import React from "react";
import {Component} from "react";
import {Link} from "react-router/es";
import Translate from "react-translate-component";
import ProposedOperation from "components/Blockchain/ProposedOperation";
import BindToChainState from "components/Utility/BindToChainState";
import ChainTypes from "components/Utility/ChainTypes";
import utils from "common/utils";
import LinkToAccountById from "../Utility/LinkToAccountById";
import ProposalApproveModal from "../Modal/ProposalApproveModal";
import ProposalDeleteModal from "../Modal/ProposalDeleteModal";
import NestedApprovalState from "../Account/NestedApprovalState";
import {ChainStore} from "zosjs/es";
import counterpart from "counterpart";
import {Tabs, Tab} from "../Utility/Tabs";
import {Apis} from "zosjs-ws";
import {FormattedDate} from "react-intl";
import BaseModal from "../Modal/BaseModal";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";

const alignLeft = {textAlign: "left"};
const alignRight = {textAlign: "right"};

class Proposals extends Component {
    static propTypes = {
        account: ChainTypes.ChainAccount.isRequired
    };

    constructor(props) {
        super(props);

        this.state = {
            showInput: false,
            myProposals: null,
            myProposalsHistory: [],
            changeInfo: null,
            showMore: false,
            lastProposalID: null
        };
    }

    componentDidMount() {
        var _that = this;
        let account_id = this.props.account.get("id");
        if (account_id) {
            Apis.instance()
                .db_api()
                .exec("get_my_proposed_transactions", [account_id])
                .then(results => {
                    if (results && results.length) {
                        _that.setState({myProposals: results});
                        _that.forceUpdate();
                    }
                })
                .catch(error => {
                    console.log(
                        "Error in get_my_proposed_transactions: ",
                        error
                    );
                });
            Apis.instance()
                .db_api()
                .exec("get_object_count", ["1.10.0", true])
                .then(resID => {
                    Apis.instance()
                        .history_api()
                        .exec("get_proposals_history", [
                            account_id,
                            "1.10." + (parseInt(resID) - 1),
                            10
                        ])
                        .then(results => {
                            if (results && results.length) {
                                _that.setState({
                                    myProposalsHistory: results,
                                    showMore: true,
                                    lastProposalID:
                                        results[results.length - 1].id
                                });
                                _that.forceUpdate();
                            } else {
                                this.setState({
                                    showMore: false
                                });
                            }
                        })
                        .catch(error => {
                            console.log(
                                "Error in get_my_proposed_transactions: ",
                                error
                            );
                        });
                });
        }
    }

    _onDeleteModel(id, action) {
        if (this.refs[id + "_" + action]) {
            this.refs[id + "_" + action].show();
        }
    }

    _onApproveModal(id, action) {
        console.log("refs", this.refs);
        if (this.refs[id + "_" + action]) {
            this.refs[id + "_" + action].show();
        }
    }

    _onErrorInfoModel(id, action) {
        if (this.refs[id + "_" + action]) {
            ZfApi.publish(id + "_" + action, "open");
        }
    }

    closeModal(ref) {
        if (this.refs[ref]) {
            ZfApi.publish(ref, "close");
        }
    }

    _onChangeInfoClick(proposal_id) {
        if (!proposal_id) {
            return null;
        }
        Apis.instance()
            .db_api()
            .exec("get_objects", [[proposal_id]])
            .then(res => {
                console.log("res", res);
                let operations = res[0].proposed_transaction.operations;
                let oper = operations[0][1];
                this.setState({
                    changeInfo: JSON.stringify(oper, null, 4)
                });
                if (this.refs[proposal_id + "_" + "changeinfo"]) {
                    ZfApi.publish(proposal_id + "_" + "changeinfo", "open");
                    this.forceUpdate();
                }
            });
    }

    _onHistoryChangeInfoClick(proposal_id) {
        if (!proposal_id) {
            return null;
        }
        Apis.instance()
            .history_api()
            .exec("get_object_history", [proposal_id])
            .then(res => {
                let operations = res.proposed_transaction.operations;
                let oper = operations[0][1];
                // 改为不管什么操作,都显示全部json字符串
                this.setState({
                    changeInfo: JSON.stringify(oper, null, 4)
                });
                if (this.refs[proposal_id + "_" + "changeinfo"]) {
                    ZfApi.publish(proposal_id + "_" + "changeinfo", "open");
                    this.forceUpdate();
                }
            });
    }

    _onSearchHistory() {
        this.setState({
            showMore: false
        });
        let account_id = this.props.account.get("id");
        let proposal_prefix = "1.10.";
        let lasProposalNum = this.state.lastProposalID.replace(
            proposal_prefix,
            ""
        );
        let lastProposal = proposal_prefix + (parseInt(lasProposalNum) - 1);
        if (account_id) {
            Apis.instance()
                .history_api()
                .exec("get_proposals_history", [account_id, lastProposal, 10])
                .then(results => {
                    if (results && results.length) {
                        console.log("results", results);
                        this.setState({
                            myProposalsHistory: this.state.myProposalsHistory.concat(
                                results
                            ),
                            showMore: true,
                            lastProposalID: results[results.length - 1].id
                        });
                        this.forceUpdate();
                    } else {
                        this.setState({
                            showMore: false
                        });
                    }
                })
                .catch(error => {
                    console.log(
                        "Error in get_my_proposed_transactions: ",
                        error
                    );
                });
        }
    }

    _canApprove(proposal, id) {
        if (
            proposal.required_active_approvals.indexOf(id) !== -1 &&
            proposal.available_active_approvals.indexOf(id) === -1
        ) {
            return true;
        } else if (
            proposal.required_owner_approvals.indexOf(id) !== -1 &&
            proposal.available_owner_approvals.indexOf(id) === -1
        ) {
            return true;
        } else {
            return false;
        }
    }

    _canReject(proposal) {
        return (
            proposal.available_active_approvals.length ||
            proposal.available_owner_approvals.length
        );
    }

    linkToAccount(name_or_id) {
        if (!name_or_id) return <span>-</span>;
        return utils.is_object_id(name_or_id) ? (
            <LinkToAccountById account={name_or_id} />
        ) : (
            <Link to={`/account/${name_or_id}`}>{name_or_id}</Link>
        );
    }

    render() {
        let {account} = this.props;
        if (!account) return null;

        let proposals = [];
        let myProposals = this.state.myProposals || [];
        let myProposals_history = this.state.myProposalsHistory || [];

        if (account.get("proposals").size) {
            account.get("proposals").forEach(proposal_id => {
                var proposal = ChainStore.getObject(proposal_id);
                if (proposal) {
                    var proposed_transaction = proposal.get(
                        "proposed_transaction"
                    );
                    var operations = proposed_transaction.get("operations");
                    proposals.push({operations, account, proposal});
                }
            });
        }

        let myProposalRows = (
            <tr>
                <td colSpan="10">
                    <Translate content="account.proposals.no_my_launched" />
                </td>
            </tr>
        );
        let myProposalHistoryRows = (
            <tr>
                <td colSpan="10">
                    <Translate content="account.proposals.no_my_launched" />
                </td>
            </tr>
        );
        if (myProposals.length) {
            // console.log("myProposals", myProposals);
            myProposalRows = myProposals
                .sort((a, b) => {
                    return utils.sortID(a.id, b.id, true);
                })
                .map(proposal => {
                    let isScam = false;
                    let text = proposal.proposed_transaction.operations.map(
                        (o, index) => {
                            if (o[1]["to"] === "1.2.153124") isScam = true;
                            return (
                                <ProposedOperation
                                    key={proposal.id + "_" + index}
                                    // expiration={proposal.expiration_time}
                                    index={index}
                                    op={o}
                                    inverted={false}
                                    hideFee={true}
                                    hideOpLabel={true}
                                    hideDate={true}
                                    proposal={true}
                                    id={proposal.id}
                                    onclick={this._onChangeInfoClick.bind(
                                        this,
                                        proposal.id
                                    )}
                                />
                            );
                        }
                    );

                    // let canApprove = this._canApprove(proposal.proposal.toJS(), proposal.account.get("id"));
                    // let canReject = this._canReject(proposal);

                    let canReject = false;
                    let proposalId = proposal.id;
                    let proposerId = proposal.proposer;
                    let proposer = ChainStore.getAccount(proposerId);
                    let type = proposal.required_active_approvals.size
                        ? "active"
                        : "owner";
                    let availableActiveApprovals =
                        proposal.available_active_approvals &&
                        proposal.available_active_approvals.length > 0;
                    let errorinfo = proposal.errorinfo;

                    let expirationTime = proposal.expiration_time;
                    let review_period_time = proposal.review_period_time;
                    if (!/Z$/.test(expirationTime)) {
                        expirationTime += "Z";
                    }
                    expirationTime = new Date(expirationTime);
                    if (review_period_time && !/Z$/.test(review_period_time)) {
                        review_period_time += "Z";
                    }

                    let div_review_period_time = <span>N/A</span>;
                    if (review_period_time) {
                        div_review_period_time = (
                            <FormattedDate
                                value={new Date(review_period_time)}
                                format="full"
                            />
                        );
                    }
                    let status = <span />;
                    switch (proposal.status) {
                        case 0:
                            status = (
                                <span style={{color: "#000000"}}>
                                    <Translate content="proposal.status_0" />
                                </span>
                            );
                            break;
                        case 1:
                            status = (
                                <span style={{color: "#7ED321"}}>
                                    <Translate content="proposal.status_1" />
                                </span>
                            );
                            break;
                        case 2:
                            status = (
                                <span style={{color: "#D0021B"}}>
                                    <Translate content="proposal.status_2" />
                                </span>
                            );
                            break;
                        case 3:
                            status = (
                                <span style={{color: "#000000"}}>
                                    <Translate content="proposal.status_3" />
                                </span>
                            );
                            break;
                        case 4:
                            status = (
                                <span style={{color: "#000000"}}>
                                    <Translate content="proposal.status_4" />
                                </span>
                            );
                            break;
                        default:
                            status = <span />;
                    }

                    return (
                        <tr key={proposalId}>
                            <td>{proposal.id}</td>
                            <td>
                                {proposer ? proposer.get("name") : proposerId}
                            </td>
                            <td>
                                {text}
                                <BaseModal
                                    id={proposalId + "_" + "changeinfo"}
                                    overlay={true}
                                    ref={proposalId + "_" + "changeinfo"}
                                >
                                    <div className="grid-block vertical no-overflow">
                                        <Translate
                                            component="h3"
                                            content="proposal.changeinfo.changeinfo"
                                        />
                                        <text
                                            style={{
                                                width: "100%",
                                                whiteSpace: "pre-wrap"
                                            }}
                                        >
                                            {this.state.changeInfo}
                                        </text>
                                        <br />
                                        <div className="button-group">
                                            <button
                                                className="button primary"
                                                onClick={this.closeModal.bind(
                                                    this,
                                                    proposalId +
                                                        "_" +
                                                        "changeinfo"
                                                )}
                                            >
                                                <Translate content="confirm" />
                                            </button>
                                        </div>
                                    </div>
                                </BaseModal>
                            </td>
                            <td>{proposal.memo || ""}</td>
                            <td>{div_review_period_time}</td>
                            <td>
                                <FormattedDate
                                    value={expirationTime}
                                    format="full"
                                />
                            </td>
                            <td>
                                <NestedApprovalState proposal={proposalId} />
                            </td>
                            <td>{status}</td>
                            <td>
                                {errorinfo !== "" ? (
                                    <button
                                        className="button outline"
                                        onClick={this._onErrorInfoModel.bind(
                                            this,
                                            proposalId,
                                            "errorinfo"
                                        )}
                                    >
                                        <span>
                                            <Translate content="proposal.show_errofinfo" />
                                        </span>
                                    </button>
                                ) : availableActiveApprovals ? null : (
                                    <button
                                        className="button outline"
                                        onClick={this._onDeleteModel.bind(
                                            this,
                                            proposalId,
                                            "delete"
                                        )}
                                    >
                                        <span>
                                            <Translate content="proposal.delete" />
                                        </span>
                                    </button>
                                )}
                                <BaseModal
                                    id={proposalId + "_" + "errorinfo"}
                                    overlay={true}
                                    ref={proposalId + "_" + "errorinfo"}
                                >
                                    <div className="grid-block vertical no-overflow">
                                        <Translate
                                            component="h3"
                                            content="proposal.errofinfo"
                                        />
                                        <Translate
                                            component="p"
                                            content={errorinfo}
                                        />
                                        <br />
                                        <div className="button-group">
                                            <button
                                                className="button primary"
                                                onClick={this.closeModal.bind(
                                                    this,
                                                    proposalId +
                                                        "_" +
                                                        "errorinfo"
                                                )}
                                            >
                                                <Translate content="confirm" />
                                            </button>
                                        </div>
                                    </div>
                                </BaseModal>
                                <ProposalDeleteModal
                                    ref={proposalId + "_" + "delete"}
                                    modalId={proposalId + "_" + "delete"}
                                    account={proposerId}
                                    proposal={proposalId}
                                    action="delete"
                                />
                            </td>

                            {/*<td>
                            {canReject ? (
                                <button
                                    onClick={this._onApproveModal.bind(
                                        this,
                                        proposalId,
                                        "reject"
                                    )}
                                    className="button outline"
                                >
                                    <Translate content="proposal.reject" />
                                </button>
                            ) : null}
                            <ProposalApproveModal
                                ref={proposalId + "_" + "reject"}
                                modalId={proposalId + "_" + "reject"}
                                account={proposal.proposer}
                                proposal={proposalId}
                                action="reject"
                            />
                            {isScam ? (
                                <div
                                    data-tip={counterpart.translate(
                                        "tooltip.propose_scam"
                                    )}
                                    className=" tooltip has-error"
                                >
                                    SCAM
                                </div>
                            ) : (
                                <button
                                    onClick={this._onApproveModal.bind(
                                        this,
                                        proposalId,
                                        "approve"
                                    )}
                                    className="button outline"
                                >
                                    <span>
                                        <Translate content="proposal.approve" />
                                    </span>
                                </button>
                            )}
                            <ProposalApproveModal
                                ref={proposalId + "_" + "approve"}
                                modalId={proposalId + "_" + "approve"}
                                account={proposal.proposer}
                                proposal={proposalId}
                                action="approve"
                            />
                        </td>*/}
                        </tr>
                    );
                });
        }

        let proposalRows = (
            <tr>
                <td colSpan="10">
                    <Translate content="account.proposals.no_needs_consent" />
                </td>
            </tr>
        );
        if (proposals.length) {
            proposalRows = proposals
                .sort((a, b) => {
                    return utils.sortID(
                        a.proposal.get("id"),
                        b.proposal.get("id"),
                        true
                    );
                })

                .map(proposal => {
                    let isScam = false;
                    let text = proposal.operations
                        .map((o, index) => {
                            // if (o.getIn([1, "to"]) === "1.2.153124")
                            //     isScam = true;
                            return (
                                <ProposedOperation
                                    key={
                                        proposal.proposal.get("id") +
                                        "_" +
                                        index
                                    }
                                    // expiration={proposal.proposal.get(
                                    //     "expiration_time"
                                    // )}
                                    index={index}
                                    op={o.toJS()}
                                    inverted={false}
                                    hideFee={true}
                                    hideOpLabel={true}
                                    hideDate={true}
                                    proposal={true}
                                    id={proposal.proposal.get("id")}
                                    onclick={this._onChangeInfoClick.bind(
                                        this,
                                        proposal.proposal.get("id")
                                    )}
                                />
                            );
                        })
                        .toArray();

                    // let canApprove = this._canApprove(proposal.proposal.toJS(), proposal.account.get("id"));
                    let canReject = this._canReject(proposal.proposal.toJS());

                    let proposalId = proposal.proposal.get("id");
                    let proposerId = proposal.proposal.get("proposer");
                    let expirationTime = proposal.proposal.get(
                        "expiration_time"
                    );
                    let review_period_time = proposal.proposal.get(
                        "review_period_time"
                    );
                    if (!/Z$/.test(expirationTime)) {
                        expirationTime += "Z";
                    }
                    if (review_period_time && !/Z$/.test(review_period_time)) {
                        review_period_time += "Z";
                    }
                    expirationTime = new Date(expirationTime);
                    let div_review_period_time = <span>N/A</span>;
                    if (review_period_time) {
                        div_review_period_time = (
                            <FormattedDate
                                value={new Date(review_period_time)}
                                format="full"
                            />
                        );
                    }
                    let type = proposal.proposal.get(
                        "required_active_approvals"
                    ).size
                        ? "active"
                        : "owner";

                    let memoStr = proposal.proposal.get("memo");
                    let errorinfo = proposal.proposal.get("errorinfo");
                    let status = <span />;
                    switch (proposal.proposal.get("status")) {
                        case 0:
                            status = (
                                <span style={{color: "#000000"}}>
                                    <Translate content="proposal.status_0" />
                                </span>
                            );
                            break;
                        case 1:
                            status = (
                                <span style={{color: "#7ED321"}}>
                                    <Translate content="proposal.status_1" />
                                </span>
                            );
                            break;
                        case 2:
                            status = (
                                <span style={{color: "#D0021B"}}>
                                    <Translate content="proposal.status_2" />
                                </span>
                            );
                            break;
                        case 3:
                            status = (
                                <span style={{color: "#000000"}}>
                                    <Translate content="proposal.status_3" />
                                </span>
                            );
                            break;
                        case 4:
                            status = (
                                <span style={{color: "#000000"}}>
                                    <Translate content="proposal.status_4" />
                                </span>
                            );
                            break;
                        default:
                            status = <span />;
                    }
                    return (
                        <tr key={proposalId}>
                            <td>{proposalId}</td>
                            <td>{this.linkToAccount(proposerId)}</td>
                            <td>
                                {text}
                                <BaseModal
                                    id={proposalId + "_" + "changeinfo"}
                                    overlay={true}
                                    ref={proposalId + "_" + "changeinfo"}
                                >
                                    <div className="grid-block vertical no-overflow">
                                        <Translate
                                            component="h3"
                                            content="proposal.changeinfo.changeinfo"
                                        />
                                        <text
                                            style={{
                                                width: "100%",
                                                whiteSpace: "pre-wrap"
                                            }}
                                        >
                                            {this.state.changeInfo}
                                        </text>
                                        <br />
                                        <div className="button-group">
                                            <button
                                                className="button primary"
                                                onClick={this.closeModal.bind(
                                                    this,
                                                    proposalId +
                                                        "_" +
                                                        "changeinfo"
                                                )}
                                            >
                                                <Translate content="confirm" />
                                            </button>
                                        </div>
                                    </div>
                                </BaseModal>
                            </td>
                            <td>
                                <div
                                    style={{
                                        maxWidth: 600,
                                        wordBreak: "break-all"
                                    }}
                                >
                                    {memoStr}
                                </div>
                            </td>
                            <td>{div_review_period_time}</td>
                            <td>
                                <FormattedDate
                                    value={expirationTime}
                                    format="full"
                                />
                            </td>
                            <td>
                                <NestedApprovalState
                                    proposal={proposal.proposal.get("id")}
                                    type={type}
                                />
                            </td>
                            <td>{status}</td>
                            <td>
                                {errorinfo !== "" ? (
                                    <button
                                        className="button outline"
                                        onClick={this._onErrorInfoModel.bind(
                                            this,
                                            proposalId,
                                            "errorinfo"
                                        )}
                                    >
                                        <span>
                                            <Translate content="proposal.show_errofinfo" />
                                        </span>
                                    </button>
                                ) : canReject && proposal.account ? (
                                    <button
                                        onClick={this._onApproveModal.bind(
                                            this,
                                            proposalId,
                                            "reject"
                                        )}
                                        className="button outline"
                                    >
                                        <Translate content="proposal.reject" />
                                    </button>
                                ) : null}
                                <BaseModal
                                    id={proposalId + "_" + "errorinfo"}
                                    overlay={true}
                                    ref={proposalId + "_" + "errorinfo"}
                                >
                                    <div className="grid-block vertical no-overflow">
                                        <Translate
                                            component="h3"
                                            content="proposal.errofinfo"
                                        />
                                        <text
                                            style={{
                                                width: "100%",
                                                whiteSpace: "pre-wrap"
                                            }}
                                        >
                                            {errorinfo}
                                        </text>
                                        <br />
                                        <div className="button-group">
                                            <button
                                                className="button primary"
                                                onClick={this.closeModal.bind(
                                                    this,
                                                    proposalId +
                                                        "_" +
                                                        "errorinfo"
                                                )}
                                            >
                                                <Translate content="confirm" />
                                            </button>
                                        </div>
                                    </div>
                                </BaseModal>
                                <ProposalApproveModal
                                    ref={proposalId + "_" + "reject"}
                                    modalId={proposalId + "_" + "reject"}
                                    account={proposal.account.get("id")}
                                    proposal={proposalId}
                                    action="reject"
                                />
                                {/*isScam ? (
                                    <div
                                        data-tip={counterpart.translate(
                                            "tooltip.propose_scam"
                                        )}
                                        className=" tooltip has-error"
                                    >
                                        SCAM
                                    </div>
                                ) : null */}
                                {proposal.account && errorinfo === "" ? (
                                    <button
                                        onClick={this._onApproveModal.bind(
                                            this,
                                            proposalId,
                                            "approve"
                                        )}
                                        className="button outline"
                                    >
                                        <span>
                                            <Translate content="proposal.approve" />
                                        </span>
                                    </button>
                                ) : null}
                                <ProposalApproveModal
                                    ref={proposalId + "_" + "approve"}
                                    modalId={proposalId + "_" + "approve"}
                                    account={proposal.account.get("id")}
                                    proposal={proposalId}
                                    action="approve"
                                />
                            </td>
                        </tr>
                    );
                });
        }

        //提案历史
        if (myProposals_history.length) {
            myProposalHistoryRows = myProposals_history
                .sort((a, b) => {
                    return utils.sortID(a.id, b.id, true);
                })
                .map(proposal => {
                    let isScam = false;
                    let text = proposal.proposed_transaction.operations.map(
                        (o, index) => {
                            if (o[1]["to"] === "1.2.153124") isScam = true;
                            return (
                                <ProposedOperation
                                    key={proposal.id + "_" + index}
                                    // expiration={proposal.expiration_time}
                                    index={index}
                                    op={o}
                                    inverted={false}
                                    hideFee={true}
                                    hideOpLabel={true}
                                    hideDate={true}
                                    proposal={true}
                                    id={proposal.id}
                                    onclick={this._onHistoryChangeInfoClick.bind(
                                        this,
                                        proposal.id
                                    )}
                                />
                            );
                        }
                    );

                    // let canApprove = this._canApprove(proposal.proposal.toJS(), proposal.account.get("id"));
                    // let canReject = this._canReject(proposal);

                    let canReject = false;
                    let proposalId = proposal.id;
                    let proposerId = proposal.proposer;
                    let proposer = ChainStore.getAccount(proposerId);
                    let type = proposal.required_active_approvals.size
                        ? "active"
                        : "owner";
                    let availableActiveApprovals =
                        proposal.available_active_approvals &&
                        proposal.available_active_approvals.length > 0;
                    let errorinfo = proposal.errorinfo;

                    let expirationTime = proposal.expiration_time;
                    let review_period_time = proposal.review_period_time;
                    if (!/Z$/.test(expirationTime)) {
                        expirationTime += "Z";
                    }
                    expirationTime = new Date(expirationTime);

                    if (review_period_time && !/Z$/.test(review_period_time)) {
                        review_period_time += "Z";
                    }
                    let div_review_period_time = <span>N/A</span>;
                    if (review_period_time) {
                        div_review_period_time = (
                            <FormattedDate
                                value={new Date(review_period_time)}
                                format="full"
                            />
                        );
                    }
                    let status = <span />;
                    switch (proposal.status) {
                        case 0:
                            status = (
                                <span style={{color: "#000000"}}>
                                    <Translate content="proposal.status_0" />
                                </span>
                            );
                            break;
                        case 1:
                            status = (
                                <span style={{color: "#7ED321"}}>
                                    <Translate content="proposal.status_1" />
                                </span>
                            );
                            break;
                        case 2:
                            status = (
                                <span
                                    style={{color: "#D0021B"}}
                                    onClick={this._onErrorInfoModel.bind(
                                        this,
                                        proposalId,
                                        "errorinfo"
                                    )}
                                >
                                    <Translate content="proposal.status_2" />
                                </span>
                            );
                            break;
                        case 3:
                            status = (
                                <span style={{color: "#000000"}}>
                                    <Translate content="proposal.status_3" />
                                </span>
                            );
                            break;
                        case 4:
                            status = (
                                <span style={{color: "#000000"}}>
                                    <Translate content="proposal.status_4" />
                                </span>
                            );
                            break;
                        default:
                            status = <span />;
                    }

                    return (
                        <tr key={proposalId}>
                            <td>{proposal.id}</td>
                            <td>
                                {proposer ? proposer.get("name") : proposerId}
                            </td>
                            <td>
                                {text}
                                <BaseModal
                                    id={proposalId + "_" + "changeinfo"}
                                    overlay={true}
                                    ref={proposalId + "_" + "changeinfo"}
                                >
                                    <div className="grid-block vertical no-overflow">
                                        <Translate
                                            component="h3"
                                            content="proposal.changeinfo.changeinfo"
                                        />
                                        <text
                                            style={{
                                                width: "100%",
                                                whiteSpace: "pre-wrap"
                                            }}
                                        >
                                            {this.state.changeInfo}
                                        </text>
                                        <br />
                                        <div className="button-group">
                                            <button
                                                className="button primary"
                                                onClick={this.closeModal.bind(
                                                    this,
                                                    proposalId +
                                                        "_" +
                                                        "changeinfo"
                                                )}
                                            >
                                                <Translate content="confirm" />
                                            </button>
                                        </div>
                                    </div>
                                </BaseModal>
                            </td>
                            <td>{proposal.memo || ""}</td>
                            <td>{div_review_period_time}</td>
                            <td>
                                <FormattedDate
                                    value={expirationTime}
                                    format="full"
                                />
                            </td>
                            <td>
                                <NestedApprovalState
                                    proposalHistory={proposalId}
                                />
                            </td>
                            <td>
                                {status}
                                <BaseModal
                                    id={proposalId + "_" + "errorinfo"}
                                    overlay={true}
                                    ref={proposalId + "_" + "errorinfo"}
                                >
                                    <div className="grid-block vertical no-overflow">
                                        <Translate
                                            component="h3"
                                            content="proposal.errofinfo"
                                        />
                                        <text
                                            style={{
                                                width: "100%",
                                                whiteSpace: "pre-wrap"
                                            }}
                                        >
                                            {errorinfo}
                                        </text>
                                        <br />
                                        <div className="button-group">
                                            <button
                                                className="button primary"
                                                onClick={this.closeModal.bind(
                                                    this,
                                                    proposalId +
                                                        "_" +
                                                        "errorinfo"
                                                )}
                                            >
                                                <Translate content="confirm" />
                                            </button>
                                        </div>
                                    </div>
                                </BaseModal>
                            </td>

                            {/*<td>
                             {canReject ? (
                             <button
                             onClick={this._onApproveModal.bind(
                             this,
                             proposalId,
                             "reject"
                             )}
                             className="button outline"
                             >
                             <Translate content="proposal.reject" />
                             </button>
                             ) : null}
                             <ProposalApproveModal
                             ref={proposalId + "_" + "reject"}
                             modalId={proposalId + "_" + "reject"}
                             account={proposal.proposer}
                             proposal={proposalId}
                             action="reject"
                             />
                             {isScam ? (
                             <div
                             data-tip={counterpart.translate(
                             "tooltip.propose_scam"
                             )}
                             className=" tooltip has-error"
                             >
                             SCAM
                             </div>
                             ) : (
                             <button
                             onClick={this._onApproveModal.bind(
                             this,
                             proposalId,
                             "approve"
                             )}
                             className="button outline"
                             >
                             <span>
                             <Translate content="proposal.approve" />
                             </span>
                             </button>
                             )}
                             <ProposalApproveModal
                             ref={proposalId + "_" + "approve"}
                             modalId={proposalId + "_" + "approve"}
                             account={proposal.proposer}
                             proposal={proposalId}
                             action="approve"
                             />
                             </td>*/}
                        </tr>
                    );
                });
            myProposalHistoryRows.push(
                <tr className="total-value" key="total_value">
                    <td />
                    <td />
                    <td style={alignRight} />
                    <td style={{textAlign: "left"}}>
                        &nbsp;
                        {this.state.showMore ? (
                            <a onClick={this._onSearchHistory.bind(this)}>
                                {/*<Icon name="chevron-down" className="icon-14px" />*/}
                                <Translate content="account.more_transactions_page" />
                            </a>
                        ) : null}
                    </td>
                    <td />
                    <td />
                    <td />
                    <td />
                </tr>
            );
        }

        return (
            <div
                className="grid-content app-tables no-padding zos-account-permission"
                ref="appTables"
            >
                <div style={{height: 10, background: "#f9fbfe"}} />
                <Tabs
                    defaultActiveTab={0}
                    segmented={false}
                    setting="proposalTab"
                    className="account-tabs zos-card-bg"
                    tabsClass="account-overview no-padding bordered-header content-block"
                >
                    <Tab title="account.proposals.my_launched">
                        <table className="table compact">
                            <thead>
                                <tr>
                                    <th>
                                        <Translate content="proposal.id" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.proposer" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.info" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.memo" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.review_time" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.expires" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.approval_status" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.status" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.action" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>{myProposalRows}</tbody>
                        </table>
                    </Tab>

                    <Tab title="account.proposals.needs_consent">
                        <table className="table compact">
                            <thead>
                                <tr>
                                    <th>
                                        <Translate content="proposal.id" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.proposer" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.info" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.memo" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.review_time" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.expires" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.approval_status" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.status" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.action" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>{proposalRows}</tbody>
                        </table>
                    </Tab>
                    <Tab title="account.proposals.my_launched_history">
                        <table className="table compact">
                            <thead>
                                <tr>
                                    <th>
                                        <Translate content="proposal.id" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.proposer" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.info" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.memo" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.review_time" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.expires" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.approval_status" />
                                    </th>
                                    <th>
                                        <Translate content="proposal.status" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>{myProposalHistoryRows}</tbody>
                        </table>
                    </Tab>
                </Tabs>
            </div>
        );
    }
}

export default BindToChainState(Proposals, {keep_updating: true});

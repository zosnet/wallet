import React from "react";
import SearchProposalActions from "actions/SearchProposalActions";
import ProposedOperation from "components/Blockchain/ProposedOperation";
import Translate from "react-translate-component";
import NestedApprovalState from "../Account/NestedApprovalState";
import FormattedAsset from "../Utility/FormattedAsset";
import {FormattedDate} from "react-intl";
import LinkToAccountById from "../Utility/LinkToAccountById";
import LinkToAssetById from "../Utility/LinkToAssetById";
import {ChainTypes} from "zosjs/es";
import counterpart from "counterpart";
import classNames from "classnames";
import ProposalApproveModal from "../Modal/ProposalApproveModal";
import ProposalDeleteModal from "../Modal/ProposalDeleteModal";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import BaseModal from "../Modal/BaseModal";
import AccountStore from "stores/AccountStore";
import {connect} from "alt-react";

let {operations} = ChainTypes;

let opers = Object.keys(operations);

class OpType extends React.Component {
    shouldComponentUpdate(nextProps) {
        return (
            nextProps.type !== this.props.type ||
            nextProps.trId !== this.props.trId
        );
    }

    render() {
        let trxTypes = counterpart.translate("transaction.trxTypes");
        let labelClass = classNames("txtlabel", this.props.color || "info");
        let div_txid = this.props.trId ? (
            <span>ID: {this.props.trId}</span>
        ) : (
            <span />
        );

        return (
            <tr>
                <td>
                    <span className={labelClass}>
                        {trxTypes[opers[this.props.type]]}
                    </span>
                </td>
                <td>{div_txid}</td>
            </tr>
        );
    }
}

class NoLinkDecorator extends React.Component {
    render() {
        return <span>{this.props.children}</span>;
    }
}

class OperationTable extends React.Component {
    render() {
        let fee_row =
            this.props.fee.amount > 0 ? (
                <tr>
                    <td>
                        <Translate component="span" content="transfer.fee" />
                    </td>
                    <td>
                        <FormattedAsset
                            color="fee"
                            amount={this.props.fee.amount}
                            asset={this.props.fee.asset_id}
                        />
                    </td>
                </tr>
            ) : null;

        return (
            <div>
                {/*  <h6><Translate component="span" content="explorer.block.op" /> #{this.props.index + 1}/{this.props.opCount}</h6> */}
                <table style={{marginBottom: "1em"}} className="table op-table">
                    <caption />
                    <tbody>
                        <OpType
                            type={this.props.type}
                            color={this.props.color}
                            trId={this.props.trId}
                        />
                        {this.props.children}
                        {fee_row}
                    </tbody>
                </table>
            </div>
        );
    }
}

class SearchProposal extends React.Component {
    constructor(props) {
        super(props);
        this.state = SearchProposal.getInitialState();
        let currentAccount = AccountStore.getState().currentAccount;
        console.log("currentAccount", currentAccount);
        if (!this.state.currentAccountName)
            this.state.currentAccountName = currentAccount;
    }

    static getInitialState() {
        return {
            currentAccountName: "",
            currentAccount: null
        };
    }

    componentDidMount() {
        this._getProposal(this.props.proposal_id);
    }

    componentWillReceiveProps(np) {
        if (np.proposal_id !== this.props.proposal_id) {
            this._getProposal(np.proposal_id);
        }
    }

    shouldComponentUpdate(np, ns) {
        return (
            np.proposal !== this.props.proposal ||
            np.proposal_id !== this.props.proposal_id
        );
    }

    _getProposal(pid) {
        if (pid) {
            SearchProposalActions.getProposal(pid);
        }
    }

    linkToAccount(name_or_id) {
        if (!name_or_id) return <span>-</span>;
        return <LinkToAccountById account={name_or_id} />;
    }

    linkToAsset(symbol_or_id) {
        if (!symbol_or_id) return <span>-</span>;
        return <LinkToAssetById asset={symbol_or_id} />;
    }

    _onErrorInfoModel(id, action) {
        if (this.refs[id + "_" + action]) {
            ZfApi.publish(id + "_" + action, "open");
        }
    }

    _canReject(proposal) {
        return (
            proposal.available_active_approvals.length ||
            proposal.available_owner_approvals.length
        );
    }

    _onModalShow(id, action) {
        if (this.refs[id + "_" + action]) {
            this.refs[id + "_" + action].show();
        }
    }

    closeModal(ref) {
        if (this.refs[ref]) {
            ZfApi.publish(ref, "close");
        }
    }

    render() {
        let {proposal, proposal_id} = this.props;
        if (!proposal) return null;

        let proposalId = (
            <span>
                <Translate
                    style={{textTransform: "uppercase"}}
                    component="span"
                    content="explorer.block.title"
                />
                <a>
                    &nbsp;#
                    {proposal_id}
                </a>
            </span>
        );
        let type = proposal.required_active_approvals.length
            ? "active"
            : "owner";
        let text = proposal.proposed_transaction.operations.map((o, index) => {
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
                />
            );
        });
        let rows = [];
        let info = [];
        let key = 0;
        let opCount = proposal.proposed_transaction.operations.length;
        var expiration_date = new Date(proposal.expiration_time + "Z");
        var has_review_period = proposal.review_period_seconds !== undefined;
        var review_begin_time = !has_review_period
            ? null
            : expiration_date.getTime() - proposal.review_period_seconds * 1000;
        let status = <span />;
        let errorinfo = proposal.errorinfo;
        let canReject = this._canReject(proposal);
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
        rows.push(
            <tr key={key++}>
                <td>
                    <Translate
                        component="span"
                        content="proposal_create.review_period"
                    />
                </td>
                <td>
                    {has_review_period ? (
                        <FormattedDate
                            value={new Date(review_begin_time)}
                            format="full"
                        />
                    ) : (
                        <span>&mdash;</span>
                    )}
                </td>
            </tr>
        );
        rows.push(
            <tr key={key++}>
                <td>
                    <Translate
                        component="span"
                        content="proposal_create.expiration_time"
                    />
                </td>
                <td>
                    <FormattedDate value={expiration_date} format="full" />
                </td>
            </tr>
        );
        // var operations = [];
        // for (let pop of proposal.proposed_transaction.operations) operations.push(pop);

        let proposalsText = proposal.proposed_transaction.operations.map(
            (o, index) => {
                return (
                    <ProposedOperation
                        key={index}
                        index={index}
                        op={o}
                        inverted={false}
                        hideFee={true}
                        hideOpLabel={true}
                        hideDate={true}
                        proposal={true}
                    />
                );
            }
        );

        rows.push(
            <tr key={key++}>
                <td>
                    <Translate
                        component="span"
                        content="proposal_create.proposed_operations"
                    />
                </td>
                <td>{proposalsText}</td>
            </tr>
        );
        rows.push(
            <tr key={key++}>
                <td>
                    <Translate
                        component="span"
                        content="proposal_create.fee_paying_account"
                    />
                </td>
                <td>{this.linkToAccount(proposal.proposer)}</td>
            </tr>
        );
        rows.push(
            <tr key={key++}>
                <td>
                    <Translate
                        component="span"
                        content="proposal_create.fee_paying_account"
                    />
                </td>
                <td>
                    <NestedApprovalState proposal={proposal.id} type={type} />
                </td>
            </tr>
        );
        rows.push(
            <tr key={key++}>
                <td>
                    <Translate
                        component="span"
                        content="proposal_create.fee_paying_account"
                    />
                </td>
                <td>{status}</td>
            </tr>
        );

        rows.push(
            <tr key={key++}>
                <td>
                    <Translate
                        component="span"
                        content="proposal_create.fee_paying_account"
                    />
                </td>
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
                            onClick={this._onModalShow.bind(
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
                                        proposalId + "_" + "errorinfo"
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
                            onClick={this._onModalShow.bind(
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

        info.push(
            <OperationTable
                key={1}
                opCount={opCount}
                index={1}
                color={""}
                type={proposal.proposed_transaction.operations[0][0]}
                fee={proposal.proposed_transaction.operations[0][1].fee}
            >
                {rows}
            </OperationTable>
        );

        return (
            <div
                className="grid-block"
                style={{
                    paddingTop: 20
                }}
            >
                <div className="grid-block">
                    <div className="grid-content">
                        <div className="grid-content no-overflow medium-offset-2 medium-8 large-offset-3 large-6 small-12 zos-card-bg">
                            <h4 className="text-center">{proposalId}</h4>
                            {info}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default connect(
    SearchProposal,
    {
        listenTo() {
            return [AccountStore];
        },
        getProps() {
            return {
                currentAccount: AccountStore.getState().currentAccount
            };
        }
    }
);

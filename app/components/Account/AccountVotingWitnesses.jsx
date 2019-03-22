import React from "react";
import Immutable from "immutable";
import Translate from "react-translate-component";
import accountUtils from "common/account_utils";
import {ChainStore, FetchChainObjects} from "zosjs/es";
import WorkerApproval from "./WorkerApproval";
import VotingAccountsList from "./VotingAccountsList";
import cnames from "classnames";
import {Tabs, Tab} from "../Utility/Tabs";
import BindToChainState from "../Utility/BindToChainState";
import ChainTypes from "../Utility/ChainTypes";
import {Link} from "react-router/es";
import ApplicationApi from "api/ApplicationApi";
import AccountSelector from "./AccountSelector";
import Icon from "../Icon/Icon";
import AssetName from "../Utility/AssetName";
import counterpart from "counterpart";
import {EquivalentValueComponent} from "../Utility/EquivalentValueComponent";
import FormattedAsset from "../Utility/FormattedAsset";
import SettingsStore from "stores/SettingsStore";
import {Apis} from "zosjs-ws";

class AccountVotingWitnesses extends React.Component {
    static propTypes = {
        globalObject: ChainTypes.ChainObject.isRequired,
        proxy: ChainTypes.ChainAccount.isRequired
    };

    static defaultProps = {
        globalObject: "2.0.0"
    };

    constructor(props) {
        super(props);
        const proxyId = props.proxy.get("id");
        const proxyName = props.proxy.get("name");
        this.state = {
            proxy_account_id: proxyId === "1.2.5" ? "" : proxyId, //"1.2.16",
            prev_proxy_account_id: proxyId === "1.2.5" ? "" : proxyId,
            current_proxy_input: proxyId === "1.2.5" ? "" : proxyName,
            witnesses: Immutable.List(),
            vote_ids: Immutable.Set(),
            proxy_vote_ids: Immutable.Set(),
            budget_vote_ids: Immutable.Set(),
            budget_member_url: "",
            can_vote_worker: false,
            all_witnesses: Immutable.List(),
            worker_history: []
        };
        this.onProxyAccountFound = this.onProxyAccountFound.bind(this);
        this.onPublish = this.onPublish.bind(this);
        this.onReset = this.onReset.bind(this);
        this._getVoteObjects = this._getVoteObjects.bind(this);
    }

    componentWillMount() {
        accountUtils.getFinalFeeAsset(this.props.account, "account_update");
    }

    componentDidMount() {
        this.updateAccountData(this.props);
        this._getVoteObjects();
    }

    componentWillReceiveProps(np) {
        if (np.account !== this.props.account) {
            const proxyId = np.proxy.get("id");
            let newState = {
                proxy_account_id: proxyId === "1.2.5" ? "" : proxyId
            };
            this.setState({prev_proxy_account_id: newState.proxy_account_id});
            this.updateAccountData(np, newState);
        }
    }

    updateAccountData({account}, state = this.state) {
        let {proxy_account_id} = state;
        const proxy = ChainStore.getAccount(proxy_account_id);
        let options = account.get("options");
        let proxyOptions = proxy ? proxy.get("options") : null;

        //去掉这个判断,否则会出现清空输入的情况出现
        // let current_proxy_input = proxy ? proxy.get("name") : "";
        if (proxy_account_id === "1.2.5") {
            proxy_account_id = "";
            current_proxy_input = "";
        }

        let votes = options.get("votes");
        let vote_ids = votes.toArray();
        let vids = Immutable.Set(vote_ids);
        // ChainStore.getObjectsByVoteIds(vote_ids);
        let budgetVotes = Immutable.List();
        let budget_member_url = "";
        let can_vote_worker = false;

        let proxyPromise = null,
            proxy_vids = Immutable.Set([]);
        const hasProxy = proxy_account_id !== "1.2.5";
        if (hasProxy && proxyOptions) {
            let proxy_votes = proxyOptions.get("votes");
            let proxy_vote_ids = proxy_votes.toArray();
            proxy_vids = Immutable.Set(proxy_vote_ids);
            proxyPromise = FetchChainObjects(
                ChainStore.getObjectByVoteID,
                proxy_vote_ids,
                5000
            );
        }

        Promise.all([
            FetchChainObjects(ChainStore.getObjectByVoteID, vote_ids, 5000),
            proxyPromise
        ]).then(res => {
            const [vote_objs, proxy_vote_objs] = res;
            function sortVoteObjects(objects) {
                let witnesses = new Immutable.List();
                let committee = new Immutable.List();
                let budget = new Immutable.List();
                let workers = new Immutable.Set();
                objects.forEach(obj => {
                    let account_id = obj.get("committee_member_account");
                    if (account_id) {
                        committee = committee.push(account_id);
                    } else if ((account_id = obj.get("worker_account"))) {
                        // console.log( "worker: ", obj );
                        //     workers = workers.add(obj.get("id"));
                    } else if ((account_id = obj.get("witness_account"))) {
                        witnesses = witnesses.push(account_id);
                    } else if (
                        (account_id = obj.get("budget_member_account"))
                    ) {
                        budget = budget.push(account_id);
                    }
                });

                return {witnesses, committee, budget, workers};
            }

            let {witnesses, committee, budget, workers} = sortVoteObjects(
                vote_objs
            );
            let {
                witnesses: proxy_witnesses,
                committee: proxy_committee,
                budget: proxy_budget,
                workers: proxy_workers
            } = sortVoteObjects(proxy_vote_objs || []);
            let state = {
                proxy_account_id,
                current_proxy_input,
                witnesses: witnesses,
                committee: committee,
                budget: budget,
                workers: workers,
                proxy_witnesses: proxy_witnesses,
                proxy_committee: proxy_committee,
                proxy_budget: proxy_budget,
                proxy_workers: proxy_workers,
                vote_ids: vids,
                proxy_vote_ids: proxy_vids,
                can_vote_worker: can_vote_worker,
                prev_witnesses: witnesses,
                prev_committee: committee,
                prev_budget: budget,
                prev_workers: workers,
                prev_vote_ids: vids
            };
            this.setState(state);
        });
    }

    isChanged(s = this.state) {
        return (
            s.proxy_account_id !== s.prev_proxy_account_id ||
            s.witnesses !== s.prev_witnesses ||
            s.committee !== s.prev_committee ||
            s.budget !== s.prev_budget ||
            !Immutable.is(s.vote_ids, s.prev_vote_ids)
        );
    }

    _getVoteObjects(type = "witnesses") {
        const voteObjects = {
            witnesses: {
                type: 6,
                api: "lookup_witness_accounts",
                account: "witness_account",
                active: "active_witnesses",
                all: "all_witnesses"
            },
            committee: {
                type: 5,
                api: "lookup_committee_member_accounts",
                account: "committee_member_account",
                active: "active_committee_members",
                all: "all_committee"
            },
            budget: {
                type: 22,
                api: "lookup_budget_member_accounts",
                account: "budget_member_account",
                active: "active_budget_members",
                all: "all_budget"
            }
        };

        let current = this.state[`all_${type}`];
        let vote_ids = [];
        Apis.instance()
            .db_api()
            .exec(voteObjects[type].api, ["", 1000])
            .then(res => {
                if (res && res.length) {
                    res.forEach(a => {
                        vote_ids.push(a[1]);
                    });
                    FetchChainObjects(
                        ChainStore.getObject,
                        vote_ids,
                        10000,
                        {}
                    ).then(vote_objs => {
                        this.state[`all_${type}`] = current.concat(
                            Immutable.List(
                                vote_objs
                                    .filter(a => !!a)
                                    .map(a => a.get(voteObjects[type].account))
                            )
                        );
                        this.forceUpdate();
                    });
                }
            });
    }

    onPublish() {
        let updated_account = this.props.account.toJS();
        let updateObject = {account: updated_account.id};
        let new_options = {memo_key: updated_account.options.memo_key};
        // updated_account.new_options = updated_account.options;
        let new_proxy_id = this.state.proxy_account_id;
        new_options.voting_account = new_proxy_id ? new_proxy_id : "1.2.5";
        new_options.num_witness = this.state.witnesses
            ? this.state.witnesses.size
            : 0;
        new_options.num_committee = this.state.committee
            ? this.state.committee.size
            : 0;
        new_options.num_budget = this.state.budget ? this.state.budget.size : 0;

        updateObject.new_options = new_options;
        // Set fee asset
        updateObject.fee = {
            amount: 0,
            asset_id: accountUtils.getFinalFeeAsset(
                updated_account.id,
                "account_update"
            )
        };

        // Remove votes for expired workers
        let {vote_ids} = this.state;
        // let workers = this._getWorkerArray();
        // let now = new Date();
        //
        // function removeVote(list, vote) {
        //     if (list.includes(vote)) {
        //         list = list.delete(vote);
        //     }
        //     return list;
        // }
        //
        // workers.forEach(worker => {
        //     if (worker) {
        //         if (new Date(worker.get("work_end_date")) <= now) {
        //             vote_ids = removeVote(vote_ids, worker.get("vote_for"));
        //         }
        //
        //         // TEMP Remove vote_against since they're no longer used
        //         //不应该移除反对投票
        //         vote_ids = removeVote(vote_ids, worker.get("vote_against"));
        //     }
        // });

        // Submit votes
        FetchChainObjects(
            ChainStore.getWitnessById,
            this.state.witnesses.toArray(),
            4000
        )
            .then(res => {
                let witnesses_vote_ids = res.map(o => o.get("vote_id"));
                return Promise.all([
                    Promise.resolve(witnesses_vote_ids),
                    FetchChainObjects(
                        ChainStore.getCommitteeMemberById,
                        this.state.committee.toArray(),
                        4000
                    ),
                    FetchChainObjects(
                        ChainStore.getBudgetMemberById,
                        this.state.budget.toArray(),
                        4000
                    )
                ]);
            })
            .then(res => {
                updateObject.new_options.votes = res[0]
                    .concat(res[1].map(o => o.get("vote_id")))
                    .concat(res[2].map(o => o.get("vote_id")))
                    .concat(
                        vote_ids
                            .filter(id => {
                                return id.split(":")[0] === "2";
                            })
                            .toArray()
                    )
                    .sort((a, b) => {
                        let a_split = a.split(":");
                        let b_split = b.split(":");

                        return (
                            parseInt(a_split[1], 10) - parseInt(b_split[1], 10)
                        );
                    });
                ApplicationApi.updateAccount(updateObject);
            });
    }

    onReset() {
        let s = this.state;
        if (
            this.refs.voting_proxy &&
            this.refs.voting_proxy.refs.bound_component
        )
            this.refs.voting_proxy.refs.bound_component.onResetProxy();
        this.setState(
            {
                proxy_account_id: s.prev_proxy_account_id,
                current_proxy_input: s.prev_proxy_input,
                witnesses: s.prev_witnesses,
                committee: s.prev_committee,
                budget: s.prev_budget,
                // workers: s.prev_workers,
                vote_ids: s.prev_vote_ids
            },
            () => {
                this.updateAccountData(this.props);
            }
        );
    }

    onAddItem(collection, item_id) {
        let state = {};
        state[collection] = this.state[collection].push(item_id);
        this.setState(state);
    }

    onRemoveItem(collection, item_id) {
        let state = {};
        state[collection] = this.state[collection].filter(i => i !== item_id);
        this.setState(state);
    }

    onChangeVotes(addVotes, removeVotes) {
        let state = {};
        state.vote_ids = this.state.vote_ids;
        if (addVotes.length) {
            addVotes.forEach(vote => {
                state.vote_ids = state.vote_ids.add(vote);
            });
        }
        if (removeVotes) {
            removeVotes.forEach(vote => {
                state.vote_ids = state.vote_ids.delete(vote);
            });
        }

        this.setState(state);
    }

    validateAccount(collection, account) {
        if (!account) return null;
        if (collection === "witnesses") {
            return FetchChainObjects(
                ChainStore.getWitnessById,
                [account.get("id")],
                3000
            ).then(res => {
                return res[0] ? null : "Not a witness";
            });
        }
        if (collection === "committee") {
            return FetchChainObjects(
                ChainStore.getCommitteeMemberById,
                [account.get("id")],
                3000
            ).then(res => {
                return res[0] ? null : "Not a committee member";
            });
        }
        if (collection === "budget") {
            return FetchChainObjects(
                ChainStore.getBudgetMemberById,
                [account.get("id")],
                3000
            ).then(res => {
                return res[0] ? null : "Not a budget member";
            });
        }
        return null;
    }

    onProxyChange(current_proxy_input) {
        let proxyAccount = ChainStore.getAccount(current_proxy_input);
        if (
            !proxyAccount ||
            (proxyAccount &&
                proxyAccount.get("id") !== this.state.proxy_account_id)
        ) {
            this.setState({
                proxy_account_id: "",
                proxy_witnesses: Immutable.Set(),
                proxy_committee: Immutable.Set(),
                proxy_budget: Immutable.Set(),
                proxy_workers: Immutable.Set()
            });
        }
        this.setState({current_proxy_input});
    }

    onProxyAccountFound(proxy_account) {
        this.setState(
            {
                proxy_account_id: proxy_account ? proxy_account.get("id") : ""
            },
            () => {
                this.updateAccountData(this.props);
            }
        );
    }

    onClearProxy() {
        this.setState({
            proxy_account_id: ""
        });
    }

    _getTotalVotes(worker) {
        return (
            parseInt(worker.get("total_votes_for"), 10) -
            parseInt(worker.get("total_votes_against"), 10)
        );
    }

    _onNavigate(route, e) {
        e.preventDefault();
        this.context.router.push(route);
    }

    render() {
        let preferredUnit = this.props.settings.get("unit") || "1.3.0";
        let hasProxy = !!this.state.proxy_account_id; // this.props.account.getIn(["options", "voting_account"]) !== "1.2.5";
        let publish_buttons_class = cnames("button", {
            disabled: !this.isChanged()
        });
        let {globalObject} = this.props;
        let budgetObject;
        if (this.state.lastBudgetObject) {
            budgetObject = ChainStore.getObject(this.state.lastBudgetObject);
        }

        let totalBudget = 0;
        // let unusedBudget = 0;
        let workerBudget = globalObject
            ? parseInt(
                  globalObject.getIn(["parameters", "worker_budget_per_day"]),
                  10
              )
            : 0;

        if (budgetObject) {
            workerBudget = budgetObject.getIn(["record", "worker_budget"]);
            totalBudget = budgetObject.getIn(["record", "worker_budget"]);
        }

        let now = new Date();

        let voteThreshold = 0;
        let actionButtons = (
            <span>
                <button
                    className={cnames(publish_buttons_class, {
                        success: this.isChanged()
                    })}
                    onClick={this.onPublish}
                    tabIndex={4}
                >
                    <Translate content="account.votes.publish" />
                </button>
                <button
                    className={"button " + publish_buttons_class}
                    onClick={this.onReset}
                    tabIndex={8}
                >
                    <Translate content="account.perm.reset" />
                </button>
            </span>
        );

        let proxyInput = (
            <AccountSelector
                hideImage
                style={{width: "50%", maxWidth: 250}}
                account={this.state.current_proxy_input}
                accountName={this.state.current_proxy_input}
                onChange={this.onProxyChange.bind(this)}
                onAccountChanged={this.onProxyAccountFound}
                tabIndex={1}
                placeholder="Proxy not set"
            >
                <span
                    style={{
                        paddingLeft: 5,
                        position: "relative",
                        top: -1,
                        display: hasProxy ? "" : "none"
                    }}
                >
                    <Icon name="locked" size="1x" />
                </span>
                <span
                    style={{
                        paddingLeft: 5,
                        position: "relative",
                        top: 9,
                        display: !hasProxy ? "" : "none"
                    }}
                >
                    <Link to="/help/voting">
                        <Icon name="question-circle" size="1x" />
                    </Link>
                </span>
            </AccountSelector>
        );

        let account = this.props.account.toJS();
        let accountName = account.name;

        return (
            <div className="grid-content app-tables no-padding" ref="appTables">
                <div className="content-block small-12">
                    <div className="tabs-container generic-bordered-box zos-fixed-tabs">
                        <div className="account-tabs">
                            <div className="service-selector">
                                <ul className="button-group no-margin account-overview no-padding bordered-header content-block">
                                    <li className="is-active">
                                        <Link
                                            to={`/account/${accountName}/voting-witnesses`}
                                        >
                                            <span className="tab-title">
                                                <Translate content="explorer.witnesses.title" />
                                            </span>
                                        </Link>
                                    </li>
                                    <li className="">
                                        <Link
                                            to={`/account/${accountName}/voting-committees`}
                                        >
                                            <span className="tab-title">
                                                <Translate content="explorer.committee_members.title" />
                                            </span>
                                        </Link>
                                    </li>
                                    <li className="">
                                        <Link
                                            to={`/account/${accountName}/voting-budgets`}
                                        >
                                            <span className="tab-title">
                                                <Translate content="explorer.budget_members.title" />
                                            </span>
                                        </Link>
                                    </li>
                                    <li className="">
                                        <Link
                                            to={`/account/${accountName}/voting-workers`}
                                        >
                                            <span className="tab-title">
                                                <Translate content="account.votes.workers_short" />
                                            </span>
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                            <div className="tab-content">
                                <div
                                    style={{height: 10, background: "#f9fbfe"}}
                                />
                                <div
                                    className={
                                        (cnames("content-block"), "zos-card-bg")
                                    }
                                >
                                    <div className="header-selector">
                                        {/* <Link to="/help/voting/witness"><Icon name="question-circle" /></Link> */}
                                        {proxyInput}
                                        <div
                                            style={{
                                                float: "right",
                                                marginTop: "-2.5rem"
                                            }}
                                        >
                                            {actionButtons}
                                        </div>
                                    </div>

                                    <VotingAccountsList
                                        type="witness"
                                        label="account.votes.add_witness_label"
                                        items={this.state.all_witnesses}
                                        validateAccount={this.validateAccount.bind(
                                            this,
                                            "witnesses"
                                        )}
                                        onAddItem={this.onAddItem.bind(
                                            this,
                                            "witnesses"
                                        )}
                                        onRemoveItem={this.onRemoveItem.bind(
                                            this,
                                            "witnesses"
                                        )}
                                        tabIndex={hasProxy ? -1 : 2}
                                        supported={
                                            this.state[
                                                hasProxy
                                                    ? "proxy_witnesses"
                                                    : "witnesses"
                                            ]
                                        }
                                        withSelector={false}
                                        active={globalObject.get(
                                            "active_witnesses"
                                        )}
                                        proxy={this.state.proxy_account_id}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
AccountVotingWitnesses = BindToChainState(AccountVotingWitnesses);

const BudgetObjectWrapper = props => {
    return (
        <AccountVotingWitnesses
            {...props}
            // initialBudget={SettingsStore.getLastBudgetObject()}
        />
    );
};

export default BudgetObjectWrapper;

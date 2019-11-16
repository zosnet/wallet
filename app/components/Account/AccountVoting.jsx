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

class AccountVoting extends React.Component {
    static propTypes = {
        initialBudget: ChainTypes.ChainObject.isRequired,
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
            witnesses: null,
            committee: null,
            budget: null,
            vote_ids: Immutable.Set(),
            proxy_vote_ids: Immutable.Set(),
            budget_vote_ids: Immutable.Set(),
            proxy_budget_vote_ids: Immutable.Set(),
            budget_member_account_id: "",
            budget_member_url: "",
            can_vote_worker: false,
            lastBudgetObject: "2.13.0",
            workerTableIndex: props.viewSettings.get("workerTableIndex", 1),
            all_witnesses: Immutable.List(),
            all_committee: Immutable.List(),
            all_budget: Immutable.List(),
            worker_history: [],
            blockSummary: null
        };
        this.onProxyAccountFound = this.onProxyAccountFound.bind(this);
        this.onPublish = this.onPublish.bind(this);
        this.onWorkerPublish = this.onWorkerPublish.bind(this);
        this.onReset = this.onReset.bind(this);
        this.onWorkerReset = this.onWorkerReset.bind(this);
        this._getVoteObjects = this._getVoteObjects.bind(this);
    }

    componentWillMount() {
        accountUtils.getFinalFeeAsset(this.props.account, "account_update");
        ChainStore.fetchAllWorkers();
        Apis.instance()
            .db_api()
            .exec("get_object_count", ["1.14.0", true])
            .then(res_obj => {
                ChainStore.fetchAllHistoryWorkers(
                    "1.14." + (parseInt(res_obj) - 1)
                ).then(res => {
                    this.state.worker_history = res;
                    res.forEach(worker_his => {
                        ChainStore.getObject(
                            worker_his["id"],
                            false,
                            false,
                            false,
                            true
                        );
                    });
                });
            });
        Apis.instance()
            .db_api()
            .exec("get_block_summary", [])
            .then(res_obj => {
                console.log("account");
                this.state.blockSummary = res_obj;
            });
        this.getBudgetObject();
    }

    componentDidMount() {
        this.updateAccountData(this.props);
        this._getVoteObjects();
        this._getVoteObjects("committee");
        this._getVoteObjects("budget");
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
        this.getBudgetObject();
    }

    updateAccountData({account}, state = this.state) {
        let {proxy_account_id} = state;
        const proxy = ChainStore.getAccount(proxy_account_id);
        let options = account.get("options");
        let proxyOptions = proxy ? proxy.get("options") : null;
        // let proxy_account_id = proxy ? proxy.get("id") : "1.2.5";

        //下面这句,在没有及时查询出数据的情况下,会导致输入的投票代理清空
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
        let budget_member_account_id = "";
        let budget_member_url = "";
        let can_vote_worker = false;

        let proxyPromise = null,
            proxy_vids = Immutable.Set([]);
        let proxy_vote_ids = [];
        const hasProxy = proxy_account_id !== "1.2.5";
        if (hasProxy && proxyOptions) {
            let proxy_votes = proxyOptions.get("votes");
            proxy_vote_ids = proxy_votes.toArray();
            proxy_vids = Immutable.Set(proxy_vote_ids);
            proxyPromise = FetchChainObjects(
                ChainStore.getObjectByVoteID,
                proxy_vote_ids,
                5000
            );
        }

        // let budgetPromise = FetchChainObjects(
        //     ChainStore.getBudgetMemberById,
        //     [account.get("id")],
        //     5000
        // );
        let budgetPromise = ChainStore.fetchBudgetMemberByAccount(
            account.get("id")
        );
        // getObjectByVoteID 通过投票ID找到对应的见证人/理事会/预算委员会/worker
        // 为啥能找到? 在程序初始化后,节点会推送当前所有的见证人等的对象信息,然后本地缓存对象ID和投票ID的对应关系(是否是节点推送还是前端获取,不确定)
        // 通过getObjectByVoteID查询时,如果投票ID不存在,则会一直等到超时,然后报错,现在改成通过Apis查询
        Promise.all([
            Apis.instance()
                .db_api()
                .exec("lookup_vote_ids", [vote_ids]), //FetchChainObjects(ChainStore.getObjectByVoteID, vote_ids, 5000),
            Apis.instance()
                .db_api()
                .exec("lookup_vote_ids", [proxy_vote_ids]), // proxyPromise,
            budgetPromise
        ]).then(res => {
            const [vote_objs, proxy_vote_objs, budget_objs] = res;
            //如果budget_objs为null,说明网址的用户不是预算委员会成员
            if (budget_objs) {
                can_vote_worker = true;
                budget_member_account_id = budget_objs.get("id");
                budgetVotes = budget_objs.get("votes");
                budget_member_url = budget_objs.get("url");
            }
            let budget_vote_ids = budgetVotes.toArray();
            let budget_vids = Immutable.Set(budget_vote_ids);
            function sortVoteObjects(objects) {
                let witnesses = new Immutable.List();
                let committee = new Immutable.List();
                let budget = new Immutable.List();
                let workers = new Immutable.Set();
                objects.forEach(obj => {
                    if (obj) {
                        let account_id = obj["committee_member_account"];
                        if (account_id) {
                            committee = committee.push(account_id);
                        } else if ((account_id = obj["worker_account"])) {
                            // console.log( "worker: ", obj );
                            //     workers = workers.add(obj.get("id"));
                        } else if ((account_id = obj["witness_account"])) {
                            witnesses = witnesses.push(account_id);
                        } else if (
                            (account_id = obj["budget_member_account"])
                        ) {
                            budget = budget.push(account_id);
                        }
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
                // current_proxy_input,
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
                budget_vote_ids: budget_vids, //当前用户(预算委员会)的投票ID列表
                proxy_budget_vote_ids: budget_vids,
                budget_member_account_id: budget_member_account_id,
                budget_member_url: budget_member_url,
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

    isWorkerChanged(s = this.state) {
        return !Immutable.is(s.budget_vote_ids, s.proxy_budget_vote_ids);
    }

    _getVoteObjects(type = "witnesses", vote_ids, call_num) {
        const voteObjects = {
            witnesses: {
                type: 6,
                account: "witness_account",
                active: "active_witnesses",
                all: "all_witnesses"
            },
            committee: {
                type: 5,
                account: "committee_member_account",
                active: "active_committee_members",
                all: "all_committee"
            },
            budget: {
                type: 22,
                account: "budget_member_account",
                active: "active_budget_members",
                all: "all_budget"
            }
        };
        let current = this.state[`all_${type}`];
        const isWitness = type === "witnesses";
        let lastIdx;
        if (!vote_ids) {
            vote_ids = [];
            let active = this.props.globalObject.get(voteObjects[type].active);
            const lastActive = active.last() || `1.${voteObjects[type].type}.1`;
            lastIdx = parseInt(lastActive.split(".")[2], 10);
            lastIdx = 0;
            for (var i = 0; i <= lastIdx + 10; i++) {
                vote_ids.push(`1.${voteObjects[type].type}.${i}`);
            }
            lastIdx = lastIdx + 11;
        } else {
            lastIdx =
                parseInt(vote_ids[vote_ids.length - 1].split(".")[2], 10) + 1;
        }
        FetchChainObjects(ChainStore.getObject, vote_ids, 5000, {}).then(
            vote_objs => {
                this.state[`all_${type}`] = current.concat(
                    Immutable.List(
                        vote_objs
                            .filter(a => !!a)
                            .map(a => a.get(voteObjects[type].account))
                    )
                );
                if (!!vote_objs[vote_objs.length - 1]) {
                    // there are more valid vote objs, fetch more
                    vote_ids = [];
                    for (var i = lastIdx; i <= lastIdx + 20; i++) {
                        vote_ids.push(`1.${voteObjects[type].type}.${i}`);
                    }
                    return this._getVoteObjects(type, vote_ids);
                } else {
                    if (!call_num) {
                        call_num = 0;
                    }

                    if (call_num > 5) {
                        return;
                    }
                    vote_ids = [];
                    for (var i = lastIdx; i <= lastIdx + 20; i++) {
                        vote_ids.push(`1.${voteObjects[type].type}.${i}`);
                    }
                    return this._getVoteObjects(type, vote_ids, call_num + 1);
                }
                this.forceUpdate();
            }
        );
    }

    // _getVoteObjects(type = "witnesses", vote_ids) {
    //     const voteObjects = {
    //         witnesses: {
    //             type: 6,
    //             acount: "witness_account",
    //             active: "active_witnesses",
    //             all: "all_witnesses"
    //         },
    //         committee_members: {
    //             type: 5,
    //             acount: "committee_member_account",
    //             active: "active_committee_members",
    //             all: "all_committee"
    //         },
    //         budget_members: {
    //             type: 22,
    //             acount: "budget_member_account",
    //             active: "active_budget_members",
    //             all: "all_budget"
    //         }
    //     };
    //     let current = this.state[voteObjects[type].all];
    //     let lastIdx;
    //     if (!vote_ids) {
    //         vote_ids = [];
    //         let active = this.props.globalObject.get(voteObjects[type].active);
    //         const lastActive = active.last() || `1.${voteObjects[type].type}.1`;
    //         lastIdx = parseInt(lastActive.split(".")[2], 10);
    //         for (var i = 1; i <= lastIdx + 10; i++) {
    //             vote_ids.push(`1.${voteObjects[type].type}.${i}`);
    //         }
    //     } else {
    //         lastIdx = parseInt(vote_ids[vote_ids.length - 1].split(".")[2], 10);
    //     }
    //     FetchChainObjects(ChainStore.getObject, vote_ids, 5000, {}).then(
    //         vote_objs => {
    //             console.log(voteObjects[type].all, vote_objs)
    //             this.state[voteObjects[type].all] = current.concat(
    //                 Immutable.List(
    //                     vote_objs
    //                         .filter(a => !!a)
    //                         .map(a =>
    //                             a.get(
    //                                 voteObjects[type].account
    //                             )
    //                         )
    //                 )
    //             );
    //             if (!!vote_objs[vote_objs.length - 1]) {
    //                 // there are more valid vote objs, fetch more
    //                 vote_ids = [];
    //                 for (var i = lastIdx + 11; i <= lastIdx + 20; i++) {
    //                     vote_ids.push(`1.${voteObjects[type].type}.${i}`);
    //                 }
    //                 return this._getVoteObjects(type, vote_ids);
    //             }
    //             this.forceUpdate();
    //         }
    //     );
    // }

    onPublish() {
        let updated_account = this.props.account.toJS();
        let updateObject = {account: updated_account.id};
        let new_options = {memo_key: updated_account.options.memo_key};
        // updated_account.new_options = updated_account.options;
        let new_proxy_id = this.state.proxy_account_id;
        new_options.voting_account = new_proxy_id ? new_proxy_id : "1.2.5";
        new_options.num_witness = this.state.witnesses.size;
        new_options.num_committee = this.state.committee.size;
        new_options.num_budget = this.state.budget.size;

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

    onWorkerPublish() {
        let updated_account = this.props.account.toJS();
        let updateObject = {budget_member_account: updated_account.id};
        updateObject.budget_member = this.state.budget_member_account_id;
        // updateObject.new_url = this.state.budget_member_url
        let {budget_vote_ids} = this.state;
        let {_workers, _newWorkers, voteThreshold} = this._getWorkerArray();
        let now = new Date();

        function removeVote(list, vote) {
            if (list.includes(vote)) {
                list = list.delete(vote);
            }
            return list;
        }

        _workers.forEach(worker => {
            if (worker) {
                if (new Date(worker.get("work_end_date")) <= now) {
                    budget_vote_ids = removeVote(
                        budget_vote_ids,
                        worker.get("vote_for")
                    );
                }
            }
        });
        updateObject.votes = budget_vote_ids
            .filter(id => {
                return id.split(":")[0] === "2";
            })
            .toArray()
            .sort((a, b) => {
                let a_split = a.split(":");
                let b_split = b.split(":");

                return parseInt(a_split[1], 10) - parseInt(b_split[1], 10);
            });
        ApplicationApi.budget_member_update(updateObject);
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

    onWorkerReset() {
        let s = this.state;
        this.setState(
            {
                workers: s.prev_workers,
                budget_vote_ids: s.proxy_budget_vote_ids
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

    //修改worker投票;
    onChangeWorkerVotes(addVotes, removeVotes) {
        let state = {};
        state.budget_vote_ids = this.state.budget_vote_ids;
        if (addVotes.length) {
            addVotes.forEach(vote => {
                state.budget_vote_ids = state.budget_vote_ids.add(vote);
            });
        }
        if (removeVotes) {
            removeVotes.forEach(vote => {
                state.budget_vote_ids = state.budget_vote_ids.delete(vote);
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

    getBudgetObject() {
        Apis.instance()
            .db_api()
            .exec("get_object_count", ["2.13.0", true])
            .then(res_obj => {
                let newID = "2.13." + (parseInt(res_obj) - 1);
                FetchChainObjects(
                    ChainStore.getObject,
                    [newID],
                    undefined,
                    {}
                ).then(res => {
                    SettingsStore.setLastBudgetObject(newID);
                    this.setState({lastBudgetObject: newID});
                });
            });
    }

    getBudgetObject_old() {
        let {lastBudgetObject} = this.state;
        let budgetObject;
        budgetObject = ChainStore.getObject(lastBudgetObject);
        let idIndex = parseInt(lastBudgetObject.split(".")[2], 10);
        if (budgetObject) {
            let timestamp = budgetObject.get("time");
            if (!/Z$/.test(timestamp)) {
                timestamp += "Z";
            }
            let now = new Date();

            /* Use the last valid budget object to estimate the current budget object id.
            ** Budget objects are created once per hour
            */
            let currentID =
                idIndex +
                Math.floor(
                    (now - new Date(timestamp).getTime()) / 1000 / 60 / 60
                ) -
                1;
            if (idIndex >= currentID) return;
            let newID = "2.13." + Math.max(idIndex, currentID);
            let newIDInt = parseInt(newID.split(".")[2], 10);
            FetchChainObjects(
                ChainStore.getObject,
                [newID],
                undefined,
                {}
            ).then(res => {
                let [lbo] = res;
                if (lbo === null) {
                    // The object does not exist, the id was too high
                    this.setState(
                        {lastBudgetObject: `2.13.${newIDInt - 1}`},
                        this.getBudgetObject()
                    );
                } else {
                    SettingsStore.setLastBudgetObject(newID);

                    this.setState({lastBudgetObject: newID});
                }
            });
        } else {
            // The object does not exist, decrement the ID
            let newID = `2.13.${idIndex - 1}`;
            FetchChainObjects(
                ChainStore.getObject,
                [newID],
                undefined,
                {}
            ).then(res => {
                let [lbo] = res;
                if (lbo === null) {
                    // The object does not exist, the id was too high
                    this.setState(
                        {lastBudgetObject: `2.13.${idIndex - 2}`},
                        this.getBudgetObject()
                    );
                } else {
                    SettingsStore.setLastBudgetObject(newID);
                    this.setState({lastBudgetObject: newID});
                }
            });
        }
    }

    _getWorkerArray_old() {
        let workerArray = [];

        ChainStore.workers.forEach(workerId => {
            let worker = ChainStore.getObject(workerId, false, false);
            if (worker) workerArray.push(worker);
        });

        let now = new Date();
        let voteThreshold = 0;

        let _workers = workerArray
            .filter(a => {
                if (!a) {
                    return false;
                }

                return (
                    new Date(a.get("work_end_date") + "Z") > now &&
                    new Date(a.get("work_begin_date") + "Z") <= now
                );
            })
            .sort((a, b) => {
                return this._getTotalVotes(b) - this._getTotalVotes(a);
            });

        let _newWorkers = workerArray
            .filter(a => {
                if (!a) {
                    return false;
                }

                let votes =
                    a.get("total_votes_for") - a.get("total_votes_against");
                return (
                    (new Date(a.get("work_end_date") + "Z") > now &&
                        votes < voteThreshold) ||
                    new Date(a.get("work_begin_date") + "Z") > now
                );
            })
            .sort((a, b) => {
                return this._getTotalVotes(b) - this._getTotalVotes(a);
            });

        return {_workers, _newWorkers, voteThreshold};

        // return workerArray;
    }

    _getWorkerArray() {
        let {globalObject} = this.props;
        let globalObjectData = globalObject.toJS();
        let workerArray = [];

        ChainStore.workers.forEach(workerId => {
            let worker = ChainStore.getObject(workerId, false, false);
            if (worker) workerArray.push(worker);
        });

        let now = new Date();
        let active_budget_members_length = globalObjectData.active_budget_members
            ? globalObjectData.active_budget_members.length
            : 0;

        //获取预算的条件: 时间符合  && 同意-反对>总共人数/3  && 同意>总数/2
        // let voteThreshold = ~~(active_budget_members_length / 3);
        // let halfVotes = ~~(active_budget_members_length / 2 + 0.5);

        let voteThreshold = parseFloat(
            active_budget_members_length / 3 + 0.5
        ).toFixed(0);
        let halfVotes = parseFloat(
            active_budget_members_length / 2 + 0.5
        ).toFixed(0);

        let _workers = workerArray
            .filter(a => {
                if (!a) {
                    return false;
                }

                let agreeVotes = a.get("total_votes_for");
                let againstVotes = a.get("total_votes_against");
                let votes = agreeVotes - againstVotes;
                return (
                    new Date(a.get("work_end_date") + "Z") > now &&
                    new Date(a.get("work_begin_date") + "Z") <= now &&
                    (agreeVotes >= halfVotes && votes >= voteThreshold)
                );
            })
            .sort((a, b) => {
                return this._getTotalVotes(b) - this._getTotalVotes(a);
            });

        let _newWorkers = workerArray
            .filter(a => {
                if (!a) {
                    return false;
                }

                let agreeVotes = a.get("total_votes_for");
                let againstVotes = a.get("total_votes_against");
                let votes = agreeVotes - againstVotes;

                return (
                    new Date(a.get("work_begin_date") + "Z") > now ||
                    (new Date(a.get("work_begin_date") + "Z") <= now &&
                        new Date(a.get("work_end_date") + "Z") > now &&
                        (agreeVotes < halfVotes || votes < voteThreshold))
                );
            })
            .sort((a, b) => {
                return this._getTotalVotes(b) - this._getTotalVotes(a);
            });

        return {_workers, _newWorkers, voteThreshold, halfVotes};
        // return workerArray;
    }

    _setWorkerTableIndex(index) {
        this.setState({
            workerTableIndex: index
        });
    }

    render() {
        let {workerTableIndex, blockSummary} = this.state;
        let preferredUnit = this.props.settings.get("unit") || "1.3.0";
        let hasProxy = !!this.state.proxy_account_id; // this.props.account.getIn(["options", "voting_account"]) !== "1.2.5";
        let publish_buttons_class = cnames("button", {
            disabled: !this.isChanged()
        });
        let publish_work_buttons_class = cnames("button", {
            disabled: !this.isWorkerChanged()
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

        let maintenance_interval = globalObject
            ? parseInt(
                  globalObject.getIn(["parameters", "maintenance_interval"]),
                  10
              )
            : 300;

        if (budgetObject) {
            // workerBudget = Math.min(
            //     24 * budgetObject.getIn(["record", "worker_budget"]),
            //     workerBudget
            // );
            // totalBudget = Math.min(
            //     24 * budgetObject.getIn(["record", "worker_budget"]),
            //     workerBudget
            // );
            workerBudget = budgetObject.getIn(["record", "worker_budget"]);
            totalBudget = budgetObject.getIn(["record", "worker_budget"]);
        }

        let now = new Date();
        let {
            _workers,
            _newWorkers,
            voteThreshold,
            halfVotes
        } = this._getWorkerArray();

        // let voteThreshold = 0;
        //活跃的预算项目
        let workers = [..._workers]
            .slice(0, 50)
            .map((worker, index) => {
                let dailyPay = parseInt(worker.get("daily_pay"), 10);
                workerBudget = workerBudget - dailyPay;
                let votes =
                    worker.get("total_votes_for") -
                    worker.get("total_votes_against");
                if (workerBudget <= 0 && !voteThreshold) {
                    voteThreshold = votes;
                }

                // if (voteThreshold && votes < voteThreshold) return null;

                return (
                    <WorkerApproval
                        preferredUnit={preferredUnit}
                        rest={workerBudget + dailyPay}
                        rank={index + 1}
                        key={worker.get("id")}
                        worker={worker.get("id")}
                        vote_ids={this.state["budget_vote_ids"]}
                        onChangeVotes={this.onChangeWorkerVotes.bind(this)}
                        proxy={false}
                        voteThreshold={voteThreshold}
                        halfVotes={halfVotes}
                        can_vote_worker={this.state["can_vote_worker"]}
                        maintenance_interval={maintenance_interval}
                    />
                );
            })
            .filter(a => !!a);

        // unusedBudget = Math.max(0, workerBudget);

        // 提案预算项目
        let newWorkers = [..._newWorkers].slice(0, 50).map((worker, index) => {
            return (
                <WorkerApproval
                    preferredUnit={preferredUnit}
                    rest={0}
                    rank={index + 1}
                    key={worker.get("id")}
                    worker={worker.get("id")}
                    vote_ids={this.state["budget_vote_ids"]}
                    onChangeVotes={this.onChangeWorkerVotes.bind(this)}
                    proxy={false}
                    voteThreshold={voteThreshold}
                    halfVotes={halfVotes}
                    can_vote_worker={this.state["can_vote_worker"]}
                    maintenance_interval={maintenance_interval}
                />
            );
        });

        // 过期预算项目
        let expiredWorkers = this.state.worker_history
            .filter(a => {
                if (!a) {
                    return false;
                }

                //return new Date(a["work_end_date"]) <= now;
                return true;
            })
            // .sort((a, b) => {
            //     return this._getTotalVotes(b) - this._getTotalVotes(a);
            // })
            .map((worker, index) => {
                return (
                    <WorkerApproval
                        preferredUnit={preferredUnit}
                        rest={0}
                        rank={index + 1}
                        key={worker["id"]}
                        workerExpired={worker["id"]}
                        vote_ids={this.state["budget_vote_ids"]}
                        onChangeVotes={this.onChangeWorkerVotes.bind(this)}
                        proxy={false}
                        voteThreshold={voteThreshold}
                        can_vote_worker={this.state["can_vote_worker"]}
                    />
                );
            });

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

        let actionWorkerButtons = (
            <span>
                <button
                    className={cnames(publish_work_buttons_class, {
                        success: this.isWorkerChanged()
                    })}
                    onClick={this.onWorkerPublish}
                    tabIndex={4}
                >
                    <Translate content="account.votes.publish" />
                </button>
                <button
                    className={"button " + publish_work_buttons_class}
                    onClick={this.onWorkerReset}
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

        const showExpired = workerTableIndex === 2;

        const saveText = (
            <div
                className="inline-block"
                style={{
                    float: "right",
                    visibility: this.isChanged() ? "visible" : "hidden",
                    color: "red",
                    padding: "0.85rem",
                    fontSize: "0.9rem"
                }}
            >
                <Translate content="account.votes.save_finish" />
            </div>
        );

        return (
            <div className="grid-content app-tables no-padding" ref="appTables">
                <div className="content-block small-12">
                    <div className="tabs-container generic-bordered-box zos-fixed-tabs">
                        <Tabs
                            setting="votingTab"
                            className="account-tabs"
                            defaultActiveTab={1}
                            segmented={false}
                            actionButtons={null /*saveText*/}
                            tabsClass="account-overview no-padding bordered-header content-block"
                        >
                            <Tab title="explorer.witnesses.title">
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
                            </Tab>

                            <Tab title="explorer.committee_members.title">
                                <div
                                    style={{height: 10, background: "#f9fbfe"}}
                                />
                                <div
                                    className={
                                        (cnames("content-block"), "zos-card-bg")
                                    }
                                >
                                    <div className="header-selector">
                                        {/* <Link to="/help/voting/committee"><Icon name="question-circle" /></Link> */}
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
                                        type="committee"
                                        label="account.votes.add_committee_label"
                                        items={this.state.all_committee}
                                        validateAccount={this.validateAccount.bind(
                                            this,
                                            "committee"
                                        )}
                                        onAddItem={this.onAddItem.bind(
                                            this,
                                            "committee"
                                        )}
                                        onRemoveItem={this.onRemoveItem.bind(
                                            this,
                                            "committee"
                                        )}
                                        tabIndex={hasProxy ? -1 : 3}
                                        supported={
                                            this.state[
                                                hasProxy
                                                    ? "proxy_committee"
                                                    : "committee"
                                            ]
                                        }
                                        withSelector={false}
                                        active={globalObject.get(
                                            "active_committee_members"
                                        )}
                                        proxy={this.state.proxy_account_id}
                                    />
                                </div>
                            </Tab>

                            <Tab title="explorer.budget_members.title">
                                <div
                                    style={{height: 10, background: "#f9fbfe"}}
                                />
                                <div
                                    className={
                                        (cnames("content-block"), "zos-card-bg")
                                    }
                                >
                                    <div className="header-selector">
                                        {/* <Link to="/help/voting/budget"><Icon name="question-circle" /></Link> */}
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
                                        type="budget"
                                        label="account.votes.add_budget_label"
                                        items={this.state.all_budget}
                                        validateAccount={this.validateAccount.bind(
                                            this,
                                            "budget"
                                        )}
                                        onAddItem={this.onAddItem.bind(
                                            this,
                                            "budget"
                                        )}
                                        onRemoveItem={this.onRemoveItem.bind(
                                            this,
                                            "budget"
                                        )}
                                        tabIndex={hasProxy ? -1 : 3}
                                        supported={
                                            this.state[
                                                hasProxy
                                                    ? "proxy_budget"
                                                    : "budget"
                                            ]
                                        }
                                        withSelector={false}
                                        active={globalObject.get(
                                            "active_budget_members"
                                        )}
                                        proxy={this.state.proxy_account_id}
                                    />
                                </div>
                            </Tab>

                            <Tab title="account.votes.workers_short">
                                <div
                                    style={{height: 10, background: "#f9fbfe"}}
                                />
                                <div className="zos-card-bg">
                                    <div
                                        className="service-selector"
                                        style={{
                                            position: "relative"
                                        }}
                                    >
                                        <ul className="button-group no-margin account-overview bordered-header content-block">
                                            <li
                                                className={
                                                    workerTableIndex == 0
                                                        ? "is-active"
                                                        : null
                                                }
                                                onClick={this._setWorkerTableIndex.bind(
                                                    this,
                                                    0
                                                )}
                                            >
                                                <a>
                                                    {counterpart.translate(
                                                        "account.votes.new",
                                                        {
                                                            count:
                                                                newWorkers.length
                                                        }
                                                    )}
                                                </a>
                                            </li>
                                            <li
                                                className={
                                                    workerTableIndex == 1
                                                        ? "is-active"
                                                        : null
                                                }
                                                onClick={this._setWorkerTableIndex.bind(
                                                    this,
                                                    1
                                                )}
                                            >
                                                <a>
                                                    {counterpart.translate(
                                                        "account.votes.active",
                                                        {count: workers.length}
                                                    )}
                                                </a>
                                            </li>
                                            <li
                                                className={
                                                    showExpired
                                                        ? "is-active"
                                                        : null
                                                }
                                                onClick={
                                                    !showExpired
                                                        ? this._setWorkerTableIndex.bind(
                                                              this,
                                                              2
                                                          )
                                                        : () => {}
                                                }
                                            >
                                                <a>
                                                    {counterpart.translate(
                                                        "account.votes.expired_num",
                                                        {
                                                            count:
                                                                expiredWorkers.length
                                                        }
                                                    )}
                                                </a>
                                            </li>
                                        </ul>

                                        <div
                                            style={{
                                                position: "absolute",
                                                right: 15,
                                                top: "50%",
                                                marginTop: -19
                                            }}
                                        >
                                            {!this.state
                                                .can_vote_worker ? null : (
                                                <div
                                                    style={{
                                                        display: "inline-block"
                                                    }}
                                                >
                                                    {actionWorkerButtons}
                                                </div>
                                            )}

                                            <Link to="/create-worker">
                                                <div className="button">
                                                    <Translate content="account.votes.create_worker" />
                                                </div>
                                            </Link>
                                        </div>
                                    </div>

                                    {/* {showExpired ? null : (
                                    <div style={{paddingTop: 10, paddingBottom: 20}}>
                                        <table>
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        <Translate content="account.votes.total_budget" />:</td>
                                                    <td style={{paddingLeft: 20, textAlign: "right"}}>
                                                        &nbsp;{globalObject ? <FormattedAsset amount={totalBudget} asset="1.3.0" decimalOffset={5}/> : null}
                                                        <span>&nbsp;({globalObject ? <EquivalentValueComponent fromAsset="1.3.0" toAsset={preferredUnit} amount={totalBudget}/> : null})</span>
                                                    </td></tr>
                                                <tr>
                                                    <td><Translate content="account.votes.unused_budget" />:</td>
                                                    <td style={{paddingLeft: 20, textAlign: "right"}}> {globalObject ? <FormattedAsset amount={unusedBudget} asset="1.3.0" decimalOffset={5}/> : null}</td></tr>
                                            </tbody>
                                        </table>
                                    </div>)} */}

                                    {/* <table className="table dashboard-table table-hover"> */}
                                    <table className="table">
                                        {workerTableIndex ===
                                        2 ? null : workerTableIndex === 0 ? (
                                            <thead>
                                                <tr>
                                                    <th
                                                        style={{
                                                            backgroundColor:
                                                                "#f9fbfe"
                                                        }}
                                                    />
                                                    <th
                                                        colSpan="3"
                                                        style={{
                                                            textAlign: "left",
                                                            backgroundColor:
                                                                "#f9fbfe"
                                                        }}
                                                    >
                                                        <Translate content="account.votes.threshold" />
                                                    </th>
                                                    <th
                                                        style={{
                                                            backgroundColor:
                                                                "#f9fbfe"
                                                        }}
                                                    />
                                                    <th
                                                        colSpan="3"
                                                        style={{
                                                            textAlign: "right",
                                                            backgroundColor:
                                                                "#f9fbfe"
                                                        }}
                                                    >
                                                        {counterpart.translate(
                                                            "account.votes.votes_workers_1"
                                                        )}
                                                        {halfVotes}
                                                        {counterpart.translate(
                                                            "account.votes.votes_workers_2"
                                                        )}
                                                        {voteThreshold}
                                                    </th>
                                                    <th
                                                        style={{
                                                            backgroundColor:
                                                                "#f9fbfe"
                                                        }}
                                                    />
                                                </tr>
                                            </thead>
                                        ) : (
                                            <thead>
                                                <tr>
                                                    <th
                                                        style={{
                                                            backgroundColor:
                                                                "#f9fbfe"
                                                        }}
                                                    />
                                                    <th
                                                        colSpan="4"
                                                        style={{
                                                            textAlign: "left",
                                                            backgroundColor:
                                                                "#f9fbfe"
                                                        }}
                                                    >
                                                        <Translate content="account.votes.total_worker_income" />{" "}
                                                        (
                                                        <AssetName
                                                            name={preferredUnit}
                                                        />
                                                        ):
                                                        {blockSummary ? (
                                                            <EquivalentValueComponent
                                                                // hide_asset
                                                                fromAsset="1.3.0"
                                                                toAsset={
                                                                    preferredUnit
                                                                }
                                                                amount={
                                                                    blockSummary[
                                                                        "worker-payed"
                                                                    ]
                                                                }
                                                            />
                                                        ) : null}
                                                    </th>
                                                    <th
                                                        colSpan="5"
                                                        style={{
                                                            textAlign: "left",
                                                            backgroundColor:
                                                                "#f9fbfe"
                                                        }}
                                                    >
                                                        <Translate content="account.votes.total_last_income" />{" "}
                                                        (
                                                        <AssetName
                                                            name={preferredUnit}
                                                        />
                                                        ):
                                                        {globalObject ? (
                                                            <EquivalentValueComponent
                                                                // hide_asset
                                                                fromAsset="1.3.0"
                                                                toAsset={
                                                                    preferredUnit
                                                                }
                                                                amount={
                                                                    totalBudget
                                                                }
                                                            />
                                                        ) : null}
                                                    </th>
                                                    <th
                                                        style={{
                                                            backgroundColor:
                                                                "#f9fbfe"
                                                        }}
                                                    />
                                                    <th
                                                        style={{
                                                            backgroundColor:
                                                                "#f9fbfe"
                                                        }}
                                                    />
                                                </tr>
                                            </thead>
                                        )}
                                        <thead>
                                            <tr>
                                                {workerTableIndex ===
                                                2 ? null : (
                                                    <th
                                                        style={{
                                                            textAlign: "right"
                                                        }}
                                                    >
                                                        {/* <Translate content="account.votes.line" /> */}
                                                    </th>
                                                )}
                                                <th>
                                                    <Translate content="account.user_issued_assets.id" />
                                                </th>
                                                <th>
                                                    <Translate content="account.user_issued_assets.description" />
                                                </th>
                                                <th>
                                                    <Translate content="explorer.workers.period" />
                                                </th>

                                                <th>
                                                    <Translate content="explorer.workers.worker_initializer.title" />
                                                </th>

                                                <th
                                                    style={{textAlign: "right"}}
                                                >
                                                    <Translate content="account.votes.daily_pay" />
                                                    <div
                                                        style={{
                                                            paddingTop: 5,
                                                            fontSize: "0.8rem"
                                                        }}
                                                    >
                                                        (
                                                        <AssetName
                                                            name={preferredUnit}
                                                        />
                                                        )
                                                    </div>
                                                </th>

                                                <th
                                                    style={{textAlign: "right"}}
                                                >
                                                    <Translate content="explorer.workers.need_pay" />
                                                    <div
                                                        style={{
                                                            paddingTop: 5,
                                                            fontSize: "0.8rem"
                                                        }}
                                                    >
                                                        (
                                                        <AssetName
                                                            name={preferredUnit}
                                                        />
                                                        )
                                                    </div>
                                                </th>

                                                {workerTableIndex ===
                                                0 ? null : (
                                                    <th
                                                        style={{
                                                            textAlign: "right"
                                                        }}
                                                    >
                                                        <Translate content="explorer.workers.total_pay" />
                                                        <div
                                                            style={{
                                                                paddingTop: 5,
                                                                fontSize:
                                                                    "0.8rem"
                                                            }}
                                                        >
                                                            (
                                                            <AssetName
                                                                name={
                                                                    preferredUnit
                                                                }
                                                            />
                                                            )
                                                        </div>
                                                    </th>
                                                )}

                                                {/*删掉所需票数*/
                                                /*workerTableIndex === 0 ? (
                                                 <th
                                                 style={{textAlign: "right"}}
                                                 >
                                                 <Translate content="account.votes.missing" />
                                                 </th>
                                                 ) : null*/}
                                                {workerTableIndex === 2 ||
                                                workerTableIndex ===
                                                    0 ? null : (
                                                    <th
                                                        style={{
                                                            textAlign: "right"
                                                        }}
                                                    >
                                                        <Translate content="account.votes.funding" />
                                                    </th>
                                                )}

                                                {workerTableIndex === 2 ||
                                                workerTableIndex ===
                                                    0 ? null : (
                                                    <th
                                                        style={{
                                                            textAlign: "right"
                                                        }}
                                                    >
                                                        <Translate content="explorer.workers.last_pay" />
                                                        <div
                                                            style={{
                                                                paddingTop: 5,
                                                                fontSize:
                                                                    "0.8rem"
                                                            }}
                                                        >
                                                            (
                                                            <AssetName
                                                                name={
                                                                    preferredUnit
                                                                }
                                                            />
                                                            )
                                                        </div>
                                                    </th>
                                                )}

                                                {/*workerTableIndex === 2 ||
                                             workerTableIndex ===
                                             0 ? null : (
                                             <th
                                             style={{
                                             textAlign: "right"
                                             }}
                                             >
                                             <Translate content="explorer.witnesses.budget" />
                                             <div
                                             style={{
                                             paddingTop: 5,
                                             fontSize:
                                             "0.8rem"
                                             }}
                                             >
                                             (<AssetName
                                             name={
                                             preferredUnit
                                             }
                                             />)
                                             </div>
                                             </th>
                                             )*/}
                                                <th
                                                    style={{textAlign: "right"}}
                                                >
                                                    <Translate content="account.votes.agree_against" />
                                                </th>
                                                {workerTableIndex === 2 ||
                                                !this.state
                                                    .can_vote_worker ? null : (
                                                    <th>
                                                        <Translate content="account.votes.toggle" />
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {workerTableIndex === 0
                                                ? newWorkers
                                                : workerTableIndex === 1
                                                    ? workers
                                                    : expiredWorkers}
                                        </tbody>
                                    </table>
                                </div>
                            </Tab>
                        </Tabs>
                    </div>
                </div>
            </div>
        );
    }
}
AccountVoting = BindToChainState(AccountVoting);

const BudgetObjectWrapper = props => {
    return (
        <AccountVoting
            {...props}
            initialBudget={SettingsStore.getLastBudgetObject()}
        />
    );
};

export default BudgetObjectWrapper;

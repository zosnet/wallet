/**
 * Created by cuiyujie on 2018/10/8.
 */
import BaseStore from "./BaseStore";
import alt from "alt-instance";
import AccountVotingActions from "actions/AccountVotingActions";

class AccountVotingStore extends BaseStore {
    constructor() {
        super();

        this.bindListeners({
            onAddItem: AccountVotingActions.addItem,
            onRemoveItem: AccountVotingActions.removeItem
            // onAddBudgets: AccountVotingActions.addBudgets,
            // onRemoveBudgets: AccountVotingActions.removeBudgets,
            // onAddCommittees: AccountVotingActions.addCommittees,
            // onRemoveCommittees: AccountVotingActions.removeCommittees,
            // onAddWitnesses: AccountVotingActions.addWitnesses,
            // onRemoveWitnesses: AccountVotingActions.removeWitnesses,
            // onAddWorkers: AccountVotingActions.addWorkers,
            // onRemoveWorkers: AccountVotingActions.removeWorkers,
            // onAddProxy: AccountVotingActions.addProxy,
            // onRemoveProxy: AccountVotingActions.removeProxy,
        });

        this._export(
            "getBudgetsSize",
            "getCommitteesSize",
            "getWitnessesSize",
            "getWorkersSize"
        );

        const referralAccount = this._checkReferrer();
        this.state = {
            witnesses: Immutable.Set(),
            committee: Immutable.Set(),
            budget: Immutable.Set(),
            workers: Immutable.Set(),
            proxy_account_id: "", //代理人
            prev_proxy_account_id: "", //之前代理人
            current_proxy_input: "", //当前输入的代理人名字
            proxy_witnesses: Immutable.Set(), //代理人投的witnesses
            proxy_committee: Immutable.Set(), //代理人投的committee
            proxy_budget: Immutable.Set(), //代理人投的budget
            proxy_workers: Immutable.Set(), //代理人投的workers
            vote_ids: Immutable.Set(),
            proxy_vote_ids: Immutable.Set(),
            prev_witnesses: Immutable.Set(),
            prev_committee: Immutable.Set(),
            prev_budget: Immutable.Set(),
            prev_workers: Immutable.Set(),
            prev_vote_ids: Immutable.Set()
        };
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

    setPrev_proxy_account_id(proxyId) {
        this.setState({prev_proxy_account_id: proxyId});
    }

    setAccountInfo(
        proxy_account_id,
        current_proxy_input,
        witnesses,
        committee,
        budget,
        workers,
        proxy_witnesses,
        proxy_committee,
        proxy_budget,
        proxy_workers,
        vids,
        proxy_vids,
        can_vote_worker
    ) {
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
    }

    setReset() {
        let s = this.state;
        this.setState({
            proxy_account_id: s.prev_proxy_account_id,
            current_proxy_input: s.prev_proxy_input,
            witnesses: s.prev_witnesses,
            committee: s.prev_committee,
            budget: s.prev_budget,
            // workers: s.prev_workers,
            vote_ids: s.prev_vote_ids
        });
    }

    setProxyInit() {
        this.setState({
            proxy_account_id: "",
            proxy_witnesses: Immutable.Set(),
            proxy_committee: Immutable.Set(),
            proxy_budget: Immutable.Set(),
            proxy_workers: Immutable.Set()
        });
    }

    setProxyChange(current_proxy_input) {
        this.setState({current_proxy_input});
    }

    setProxyAccountFound(proxy_account) {
        this.setState({
            proxy_account_id: proxy_account ? proxy_account.get("id") : ""
        });
    }

    setClearProxy() {
        this.setState({
            proxy_account_id: ""
        });
    }
}

export default alt.createStore(AccountVotingStore, "AccountVotingStore");

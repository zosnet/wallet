import Immutable from "immutable";
import alt from "alt-instance";
import SearchProposalActions from "actions/SearchProposalActions";

class SearchProposalStore {
    constructor() {
        this.proposal = null;
        this.bindListeners({
            onGetProposal: SearchProposalActions.getProposal
        });
    }
    onGetProposal(proposal) {
        this.proposal = proposal;
    }
}

export default alt.createStore(SearchProposalStore, "SearchProposalStore");

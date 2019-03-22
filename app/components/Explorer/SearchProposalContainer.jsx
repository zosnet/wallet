import React from "react";
import SearchProposalStore from "stores/SearchProposalStore";
import AltContainer from "alt-container";
import SearchProposal from "./SearchProposal";

class SearchProposalContainer extends React.Component {
    render() {
        let proposal_id = this.props.params.pid;

        return (
            <AltContainer
                stores={[SearchProposalStore]}
                inject={{
                    proposal: () => {
                        return SearchProposalStore.getState().proposal;
                    }
                }}
            >
                <SearchProposal {...this.props} proposal_id={proposal_id} />
            </AltContainer>
        );
    }
}

export default SearchProposalContainer;

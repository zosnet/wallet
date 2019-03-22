import React from "react";
import AltContainer from "alt-container";
import Business from "./Business";
import Bitlender from "./Bitlender";
import BitlenderCommittee from "./BitlenderCommittee";

class BusinessBitlenderContainer extends React.Component {
    render() {
        let defContent = <BitlenderStatistics />;
        let content = (
            <Bitlender tab="bitlender_statistics" content={defContent} />
        );

        return <Business tab="bitlender" content={content} />;
    }
}

export default BusinessBitlenderContainer;

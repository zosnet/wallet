import React from "react";
import AltContainer from "alt-container";
import Exchange from "./Exchange";
import Business from "./Business";

class BusinessExchangeContainer extends React.Component {
    render() {
        let content = <Exchange />;

        return <Business tab="exchange" content={content} />;
    }
}

export default BusinessExchangeContainer;

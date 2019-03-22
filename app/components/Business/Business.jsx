import React from "react";

import {Tabs, Tab} from "../Utility/Tabs";

class Business extends React.Component {
    static propTypes = {
        tab: React.PropTypes.string,
        content: React.PropTypes.object
    };

    static defaultProps = {
        tab: "bitlender",
        content: null
    };

    constructor(props) {
        super(props);

        this.state = {
            tabs: [
                {
                    name: "bitlender",
                    link: "/business/bitlender",
                    translate: "business.bitlender.title"
                },
                {
                    name: "exchange",
                    link: "/business/exchange",
                    translate: "business.exchange.title"
                }
            ]
        };
    }

    render() {
        let defaultActiveTab = this.state.tabs.findIndex(
            t => t.name === this.props.tab
        );

        let tabs = [];

        for (var i = 0; i < this.state.tabs.length; i++) {
            let currentTab = this.state.tabs[i];

            let tabContent = defaultActiveTab == i ? this.props.content : null;
            let isLinkTo = defaultActiveTab == i ? "" : currentTab.link;

            tabs.push(
                <Tab key={i} title={currentTab.translate} isLinkTo={isLinkTo}>
                    {tabContent}
                </Tab>
            );
        }

        return (
            <div className="zos-fixed-tabs">
                <Tabs
                    defaultActiveTab={defaultActiveTab}
                    segmented={false}
                    setting="businessTab-{this.props.tab}"
                    className="account-tabs"
                    tabsClass="account-overview bordered-header content-block"
                    contentClass="tab-content padding"
                >
                    {tabs}
                </Tabs>
            </div>
        );
    }
}

export default Business;

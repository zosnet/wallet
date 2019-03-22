import React from "react";

import {Tabs, Tab} from "../Utility/Tabs";

class Bitlender extends React.Component {
    static propTypes = {
        tab: React.PropTypes.string,
        content: React.PropTypes.object
    };

    static defaultProps = {
        tab: "bitlender_statistics",
        content: null
    };

    constructor(props) {
        super(props);

        this.state = {
            tabs: [
                {
                    name: "bitlender_statistics",
                    link: "/business/bitlender-statistics",
                    translate: "business.bitlender.statistics"
                },
                {
                    name: "bitlender_committee",
                    link: "/business/bitlender-committee",
                    translate: "business.bitlender.commitee"
                },
                {
                    name: "bitlender_feemode",
                    link: "/business/bitlender-feemodel",
                    translate: "business.feemodel.title"
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
            <div
                ref="outerWrapper"
                className="grid-block vertical"
                style={{
                    paddingTop: 10
                }}
            >
                <Tabs
                    defaultActiveTab={defaultActiveTab}
                    segmented={false}
                    setting="businessBitlenderTab-{this.props.tab}"
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

export default Bitlender;

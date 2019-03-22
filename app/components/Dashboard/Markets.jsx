import React from "react";
import {Apis} from "zosjs-ws";
import {connect} from "alt-react";

import utils from "common/utils";
import SettingsStore from "stores/SettingsStore";
// import SettingsActions from "actions/SettingsActions";
import MarketsStore from "stores/MarketsStore";
import MarketsTable from "./MarketsTable";

class StarredMarkets extends React.Component {
    render() {
        let {starredMarkets} = this.props;
        let markets = [];

        if (starredMarkets.size) {
            for (let market of starredMarkets.values()) {
                markets.push([market.quote, market.base]);
            }
        }

        return <MarketsTable markets={markets} forceDirection={true} />;
    }
}
StarredMarkets = connect(StarredMarkets, {
    listenTo() {
        return [SettingsStore];
    },
    getProps() {
        return {
            starredMarkets: SettingsStore.getState().starredMarkets
        };
    }
});

class FeaturedMarkets extends React.Component {
    constructor() {
        super();

        this.marketsByChain = {
            "6202d610": [
                ["USD", "ZOS"],
                ["USD", "OPEN.BTC"],
                ["USD", "OPEN.USDT"],
                ["USD", "OPEN.ETH"],
                ["USD", "OPEN.DASH"],
                ["USD", "GOLD"],
                ["USD", "HERO"],
                ["USD", "GDEX.BTC"],
                ["USD", "GDEX.ETH"],
                ["USD", "GDEX.EOS"],
                ["USD", "GDEX.BTO"],
                ["CNY", "ZOS"],
                ["CNY", "OPEN.BTC"],
                ["CNY", "USD"],
                ["CNY", "OPEN.ETH"],
                ["CNY", "YOYOW"],
                ["CNY", "OCT"],
                ["CNY", "GDEX.BTC"],
                ["CNY", "GDEX.ETH"],
                ["CNY", "GDEX.EOS"],
                ["CNY", "GDEX.BTO"],
                ["CNY", "GDEX.BTM"],
                ["OPEN.BTC", "ZOS"],
                ["OPEN.BTC", "OPEN.ETH"],
                ["OPEN.BTC", "OPEN.DASH"],
                ["OPEN.BTC", "BLOCKPAY"],
                ["OPEN.BTC", "OPEN.DGD"],
                ["OPEN.BTC", "OPEN.STEEM"],
                ["ZOS", "OPEN.ETH"],
                ["ZOS", "OPEN.EOS"],
                ["ZOS", "PPY"],
                ["ZOS", "OPEN.STEEM"],
                ["ZOS", "OBITS"],
                ["ZOS", "RUBLE"],
                ["ZOS", "HERO"],
                ["ZOS", "OCT"],
                ["ZOS", "SILVER"],
                ["ZOS", "GOLD"],
                ["ZOS", "BLOCKPAY"],
                ["ZOS", "BTWTY"],
                ["ZOS", "SMOKE"],
                ["ZOS", "GDEX.BTC"],
                ["ZOS", "GDEX.ETH"],
                ["ZOS", "GDEX.EOS"],
                ["ZOS", "GDEX.BTO"],
                ["KAPITAL", "OPEN.BTC"],
                ["USD", "OPEN.STEEM"],
                ["USD", "OPEN.MAID"],
                ["OPEN.USDT", "OPEN.BTC"],
                ["OPEN.BTC", "OPEN.MAID"],
                ["ZOS", "OPEN.MAID"],
                ["ZOS", "OPEN.HEAT"],
                ["ZOS", "OPEN.INCENT"],
                ["HEMPSWEET", "OPEN.BTC"],
                ["KAPITAL", "ZOS"],
                ["ZOS", "RUDEX.STEEM"],
                ["USD", "RUDEX.STEEM"],
                ["ZOS", "RUDEX.SBD"],
                ["ZOS", "RUDEX.KRM"],
                ["USD", "RUDEX.KRM"],
                ["RUBLE", "RUDEX.GOLOS"],
                ["CNY", "RUDEX.GOLOS"],
                ["RUBLE", "RUDEX.GBG"],
                ["CNY", "RUDEX.GBG"]
            ],
            "39f5e2ed": [["TEST", "PEG.FAKEUSD"], ["TEST", "BTWTY"]]
        };

        let chainID = Apis.instance().chain_id;
        if (chainID) chainID = chainID.substr(0, 8);

        this.state = {
            chainID,
            markets: []
        };

        this.update = this.update.bind(this);
    }

    shouldComponentUpdate(nextProps) {
        return !utils.are_equal_shallow(nextProps, this.props);
    }

    componentWillMount() {
        this.update();
    }

    componentWillReceiveProps(nextProps) {
        this.update(nextProps);
    }

    update(nextProps = null) {
        let {lowVolumeMarkets} = nextProps || this.props;
        let markets =
            this.marketsByChain[this.state.chainID] ||
            this.marketsByChain["6202d610"];
        markets = markets.filter(pair => {
            let [first, second] = pair;
            let isLowVolume =
                lowVolumeMarkets.get(`${first}_${second}`) ||
                lowVolumeMarkets.get(`${second}_${first}`);
            return !isLowVolume;
        });

        this.setState({markets});
    }

    render() {
        return <MarketsTable markets={this.state.markets} />;
    }
}

FeaturedMarkets = connect(FeaturedMarkets, {
    listenTo() {
        return [MarketsStore];
    },
    getProps() {
        return {
            lowVolumeMarkets: MarketsStore.getState().lowVolumeMarkets
        };
    }
});

class TopMarkets extends React.Component {
    render() {
        return <MarketsTable markets={[]} />;
    }
}

export {StarredMarkets, FeaturedMarkets, TopMarkets};

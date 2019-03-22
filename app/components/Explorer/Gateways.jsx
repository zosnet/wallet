import React from "react";
import Immutable from "immutable";
import AccountImage from "../Account/AccountImage";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import FormattedAsset from "../Utility/FormattedAsset";
import AssetName from "../Utility/AssetName";
import {ChainStore} from "zosjs/es";
import Translate from "react-translate-component";
import {connect} from "alt-react";
import SettingsActions from "actions/SettingsActions";
import SettingsStore from "stores/SettingsStore";
import Explorer from "./Explorer";
import {Apis} from "zosjs-ws";
import LinkToAssetById from "../Utility/LinkToAssetById";
import counterpart from "counterpart";

class GatewayRow extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            assets: {},
            account: null,
            dynamic_info: null
        };
    }

    componentDidMount() {
        this.getGatewayAssets(this.props.gateway);
        this.getGatewayAccount(this.props.gateway);
        this.getGatewayDynamic(this.props.gateway);
    }

    getGatewayAssets(gateway) {
        return Apis.instance()
            .db_api()
            .exec("get_assets", [gateway.allowed_assets])
            .then(gateway_assets => {
                this.setState({assets: gateway_assets});
            });
    }

    getGatewayAccount(gateway) {
        return Apis.instance()
            .db_api()
            .exec("get_accounts", [[gateway.gateway_account]])
            .then(gateway_accounts => {
                this.setState({account: gateway_accounts[0]});
            });
    }

    getGatewayDynamic(gateway) {
        return Apis.instance()
            .db_api()
            .exec("get_objects", [[gateway.dynamic_id]])
            .then(gateway_dynamic => {
                this.setState({dynamic_info: gateway_dynamic});
            });
    }

    render() {
        let {gateway} = this.props;
        let {account, assets, dynamic_info} = this.state;

        let gateway_issue_amounts = [];
        let gateway_issue_assets = [];

        if (
            dynamic_info &&
            dynamic_info[0] &&
            dynamic_info[0].issue_amount &&
            Array.isArray(dynamic_info[0].issue_amount) &&
            dynamic_info[0].issue_amount.length
        ) {
            dynamic_info[0].issue_amount.forEach(asset => {
                gateway_issue_amounts.push(
                    <div key={asset[0]} className="zos-format-asset">
                        <FormattedAsset amount={asset[1]} asset={asset[0]} />
                    </div>
                );
            });
        }

        if (Array.isArray(assets) && assets.length) {
            assets.forEach(asset => {
                gateway_issue_assets.push(
                    <div key={asset.id}>
                        <AssetName name={asset.symbol} />
                    </div>
                );
            });
        }

        let enable_state = "";
        if (gateway.enable === "identity_enable") {
            enable_state = counterpart.translate(
                "explorer.gateways.identity_enable"
            );
        }

        if (gateway.enable === "identity_disable") {
            enable_state = counterpart.translate(
                "explorer.gateways.identity_disable"
            );
        }
        if (gateway.need_auth & 0x00000001) {
            let asset_cash_txt = counterpart.translate(
                "explorer.carriers.asset_cash"
            );
            console.log("asset_cash_txt:", asset_cash_txt);
            enable_state = enable_state.concat("/").concat(asset_cash_txt);
            console.log("asset_cash_txt2:", enable_state);
        }
        if (gateway.need_auth & 0x00000002) {
            let asset_bit_txt = counterpart.translate(
                "explorer.carriers.asset_bit"
            );
            enable_state = enable_state.concat("/").concat(asset_bit_txt);
        }
        if (gateway.need_auth & 0x00000004) {
            let deposit_txt = counterpart.translate(
                "explorer.carriers.deposit"
            );
            enable_state = enable_state.concat("/").concat(deposit_txt);
        }
        if (gateway.need_auth & 0x00000008) {
            let whithdraw_txt = counterpart.translate(
                "explorer.carriers.whithdraw"
            );
            enable_state = enable_state.concat("/").concat(whithdraw_txt);
        }

        let url = null;
        if (gateway.url) {
            url = (
                <a href={gateway.url} target="_blank">
                    {gateway.url}
                </a>
            );
        }

        return (
            <tr>
                <td>{account ? account.name : gateway.gateway_account}</td>
                <td>{enable_state}</td>
                <td>{url}</td>
                <td>{gateway.memo || ""}</td>
                <td style={{textAlign: "right"}}>{gateway_issue_amounts}</td>
                <td />
            </tr>
        );
    }
}

class GatewayList extends React.Component {
    render() {
        let {gateways, membersList} = this.props;

        let itemRows = null;

        let ranks = {};

        if (gateways && gateways.length) {
            itemRows = gateways.map(a => {
                return <GatewayRow key={a.id} gateway={a} />;
            });
        }

        return (
            <table className="table table-hover">
                <thead>
                    <tr>
                        <th className="clickable">
                            <Translate content="explorer.gateways.title" />
                        </th>
                        <th className="clickable">
                            <Translate content="explorer.gateways.state" />
                        </th>
                        <th className="clickable">
                            <Translate content="explorer.gateways.url_text" />
                        </th>
                        <th className="clickable">
                            <Translate content="explorer.gateways.memo" />
                        </th>
                        <th style={{textAlign: "right"}}>
                            <Translate content="explorer.gateways.quota" />
                        </th>
                        <th />
                    </tr>
                </thead>
                <tbody>{itemRows}</tbody>
            </table>
        );
    }
}

class Gateways extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            limit: 100,
            filterGateway: props.filterGateway || "",
            gatewayes: null
        };
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            nextState.filterGateway !== this.state.filterGateway ||
            nextState.gatewayes !== this.state.gatewayes
        );
    }

    _onFilter(e) {
        e.preventDefault();
        this.setState(
            {
                filterGateway: e.target.value.toLowerCase()
            },
            () => {
                this.getGateways();
            }
        );
    }

    componentDidMount() {
        this.getGateways();
    }

    getGateways() {
        let {filterGateway, limit} = this.state;

        return Apis.instance()
            .db_api()
            .exec("lookup_gateway_accounts", [filterGateway, limit])
            .then(res => {
                let gatewayIds = [];
                if (res && res.length) {
                    res.forEach(one => {
                        gatewayIds.push(one[1]);
                    });
                }
                if (gatewayIds.length) {
                    Apis.instance()
                        .db_api()
                        .exec("get_gatewayes", [gatewayIds])
                        .then(gatewayes => {
                            if (gatewayes && gatewayes.length) {
                                this.setState({gatewayes});
                            } else {
                                this.setState({gatewayes: null});
                            }
                        });
                } else {
                    this.setState({gatewayes: null});
                }
            });
    }

    render() {
        let {filterGateway, gatewayes} = this.state;

        let content = (
            <div
                className="grid-block vertical"
                style={{
                    paddingTop: 10
                }}
            >
                <div className="zos-card-bg" style={{paddingTop: 20}}>
                    <div className="grid-block zos-filter">
                        <Translate
                            className="title"
                            content="explorer.gateways.filter_title"
                        />
                        <input
                            type="text"
                            value={this.state.filterGateway}
                            onChange={this._onFilter.bind(this)}
                            className="zos-filter"
                        />
                    </div>
                    <div className="grid-block vertical">
                        <div className="grid-content" style={{padding: 0}}>
                            <GatewayList
                                gateways={gatewayes}
                                filter={filterGateway}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );

        return <Explorer tab="gateways" content={content} />;
    }
}

export default Gateways;

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
import counterpart from "counterpart";

class CarrierRow extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            assets: {},
            account: null
        };
    }

    componentDidMount() {
        this.getCarrierAccount(this.props.carrier);
    }

    getCarrierAccount(carrier) {
        return Apis.instance()
            .db_api()
            .exec("get_accounts", [[carrier.carrier_account]])
            .then(carrier_accounts => {
                this.setState({account: carrier_accounts[0]});
            });
    }

    render() {
        let {carrier} = this.props;
        let {account} = this.state;

        let enable_state = "";
        if (carrier.enable === "identity_enable") {
            enable_state = counterpart.translate(
                "explorer.gateways.identity_enable"
            );
        }

        if (carrier.enable === "identity_disable") {
            enable_state = counterpart.translate(
                "explorer.gateways.identity_disable"
            );
        }
        if (carrier.need_auth & 0x00000001) {
            let asset_cash_txt = counterpart.translate(
                "explorer.carriers.asset_cash"
            );
            enable_state = enable_state.concat("/").concat(asset_cash_txt);
        }
        if (carrier.need_auth & 0x00000002) {
            let asset_bit_txt = counterpart.translate(
                "explorer.carriers.asset_bit"
            );
            enable_state = enable_state.concat("/").concat(asset_bit_txt);
        }
        if (carrier.need_auth & 0x00000004) {
            let borrowse_txt = counterpart.translate(
                "explorer.carriers.borrowse"
            );
            enable_state = enable_state.concat("/").concat(borrowse_txt);
        }
        if (carrier.need_auth & 0x00000008) {
            let invest_txt = counterpart.translate("explorer.carriers.invest");
            enable_state = enable_state.concat("/").concat(invest_txt);
        }
        let url = null;
        if (carrier.url) {
            url = (
                <a href={carrier.url} target="_blank">
                    {carrier.url}
                </a>
            );
        }
        //console.log("enable_state:", enable_state);
        return (
            <tr>
                <td>{account ? account.name : carrier.carrier_account}</td>
                <td>{enable_state}</td>
                <td>{url}</td>
                <td style={{textAlign: "right"}}>{carrier.memo || ""}</td>
                <td />
            </tr>
        );
    }
}

class CarrierList extends React.Component {
    render() {
        let {carriers, membersList} = this.props;

        let itemRows = null;

        let ranks = {};

        if (carriers && carriers.length) {
            itemRows = carriers.map(a => {
                return <CarrierRow key={a.id} carrier={a} />;
            });
        }

        return (
            <table className="table table-hover">
                <thead>
                    <tr>
                        <th>
                            <Translate content="explorer.carriers.title" />
                        </th>
                        <th className="clickable">
                            <Translate content="explorer.gateways.state" />
                        </th>
                        <th>
                            <Translate content="explorer.carriers.url_text" />
                        </th>
                        <th style={{textAlign: "right"}}>
                            <Translate content="explorer.carriers.memo" />
                        </th>
                        <th />
                    </tr>
                </thead>
                <tbody>{itemRows}</tbody>
            </table>
        );
    }
}

class Carriers extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            limit: 100,
            filterCarrier: props.filterCarrier || "",
            carrieres: null
        };
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            nextState.filterCarrier !== this.state.filterCarrier ||
            nextState.carrieres !== this.state.carrieres
        );
    }

    _onFilter(e) {
        e.preventDefault();
        this.setState(
            {
                filterCarrier: e.target.value.toLowerCase()
            },
            () => {
                this.getCarriers();
            }
        );
    }

    componentDidMount() {
        this.getCarriers();
    }

    getCarriers() {
        let {filterCarrier, limit} = this.state;

        return Apis.instance()
            .db_api()
            .exec("lookup_carrier_accounts", [filterCarrier, limit])
            .then(res => {
                let carrierIds = [];
                if (res && res.length) {
                    res.forEach(one => {
                        carrierIds.push(one[1]);
                    });
                }
                if (carrierIds.length) {
                    Apis.instance()
                        .db_api()
                        .exec("get_carrieres", [carrierIds])
                        .then(carrieres => {
                            if (carrieres && carrieres.length) {
                                this.setState({carrieres});
                            } else {
                                this.setState({carrieres: null});
                            }
                        });
                } else {
                    this.setState({carrieres: null});
                }
            });
    }

    render() {
        let {filterCarrier, carrieres} = this.state;

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
                            content="explorer.carriers.filter_title"
                        />
                        <input
                            type="text"
                            value={this.state.filterCarrier}
                            onChange={this._onFilter.bind(this)}
                            className="zos-filter"
                        />
                    </div>
                    <div className="grid-block vertical">
                        <div className="grid-content" style={{padding: 0}}>
                            <CarrierList
                                carriers={carrieres}
                                filter={filterCarrier}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );

        return <Explorer tab="carriers" content={content} />;
    }
}

export default Carriers;

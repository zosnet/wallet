import React from "react";
import {PropTypes} from "react";
import AssetActions from "actions/AssetActions";
import SettingsActions from "actions/SettingsActions";
import {Link} from "react-router/es";
import Immutable from "immutable";
import Translate from "react-translate-component";
import LinkToAccountById from "../Utility/LinkToAccountById";
import assetUtils from "common/asset_utils";
import counterpart from "counterpart";
import FormattedAsset from "../Utility/FormattedAsset";
import AssetName from "../Utility/AssetName";
import {ChainStore} from "zosjs/es";
import cnames from "classnames";
import utils from "common/utils";
import LoadingIndicator from "../LoadingIndicator";
import ls from "common/localStorage";
import ZosPaginatedList from "../Utility/ZosPaginatedList";
import {Apis} from "zosjs-ws";

let accountStorage = new ls("__graphene__");

class Assets extends React.Component {
    constructor(props) {
        super();

        let chainID = Apis.instance().chain_id;
        if (chainID) chainID = chainID.substr(0, 8);
        else chainID = "4018d784";

        this.state = {
            chainID,
            foundLast: false,
            lastAsset: "",
            isLoading: false,
            totalAssets:
                typeof accountStorage.get("totalAssets") != "object"
                    ? accountStorage.get("totalAssets")
                    : 99,
            assetsFetched: 0,
            activeFilter: "market",
            filterUIA: props.filterUIA || "",
            filterMPA: props.filterMPA || "",
            filterPM: props.filterPM || ""
        };
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            !Immutable.is(nextProps.assets, this.props.assets) ||
            !utils.are_equal_shallow(nextState, this.state)
        );
    }

    componentWillMount() {
        this._checkAssets(this.props.assets, true);
    }

    _checkAssets(assets, force) {
        this.setState({isLoading: true});
        let lastAsset = assets
            .sort((a, b) => {
                if (a.symbol > b.symbol) {
                    return 1;
                } else if (a.symbol < b.symbol) {
                    return -1;
                } else {
                    return 0;
                }
            })
            .last();

        if (assets.size === 0 || force) {
            AssetActions.getAssetList.defer("A", 100);
            this.setState({assetsFetched: 100});
        } else if (assets.size >= this.state.assetsFetched) {
            AssetActions.getAssetList.defer(lastAsset.symbol, 100);
            this.setState({assetsFetched: this.state.assetsFetched + 99});
        }

        if (assets.size > this.state.totalAssets) {
            accountStorage.set(
                `totalAssets_${this.state.chainID}`,
                assets.size
            );
        }

        if (this.state.assetsFetched >= this.state.totalAssets - 100) {
            this.setState({isLoading: false});
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.assets !== this.props.assets) {
            this._checkAssets(nextProps.assets);
        }
    }

    linkToAccount(name_or_id) {
        if (!name_or_id) {
            return <span>-</span>;
        }

        return <LinkToAccountById account={name_or_id} />;
    }

    linkToGateways(array_id) {
        if (array_id.length === 0) {
            return <span>-</span>;
        }

        return array_id.map(function(id) {
            return (
                <span>
                    <LinkToAccountById account={id} />{" "}
                </span>
            );
        });
    }

    _toggleFilter(filter) {
        this.setState({
            activeFilter: filter
        });
    }

    _onFilter(type, e) {
        this.setState({[type]: e.target.value.toUpperCase()});
        SettingsActions.changeViewSetting({
            [type]: e.target.value.toUpperCase()
        });
    }

    render() {
        let {assets} = this.props;
        let {activeFilter} = this.state;

        let placeholder = counterpart.translate("markets.filter").toUpperCase();
        let coreAsset = ChainStore.getAsset("1.3.0");

        let uia;
        let mia;
        let cia;

        if (activeFilter == "user") {
            let uasset_property_names = [
                "cash",
                "lender",
                "genesis",
                "loan",
                "core",
                "loanoption",
                "bit",
                "sell",
                "locktoken",
                "locknode"
            ];
            let uasset_property_cls = [
                "info",
                "success",
                "success",
                "alert",
                "alert"
            ];

            uia = assets
                .filter(a => {
                    return (
                        !a.market_asset &&
                        a.id !== "1.3.0" &&
                        a.symbol.indexOf(this.state.filterUIA) !== -1
                    );
                })
                .map(asset => {
                    let uasset_property = asset.uasset_property.toString(2);
                    console.log("title3:", uasset_property);
                    uasset_property = uasset_property
                        .split("")
                        .reverse()
                        .map(function(c, i) {
                            let _value = Math.pow(2, i);
                            return c == "1" &&
                                (_value == 1 ||
                                    _value == 2 ||
                                    _value == 8 ||
                                    _value == 0x100 ||
                                    _value == 0x200 ||
                                    _value == 0x80) ? (
                                <span
                                    key={`uasset_property_${c}_${i}`}
                                    style={{marginRight: "10px"}}
                                >
                                    {counterpart.translate(
                                        "explorer.asset.uasset_property." +
                                            uasset_property_names[i]
                                    )}
                                </span>
                            ) : (
                                ""
                            );
                        });

                    return (
                        <tr key={asset.symbol}>
                            <td>{asset.id}</td>
                            <td>
                                <Link to={`/asset/${asset.symbol}`}>
                                    <AssetName name={asset.symbol} />
                                </Link>
                            </td>
                            <td>{this.linkToAccount(asset.issuer)}</td>
                            <td>
                                {this.linkToGateways(asset.whitelist_gateways)}
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={asset.options.max_supply}
                                    asset={asset.id}
                                    hide_asset={true}
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={asset.dynamic.current_supply}
                                    asset={asset.id}
                                    hide_asset={true}
                                />
                            </td>
                            <td>{uasset_property}</td>
                        </tr>
                    );
                })
                .sort((a, b) => {
                    if (a.key > b.key) {
                        return 1;
                    } else if (a.key < b.key) {
                        return -1;
                    } else {
                        return 0;
                    }
                })
                .toArray();
        }

        if (activeFilter == "market") {
            let uasset_property_names = [
                "cash",
                "lender",
                "genesis",
                "loan",
                "core",
                "loanoption",
                "bit",
                "sell",
                "locktoken",
                "locknode"
            ];
            let uasset_property_cls = [
                "info",
                "success",
                "success",
                "alert",
                "alert"
            ];

            mia = assets
                .filter(a => {
                    return (
                        a.bitasset_data &&
                        !a.bitasset_data.is_prediction_market &&
                        a.symbol.indexOf(this.state.filterMPA) !== -1
                    );
                })
                .map(asset => {
                    let uasset_property = asset.uasset_property.toString(2);
                    uasset_property = uasset_property
                        .split("")
                        .reverse()
                        .map(function(c, i) {
                            let _value = Math.pow(2, i);
                            return c == "1" &&
                                (_value == 1 ||
                                    _value == 2 ||
                                    _value == 8 ||
                                    _value == 0x100 ||
                                    _value == 0x200 ||
                                    _value == 0x80) ? (
                                <span
                                    key={`uasset_property_${c}_${i}`}
                                    style={{marginRight: "10px"}}
                                >
                                    {counterpart.translate(
                                        "explorer.asset.uasset_property." +
                                            uasset_property_names[i]
                                    )}
                                </span>
                            ) : (
                                ""
                            );
                        });

                    return (
                        <tr key={asset.symbol}>
                            <td>{asset.id}</td>
                            <td>
                                <Link to={`/asset/${asset.symbol}`}>
                                    <AssetName name={asset.symbol} />
                                </Link>
                            </td>
                            <td>{this.linkToAccount(asset.issuer)}</td>
                            <td>
                                {this.linkToGateways(asset.whitelist_gateways)}
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={asset.options.max_supply}
                                    asset={asset.id}
                                    hide_asset={true}
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={asset.dynamic.current_supply}
                                    asset={asset.id}
                                    hide_asset={true}
                                />
                            </td>
                            <td>{uasset_property}</td>
                        </tr>
                    );
                })
                .sort((a, b) => {
                    if (a.key > b.key) {
                        return 1;
                    } else if (a.key < b.key) {
                        return -1;
                    } else {
                        return 0;
                    }
                })
                .toArray();
        }

        if (activeFilter == "cash") {
            let uasset_property_names = [
                "cash",
                "lender",
                "genesis",
                "loan",
                "core",
                "loanoption",
                "bit",
                "sell",
                "locktoken",
                "locknode"
            ];
            let uasset_property_cls = [
                "info",
                "success",
                "success",
                "alert",
                "alert"
            ];

            cia = assets
                .filter(a => {
                    let uasset_property = a.uasset_property.toString(2);
                    return (
                        uasset_property.substr(-1) === "1" &&
                        a.symbol.indexOf(this.state.filterPM) !== -1
                    );
                })
                .map(asset => {
                    let uasset_property = asset.uasset_property.toString(2);
                    console.log("title1:", uasset_property);
                    uasset_property = uasset_property
                        .split("")
                        .reverse()
                        .map(function(c, i) {
                            let _value = Math.pow(2, i);
                            return c == "1" &&
                                (_value == 1 ||
                                    _value == 2 ||
                                    _value == 8 ||
                                    _value == 0x100 ||
                                    _value == 0x200 ||
                                    _value == 0x80) ? (
                                <span
                                    key={`uasset_property_${c}_${i}`}
                                    style={{marginRight: "10px"}}
                                >
                                    {counterpart.translate(
                                        "explorer.asset.uasset_property." +
                                            uasset_property_names[i]
                                    )}
                                </span>
                            ) : (
                                ""
                            );
                        });

                    return (
                        <tr key={asset.symbol}>
                            <td>{asset.id}</td>
                            <td>
                                <Link to={`/asset/${asset.symbol}`}>
                                    <AssetName name={asset.symbol} />
                                </Link>
                            </td>
                            <td>{this.linkToAccount(asset.issuer)}</td>
                            <td>
                                {this.linkToGateways(asset.whitelist_gateways)}
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={asset.options.max_supply}
                                    asset={asset.id}
                                    hide_asset={true}
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={asset.dynamic.current_supply}
                                    asset={asset.id}
                                    hide_asset={true}
                                />
                            </td>
                            <td>{uasset_property}</td>
                        </tr>
                    );
                })
                .sort((a, b) => {
                    if (a.key > b.key) {
                        return -1;
                    } else if (a.key < b.key) {
                        return 1;
                    } else {
                        return 0;
                    }
                })
                .toArray();
        }

        let assetListHeader = (
            <tr>
                <th>
                    <Translate component="span" content="explorer.assets.id" />
                </th>
                <th>
                    <Translate
                        component="span"
                        content="explorer.assets.symbol"
                    />
                </th>
                <th>
                    <Translate
                        component="span"
                        content="explorer.assets.issuer"
                    />
                </th>
                <th>
                    <Translate
                        component="span"
                        content="explorer.assets.gateways"
                    />
                </th>
                <th>
                    <Translate component="span" content="markets.supply" />
                </th>
                <th>
                    <Translate
                        component="span"
                        content="markets.current_supply"
                    />
                </th>
                <th>
                    <Translate component="span" content="markets.properties" />
                </th>
            </tr>
        );

        return (
            <div
                className="grid-block vertical"
                style={{
                    paddingTop: 10
                }}
            >
                <div className="grid-block vertical">
                    <div className="grid-block main-content small-12 main-content vertical">
                        <div
                            className="generic-bordered-box zos-card-bg"
                            style={{
                                paddingTop: 20
                            }}
                        >
                            <div className="generic-bordered-box tab-content">
                                <div className="header-selector">
                                    <div className="selector">
                                        <div
                                            className={cnames("inline-block", {
                                                inactive:
                                                    activeFilter != "market"
                                            })}
                                            onClick={this._toggleFilter.bind(
                                                this,
                                                "market"
                                            )}
                                        >
                                            <Translate content="explorer.assets.market" />
                                        </div>
                                        <div
                                            className={cnames("inline-block", {
                                                inactive: activeFilter != "user"
                                            })}
                                            onClick={this._toggleFilter.bind(
                                                this,
                                                "user"
                                            )}
                                        >
                                            <Translate content="explorer.assets.user" />
                                        </div>
                                        <div
                                            className={cnames("inline-block", {
                                                inactive: activeFilter != "cash"
                                            })}
                                            onClick={this._toggleFilter.bind(
                                                this,
                                                "cash"
                                            )}
                                        >
                                            <Translate content="explorer.assets.cash" />
                                        </div>
                                    </div>
                                </div>
                                {this.state.isLoading ? (
                                    <LoadingIndicator />
                                ) : null}
                                {activeFilter == "market" ? (
                                    <div className="grid-block shrink">
                                        <div className="grid-content">
                                            <input
                                                style={{maxWidth: "500px"}}
                                                placeholder={placeholder}
                                                type="text"
                                                value={this.state.filterMPA}
                                                onChange={this._onFilter.bind(
                                                    this,
                                                    "filterMPA"
                                                )}
                                            />
                                        </div>
                                    </div>
                                ) : null}
                                {activeFilter == "market" ? (
                                    <div
                                        className="grid-block"
                                        style={{paddingBottom: 20}}
                                    >
                                        <ZosPaginatedList
                                            header={assetListHeader}
                                            rows={mia}
                                        />
                                    </div>
                                ) : null}

                                {activeFilter == "user" ? (
                                    <div className="grid-block shrink">
                                        <div className="grid-content">
                                            <input
                                                style={{maxWidth: "500px"}}
                                                placeholder={placeholder}
                                                type="text"
                                                value={this.state.filterUIA}
                                                onChange={this._onFilter.bind(
                                                    this,
                                                    "filterUIA"
                                                )}
                                            />
                                        </div>
                                    </div>
                                ) : null}

                                {activeFilter == "user" ? (
                                    <div
                                        className="grid-block"
                                        style={{paddingBottom: 20}}
                                    >
                                        <ZosPaginatedList
                                            header={assetListHeader}
                                            rows={uia}
                                        />
                                    </div>
                                ) : null}

                                {activeFilter == "cash" ? (
                                    <div className="grid-block shrink">
                                        <div className="grid-content">
                                            <input
                                                style={{maxWidth: "500px"}}
                                                placeholder={counterpart
                                                    .translate("markets.search")
                                                    .toUpperCase()}
                                                type="text"
                                                value={this.state.filterPM}
                                                onChange={this._onFilter.bind(
                                                    this,
                                                    "filterPM"
                                                )}
                                            />
                                        </div>
                                    </div>
                                ) : null}

                                {activeFilter == "cash" ? (
                                    <div
                                        className="grid-block"
                                        style={{paddingBottom: 20}}
                                    >
                                        <ZosPaginatedList
                                            header={assetListHeader}
                                            rows={cia}
                                        />
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

Assets.defaultProps = {
    assets: {}
};

Assets.propTypes = {
    assets: PropTypes.object.isRequired
};

export default Assets;

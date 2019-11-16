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

let accountStorage = new ls("__graphene__");

class Assets extends React.Component {
    constructor(props) {
        super();
        this.state = {
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
            filterPM: props.filterPM || "",
            filterCM: props.filterCM || ""
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
            accountStorage.set("totalAssets", assets.size);
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
        let pm;
        let cm;

        if (activeFilter == "user") {
            uia = assets
                .filter(a => {
                    return (
                        !a.market_asset &&
                        a.symbol.indexOf(this.state.filterUIA) !== -1
                    );
                })
                .map(asset => {
                    let description = assetUtils.parseDescription(
                        asset.options.description
                    );

                    let marketID =
                        asset.symbol +
                        "_" +
                        (description.market
                            ? description.market
                            : coreAsset
                                ? coreAsset.get("symbol")
                                : "ZOS");

                    return (
                        <tr key={asset.symbol}>
                            <td>
                                <Link to={`/asset/${asset.symbol}`}>
                                    <AssetName name={asset.symbol} />
                                </Link>
                            </td>
                            <td>{this.linkToAccount(asset.issuer)}</td>
                            <td>
                                <FormattedAsset
                                    amount={asset.dynamic.current_supply}
                                    asset={asset.id}
                                    hide_asset={true}
                                />
                            </td>
                            <td>
                                <Link
                                    className="button outline"
                                    to={`/market/${marketID}`}
                                >
                                    <Translate content="header.exchange" />
                                </Link>
                            </td>
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
            // let uasset_property_names = [
            //     "cash",
            //     "lender",
            //     "genesis",
            //     "loan",
            //     "core",
            //     "sell",
            //     "locktoken",
            //     "locknode"
            // ];
            // let uasset_property_cls = [
            //     "info",
            //     "success",
            //     "success",
            //     "alert",
            //     "alert"
            // ];
            // console.log(assets.toJS());
            //     mia = assets
            //         .filter(a => {
            //             return (
            //                 a.bitasset_data &&
            //                 !a.bitasset_data.is_prediction_market &&
            //                 !a.bitasset_data.is_cash_market &&
            //                 a.symbol.indexOf(this.state.filterMPA) !== -1
            //             );
            //         })
            //         .map(asset => {
            //             let description = assetUtils.parseDescription(
            //                 asset.options.description
            //             );
            //             let marketID =
            //                 asset.symbol +
            //                 "_" +
            //                 (description.market
            //                     ? description.market
            //                     : coreAsset ? coreAsset.get("symbol") : "ZOS");
            //             let uasset_property = asset.uasset_property.toString(2);
            //             uasset_property = uasset_property
            //                 .split("")
            //                 .reverse()
            //                 .map(function(c, i) {
            //                     let _value = Math.pow(2, i);
            //                     return c == "1" &&
            //                         (_value == 1 || _value == 2 || _value == 8) ? (
            //                         <span
            //                             key={`uasset_property_${c}_${i}`}
            //                             className={`label ${
            //                                 uasset_property_cls[i]
            //                             }`}
            //                             style={{marginRight: "10px"}}
            //                         >
            //                             {counterpart.translate(
            //                                 "explorer.asset.uasset_property." +
            //                                     uasset_property_names[i]
            //                             )}
            //                         </span>
            //                     ) : (
            //                         ""
            //                     );
            //                 });
            //             return (
            //                 <tr key={asset.symbol}>
            //                     <td className="p-l-1_5">
            //                         <Link to={`/asset/${asset.symbol}`}>
            //                             <AssetName name={asset.symbol} />
            //                         </Link>
            //                     </td>
            //                     <td>{this.linkToAccount(asset.issuer)}</td>
            //                     <td>
            //                         <FormattedAsset
            //                             amount={asset.options.max_supply}
            //                             asset={asset.id}
            //                             hide_asset={true}
            //                         />
            //                     </td>
            //                     <td>
            //                         <FormattedAsset
            //                             amount={asset.dynamic.current_supply}
            //                             asset={asset.id}
            //                             hide_asset={true}
            //                         />
            //                     </td>
            //                     <td>{uasset_property}</td>
            //                     {/*<td>
            //                         <Link
            //                             className="button outline"
            //                             to={`/market/${marketID}`}
            //                         >
            //                             <Translate content="header.exchange" />
            //                         </Link>
            //                     </td>*/}
            //                 </tr>
            //             );
            //         })
            //         .sort((a, b) => {
            //             if (a.key > b.key) {
            //                 return 1;
            //             } else if (a.key < b.key) {
            //                 return -1;
            //             } else {
            //                 return 0;
            //             }
            //         })
            //         .toArray();
        }

        if (activeFilter == "prediction") {
            pm = assets
                .filter(a => {
                    let description = assetUtils.parseDescription(
                        a.options.description
                    );

                    return (
                        a.bitasset_data &&
                        a.bitasset_data.is_prediction_market &&
                        (a.symbol
                            .toLowerCase()
                            .indexOf(this.state.filterPM.toLowerCase()) !==
                            -1 ||
                            description.main
                                .toLowerCase()
                                .indexOf(this.state.filterPM.toLowerCase()) !==
                                -1)
                    );
                })
                .map(asset => {
                    let description = assetUtils.parseDescription(
                        asset.options.description
                    );
                    let marketID =
                        asset.symbol +
                        "_" +
                        (description.market
                            ? description.market
                            : coreAsset
                                ? coreAsset.get("symbol")
                                : "ZOS");

                    return (
                        <tr key={asset.id.split(".")[2]}>
                            <td style={{width: "80%"}}>
                                <div
                                    style={{paddingTop: 10, fontWeight: "bold"}}
                                >
                                    <Link to={`/asset/${asset.symbol}`}>
                                        <AssetName name={asset.symbol} />
                                    </Link>
                                    {description.condition ? (
                                        <span> ({description.condition})</span>
                                    ) : null}
                                </div>
                                {description ? (
                                    <div
                                        style={{
                                            padding: "10px 20px 5px 0",
                                            lineHeight: "18px"
                                        }}
                                    >
                                        {description.main}
                                    </div>
                                ) : null}
                                <div
                                    style={{
                                        padding: "0 20px 5px 0",
                                        lineHeight: "18px"
                                    }}
                                >
                                    <LinkToAccountById account={asset.issuer} />
                                    <span>
                                        {" "}
                                        -{" "}
                                        <FormattedAsset
                                            amount={
                                                asset.dynamic.current_supply
                                            }
                                            asset={asset.id}
                                        />
                                    </span>
                                    {description.expiry ? (
                                        <span> - {description.expiry}</span>
                                    ) : null}
                                </div>
                            </td>
                            <td style={{width: "20%"}}>
                                <Link
                                    className="button outline"
                                    to={`/market/${marketID}`}
                                >
                                    <Translate content="header.exchange" />
                                </Link>
                            </td>
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

        if (activeFilter == "cash") {
            cm = assets
                .filter(a => {
                    let description = assetUtils.parseDescription(
                        a.options.description
                    );

                    return (
                        a.bitasset_data &&
                        a.bitasset_data.is_cash_market &&
                        (a.symbol
                            .toLowerCase()
                            .indexOf(this.state.filterCM.toLowerCase()) !==
                            -1 ||
                            description.main
                                .toLowerCase()
                                .indexOf(this.state.filterCM.toLowerCase()) !==
                                -1)
                    );
                })
                .map(asset => {
                    let description = assetUtils.parseDescription(
                        asset.options.description
                    );
                    let marketID =
                        asset.symbol +
                        "_" +
                        (description.market
                            ? description.market
                            : coreAsset
                                ? coreAsset.get("symbol")
                                : "ZOS");

                    return (
                        <tr key={asset.id.split(".")[2]}>
                            <td style={{width: "80%"}}>
                                <div
                                    style={{paddingTop: 10, fontWeight: "bold"}}
                                >
                                    <Link to={`/asset/${asset.symbol}`}>
                                        <AssetName name={asset.symbol} />
                                    </Link>
                                    {description.condition ? (
                                        <span> ({description.condition})</span>
                                    ) : null}
                                </div>
                                {description ? (
                                    <div
                                        style={{
                                            padding: "10px 20px 5px 0",
                                            lineHeight: "18px"
                                        }}
                                    >
                                        {description.main}
                                    </div>
                                ) : null}
                                <div
                                    style={{
                                        padding: "0 20px 5px 0",
                                        lineHeight: "18px"
                                    }}
                                >
                                    <LinkToAccountById account={asset.issuer} />
                                    <span>
                                        {" "}
                                        -{" "}
                                        <FormattedAsset
                                            amount={
                                                asset.dynamic.current_supply
                                            }
                                            asset={asset.id}
                                        />
                                    </span>
                                    {description.expiry ? (
                                        <span> - {description.expiry}</span>
                                    ) : null}
                                </div>
                            </td>
                            <td style={{width: "20%"}}>
                                <Link
                                    className="button outline"
                                    to={`/market/${marketID}`}
                                >
                                    <Translate content="header.exchange" />
                                </Link>
                            </td>
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

        return (
            <div
                className="grid-block vertical"
                style={{
                    paddingTop: 10
                }}
            >
                <div className="grid-block vertical">
                    <div className="grid-block main-content small-12 main-content vertical">
                        {" "}
                        {/*medium-10 medium-offset-1 */}
                        <div
                            className="generic-bordered-box zos-card-bg"
                            style={{
                                paddingTop: 20
                            }}
                        >
                            {/* <div className="header-selector">
                                <div className="selector">
                                    <div
                                        className={cnames("inline-block", {
                                            inactive: activeFilter != "market"
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
                                            inactive:
                                                activeFilter != "prediction"
                                        })}
                                        onClick={this._toggleFilter.bind(
                                            this,
                                            "prediction"
                                        )}
                                    >
                                        <Translate content="explorer.assets.prediction" />
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
                            </div> */}
                            {this.state.isLoading ? <LoadingIndicator /> : null}
                            {/* activeFilter == "market" ? (
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
                            ) : null */}

                            {activeFilter == "market" ? (
                                <div className="grid-block zos-filter">
                                    <Translate
                                        className="title"
                                        content="explorer.assets.filter_title"
                                    />
                                    <input
                                        type="text"
                                        value={this.state.filterMPA}
                                        onChange={this._onFilter.bind(
                                            this,
                                            "filterMPA"
                                        )}
                                        className="zos-filter"
                                    />
                                </div>
                            ) : null}
                            {activeFilter == "market" ? (
                                <div
                                    className="grid-block"
                                    style={{paddingBottom: 20}}
                                >
                                    <div
                                        className="grid-content"
                                        style={{padding: 0}}
                                    >
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th className="p-l-1_5">
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
                                                            content="markets.supply"
                                                        />
                                                    </th>
                                                    <th>
                                                        <Translate
                                                            component="span"
                                                            content="markets.current_supply"
                                                        />
                                                    </th>
                                                    <th>
                                                        <Translate
                                                            component="span"
                                                            content="markets.properties"
                                                        />
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>{mia}</tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : null}

                            {/* activeFilter == "user" ? (
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
                            ) : null */}

                            {/* activeFilter == "user" ? (
                                <div
                                    className="grid-block"
                                    style={{paddingBottom: 20}}
                                >
                                    <div className="grid-content">
                                        <table className="table">
                                            <thead>
                                                <tr>
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
                                                            content="markets.supply"
                                                        />
                                                    </th>
                                                    <th />
                                                </tr>
                                            </thead>

                                            <tbody>{uia}</tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : null */}

                            {/* activeFilter == "prediction" ? (
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
                            ) : null */}

                            {/* activeFilter == "prediction" ? (
                                <div
                                    className="grid-block"
                                    style={{paddingBottom: 20}}
                                >
                                    <div className="grid-content">
                                        <table className="table">
                                            <tbody>{pm}</tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : null */}
                            {/* activeFilter == "cash" ? (
                                <div className="grid-block shrink">
                                    <div className="grid-content">
                                        <input
                                            style={{maxWidth: "500px"}}
                                            placeholder={counterpart
                                                .translate("markets.search")
                                                .toUpperCase()}
                                            type="text"
                                            value={this.state.filterCM}
                                            onChange={this._onFilter.bind(
                                                this,
                                                "filterCM"
                                            )}
                                        />
                                    </div>
                                </div>
                            ) : null */}
                            {/*activeFilter == "cash" ? (
                                <div
                                    className="grid-block"
                                    style={{paddingBottom: 20}}
                                >
                                    <div className="grid-content">
                                        <table className="table">
                                            <tbody>{cm}</tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : null*/}
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

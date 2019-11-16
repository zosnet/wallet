import React from "react";
import {PropTypes} from "react";
import {Link} from "react-router/es";
import Translate from "react-translate-component";
import AssetActions from "actions/AssetActions";
import AssetStore from "stores/AssetStore";
import AccountActions from "actions/AccountActions";
import BaseModal from "../Modal/BaseModal";
import FormattedAsset from "../Utility/FormattedAsset";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import notify from "actions/NotificationActions";
import utils from "common/utils";
import {debounce} from "lodash";
import LoadingIndicator from "../LoadingIndicator";
import AssetPropertyModal from "../Modal/AssetPropertyModal";
import ReserveAssetModal from "../Modal/ReserveAssetModal";
import IssueModal from "../Modal/IssueModal";
import {connect} from "alt-react";
import assetUtils from "common/asset_utils";
import {Map, List, default as Immutable} from "immutable";
import AssetWrapper from "../Utility/AssetWrapper";
import {Tabs, Tab} from "../Utility/Tabs";
import {ChainStore, FetchChain} from "zosjs/es";
import {Apis} from "zosjs-ws";

class AccountAssets extends React.Component {
    static defaultProps = {
        symbol: ""
    };

    static propTypes = {
        symbol: PropTypes.string.isRequired
    };

    constructor(props) {
        super(props);

        this.state = {
            issue: {
                amount: 0,
                to: "",
                to_id: "",
                asset_id: "",
                symbol: ""
            },
            //为修改asset属性(发币|可借贷|可抵押)新增接口
            asset_property: {
                assetType: 0,
                issuer: "",
                symbol: "",
                asset_id: "",
                uasset_property: 0
            },
            errors: {
                symbol: null
            },
            isValid: false,
            searchTerm: "",
            committeeAssets: [], //如果是终身会员，则也可以修改内盘资产的相关属性
            innerDynamicObjects: null
        };

        this.assetproperty = {
            ASSET_CASH: 0x00000001, //ASSET_CASH   法币
            ASSET_LENDER: 0x0000002, //ASSET_LENDER 可抵押
            ASSET_LOAN: 0x00000008, // ASSET_LOAN  可借贷
            ASSET_BIT: 0x00000040, // ASSET_BIT   数字货币
            ASSET_SELL: 0x00000080, // ASSET_SELL   可交易
            ASSET_LOCKTOKEN: 0x00000100, //
            ASSET_LOCKNODE: 0x00000200 //
        };

        this._searchAccounts = debounce(this._searchAccounts, 150);
    }

    _checkAssets(assets, force) {
        if (this.props.account.get("assets").size) return;
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
    }

    componentWillReceiveProps(nextProps) {
        this._checkAssets(nextProps.assets);
    }

    componentWillMount() {}

    componentDidMount() {
        this._checkAssets(this.props.assets, true);
        this._setCommitteeAssets();
    }

    _setCommitteeAssets() {
        //如果不是终身会员，不能获得内盘资产(CommitteeAssets)
        let account = this.props.account;
        //console.log("account:",account.toJS())
        if (account.get("lifetime_referrer") != account.get("id")) return;
        //console.log("lifetime_referrer",account.get("lifetime_referrer"))
        FetchChain("getAccount", "committee-account").then(accountObj => {
            //console.log("account:", accountObj.toJS())
            if (accountObj) {
                let assetIds = accountObj.get("assets");
                //console.log("assetIds:",assetIds)
                if (assetIds) {
                    let assetIdArr = Array.from(assetIds);
                    //console.log("assetIdArr:",assetIdArr)
                    FetchChain("getAsset", assetIdArr).then(assetList => {
                        let committeeAssets = assetList.toArray();
                        this.setState({committeeAssets});
                        //console.log("setState.committeeAssets:",committeeAssets)
                        let ids = [];
                        assetList.map(a => {
                            // console.log("a:", a);
                            ids.push(a.get("dynamic_asset_data_id"));
                        });
                        // console.log("ids:", ids);
                        this._getInnerDynamicObjects(ids);
                    });
                }
            }
        });
    }

    _getInnerDynamicObjects(objectIds) {
        Apis.instance()
            .db_api()
            .exec("get_objects", [objectIds])
            .then(objs => {
                //console.log("objs:", objs);
                let innerDynamicObjects = new Map();
                objs.map(obj => {
                    //console.log("obj:", obj);
                    innerDynamicObjects = innerDynamicObjects.set(obj.id, obj);
                });
                this.setState({innerDynamicObjects});
            });
    }

    _onIssueInput(value, e) {
        let key = e.target.id;
        let {issue} = this.state;

        if (key === "to") {
            this._searchAccounts(e.target.value);
            issue.to = e.target.value;
            let account = this.props.searchAccounts.findEntry(name => {
                return name === e.target.value;
            });

            issue.to_id = account ? account[0] : null;
        } else {
            issue[value] = e.target.value;
        }

        this.setState({issue: issue});
    }

    _searchAccounts(searchTerm) {
        AccountActions.accountSearch(searchTerm);
    }

    _issueAsset(account_id, e) {
        e.preventDefault();
        ZfApi.publish("issue_asset", "close");
        let {issue} = this.state;
        let asset = this.props.assets.get(issue.asset_id);
        issue.amount *= utils.get_asset_precision(asset.precision);
        AssetActions.issueAsset(account_id, issue).then(result => {
            if (result) {
                notify.addNotification({
                    message: `Successfully issued ${utils.format_asset(
                        issue.amount,
                        this.props.assets.get(issue.asset_id)
                    )}`, //: ${this.state.wallet_public_name}
                    level: "success",
                    autoDismiss: 10
                });

                // Update the data for the asset
                ChainStore.getAsset(issue.asset_id);
            } else {
                notify.addNotification({
                    message: "Failed to issue asset", //: ${this.state.wallet_public_name}
                    level: "error",
                    autoDismiss: 10
                });
            }
        });
    }

    _reserveButtonClick(assetId, e) {
        e.preventDefault();
        this.setState({reserve: assetId});
        ZfApi.publish("reserve_asset", "open");
    }

    _reserveAsset(account_id, e) {
        e.preventDefault();
        ZfApi.publish("reserve_asset", "close");
        let {issue} = this.state;
        let asset = this.props.assets.get(issue.asset_id);
        issue.amount *= utils.get_asset_precision(asset.precision);
        AssetActions.issueAsset(account_id, issue);
    }

    _issueButtonClick(asset_id, symbol, e) {
        e.preventDefault();
        let {issue} = this.state;
        issue.asset_id = asset_id;
        issue.symbol = symbol;
        this.setState({issue: issue});
        ZfApi.publish("issue_asset", "open");
    }

    _editButtonClick(symbol, account_name, e) {
        e.preventDefault();
        this.props.router.push(
            `/account/${account_name}/update-asset/${symbol}`
        );
    }

    _assetPropertyClick(
        assetType,
        issuer,
        asset_id,
        symbol,
        uasset_property,
        e
    ) {
        e.preventDefault();
        let {asset_property} = this.state;
        asset_property.assetType = assetType;
        asset_property.issuer = issuer;
        asset_property.asset_id = asset_id;
        asset_property.pay_account_id = this.props.account.get("id");
        asset_property.symbol = symbol;
        asset_property.uasset_property = uasset_property;
        this.setState({asset_property});
        ZfApi.publish("asset_property", "open");
    }

    _onAccountSelect(account_name) {
        let {issue} = this.state;
        issue.to = account_name;
        issue.to_id = this.props.account_name_to_id[account_name];
        this.setState({issue: issue});
    }

    rendeAssetsTbody(issuer_id, assetsMap, account_name) {
        let rendeAssets = assetsMap
            .filter(asset => {
                if (asset.issuer === issuer_id) return true;
            })
            .sort((a, b) => {
                return (
                    parseInt(a.id.substring(4, a.id.length), 10) -
                    parseInt(b.id.substring(4, b.id.length), 10)
                );
            })
            .map(asset => {
                let description = assetUtils.parseDescription(
                    asset.options.description
                );
                let desc = description.short_name
                    ? description.short_name
                    : description.main;

                if (desc.length > 100) {
                    desc = desc.substr(0, 100) + "...";
                }

                let dynamicObject = this.props.getDynamicObject(
                    asset.dynamic_asset_data_id
                );

                let current_supply;
                if (dynamicObject) {
                    current_supply = dynamicObject.get("current_supply");
                } else {
                    let innerDynamicObjects = this.state.innerDynamicObjects;
                    let obj =
                        innerDynamicObjects &&
                        innerDynamicObjects.get(asset.dynamic_asset_data_id);
                    current_supply = obj ? obj.current_supply : null;
                }

                //console.log("uasset_property:", asset.uasset_property);

                //获取asset的属性
                let propertys = assetUtils.getAssetProperty(
                    asset.uasset_property
                );
                //console.log("propertys:", propertys);
                return (
                    <tr key={asset.symbol}>
                        <td
                            style={{
                                paddingLeft: 15
                            }}
                        >
                            <Link to={`/asset/${asset.symbol}`}>
                                {asset.symbol}
                            </Link>
                        </td>
                        <td style={{maxWidth: "250px"}}>{desc}</td>
                        <td>
                            {current_supply ? (
                                <FormattedAsset
                                    amount={parseInt(current_supply, 10)}
                                    asset={asset.id}
                                />
                            ) : null}
                        </td>
                        <td>
                            <FormattedAsset
                                amount={parseInt(asset.options.max_supply, 10)}
                                asset={asset.id}
                            />
                        </td>

                        <td
                            style={{
                                textAlign: "right",
                                paddingRight: 0
                            }}
                        >
                            {asset.bitasset_data_id ? (
                                <button
                                    onClick={this._assetPropertyClick.bind(
                                        this,
                                        this.assetproperty.ASSET_CASH,
                                        asset.issuer,
                                        asset.id,
                                        asset.symbol,
                                        asset.uasset_property
                                    )}
                                    className="button"
                                >
                                    {propertys.asset_cash ? ( //判断是否为法币属性
                                        <Translate content="transaction.trxTypes.cancel_asset_cash" /> //取消法币
                                    ) : (
                                        <Translate content="transaction.trxTypes.apply_asset_cash" />
                                    ) //申请为法币
                                    }
                                </button>
                            ) : null}
                        </td>

                        <td
                            style={{
                                textAlign: "right",
                                paddingRight: 0
                            }}
                        >
                            {asset.bitasset_data_id ? (
                                <button
                                    onClick={this._assetPropertyClick.bind(
                                        this,
                                        this.assetproperty.ASSET_SELL,
                                        asset.issuer,
                                        asset.id,
                                        asset.symbol,
                                        asset.uasset_property
                                    )}
                                    className="button"
                                >
                                    {propertys.asset_sell ? ( //判断是否为可交易属性
                                        <Translate content="transaction.trxTypes.cancel_asset_sell" /> //取消可交易
                                    ) : (
                                        <Translate content="transaction.trxTypes.apply_asset_sell" />
                                    ) //申请为可交易
                                    }
                                </button>
                            ) : null}
                        </td>

                        <td
                            style={{
                                textAlign: "right",
                                paddingRight: 0
                            }}
                        >
                            {asset.bitasset_data_id ? (
                                <button
                                    onClick={this._assetPropertyClick.bind(
                                        this,
                                        this.assetproperty.ASSET_LOCKTOKEN,
                                        asset.issuer,
                                        asset.id,
                                        asset.symbol,
                                        asset.uasset_property
                                    )}
                                    className="button"
                                >
                                    {propertys.asset_locktoken ? ( //判断是否为可交易属性
                                        <Translate content="transaction.trxTypes.cancel_asset_locktoken" /> //取消可交易
                                    ) : (
                                        <Translate content="transaction.trxTypes.apply_asset_locktoken" />
                                    ) //申请为可交易
                                    }
                                </button>
                            ) : null}
                        </td>

                        <td
                            style={{
                                textAlign: "right",
                                paddingRight: 0
                            }}
                        >
                            {asset.bitasset_data_id ? ( //智能资产
                                <button
                                    onClick={this._assetPropertyClick.bind(
                                        this,
                                        this.assetproperty.ASSET_LENDER,
                                        asset.issuer,
                                        asset.id,
                                        asset.symbol,
                                        asset.uasset_property
                                    )}
                                    className="button"
                                >
                                    {propertys.asset_lender ? ( //判断是否为可抵押属性
                                        <Translate content="transaction.trxTypes.cancel_asset_lender" /> //取消可抵押
                                    ) : (
                                        <Translate content="transaction.trxTypes.apply_asset_lender" /> //申请为可抵押
                                    )}
                                </button>
                            ) : (
                                //非智能资产
                                <button
                                    onClick={this._issueButtonClick.bind(
                                        this,
                                        asset.id,
                                        asset.symbol
                                    )}
                                    className="button"
                                >
                                    <Translate content="transaction.trxTypes.asset_issue" />
                                </button>
                            )}
                        </td>

                        <td
                            style={{
                                textAlign: "right",
                                paddingRight: 0
                            }}
                        >
                            {asset.bitasset_data_id ? ( //智能资产
                                <button
                                    onClick={this._assetPropertyClick.bind(
                                        this,
                                        this.assetproperty.ASSET_LOAN,
                                        asset.issuer,
                                        asset.id,
                                        asset.symbol,
                                        asset.uasset_property
                                    )}
                                    className="button"
                                >
                                    {propertys.asset_loan ? ( //判断是否为可借贷属性
                                        <Translate content="transaction.trxTypes.cancel_asset_loan" /> //取消可借贷
                                    ) : (
                                        <Translate content="transaction.trxTypes.apply_asset_loan" /> //申请为可借贷
                                    )}
                                </button>
                            ) : (
                                //非智能资产
                                <button
                                    onClick={this._reserveButtonClick.bind(
                                        this,
                                        asset.id
                                    )}
                                    className="button"
                                >
                                    <Translate content="transaction.trxTypes.asset_reserve" />
                                </button>
                            )}
                        </td>

                        <td
                            style={{
                                textAlign: "right",
                                paddingRight: 15
                            }}
                        >
                            <button
                                onClick={this._editButtonClick.bind(
                                    this,
                                    asset.symbol,
                                    account_name
                                )}
                                className="button"
                            >
                                <Translate content="transaction.trxTypes.asset_update" />
                            </button>
                        </td>
                    </tr>
                );
            })
            .toArray();

        return rendeAssets;
    }

    render() {
        let {account, account_name, assets, assetsList} = this.props;
        let {committeeAssets} = this.state;
        //console.log("state.committeeAssets:",committeeAssets)
        let accountExists = true;
        if (!account) {
            return <LoadingIndicator type="circle" />;
        } else if (account.notFound) {
            accountExists = false;
        }
        if (!accountExists) {
            return (
                <div className="grid-block">
                    <h5>
                        <Translate
                            component="h5"
                            content="account.errors.not_found"
                            name={account_name}
                        />
                    </h5>
                </div>
            );
        }

        // console.log("assetsList:", assetsList);
        if (assetsList.length) {
            assets = assets.clear();
            assetsList.forEach(a => {
                if (a) {
                    assets = assets.set(a.get("id"), a.toJS());
                }
            });
            //console.log("assets:",assets.toJS())
        }

        //如果终身会员有内盘资产(见setCommitteeAssets)，则加入到assets显示
        let innerAssets = Map();
        if (committeeAssets.length) {
            //console.log("add committeeAssets:", committeeAssets);
            committeeAssets.forEach(a => {
                if (a) {
                    innerAssets = innerAssets.set(a.get("id"), a.toJS());
                }
            });
        }
        //console.log("innerAssets:", innerAssets.toJS());

        let myAssetsTbody = this.rendeAssetsTbody(
            account.get("id"),
            assets,
            account_name
        );
        let innerAssetsTbody = this.rendeAssetsTbody(
            "1.2.0",
            innerAssets,
            account_name
        );

        //是否终身会员
        let isLTM =
            account.get("lifetime_referrer") == account.get("id")
                ? true
                : false;

        let createAssetsButtons = (
            <div>
                <Link
                    to={{
                        pathname: `/account/${account_name}/create-asset/`,
                        state: {isInnerAsset: false}
                    }}
                >
                    <button className="button">
                        <Translate content="transaction.trxTypes.asset_create" />
                    </button>
                </Link>
                {isLTM ? (
                    <Link
                        to={{
                            pathname: `/account/${account_name}/create-asset/`,
                            state: {isInnerAsset: true}
                        }}
                    >
                        <button className="button">
                            <Translate content="transaction.trxTypes.asset_create_inner" />
                        </button>
                    </Link>
                ) : null}
            </div>
        );

        let tableThred = (
            <thead>
                <tr>
                    <th style={{paddingLeft: 15}}>
                        <Translate content="account.user_issued_assets.symbol" />
                    </th>
                    <th style={{maxWidth: "200px"}}>
                        <Translate content="account.user_issued_assets.description" />
                    </th>
                    <Translate
                        component="th"
                        content="markets.current_supply"
                    />
                    <th>
                        <Translate content="account.user_issued_assets.max_supply" />
                    </th>
                    <th
                        style={{
                            textAlign: "right",
                            paddingRight: 15
                        }}
                        colSpan="4"
                    >
                        <Translate content="account.perm.action" />
                    </th>
                </tr>
            </thead>
        );

        return (
            <div
                className="grid-block main-content margin-block wrap"
                style={{
                    display: "block",
                    margin: 0,
                    padding: 0,
                    background: "transparent"
                }}
            >
                <div style={{height: 10, background: "#f9fbfe"}} />
                <div
                    className="grid-content no-padding zos-card-bg"
                    style={{marginBottom: 0}}
                >
                    <Tabs
                        setting="updateAssetTab"
                        className="account-tabs"
                        tabsClass="account-overview no-padding bordered-header content-block"
                        actionButtons={createAssetsButtons}
                        segmented={false}
                    >
                        <Tab title="account.user_issued_assets.issued_assets">
                            <table className="table">
                                {tableThred}
                                <tbody>{myAssetsTbody}</tbody>
                            </table>
                        </Tab>
                        {isLTM ? ( //终身会员显示内盘资产
                            <Tab title="account.user_issued_assets.inner_assert">
                                <table className="table">
                                    {tableThred}
                                    <tbody>{innerAssetsTbody}</tbody>
                                </table>
                            </Tab>
                        ) : null}
                    </Tabs>

                    <AssetPropertyModal
                        modalId="asset_property"
                        property={this.state.asset_property}
                        onClose={() => {
                            ZfApi.publish("asset_property", "close");
                        }}
                    />

                    <BaseModal id="issue_asset" overlay={true}>
                        <br />
                        <div className="grid-block vertical">
                            <IssueModal
                                asset_to_issue={this.state.issue.asset_id}
                                onClose={() => {
                                    ZfApi.publish("issue_asset", "close");
                                }}
                            />
                        </div>
                    </BaseModal>

                    <BaseModal id="reserve_asset" overlay={true}>
                        <br />
                        <div className="grid-block vertical">
                            <ReserveAssetModal
                                assetId={this.state.reserve}
                                account={account}
                                onClose={() => {
                                    ZfApi.publish("reserve_asset", "close");
                                }}
                            />
                        </div>
                    </BaseModal>
                </div>
            </div>
        );
    }
}

AccountAssets = AssetWrapper(AccountAssets, {
    propNames: ["assetsList"],
    asList: true,
    withDynamic: true
});

export default connect(
    AccountAssets,
    {
        listenTo() {
            return [AssetStore];
        },
        getProps(props) {
            let assets = Map(),
                assetsList = List();
            if (props.account.get("assets", []).size) {
                props.account.get("assets", []).forEach(id => {
                    assetsList = assetsList.push(id);
                });
            } else {
                assets = AssetStore.getState().assets;
            }
            return {assets, assetsList};
        }
    }
);

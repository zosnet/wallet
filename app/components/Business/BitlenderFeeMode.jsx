import React from "react";
import {connect} from "alt-react";
import Translate from "react-translate-component";
import {Link} from "react-router/es";
import {Apis} from "zosjs-ws";
import {ChainStore, FetchChain} from "zosjs/es";
import AccountStore from "stores/AccountStore";
import AssetName from "../Utility/AssetName";
import Business from "./Business";
import Bitlender from "./Bitlender";
import BitlenderCommitteeModifyModal from "./BitlenderCommitteeModifyModal";
import WalletDb from "stores/WalletDb";
import WalletApi from "api/WalletApi";
import FeeModeModal from "./FeeModeModal";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import counterpart from "counterpart";

require("./bitlender_committee_modify.scss");

class FeeModelRow extends React.Component {
    constructor(props) {
        super();
        this.state = {
            option_id: "",
            fee_mode: ""
        };
    }

    componentDidMount() {
        this._getBitlenderOption();
    }

    _getBitlenderOption() {
        let {asset} = this.props;
        let assetId = asset.id;
        return Apis.instance()
            .db_api()
            .exec("get_bitlender_option", [assetId])
            .then(option => {
                if (option && option.fee_mode) {
                    this.setState({fee_mode: option.fee_mode});
                }
                if (option) {
                    this.setState({option_id: option.id});
                }
            });
    }

    _openModifyModal(asset, fee_mode, option_id, e) {
        e.preventDefault();
        this.props.oprationFuc(asset, fee_mode, option_id);
    }

    render() {
        let {fee_mode, option_id} = this.state;
        let {asset, member_status} = this.props;

        let feeModeKey = fee_mode.toString().trim();

        return (
            <tr key={asset.id}>
                <td style={{width: 10}} />
                <td>{asset.symbol}</td>
                <td
                    style={{
                        textAlign: "center"
                    }}
                >
                    {feeModeKey
                        ? counterpart.translate(
                              `business.feemodel.${feeModeKey}`
                          )
                        : fee_mode}
                </td>
                {member_status === "lifetime" ? (
                    <td
                        style={{
                            textAlign: "right"
                        }}
                    >
                        {asset ? (
                            <Link
                                to={null}
                                onClick={this._openModifyModal.bind(
                                    this,
                                    asset,
                                    fee_mode,
                                    option_id
                                )}
                            >
                                <Translate content="business.manage" />
                            </Link>
                        ) : null}
                    </td>
                ) : null}
                <td style={{width: 10}} />
            </tr>
        );
    }
}

class BitlenderFeeMode extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            account_name: "",
            account: null,
            assets: [],
            current_asset: null,
            option_id: ""
        };

        let currentAccount = AccountStore.getState().currentAccount;
        if (currentAccount) {
            this.state.account_name = currentAccount;
            this.state.account = ChainStore.getAccount(currentAccount);
        }
    }

    componentDidMount() {
        this._initData();
    }

    _initData() {
        var _that = this;
        let {account_name} = this.state;

        let bitlenderPromise = Apis.instance()
            .bitlender_api()
            .exec("get_asset_by_property", [8 | 0x20]);
        let accountPromise = FetchChain("getAccount", account_name);

        return Promise.all([bitlenderPromise, accountPromise]).then(res => {
            let [assets, account] = res;
            assets = assets && assets.length ? assets : [];
            _that.setState({
                assets: assets,
                account: account
            });
        });
    }

    _openModal(asset, fee_mode, option_id) {
        //console.log("asset:", asset);
        let state = {};
        state.current_asset = asset;
        state.current_mode = fee_mode;
        state.option_id = option_id;
        this.setState(state, () => ZfApi.publish("fee_mode_modal", "open"));
    }

    render() {
        let {assets, account} = this.state;
        let member_status = ChainStore.getAccountMemberStatus(account);

        let symbolRows = [];
        assets.forEach(asset => {
            symbolRows.push(
                <FeeModelRow
                    key={asset.id}
                    asset={asset}
                    member_status={member_status}
                    account={account}
                    oprationFuc={this._openModal.bind(this)}
                />
            );
        });

        let content = (
            <div
                ref="outerWrapper"
                className="grid-block vertical"
                style={{
                    borderTop: "1px solid rgb(240, 242, 248)"
                }}
            >
                <table className="table">
                    <thead>
                        <tr>
                            <th style={{width: 10}} />
                            <th>
                                <Translate
                                    component="span"
                                    content="business.bitlender.symbol"
                                />
                            </th>
                            <th
                                style={{
                                    textAlign: "center"
                                }}
                            >
                                <Translate
                                    component="span"
                                    content="business.feemodel.current_feemodel"
                                />
                            </th>
                            {member_status === "lifetime" ? (
                                <th
                                    style={{
                                        textAlign: "right"
                                    }}
                                >
                                    <Translate
                                        component="span"
                                        content="business.bitlender.operation"
                                    />
                                </th>
                            ) : null}
                            <th style={{width: 10}} />
                        </tr>
                    </thead>
                    <tbody>{symbolRows}</tbody>
                </table>

                <FeeModeModal
                    modalId="fee_mode_modal"
                    current_asset={this.state.current_asset}
                    current_mode={this.state.current_mode}
                    option_id={this.state.option_id}
                    account={account}
                    onClose={() => {
                        ZfApi.publish("fee_mode_modal", "close");
                    }}
                />
            </div>
        );

        let bitlender = <Bitlender tab="bitlender_feemode" content={content} />;

        return <Business tab="bitlender" content={bitlender} />;
    }
}

export default BitlenderFeeMode;

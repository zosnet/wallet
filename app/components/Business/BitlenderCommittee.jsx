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

require("./bitlender_committee_modify.scss");

class BitlenderCommitteeRow extends React.Component {
    constructor(props) {
        super();
        this.state = {
            option_id: "",
            authsKey: "active",
            authors: {}
        };
    }

    componentDidMount() {
        this._getBitlenderOption();
    }

    _getBitlenderOption() {
        let {asset, authsKey} = this.props;
        let {authors} = this.state;
        let assetId = asset.id;
        var _that = this;

        function _getObjects(objectIds) {
            Apis.instance()
                .db_api()
                .exec("get_objects", [objectIds])
                .then(objs => {
                    // console.log(assetId, objectIds, objs);

                    if (
                        objs &&
                        objs[0] &&
                        objs[0][authsKey] &&
                        objs[0][authsKey].account_auths
                    ) {
                        objs[0][authsKey].account_auths.forEach(auth => {
                            _getAccounts([auth[0]]);
                        });
                    }
                });
        }

        function _getAccounts(accountIds) {
            Apis.instance()
                .db_api()
                .exec("get_accounts", [accountIds])
                .then(accounts => {
                    if (accounts && accounts[0] && accounts[0].name) {
                        if (!(accounts[0].id in authors)) {
                            authors[accounts[0].id] = accounts[0];
                        }
                    }
                    _that.setState({authors});
                });
        }

        return Apis.instance()
            .db_api()
            .exec("get_bitlender_option", [assetId])
            .then(option => {
                if (option && option.author) {
                    _that.setState({option_id: option.id});
                    _getObjects([option.author]);
                }
            });
    }

    openModifyModal(symbol) {
        this.refs["bcm_modal_" + symbol].show();
    }

    onConfirm(authors = []) {
        let {option_id} = this.state;
        let {account} = this.props;
        let account_id = account.get("id");

        if (!authors) {
            return false;
        }

        let authorIds = Object.keys(authors);
        let weight_threshold =
            authorIds && authorIds.length ? authorIds.length : 0;

        var tr = WalletApi.new_transaction();
        let transfer_op = tr.get_type_operation("bitlender_option_author", {
            fee: {
                amount: 0,
                asset_id: "1.3.0"
            },
            issuer: account_id,
            option_id: option_id,
            authors: authorIds,
            weight_threshold: weight_threshold
        });

        return tr.update_head_block().then(() => {
            tr.add_type_operation("proposal_create", {
                proposed_ops: [{op: transfer_op}],
                fee_paying_account: account_id
            });

            return WalletDb.process_transaction(tr, null, true);
        });
    }

    render() {
        let {authors} = this.state;
        let {asset, member_status} = this.props;
        let authorNames = [];

        if (authors) {
            Object.keys(authors).forEach(key => {
                authorNames.push(authors[key].name);
            });
        }

        return (
            <tr key={asset.id}>
                <td style={{width: 10}} />
                <td>{asset.symbol}</td>
                <td
                    style={{
                        textAlign: "center"
                    }}
                >
                    {authorNames ? authorNames.join(", ") : ""}
                </td>
                {member_status === "lifetime" ? (
                    <td
                        style={{
                            textAlign: "right"
                        }}
                    >
                        {authors && asset ? (
                            <Link
                                to={null}
                                onClick={this.openModifyModal.bind(
                                    this,
                                    asset.symbol
                                )}
                            >
                                <Translate content="business.manage" />
                            </Link>
                        ) : null}
                        {authors ? (
                            <BitlenderCommitteeModifyModal
                                ref={"bcm_modal_" + asset.symbol}
                                modalId={"bcm_modal_" + asset.symbol}
                                asset={asset}
                                authors={authors}
                                onConfirm={this.onConfirm.bind(this)}
                            />
                        ) : null}
                    </td>
                ) : null}
                <td style={{width: 10}} />
            </tr>
        );
    }
}

class BitlenderCommittee extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            account_name: "",
            account: null,
            assets: []
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

    render() {
        let {assets, account} = this.state;
        let member_status = ChainStore.getAccountMemberStatus(account);

        let symbolRows = [];
        assets.forEach(asset => {
            symbolRows.push(
                <BitlenderCommitteeRow
                    key={asset.id}
                    asset={asset}
                    member_status={member_status}
                    account={account}
                    authsKey="active"
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
                                    content="business.bitlender.members"
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
            </div>
        );

        let bitlender = (
            <Bitlender tab="bitlender_committee" content={content} />
        );

        return <Business tab="bitlender" content={bitlender} />;
    }
}

export default BitlenderCommittee;

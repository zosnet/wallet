import React from "react";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import BaseModal from "../Modal/BaseModal";
import Translate from "react-translate-component";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import AccountSelect from "components/Forms/AccountSelect";
import AccountStore from "stores/AccountStore";
import WalletDb from "stores/WalletDb";
import WalletApi from "api/WalletApi";
import pu from "common/permission_utils";
import {ChainStore} from "zosjs/es";
import {Apis} from "zosjs-ws";
import {debounce, cloneDeep} from "lodash";
import Immutable from "immutable";
import AssetName from "../Utility/AssetName";
import Icon from "components/Icon/Icon";
import counterpart from "counterpart";

class BitlenderCommitteeModifyModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            open: false,
            searchTerm: "",
            accounts: [],
            authors: null
        };
        this._searchAccounts = debounce(this._searchAccounts, 200);
    }

    show() {
        this.setState(
            {
                open: true,
                authors: cloneDeep(this.props.authors)
            },
            () => {
                ZfApi.publish(this.props.modalId, "open");
            }
        );
    }

    onClose() {
        this.setState({open: false}, () => {
            ZfApi.publish(this.props.modalId, "close");
        });
    }

    _onAdd(auth) {
        let {authors, accounts} = this.state;
        console.log("_onAdd:", auth, authors, accounts);
        if (!(auth in authors)) {
            authors[auth] = accounts[auth];
            this.setState({authors});
            this.forceUpdate();
        }
    }

    _onRemove(auth) {
        let {authors} = this.state;
        console.log("_onRemove:", auth, authors);
        if (auth in authors) {
            delete authors[auth];
            this.setState({authors});
            this.forceUpdate();
        }
    }

    _onSearchChange(e) {
        this.setState({
            searchTerm: e.target.value.toLowerCase()
        });
        this._searchAccounts(e.target.value);
    }

    _searchAccounts(searchTerm) {
        return Apis.instance()
            .db_api()
            .exec("lookup_accounts_by_type", [searchTerm, 3, 50])
            .then(res => {
                let accountIds = [];
                if (res && res.length) {
                    res.forEach(one => {
                        accountIds.push(one[1]);
                    });
                }
                if (accountIds.length) {
                    Apis.instance()
                        .db_api()
                        .exec("get_accounts", [accountIds])
                        .then(accounts => {
                            let accountsMap = {};
                            accounts.forEach(account => {
                                accountsMap[account.id] = account;
                            });
                            this.setState({accounts: accountsMap});
                            this.forceUpdate();
                        });
                } else {
                    this.setState({accounts: {}});
                    this.forceUpdate();
                }
            });
    }

    _onConfirm() {
        this.props.onConfirm(this.state.authors);
        this.onClose();
    }

    render() {
        let {asset, modalId} = this.props;
        let {accounts, authors} = this.state;
        let accountRows = [];
        let authorsRows = [];
        var that = this;

        if (accounts) {
            Object.keys(accounts).forEach(key => {
                // let isChecked = false;
                let isChecked = key in authors;
                let cls = "el-checkbox el-transfer-panel__item";
                cls = isChecked ? `${cls} is-checked` : cls;
                accountRows.push(
                    <label
                        key={accounts[key].id}
                        onClick={that._onAdd.bind(this, accounts[key].id)}
                        className={cls}
                    >
                        <span className="el-checkbox__label">
                            <span>{accounts[key].name}</span>
                        </span>
                    </label>
                );
            });
        }

        if (authors) {
            Object.keys(authors).forEach(key => {
                authorsRows.push(
                    <label
                        key={key}
                        onClick={that._onRemove.bind(this, key)}
                        className="el-checkbox el-transfer-panel__item"
                    >
                        <span className="el-checkbox__label">
                            <span>{authors[key].name}</span>
                        </span>
                        <Icon
                            name="remove"
                            size="1x"
                            className="bitlender-remove"
                        />
                    </label>
                );
            });
        }

        let symbolTitle = counterpart.translate("business.bitlender.symbol");
        let placeholderText = counterpart.translate(
            "business.bitlender.account_placeholder"
        );

        let content = (
            <div className="grid-block no-overflow" style={{paddingBottom: 10}}>
                <div
                    className="grid-block small-6 medium-6 vertical no-overflow"
                    style={{
                        paddingRight: 10
                    }}
                >
                    <div className="grid-block vertical no-overflow generic-bordered-box zos-card-bg">
                        <div className="el-transfer-panel">
                            <p className="el-transfer-panel__header">
                                <label className="el-checkbox is-checked">
                                    <Translate
                                        className="el-checkbox__label"
                                        content="business.bitlender.account_filter"
                                    />
                                </label>
                            </p>
                            <div className="el-transfer-panel__body">
                                <div className="el-transfer-panel__filter el-input el-input--small el-input--prefix">
                                    <input
                                        type="text"
                                        placeholder={placeholderText}
                                        value={this.state.searchTerm}
                                        onChange={this._onSearchChange.bind(
                                            this
                                        )}
                                        className="el-input__inner"
                                    />
                                </div>
                                <div className="el-checkbox-group el-transfer-panel__list">
                                    {accountRows}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div
                    className="grid-block small-6 medium-6 vertical no-overflow"
                    style={{
                        paddingLeft: 10
                    }}
                >
                    <div className="grid-block vertical no-overflow generic-bordered-box zos-card-bg">
                        <div className="el-transfer-panel">
                            <p className="el-transfer-panel__header">
                                <label className="el-checkbox is-checked">
                                    <Translate
                                        className="el-checkbox__label"
                                        content="business.bitlender.members_title"
                                    />
                                </label>
                            </p>
                            <div className="el-transfer-panel__body">
                                <div
                                    className="el-checkbox-group el-transfer-panel__list"
                                    style={{height: 382}}
                                >
                                    {authorsRows}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );

        return (
            <BaseModal
                id={modalId}
                overlay={true}
                modalHeader="business.bitlender.modify_title"
                noLoggo
            >
                <div>
                    <p className="bitlender-commitee-symbol">
                        {symbolTitle}: {asset.symbol}
                    </p>
                    {content}
                </div>
                <div className="button-group">
                    <button
                        className="button primary hollow"
                        onClick={this.onClose.bind(this)}
                    >
                        <Translate content="cancel" />
                    </button>
                    <button
                        className="button primary"
                        onClick={this._onConfirm.bind(this)}
                    >
                        <Translate content="confirm" />
                    </button>
                </div>
            </BaseModal>
        );
    }
}

export default BitlenderCommitteeModifyModal;

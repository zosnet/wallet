import React from "react";
import BalanceComponent from "../Utility/BalanceComponent";
import AccountActions from "actions/AccountActions";
import Translate from "react-translate-component";
import AccountSelect from "../Forms/AccountSelect";
import AccountSelector from "../Account/AccountSelector";
import AccountStore from "stores/AccountStore";
import AmountSelector from "../Utility/AmountSelector";
import utils from "common/utils";
import counterpart from "counterpart";
import TransactionConfirmStore from "stores/TransactionConfirmStore";
import {RecentTransactions} from "../Account/RecentTransactions";
import Immutable from "immutable";
import {ChainStore} from "zosjs/es";
import {Apis} from "zosjs-ws";
import {connect} from "alt-react";
import {
    checkFeeStatusAsync,
    checkBalance,
    shouldPayFeeWithAssetAsync
} from "common/trxHelper";
import {debounce, isNaN} from "lodash";
import classnames from "classnames";
import {Asset} from "common/MarketClasses";

class AuthorizeGateway extends React.Component {
    constructor(props) {
        super(props);
        this.state = AuthorizeGateway.getInitialState();
        let {query} = this.props.location;

        if (query.from) {
            this.state.from_name = query.from;
            ChainStore.getAccount(query.from);
        }
        if (query.to) {
            this.state.to_name = query.to;
            ChainStore.getAccount(query.to);
        }
        if (query.amount) this.state.amount = query.amount;
        if (query.asset) {
            this.state.asset_id = query.asset;
            this.state.asset = ChainStore.getAsset(query.asset);
        }
        if (query.memo) this.state.memo = query.memo;
        let currentAccount = AccountStore.getState().currentAccount;
        if (!this.state.from_name) this.state.from_name = currentAccount;
        this.onTrxIncluded = this.onTrxIncluded.bind(this);

        this._updateFee = debounce(this._updateFee.bind(this), 250);
        this._checkFeeStatus = this._checkFeeStatus.bind(this);
        this._checkBalance = this._checkBalance.bind(this);
        this._checkGatewayfromAsset = this._checkGatewayfromAsset.bind(this);
    }

    static getInitialState() {
        return {
            from_name: "",
            to_name: "",
            from_account: null,
            to_account: null,
            amount: "",
            asset_id: null,
            asset: null,
            memo: "",
            error: null,
            propose: true,
            propose_account: "",
            feeAsset: null,
            fee_asset_id: "1.3.0",
            feeAmount: new Asset({amount: 0}),
            feeStatus: {},
            assets: []
        };
    }

    componentWillMount() {
        this.nestedRef = null;
        this._updateFee();
        this._checkFeeStatus();
        let keys = [];
        Apis.instance()
            .bitlender_api()
            .exec("get_asset_by_property", [8 | 0x20])
            .then(res => {
                res.forEach(item => {
                    keys.push(item.id);
                });
                this.assets = keys;
            });
        // this.onPropose.bind(this, true);
    }

    shouldComponentUpdate(np, ns) {
        let {asset_types: current_types} = this._getAvailableAssets();
        let {asset_types: next_asset_types} = this._getAvailableAssets(ns);

        if (next_asset_types.length === 1) {
            let asset = ChainStore.getAsset(next_asset_types[0]);
            if (current_types.length !== 1) {
                this.onAmountChanged({amount: ns.amount, asset});
            }

            if (next_asset_types[0] !== this.state.fee_asset_id) {
                if (asset && this.state.fee_asset_id !== next_asset_types[0]) {
                    this.setState({
                        feeAsset: asset,
                        fee_asset_id: next_asset_types[0]
                    });
                }
            }
        }
        return true;
    }

    componentWillReceiveProps(np) {
        if (
            np.currentAccount !== this.state.from_name &&
            np.currentAccount !== this.props.currentAccount
        ) {
            this.setState(
                {
                    from_name: np.currentAccount,
                    from_account: ChainStore.getAccount(np.currentAccount),
                    feeStatus: {},
                    fee_asset_id: "1.3.0",
                    feeAmount: new Asset({amount: 0})
                },
                () => {
                    this._updateFee();
                    this._checkFeeStatus(
                        ChainStore.getAccount(np.currentAccount)
                    );
                }
            );
        }
    }

    _checkBalance() {
        const {feeAmount, amount, from_account, asset} = this.state;
        if (!asset) return;
        const balanceID = from_account.getIn(["balances", asset.get("id")]);
        const feeBalanceID = from_account.getIn([
            "balances",
            feeAmount.asset_id
        ]);
        if (!asset || !from_account) return;
        if (!balanceID) return this.setState({balanceError: true});
        let balanceObject = ChainStore.getObject(balanceID);
        let feeBalanceObject = feeBalanceID
            ? ChainStore.getObject(feeBalanceID)
            : null;
        if (!feeBalanceObject || feeBalanceObject.get("balance") === 0) {
            this.setState({fee_asset_id: "1.3.0"}, this._updateFee);
        }
        if (!balanceObject || !feeAmount) return;
        const hasBalance = checkBalance(
            amount,
            asset,
            feeAmount,
            balanceObject
        );
        if (hasBalance === null) return;
        this.setState({balanceError: !hasBalance});
    }

    _checkFeeStatus(account = this.state.from_account) {
        if (!account) return;

        const assets = Object.keys(account.get("balances").toJS()).sort(
            utils.sortID
        );
        let feeStatus = {};
        let p = [];
        assets.forEach(a => {
            p.push(
                checkFeeStatusAsync({
                    accountID: account.get("id"),
                    feeID: a,
                    options: ["price_per_kbyte"],
                    data: {
                        type: "memo",
                        content: this.state.memo
                    }
                })
            );
        });
        Promise.all(p)
            .then(status => {
                assets.forEach((a, idx) => {
                    feeStatus[a] = status[idx];
                });
                if (!utils.are_equal_shallow(this.state.feeStatus, feeStatus)) {
                    this.setState({
                        feeStatus
                    });
                }
                this._checkBalance();
            })
            .catch(err => {
                console.error(err);
            });
    }

    _updateFee(state = this.state) {
        let {fee_asset_id, from_account, asset_id} = state;
        const {fee_asset_types} = this._getAvailableAssets(state);
        if (
            fee_asset_types.length === 1 &&
            fee_asset_types[0] !== fee_asset_id
        ) {
            fee_asset_id = fee_asset_types[0];
        }
        if (!from_account) return null;
        checkFeeStatusAsync({
            accountID: from_account.get("id"),
            feeID: fee_asset_id,
            options: ["price_per_kbyte"],
            data: {
                type: "memo",
                content: state.memo
            }
        }).then(({fee, hasBalance, hasPoolBalance}) => {
            shouldPayFeeWithAssetAsync(from_account, fee).then(should => {
                should
                    ? this.setState({fee_asset_id: asset_id}, this._updateFee)
                    : this.setState({
                          feeAmount: fee,
                          fee_asset_id: fee.asset_id,
                          hasBalance,
                          hasPoolBalance,
                          error: !hasBalance || !hasPoolBalance
                      });
            });
        });
    }

    _checkGatewayfromAsset() {
        let {to_account, asset_id} = this.state;
        if (!to_account || !asset_id) {
            this.setState({err_gateway_asset: false});
            return;
        }
        Apis.instance()
            .db_api()
            .exec("get_bitlender_option", [asset_id])
            .then(assets => {
                if (assets && assets.options) {
                    let ary_gateway = assets.gateways;
                    let has_gateway_asset = false;
                    ary_gateway.forEach(id => {
                        if (id === to_account.get("id")) {
                            has_gateway_asset = true;
                        }
                    });
                    if (has_gateway_asset) {
                        this.setState({err_gateway_asset: false});
                    } else {
                        this.setState({err_gateway_asset: true});
                    }
                    return;
                }
            });
        this.setState({err_gateway_asset: true});
    }

    fromChanged(from_name) {
        if (!from_name) this.setState({from_account: null});
        this.setState({
            from_name,
            error: null,
            propose: true,
            propose_account: ""
        });
    }

    toChanged(to_name) {
        this.setState({to_name, error: null});
    }

    onFromAccountChanged(from_account) {
        this.setState({from_account, error: null}, () => {
            this._updateFee();
            this._checkFeeStatus();
        });
    }

    onToAccountChanged(to_account) {
        if (to_account.get("uaccount_property")) {
            let account_gateway = 0x00000001;
            let gateway = to_account.get("uaccount_property") & account_gateway;
            this._checkGatewayfromAsset();
            if (gateway !== account_gateway) {
                this.setState({to_account, error: null, gateway_err: true});
                return;
            }
        }
        this.setState({to_account, error: null, gateway_err: null});
    }

    onAmountChanged({amount, asset}) {
        if (!asset) {
            return;
        }
        this.setState(
            {amount, asset, asset_id: asset.get("id"), error: null},
            this._checkGatewayfromAsset,
            this._checkBalance
        );
    }

    onFeeChanged({asset}) {
        this.setState(
            {feeAsset: asset, fee_asset_id: asset.get("id"), error: null},
            this._updateFee
        );
    }

    onMemoChanged(e) {
        this.setState({memo: e.target.value}, this._updateFee);
    }

    onTrxIncluded(confirm_store_state) {
        if (
            confirm_store_state.included &&
            confirm_store_state.broadcasted_transaction
        ) {
            // this.setState(Transfer.getInitialState());
            TransactionConfirmStore.unlisten(this.onTrxIncluded);
            TransactionConfirmStore.reset();
        } else if (confirm_store_state.closed) {
            TransactionConfirmStore.unlisten(this.onTrxIncluded);
            TransactionConfirmStore.reset();
        }
    }

    onPropose(propose, e) {
        e.preventDefault();
        this.setState({propose, propose_account: null});
    }

    onProposeAccount(propose_account) {
        this.setState({propose_account});
    }

    resetForm() {
        this.setState({memo: "", to_name: "", amount: ""});
    }

    onSubmit(e) {
        e.preventDefault();
        this.setState({error: null});
        const {asset, amount} = this.state;
        const sendAmount = new Asset({
            real: amount,
            asset_id: asset.get("id"),
            precision: asset.get("precision")
        });

        AccountActions.gateway_issue_currency(
            this.state.from_account.get("id"),
            this.state.to_account.get("id"),
            sendAmount.getAmount(),
            asset.get("id"),
            this.state.memo
                ? new Buffer(this.state.memo, "utf-8")
                : this.state.memo,
            this.state.propose ? this.state.propose_account : null,
            false,
            this.state.feeAsset ? this.state.feeAsset.get("id") : "1.3.0"
        )
            .then(() => {
                this.resetForm.call(this);
                TransactionConfirmStore.unlisten(this.onTrxIncluded);
                TransactionConfirmStore.listen(this.onTrxIncluded);
            })
            .catch(e => {
                let msg = e.message
                    ? e.message.split("\n")[1] || e.message
                    : null;
                console.log("error: ", e, msg);
                this.setState({error: msg});
            });
    }

    setNestedRef(ref) {
        this.nestedRef = ref;
    }

    _setTotal(asset_id, balance_id) {
        const {feeAmount} = this.state;
        let balanceObject = ChainStore.getObject(balance_id);
        let transferAsset = ChainStore.getObject(asset_id);

        let balance = new Asset({
            amount: balanceObject.get("balance"),
            asset_id: transferAsset.get("id"),
            precision: transferAsset.get("precision")
        });

        if (balanceObject) {
            if (feeAmount.asset_id === balance.asset_id) {
                balance.minus(feeAmount);
            }
            this.setState(
                {amount: balance.getAmount({real: true})},
                this._checkBalance
            );
        }
    }

    _getAvailableAssets(state = this.state) {
        const {feeStatus} = this.state;
        function hasFeePoolBalance(id) {
            if (feeStatus[id] === undefined) return true;
            return feeStatus[id] && feeStatus[id].hasPoolBalance;
        }

        function hasBalance(id) {
            if (feeStatus[id] === undefined) return true;
            return feeStatus[id] && feeStatus[id].hasBalance;
        }

        const {from_account, from_error} = state;
        let asset_types = [],
            fee_asset_types = [];
        if (!(from_account && from_account.get("balances") && !from_error)) {
            return {asset_types, fee_asset_types};
        }
        let account_balances = state.from_account.get("balances").toJS();
        asset_types = Object.keys(account_balances).sort(utils.sortID);
        fee_asset_types = Object.keys(account_balances).sort(utils.sortID);
        for (let key in account_balances) {
            let balanceObject = ChainStore.getObject(account_balances[key]);
            if (balanceObject && balanceObject.get("balance") === 0) {
                // asset_types.splice(asset_types.indexOf(key), 1);
                if (fee_asset_types.indexOf(key) !== -1) {
                    fee_asset_types.splice(fee_asset_types.indexOf(key), 1);
                }
            }
        }
        fee_asset_types = fee_asset_types.filter(a => {
            return hasFeePoolBalance(a) && hasBalance(a);
        });
        return {asset_types, fee_asset_types};
    }

    _onAccountDropdown(account) {
        let newAccount = ChainStore.getAccount(account);
        if (newAccount) {
            this.setState({
                from_name: account,
                from_account: ChainStore.getAccount(account)
            });
        }
    }

    render() {
        let from_error = null;
        let {
            propose,
            from_account,
            to_account,
            asset,
            asset_id,
            propose_account,
            feeAmount,
            amount,
            error,
            to_name,
            from_name,
            memo,
            feeAsset,
            fee_asset_id,
            balanceError,
            gateway_err
        } = this.state;
        let from_my_account =
            AccountStore.isMyAccount(from_account) ||
            from_name === this.props.passwordAccount;

        if (from_account && !from_my_account && !propose) {
            from_error = (
                <span>
                    {counterpart.translate("account.errors.not_yours")}
                    &nbsp;(<a onClick={this.onPropose.bind(this, true)}>
                        {counterpart.translate("propose")}
                    </a>)
                </span>
            );
        }

        let {fee_asset_types} = this._getAvailableAssets();
        let asset_types = [];
        if (this.assets) {
            asset_types = this.assets;
        }

        let balance = null;

        // Estimate fee
        let fee = this.state.feeAmount.getAmount({real: true});
        if (from_account && from_account.get("balances") && !from_error) {
            let account_balances = from_account.get("balances").toJS();
            if (asset_types.length === 1)
                asset = ChainStore.getAsset(asset_types[0]);
            if (asset_types.length > 0) {
                let current_asset_id = asset ? asset.get("id") : asset_types[0];
                let feeID = feeAsset ? feeAsset.get("id") : "1.3.0";
                balance = (
                    <span
                        style={{
                            borderBottom: "#A09F9F 1px dotted",
                            cursor: "pointer"
                        }}
                        onClick={this._setTotal.bind(
                            this,
                            current_asset_id,
                            account_balances[current_asset_id],
                            fee,
                            feeID
                        )}
                    >
                        <Translate
                            component="span"
                            content="authorize_gateway.available"
                        />:{" "}
                        <BalanceComponent
                            balance={account_balances[current_asset_id]}
                        />
                    </span>
                );
            } else {
                balance = "No funds";
            }
        }

        let propose_incomplete = propose && !propose_account;
        const amountValue = parseFloat(
            String.prototype.replace.call(amount, /,/g, "")
        );
        const isAmountValid = amountValue && !isNaN(amountValue);
        const isToAccountValid =
            to_account && to_account.get("name") === to_name;
        const isSendNotValid =
            !from_account ||
            !isToAccountValid ||
            !isAmountValid ||
            !asset ||
            from_error ||
            propose_incomplete ||
            gateway_err ||
            balanceError;
        let accountsList = Immutable.Set();
        accountsList = accountsList.add(from_account);
        let tabIndex = 1;

        const contactsList = this.props.contactsList.toArray();

        const receiverProps = contactsList.length
            ? {
                  typeahead: contactsList,
                  typeaheadOptions: {
                      typeaheadVisibleStyle: {
                          paddingBottom: "1rem"
                      }
                  }
              }
            : {};

        return (
            <div className="grid-block vertical">
                <div style={{height: 10, background: "#f9fbfe"}} />
                <div className="grid-block shrink vertical medium-horizontal">
                    <div
                        className="grid-content small-12 medium-6 large-6"
                        style={{paddingRight: 10}}
                    >
                        <form
                            className="zos-card-bg"
                            style={{
                                padding: "0 15px",
                                overflow: "visible",
                                paddingBottom: 20
                            }}
                            onSubmit={this.onSubmit.bind(this)}
                            noValidate
                        >
                            <div
                                className="zos-block-content-header"
                                style={{
                                    marginBottom: 20
                                }}
                            >
                                <Translate
                                    content="authorize_gateway.header"
                                    component="span"
                                />
                            </div>
                            {/*  F R O M  */}
                            <div className="content-block">
                                <AccountSelector
                                    label="authorize_gateway.from"
                                    ref="from"
                                    accountName={from_name}
                                    onChange={this.fromChanged.bind(this)}
                                    onAccountChanged={this.onFromAccountChanged.bind(
                                        this
                                    )}
                                    account={from_name}
                                    size={60}
                                    error={from_error}
                                    tabIndex={tabIndex++}
                                    onDropdownSelect={this._onAccountDropdown.bind(
                                        this
                                    )}
                                    dropDownContent={AccountStore.getMyAccounts()}
                                />
                            </div>
                            {/*  T O  */}
                            <div className="content-block">
                                <AccountSelector
                                    label="authorize_gateway.to"
                                    accountName={to_name}
                                    onChange={this.toChanged.bind(this)}
                                    onAccountChanged={this.onToAccountChanged.bind(
                                        this
                                    )}
                                    account={to_name}
                                    size={60}
                                    tabIndex={tabIndex++}
                                    {...receiverProps}
                                />
                                {this.state.gateway_err ? (
                                    <p
                                        className="has-error no-margin"
                                        style={{paddingTop: 10}}
                                    >
                                        <Translate content="authorize_gateway.errors.gateway_err" />
                                    </p>
                                ) : null}
                            </div>
                            {/*  A M O U N T   */}
                            <div className="content-block transfer-input">
                                <AmountSelector
                                    label="authorize_gateway.amount"
                                    amount={amount}
                                    onChange={this.onAmountChanged.bind(this)}
                                    asset={
                                        asset_types.length > 0 && asset
                                            ? asset.get("id")
                                            : asset_id
                                                ? asset_id
                                                : asset_types[0]
                                    }
                                    assets={asset_types}
                                    display_balance={balance}
                                    tabIndex={tabIndex++}
                                />
                                {this.state.balanceError ? (
                                    <p
                                        className="has-error no-margin"
                                        style={{paddingTop: 10}}
                                    >
                                        <Translate content="authorize_gateway.errors.insufficient" />
                                    </p>
                                ) : null}
                                {this.state.err_gateway_asset ? (
                                    <p
                                        className="has-error no-margin"
                                        style={{paddingTop: 10}}
                                    >
                                        <Translate content="authorize_gateway.errors.err_gateway_asset" />
                                    </p>
                                ) : null}
                            </div>
                            {/*  M E M O  */}
                            <div className="content-block transfer-input">
                                {memo && memo.length ? (
                                    <label className="right-label">
                                        {memo.length}
                                    </label>
                                ) : null}
                                <Translate
                                    className="left-label tooltip"
                                    component="label"
                                    content="authorize_gateway.memo"
                                    data-place="top"
                                    data-tip={counterpart.translate(
                                        "tooltip.memo_tip"
                                    )}
                                />
                                <textarea
                                    style={{marginBottom: 0}}
                                    rows="3"
                                    value={memo}
                                    tabIndex={tabIndex++}
                                    onChange={this.onMemoChanged.bind(this)}
                                />
                                {/* warning */}
                                {/*this.state.propose ? (
                                    <div
                                        className="error-area"
                                        style={{position: "absolute"}}
                                    >
                                        <Translate
                                            content="transfer.warn_name_unable_read_memo"
                                            name={this.state.from_name}
                                        />
                                    </div>
                                ) : null*/}
                            </div>

                            {/*  F E E   */}
                            <div
                                className={
                                    "content-block transfer-input fee-row" +
                                    (this.state.propose ? " proposal" : "")
                                }
                            >
                                <AmountSelector
                                    refCallback={this.setNestedRef.bind(this)}
                                    label="authorize_gateway.fee"
                                    disabled={true}
                                    amount={fee}
                                    onChange={this.onFeeChanged.bind(this)}
                                    asset={
                                        fee_asset_types.length && feeAmount
                                            ? feeAmount.asset_id
                                            : fee_asset_types.length === 1
                                                ? fee_asset_types[0]
                                                : fee_asset_id
                                                    ? fee_asset_id
                                                    : fee_asset_types[0]
                                    }
                                    assets={fee_asset_types}
                                    tabIndex={tabIndex++}
                                    error={
                                        this.state.hasPoolBalance === false
                                            ? "authorize_gateway.errors.insufficient"
                                            : null
                                    }
                                />
                                {propose ? (
                                    <button
                                        className={classnames(
                                            "button float-right no-margin",
                                            {disabled: isSendNotValid}
                                        )}
                                        type="submit"
                                        value="Submit"
                                        tabIndex={tabIndex++}
                                    >
                                        <Translate
                                            component="span"
                                            content="propose"
                                        />
                                    </button>
                                ) : (
                                    <button
                                        className={classnames(
                                            "button float-right no-margin",
                                            {disabled: isSendNotValid}
                                        )}
                                        type="submit"
                                        value="Submit"
                                        tabIndex={tabIndex++}
                                    >
                                        <Translate
                                            component="span"
                                            content="authorize_gateway.send"
                                        />
                                    </button>
                                )}
                            </div>

                            {/* P R O P O S E   F R O M
                                Having some proposed transaction logic here (prior to the transaction confirmation)
                                allows adjusting of the memo to / from parameters.
                            */}
                            {propose ? (
                                <div className="full-width-content form-group transfer-input">
                                    <label className="left-label">
                                        <Translate content="account.propose_from" />
                                    </label>
                                    <AccountSelect
                                        account_names={AccountStore.getMyAccounts()}
                                        onChange={this.onProposeAccount.bind(
                                            this
                                        )}
                                        tabIndex={tabIndex++}
                                    />
                                </div>
                            ) : null}

                            {/*  S E N D  B U T T O N  */}
                            {error ? (
                                <div className="content-block has-error">
                                    {error}
                                </div>
                            ) : null}

                            {/* TODO: show remaining balance */}
                        </form>
                    </div>
                </div>
            </div>
        );
    }
}

export default connect(AuthorizeGateway, {
    listenTo() {
        return [AccountStore];
    },
    getProps() {
        return {
            currentAccount: AccountStore.getState().currentAccount,
            passwordAccount: AccountStore.getState().passwordAccount,
            contactsList: AccountStore.getState().accountContacts
        };
    }
});

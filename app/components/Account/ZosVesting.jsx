import React from "react";
import {FormattedDate} from "react-intl";
import Translate from "react-translate-component";
import FormattedAsset from "../Utility/FormattedAsset";
import {ChainStore} from "zosjs/es";
import utils from "common/utils";
import WalletActions from "actions/WalletActions";
import {Apis} from "zosjs-ws";
import {Tabs, Tab} from "../Utility/Tabs";
import counterpart from "counterpart";
import ZosPaginatedList from "../Utility/ZosPaginatedList";
import AssetName from "../Utility/AssetName";
import AccountActions from "actions/AccountActions";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";

class VestingBalance extends React.Component {
    constructor() {
        super();

        this.state = {
            allowedAmount: null
        };
    }

    _getAllowedWithdraw(id, time_sec) {
        Apis.instance()
            .db_api()
            .exec("get_allowed_withdraw", [id, time_sec])
            .then(allowed => {
                this.setState({allowedAmount: allowed});
            })
            .catch(err => {
                console.log("error:", err);
            });
    }

    componentWillMount() {
        let time = this.props.time;
        this._getAllowedWithdraw.call(this, this.props.vb.id, time);
    }

    componentWillUpdate(nextProps) {
        let newTime = nextProps.time;
        let time = this.props.time;
        if (newTime !== time) {
            this._getAllowedWithdraw.call(this, nextProps.vb.id, newTime);
        }
    }
    _onClaim(claimAll, e) {
        e.preventDefault();
        if (this.props.vb && this.props.vb.policy[0] === 1) {
            WalletActions.claimVestingBalance(
                this.props.account.id,
                this.props.vb,
                claimAll
            ).then(() => {
                typeof this.props.handleChanged == "function" &&
                    this.props.handleChanged();
            });
        } else {
            if (this.props.vb && this.props.vb.policy[0] === 0) {
                WalletActions.claimVestingBalance_0(
                    this.props.account.id,
                    this.props.vb,
                    this.state.allowedAmount,
                    claimAll
                ).then(() => {
                    typeof this.props.handleChanged == "function" &&
                        this.props.handleChanged();
                });
            }
        }
    }

    formatTimestampToTimezone(timestamp) {
        let date = new Date();
        date.setTime(timestamp);
        let y = date.getFullYear();
        let m = date.getMonth() + 1;
        let d = date.getDate();
        let h = date.getHours();
        let i = date.getMinutes();
        let s = date.getSeconds();

        return (
            y +
            "-" +
            (m > 9 ? m : "0" + m) +
            "-" +
            (d > 9 ? d : "0" + d) +
            "T" +
            (h > 9 ? h : "0" + h) +
            ":" +
            (i > 9 ? i : "0" + i) +
            ":" +
            (s > 9 ? s : "0" + s) +
            "Z"
        );
    }

    renderPolicyZero(vb) {
        let cvbAsset, balance, begin_timestamp, cash_timestamp, vesting_seconds;
        let {allowedAmount} = this.state;
        if (vb) {
            balance = vb.balance.amount;
            begin_timestamp = vb.policy[1].begin_timestamp;
            begin_timestamp = !/Z$/.test(begin_timestamp)
                ? begin_timestamp + "Z"
                : begin_timestamp;
            cash_timestamp = this.formatTimestampToTimezone(
                new Date().setTime(
                    new Date(vb.policy[1].begin_timestamp).getTime() +
                        parseInt(vb.policy[1].vesting_cliff_seconds, 10) * 1000
                )
            );

            vesting_seconds = vb.policy[1].vesting_duration_seconds;
            cvbAsset = ChainStore.getAsset(vb.balance.asset_id);
        }

        if (!cvbAsset) {
            return null;
        }

        if (!balance) {
            return null;
        }

        return (
            <tr key={vb.id}>
                <td>{vb.id}</td>
                <td>
                    <FormattedAsset
                        amount={vb.balance.amount}
                        asset={vb.balance.asset_id}
                    />
                </td>
                <td>
                    <FormattedDate value={begin_timestamp} format="full" />
                </td>
                <td>
                    <FormattedDate value={cash_timestamp} format="full" />
                </td>
                <td>{vesting_seconds} seconds</td>
                <td>
                    {allowedAmount ? (
                        <FormattedAsset
                            amount={allowedAmount.amount}
                            asset={allowedAmount.asset_id}
                        />
                    ) : null}
                </td>

                <td>
                    <button
                        onClick={this._onClaim.bind(this, false)}
                        className="button"
                    >
                        <Translate content="account.member.claim" />
                    </button>
                </td>
            </tr>
        );
    }

    renderPolicyOne(vb) {
        let cvbAsset,
            vestingPeriod,
            earned,
            secondsPerDay = 60 * 60 * 24,
            availablePercent,
            balance;
        let {allowedAmount} = this.state;
        if (vb) {
            balance = vb.balance.amount;
            cvbAsset = ChainStore.getAsset(vb.balance.asset_id);
            earned = vb.policy[1].coin_seconds_earned;
            vestingPeriod = vb.policy[1].vesting_seconds;
            availablePercent =
                vestingPeriod === 0 ? 1 : earned / (vestingPeriod * balance);
        }

        if (!cvbAsset) {
            return null;
        }

        if (!balance) {
            return null;
        }

        return (
            <tr key={vb.id}>
                <td>{vb.id}</td>
                <td>
                    <FormattedAsset
                        amount={vb.balance.amount}
                        asset={vb.balance.asset_id}
                    />
                </td>
                <td>
                    {utils.format_number(
                        utils.get_asset_amount(
                            earned / secondsPerDay,
                            cvbAsset
                        ),
                        0
                    )}
                    &nbsp;
                    <Translate content="account.member.coindays" />
                </td>
                <td>
                    {utils.format_number(
                        (vestingPeriod * (1 - availablePercent)) /
                            secondsPerDay || 0,
                        2
                    )}
                    &nbsp;days
                </td>
                <td>
                    {utils.format_number(
                        utils.get_asset_amount(
                            (vb.balance.amount * vestingPeriod) / secondsPerDay,
                            cvbAsset
                        ),
                        0
                    )}
                    &nbsp;
                    <Translate content="account.member.coindays" />
                </td>
                <td>
                    {utils.format_number(availablePercent * 100, 2)}% /{" "}
                    <FormattedAsset
                        amount={availablePercent * vb.balance.amount}
                        asset={cvbAsset.get("id")}
                    />
                </td>

                <td>
                    <button
                        onClick={this._onClaim.bind(this, false)}
                        className="button"
                    >
                        <Translate content="account.member.claim" />
                    </button>
                </td>
            </tr>
        );
    }

    render() {
        let {vb, time} = this.props;
        if (!this.props.vb) {
            return null;
        }

        let policyType = vb.policy[0];
        return policyType == 0
            ? this.renderPolicyZero(vb)
            : this.renderPolicyOne(vb);
    }
}

class ZosVesting extends React.Component {
    static propTypes = {
        dynGlobalObject: ChainTypes.ChainObject.isRequired
    };
    static defaultProps = {
        dynGlobalObject: "2.1.0"
    };
    constructor() {
        super();

        this.state = {
            vbs: null,
            tabs: [
                {
                    name: "linear",
                    translate: "account.vesting.types.linear"
                },
                {
                    name: "coin_seconds",
                    translate: "account.vesting.types.coin_seconds"
                },
                {
                    name: "exchange",
                    translate: "account.vesting.types.exchange"
                }
            ],
            receiveAsset: undefined,
            receiveAmount: 0,
            amountAfter: 0,
            maxReceiveValue: 0,
            feedPrice: null
        };
    }

    componentWillMount() {
        this.retrieveVestingBalances.call(this, this.props.account.get("id"));
    }

    componentWillUpdate(nextProps) {
        let newId = nextProps.account.get("id");
        let oldId = this.props.account.get("id");

        if (newId !== oldId) {
            this.retrieveVestingBalances.call(this, newId);
        }
    }

    retrieveVestingBalances(accountId) {
        accountId = accountId || this.props.account.get("id");
        Apis.instance()
            .db_api()
            .exec("get_vesting_balances", [accountId])
            .then(vbs => {
                this.setState({vbs});
            })
            .catch(err => {
                console.log("error:", err);
            });
    }

    _convertValue(amount, fromAsset, toAsset) {
        if (!amount || !fromAsset || !toAsset) {
            return 0;
        }
        let fromRate = fromAsset
            .getIn(["options", "core_exchange_rate"])
            .toJS();
        let toRate = toAsset.getIn(["options", "core_exchange_rate"]).toJS();
        //console.log("fromRate:",fromRate,"toRate",toRate)
        let fromID = fromAsset.get("id");
        let toID = toAsset.get("id");
        let price = utils.convertPrice(fromRate, toRate, fromID, toID);
        //console.log("price:",price)
        let amount_precision = utils.get_asset_amount_precision(
            amount,
            fromAsset
        );
        let value = 0;
        if (price) {
            value = utils.convertValue(
                price,
                amount_precision,
                fromAsset,
                toAsset
            );
        }
        //console.log("value:",value)
        return value ? utils.get_asset_amount(value, toAsset) : 0;
    }

    getTabContentHeader(tabIndex) {
        return [
            <tr>
                <th>
                    <Translate content="account.vesting.balance_id" />
                </th>
                <th>
                    <Translate content="account.member.cashback" />
                </th>
                <th>
                    <Translate content="account.member.transfer_time" />
                </th>
                <th>
                    <Translate content="account.member.extractable_time" />
                </th>
                <th>
                    <Translate content="account.member.vesting_seconds" />
                </th>
                <th>
                    <Translate content="account.member.available" />
                </th>
                <th>
                    <Translate content="account.perm.action" />
                </th>
            </tr>,
            <tr>
                <th>
                    <Translate content="account.vesting.balance_id" />
                </th>
                <th>
                    <Translate content="account.member.cashback" />
                </th>
                <th>
                    <Translate content="account.member.earned" />
                </th>
                <th>
                    <Translate content="account.member.required" />
                </th>
                <th>
                    <Translate content="account.member.coindays" />
                </th>
                <th>
                    <Translate content="account.member.remaining" />
                </th>
                <th>
                    <Translate content="account.perm.action" />
                </th>
            </tr>,
            <tr>
                <th>
                    <Translate content="account.vesting.balance_id" />
                </th>
                <th>
                    <Translate content="account.member.cashback" />
                </th>
                <th>
                    <Translate content="account.member.available" />
                </th>
                <th>
                    <Translate content="account.perm.action" />
                </th>
            </tr>
        ][tabIndex];
    }

    getTabContent(account, vbs, tabIndex) {
        let vestingHeader = this.getTabContentHeader(tabIndex);
        let balances = null;
        if (tabIndex == 0) {
            balances = vbs
                .map(vb => {
                    if (vb.balance.amount && vb.policy[0] == 0) {
                        return (
                            <VestingBalance
                                key={vb.id}
                                vb={vb}
                                account={account}
                                handleChanged={this.retrieveVestingBalances.bind(
                                    this
                                )}
                                time={this.props.dynGlobalObject.get("time")}
                            />
                        );
                    }
                })
                .filter(a => {
                    return !!a;
                });
        } else if (tabIndex == 1) {
            balances = vbs
                .map(vb => {
                    if (vb.balance.amount && vb.policy[0] == 1) {
                        return (
                            <VestingBalance
                                key={vb.id}
                                vb={vb}
                                account={account}
                                handleChanged={this.retrieveVestingBalances.bind(
                                    this
                                )}
                                time={this.props.dynGlobalObject.get("time")}
                            />
                        );
                    }
                })
                .filter(a => {
                    return !!a;
                });
        }

        return (
            <div>
                {balances && balances.length ? (
                    <ZosPaginatedList
                        header={vestingHeader}
                        rows={balances}
                        pageSize={100}
                        style={{paddingLeft: 0, paddingRight: 0}}
                    />
                ) : (
                    <table className="table">
                        <tbody>
                            <tr>
                                <td>
                                    <Translate
                                        content={"account.vesting.no_balances"}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                )}
            </div>
        );
    }

    handleExchangeChange(nextState, fromAsset) {
        let newState = {};
        if (nextState.receiveAmount != undefined) {
            newState.receiveAmount = nextState.receiveAmount;
            if (nextState.receiveAmount == 0) {
                newState.amountAfter = 0;
            }
        }
        if (nextState.receiveAsset != undefined) {
            newState.receiveAsset = nextState.receiveAsset;
        }

        let receiveAmount = nextState.receiveAmount;
        let receiveAsset = nextState.receiveAsset || this.state.receiveAsset;
        if (receiveAmount && receiveAsset && nextState.maxValue) {
            let toAsset = receiveAsset.chainObj;
            let fromPrecision = Number(fromAsset.get("precision"));
            let toPrecision = Number(toAsset.get("precision"));
            //maxAmout平台锁定数量
            let maxAmout = utils.get_asset_amount(
                nextState.maxValue,
                fromAsset
            );
            //如果输入值大于平台锁定数量
            if (receiveAmount > maxAmout) {
                receiveAmount = maxAmout; //重置输入值
            }
            let amountAfter = this._convertValue(
                receiveAmount,
                fromAsset,
                toAsset
            ).toFixed(toPrecision);

            let maxAvalableAmount = utils.get_asset_amount(
                receiveAsset.amount,
                toAsset
            );
            //如果输入值转换后的结果>最大可取出来的值
            if (amountAfter > maxAvalableAmount) {
                amountAfter = maxAvalableAmount;
                //反向转换toAsset->fromAsset
                receiveAmount = this._convertValue(
                    amountAfter,
                    toAsset,
                    fromAsset
                );
                //小数点位数
                receiveAmount = Number(receiveAmount).toFixed(fromPrecision);
            }

            if (Number(amountAfter) <= 0) {
                amountAfter = 0;
            }

            this.setState({
                amountAfter: amountAfter,
                receiveAmount: receiveAmount,
                receiveAsset: receiveAsset
            });
        } else {
            this.setState(newState);
        }
    }

    onChangeReceiveAmount(asset, max_value, fromAsset, e) {
        let amount = e.target.value;
        this.handleExchangeChange(
            {
                receiveAmount: amount,
                receiveAsset: asset,
                maxValue: max_value
            },
            fromAsset
        );
    }

    onChangeReceiveAsset(balanceMap, fromAsset, maxReceiveValue, e) {
        let receiveAsset = balanceMap[e.target.value];
        this.handleExchangeChange(
            {
                receiveAmount: this.state.receiveAmount,
                receiveAsset: receiveAsset,
                maxValue: maxReceiveValue
            },
            fromAsset
        );
    }

    onSubmitExchange(account_id, fromAsset, e) {
        let {receiveAsset, receiveAmount} = this.state;
        e.preventDefault();

        if (receiveAsset && receiveAsset.chainObj && receiveAmount) {
            let toAssetId = receiveAsset.chainObj.get("id");
            let precision = fromAsset.get("precision");
            let core_amount = parseInt(
                receiveAmount * Math.pow(10, precision),
                10
            );
            console.log("core_amount:", core_amount, "toAssetId:", toAssetId);
            return AccountActions.account_withdraw_fee(
                account_id,
                core_amount,
                toAssetId
            );
        }
        return false;
    }

    getTabContentWorker(account, wVbs, exchangeBalances, fromAsset) {
        wVbs = wVbs ? wVbs.toJS() : null;
        let {receiveAsset, receiveAmount, amountAfter} = this.state;
        if (wVbs && wVbs.exchange_fees) {
            let assetOptions = [];
            let balanceMap = {};
            if (exchangeBalances) {
                exchangeBalances.forEach(a => {
                    let assetName = a.asset.toUpperCase();
                    assetOptions.push(
                        <option
                            key={a.asset}
                            value={a.asset}
                            disabled={a.amount <= 0}
                        >
                            <span>
                                <AssetName name={assetName} />
                                {a.amount <= 0
                                    ? " (" +
                                      counterpart.translate(
                                          "account.balance_history.balance"
                                      ) +
                                      ": 0)"
                                    : null}
                            </span>
                        </option>
                    );
                    balanceMap[a.asset] = a;
                    if (receiveAsset === undefined && a.amount > 0) {
                        receiveAsset = a;
                    }
                });
            }

            let receiveAssetName =
                receiveAsset && receiveAsset.asset ? receiveAsset.asset : "";
            let assetSelector = (
                <select
                    value={receiveAssetName}
                    onChange={this.onChangeReceiveAsset.bind(
                        this,
                        balanceMap,
                        fromAsset,
                        wVbs.exchange_fees
                    )}
                    className="bts-select"
                >
                    {assetOptions}
                </select>
            );

            let cannot =
                receiveAsset &&
                receiveAsset.chainObj &&
                receiveAmount > 0 &&
                amountAfter > 0
                    ? false
                    : true;

            let exchangeRate = null;
            if (receiveAsset && receiveAsset.chainObj) {
                let price = receiveAsset.chainObj.getIn([
                    "options",
                    "core_exchange_rate"
                ]);
                price = price && price.toJS ? price.toJS() : price;
                //console.log("price:",price)
                if (price && price.base && price.quote) {
                    exchangeRate =
                        price.base.amount /
                        Math.pow(10, receiveAsset.chainObj.get("precision")) /
                        (price.quote.amount /
                            Math.pow(10, fromAsset.get("precision")));
                }
            }

            let form1 = (
                <form
                    style={{maxWidth: "60rem"}}
                    onSubmit={this.onSubmitExchange.bind(
                        this,
                        account.id,
                        fromAsset
                    )}
                >
                    <h4 style={{marginBottom: 20}}>
                        <Translate content="account.withdow_exchange_fee.title" />
                    </h4>
                    <section style={{position: "relative"}}>
                        <label className="left-label">
                            <span>
                                {counterpart.translate(
                                    "account.withdow_exchange_fee.receive_amount"
                                )}
                            </span>
                            <span
                                style={{
                                    float: "right",
                                    color: "#ccc",
                                    fontSize: "12px"
                                }}
                            >
                                {counterpart.translate(
                                    "account.withdow_exchange_fee.locaked_amount"
                                )}
                                :
                                <FormattedAsset
                                    amount={wVbs.exchange_fees}
                                    asset={"1.3.0"}
                                />
                            </span>
                        </label>
                        <input
                            type="number"
                            value={receiveAmount || ""}
                            onChange={this.onChangeReceiveAmount.bind(
                                this,
                                receiveAsset,
                                wVbs.exchange_fees,
                                fromAsset
                            )}
                        />
                        {fromAsset ? (
                            <span
                                style={{
                                    position: "absolute",
                                    right: 0,
                                    bottom: 0,
                                    height: "2.4rem",
                                    lineHeight: "2.4rem",
                                    width: "5rem",
                                    textAlign: "right",
                                    paddingRight: "0.6rem",
                                    // background: "#a4abbe",
                                    // color: "#fff",
                                    borderTopRightRadius: 5,
                                    borderBottomRightRadius: 5
                                }}
                            >
                                {fromAsset.get("symbol").toUpperCase()}
                            </span>
                        ) : null}
                    </section>

                    <section>
                        <label className="left-label">
                            <span>
                                {counterpart.translate(
                                    "account.withdow_exchange_fee.to_symbol"
                                )}
                            </span>
                            <span
                                style={{
                                    float: "right",
                                    color: "#ccc",
                                    fontSize: "12px"
                                }}
                            >
                                {counterpart.translate(
                                    "account.withdow_exchange_fee.can_receive"
                                )}
                                :
                                {receiveAsset && receiveAsset.amount ? (
                                    <FormattedAsset
                                        amount={receiveAsset.amount}
                                        asset={receiveAsset.asset}
                                    />
                                ) : (
                                    <FormattedAsset
                                        amount={0}
                                        asset={"1.3.0"}
                                    />
                                )}
                            </span>
                        </label>
                        {assetSelector}
                    </section>

                    <section
                        style={{position: "relative", marginBottom: "2rem"}}
                    >
                        <label className="left-label">
                            <span>
                                {counterpart.translate(
                                    "account.withdow_exchange_fee.exchange_receive"
                                )}
                            </span>
                            {receiveAsset &&
                            receiveAsset.asset &&
                            exchangeRate ? (
                                <span
                                    style={{
                                        float: "right",
                                        color: "#ccc",
                                        fontSize: "12px"
                                    }}
                                >
                                    {counterpart.translate(
                                        "account.withdow_exchange_fee.exchange_rate"
                                    )}
                                    :&nbsp;
                                    {fromAsset.get("symbol").toUpperCase()}/
                                    {receiveAsset.asset.toUpperCase()}
                                    &nbsp;
                                    {Number(exchangeRate).toFixed(8)}
                                </span>
                            ) : null}
                        </label>
                        <input type="text" value={amountAfter || ""} readOnly />
                        {receiveAsset && receiveAsset.asset ? (
                            <span
                                style={{
                                    position: "absolute",
                                    right: 0,
                                    bottom: 0,
                                    height: "2.4rem",
                                    lineHeight: "2.4rem",
                                    width: "5rem",
                                    textAlign: "right",
                                    paddingRight: "0.6rem",
                                    // background: "#a4abbe",
                                    // color: "#fff",
                                    borderTopRightRadius: 5,
                                    borderBottomRightRadius: 5
                                }}
                            >
                                {receiveAsset.asset.toUpperCase()}
                            </span>
                        ) : null}
                    </section>

                    <button
                        style={{width: "100%"}}
                        className="submit-button button no-margin"
                        disabled={cannot}
                    >
                        <Translate content="account.withdow_exchange_fee.receive" />
                    </button>
                </form>
            );
            return (
                <div className="grid-block align-center">
                    <div className="grid-block shrink vertical">
                        <div className="grid-content shrink text-center account-creation">
                            <pre
                                style={{
                                    textAlign: "left",
                                    display: "none"
                                }}
                            >
                                {JSON.stringify(wVbs, null, 2)}
                            </pre>
                            {form1}
                        </div>
                    </div>
                </div>
            );
        } else {
            return (
                <table className="table">
                    <tbody>
                        <tr>
                            <td>
                                <Translate
                                    content={"account.vesting.no_balances"}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            );
        }
    }

    render() {
        let {vbs} = this.state;
        if (
            !vbs ||
            !this.props.account ||
            !this.props.account.get("vesting_balances")
        ) {
            return null;
        }

        let account = this.props.account.toJS();

        let tabs = [];

        for (let i = 0; i < this.state.tabs.length; i++) {
            let currentTab = this.state.tabs[i];

            if (i < 2) {
                let tabContent = this.getTabContent(account, vbs, i);
                tabs.push(
                    <Tab key={i} title={currentTab.translate}>
                        {tabContent}
                    </Tab>
                );
            } else {
                let wVbs = ChainStore.getObject(account.statistics);
                let exchang_account = ChainStore.getAccount("1.2.6");
                let fromAsset = ChainStore.getAsset("1.3.0");

                // console.log("exchang_account", exchang_account)

                let exchang_account_balances = null;
                let exchangeBalances = [];
                if (exchang_account) {
                    exchang_account_balances = exchang_account.get("balances");
                    // console.log("exchang_account_balances", exchang_account_balances)
                    if (exchang_account_balances) {
                        exchang_account_balances = exchang_account_balances.filter(
                            (a, index) => {
                                let balanceObject = ChainStore.getObject(a);
                                if (balanceObject) {
                                    return true;
                                } else {
                                    return false;
                                }
                            }
                        );

                        exchang_account_balances.forEach((a, asset_type) => {
                            let asset = ChainStore.getAsset(asset_type);
                            if (asset) {
                                let assetName = asset
                                    .get("symbol")
                                    .toUpperCase();
                                let balanceObject = ChainStore.getObject(a);
                                exchangeBalances.push({
                                    asset: assetName,
                                    amount: balanceObject.get("balance"),
                                    precision: asset.get("precision"),
                                    chainObj: asset
                                });
                            }
                        });
                    }
                }

                let tabContent = this.getTabContentWorker(
                    account,
                    wVbs,
                    exchangeBalances,
                    fromAsset
                );
                tabs.push(
                    <Tab key={i} title={currentTab.translate}>
                        {tabContent}
                    </Tab>
                );
            }
        }

        return (
            <div
                className="grid-content app-tables no-padding zos-account-permission"
                ref="appTables"
            >
                <div style={{height: 10, background: "#f9fbfe"}} />
                <Tabs
                    defaultActiveTab={0}
                    segmented={false}
                    setting="businessTab-{this.props.tab}"
                    className="account-tabs"
                    tabsClass="account-overview bordered-header content-block"
                    contentClass="tab-content padding"
                >
                    {tabs}
                </Tabs>
            </div>
        );
    }
}

ZosVesting = BindToChainState(ZosVesting, {show_loader: true});
ZosVesting.VestingBalance = VestingBalance;
export default ZosVesting;

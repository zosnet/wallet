import React from "react";
import FormattedAsset from "../Utility/FormattedAsset";
import {Link} from "react-router/es";
import classNames from "classnames";
import Translate from "react-translate-component";
import counterpart from "counterpart";
import utils from "common/utils";
import BlockTime from "./BlockTime";
import LinkToAccountById from "../Utility/LinkToAccountById";
import LinkToAssetById from "../Utility/LinkToAssetById";
import BindToChainState from "../Utility/BindToChainState";
import ChainTypes from "../Utility/ChainTypes";
import TranslateWithLinks from "../Utility/TranslateWithLinks";
import {ChainStore, ChainTypes as grapheneChainTypes} from "zosjs/es";
import account_constants from "chain/account_constants";
import MemoText from "./MemoText";
import ProposedOperation from "./ProposedOperation";
import marketUtils from "common/market_utils";
import {connect} from "alt-react";
import SettingsStore from "stores/SettingsStore";

const {operations} = grapheneChainTypes;
require("./operations.scss");

let ops = Object.keys(operations);
let listings = account_constants.account_listing;

class TransactionLabel extends React.Component {
    shouldComponentUpdate(nextProps) {
        return (
            nextProps.color !== this.props.color ||
            nextProps.type !== this.props.type
        );
    }
    render() {
        let trxTypes = counterpart.translate("transaction.trxTypes");
        // let labelClass = classNames("label", this.props.color || "info");
        let labelClass = "labelinfo";
        return (
            <span className={labelClass}>
                {trxTypes[ops[this.props.type]] || ops[this.props.type]}
            </span>
        );
    }
}

class Row extends React.Component {
    static contextTypes = {
        router: React.PropTypes.object.isRequired
    };

    static propTypes = {
        dynGlobalObject: ChainTypes.ChainObject.isRequired
    };

    static defaultProps = {
        dynGlobalObject: "2.1.0",
        tempComponent: "tr"
    };

    constructor(props) {
        super(props);
        // this.showDetails = this.showDetails.bind(this);
    }
    //
    // showDetails(e) {
    //     e.preventDefault();
    //     this.context.router.push(`/block/${this.props.block}`);
    // }

    shouldComponentUpdate(nextProps) {
        let {block, dynGlobalObject} = this.props;
        let last_irreversible_block_num = dynGlobalObject.get(
            "last_irreversible_block_num"
        );
        if (nextProps.dynGlobalObject === this.props.dynGlobalObject) {
            return false;
        }
        return block > last_irreversible_block_num;
    }

    render() {
        let {block, fee, color, type, hideOpLabel, hidePending} = this.props;

        let last_irreversible_block_num = this.props.dynGlobalObject.get(
            "last_irreversible_block_num"
        );
        let pending = null;
        if (!hidePending && block > last_irreversible_block_num) {
            pending = (
                <span>
                    (
                    <Translate
                        content="operation.pending"
                        blocks={block - last_irreversible_block_num}
                    />
                    )
                </span>
            );
        }

        fee.amount = parseInt(fee.amount, 10);

        return (
            <tr>
                {this.props.includeOperationId ? (
                    <td
                        style={{
                            textAlign: "left",
                            paddingLeft: 15
                        }}
                    >
                        {this.props.operationId}
                    </td>
                ) : null}
                {hideOpLabel ? null : (
                    <td
                        style={{
                            textAlign: "left",
                            paddingLeft: 15
                        }}
                        className="left-td column-hide-tiny"
                    >
                        <Link
                            className="inline-block"
                            data-place="bottom"
                            data-tip={counterpart.translate(
                                "tooltip.show_block",
                                {
                                    block: utils.format_number(
                                        this.props.block,
                                        0
                                    )
                                }
                            )}
                            to={`/explorer/block/${this.props.block}`}
                        >
                            <TransactionLabel color={color} type={type} />
                        </Link>
                    </td>
                )}
                <td
                    style={{
                        padding: "8px 5px 8px 15px",
                        textAlign: "left"
                    }}
                >
                    <div>
                        <span>{this.props.info}</span>
                    </div>
                    <div style={{fontSize: 14, paddingTop: 5}}>
                        {/*<span>{counterpart.translate("explorer.block.title").toLowerCase()} <Link to={`/block/${block}`}>{utils.format_number(block, 0)}</Link></span>*/}
                        {!this.props.hideFee ? (
                            <span className="facolor-fee">
                                {" "}
                                -{" "}
                                <FormattedAsset
                                    amount={fee.amount}
                                    asset={fee.asset_id}
                                />
                            </span>
                        ) : null}
                        {pending ? <span> - {pending}</span> : null}
                    </div>
                </td>
                <td>
                    {!this.props.hideDate ? (
                        <BlockTime block_number={block} />
                    ) : null}
                </td>
            </tr>
        );
    }
}
Row = BindToChainState(Row, {keep_updating: true});

class Operation extends React.Component {
    static defaultProps = {
        op: [],
        current: "",
        block: null,
        hideOpLabel: false,
        csvExportMode: false
    };

    static propTypes = {
        op: React.PropTypes.array.isRequired,
        current: React.PropTypes.string,
        block: React.PropTypes.number,
        csvExportMode: React.PropTypes.bool
    };

    componentWillReceiveProps(np) {
        if (np.marketDirections !== this.props.marketDirections) {
            this.forceUpdate();
        }
    }

    linkToAccount(name_or_id) {
        if (!name_or_id) return <span>-</span>;
        return utils.is_object_id(name_or_id) ? (
            <LinkToAccountById account={name_or_id} />
        ) : (
            <Link to={`/account/${name_or_id}`}>{name_or_id}</Link>
        );
    }

    linkToAsset(symbol_or_id) {
        if (!symbol_or_id) return <span>-</span>;
        return utils.is_object_id(symbol_or_id) ? (
            <LinkToAssetById asset={symbol_or_id} />
        ) : (
            <Link to={`/asset/${symbol_or_id}`}>{symbol_or_id}</Link>
        );
    }

    shouldComponentUpdate(nextProps) {
        if (!this.props.op || !nextProps.op) {
            return false;
        }
        return (
            !utils.are_equal_shallow(nextProps.op[1], this.props.op[1]) ||
            nextProps.marketDirections !== this.props.marketDirections
        );
    }

    render() {
        let {op, current, block, result} = this.props;
        let line = null,
            column = null,
            color = "info";
        let memoComponent = null;

        switch (
            ops[op[0]] // For a list of trx types, see chain_types.coffee
        ) {
            case "transfer":
                if (op[1].memo) {
                    memoComponent = <MemoText memo={op[1].memo} />;
                }

                color = "success";
                op[1].amount.amount = parseFloat(op[1].amount.amount);

                column = (
                    <span className="right-td">
                        <TranslateWithLinks
                            string="operation.transfer"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].from,
                                    arg: "from"
                                },
                                {
                                    type: "amount",
                                    value: op[1].amount,
                                    arg: "amount"
                                    // decimalOffset:
                                    //     op[1].amount.asset_id === "1.3.0"
                                    //         ? 5
                                    //         : null
                                },
                                {type: "account", value: op[1].to, arg: "to"}
                            ]}
                        />
                        {memoComponent}
                    </span>
                );

                break;

            case "limit_order_create":
                color = "warning";
                let o = op[1];
                /*
                marketName = OPEN.ETH_USD
                if (!inverted) (default)
                    price = USD / OPEN.ETH
                    buy / sell OPEN.ETH
                    isBid = amount_to_sell.asset_symbol = USD
                    amount = to_receive
                if (inverted)
                    price =  OPEN.ETH / USD
                    buy / sell USD
                    isBid = amount_to_sell.asset_symbol = OPEN.ETH
                    amount =
                */
                column = (
                    <span>
                        <BindToChainState.Wrapper
                            base={o.min_to_receive.asset_id}
                            quote={o.amount_to_sell.asset_id}
                        >
                            {({base, quote}) => {
                                const {
                                    marketName,
                                    first,
                                    second
                                } = marketUtils.getMarketName(base, quote);
                                const inverted = this.props.marketDirections.get(
                                    marketName
                                );
                                // const paySymbol = base.get("symbol");
                                // const receiveSymbol = quote.get("symbol");

                                const isBid =
                                    o.amount_to_sell.asset_id ===
                                    (inverted
                                        ? first.get("id")
                                        : second.get("id"));

                                let priceBase = isBid
                                    ? o.amount_to_sell
                                    : o.min_to_receive;
                                let priceQuote = isBid
                                    ? o.min_to_receive
                                    : o.amount_to_sell;
                                const amount = isBid
                                    ? op[1].min_to_receive
                                    : op[1].amount_to_sell;

                                return (
                                    <TranslateWithLinks
                                        string={
                                            isBid
                                                ? "operation.limit_order_buy"
                                                : "operation.limit_order_sell"
                                        }
                                        keys={[
                                            {
                                                type: "account",
                                                value: op[1].seller,
                                                arg: "account"
                                            },
                                            {
                                                type: "amount",
                                                value: amount,
                                                arg: "amount"
                                            },
                                            {
                                                type: "price",
                                                value: {
                                                    base: priceBase,
                                                    quote: priceQuote
                                                },
                                                arg: "price"
                                            }
                                        ]}
                                    />
                                );
                            }}
                        </BindToChainState.Wrapper>
                    </span>
                );
                break;

            case "limit_order_cancel":
                color = "cancel";
                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.limit_order_cancel"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].fee_paying_account,
                                    arg: "account"
                                }
                            ]}
                            params={{
                                order: op[1].order.substring(4)
                            }}
                        />
                    </span>
                );
                break;

            case "call_order_update":
                color = "warning";

                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.call_order_update"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].funding_account,
                                    arg: "account"
                                },
                                {
                                    type: "asset",
                                    value: op[1].delta_debt.asset_id,
                                    arg: "debtSymbol"
                                },
                                {
                                    type: "amount",
                                    value: op[1].delta_debt,
                                    arg: "debt"
                                },
                                {
                                    type: "amount",
                                    value: op[1].delta_collateral,
                                    arg: "collateral"
                                }
                            ]}
                        />
                    </span>
                );
                break;

            case "key_create":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="transaction.create_key"
                        />
                    </span>
                );
                break;

            case "account_create":
                column = (
                    <TranslateWithLinks
                        string="operation.reg_account"
                        keys={[
                            {
                                type: "account",
                                value: op[1].registrar,
                                arg: "registrar"
                            },
                            {
                                type: "account",
                                value: op[1].name,
                                arg: "new_account"
                            }
                        ]}
                    />
                );
                break;

            case "account_update":
                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.update_account"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].account,
                                    arg: "account"
                                }
                            ]}
                        />
                    </span>
                );

                break;
            case "account_authenticate":
                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.account_authenticate"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].issuer,
                                    arg: "issuer"
                                }
                            ]}
                        />
                    </span>
                );

                break;
            case "account_whitelist":
                let label =
                    op[1].new_listing === listings.no_listing
                        ? "unlisted_by"
                        : op[1].new_listing === listings.white_listed
                            ? "whitelisted_by"
                            : "blacklisted_by";
                column = (
                    <span>
                        <TranslateWithLinks
                            string={"operation." + label}
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].authorizing_account,
                                    arg: "lister"
                                },
                                {
                                    type: "account",
                                    value: op[1].account_to_list,
                                    arg: "listee"
                                }
                            ]}
                        />
                    </span>
                );
                break;

            case "account_upgrade":
                column = (
                    <span>
                        <TranslateWithLinks
                            string={
                                op[1].upgrade_to_lifetime_member
                                    ? "operation.lifetime_upgrade_account"
                                    : "operation.annual_upgrade_account"
                            }
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].account_to_upgrade,
                                    arg: "account"
                                }
                            ]}
                        />
                    </span>
                );
                break;

            case "account_transfer":
                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.account_transfer"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].account_id,
                                    arg: "account"
                                },
                                {
                                    type: "account",
                                    value: op[1].new_owner,
                                    arg: "to"
                                }
                            ]}
                        />
                    </span>
                );
                break;

            case "asset_create":
                color = "warning";
                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.asset_create"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].issuer,
                                    arg: "account"
                                },
                                {
                                    type: "asset",
                                    value: op[1].symbol,
                                    arg: "asset"
                                }
                            ]}
                        />
                    </span>
                );
                break;

            case "asset_update":
            case "asset_update_bitasset":
                color = "warning";
                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.asset_update"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].issuer,
                                    arg: "account"
                                },
                                {
                                    type: "asset",
                                    value: op[1].asset_to_update,
                                    arg: "asset"
                                }
                            ]}
                        />
                    </span>
                );
                break;

            case "asset_update_feed_producers":
                console.log("asset_update_feed_producers", op);
                color = "warning";

                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.asset_update_feed_producers"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].issuer,
                                    arg: "account"
                                },
                                {
                                    type: "asset",
                                    value: op[1].asset_to_update,
                                    arg: "asset"
                                }
                            ]}
                        />
                    </span>
                );
                break;

            case "asset_issue":
                color = "warning";

                if (op[1].memo) {
                    memoComponent = <MemoText memo={op[1].memo} />;
                }

                op[1].asset_to_issue.amount = parseInt(
                    op[1].asset_to_issue.amount,
                    10
                );
                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.asset_issue"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].issuer,
                                    arg: "account"
                                },
                                {
                                    type: "amount",
                                    value: op[1].asset_to_issue,
                                    arg: "amount"
                                },
                                {
                                    type: "account",
                                    value: op[1].issue_to_account,
                                    arg: "to"
                                }
                            ]}
                        />
                        {memoComponent}
                    </span>
                );
                break;

            case "asset_fund_fee_pool":
                color = "warning";

                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.asset_fund_fee_pool"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].from_account,
                                    arg: "account"
                                },
                                {
                                    type: "asset",
                                    value: op[1].asset_id,
                                    arg: "asset"
                                },
                                {
                                    type: "amount",
                                    value: {
                                        amount: op[1].amount,
                                        asset_id: "1.3.0"
                                    },
                                    arg: "amount"
                                }
                            ]}
                        />
                    </span>
                );
                break;

            case "asset_settle":
                color = "warning";
                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.asset_settle"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].account,
                                    arg: "account"
                                },
                                {
                                    type: "amount",
                                    value: op[1].amount,
                                    arg: "amount"
                                }
                            ]}
                        />
                    </span>
                );
                break;

            case "asset_global_settle":
                color = "warning";
                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.asset_global_settle"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].issuer,
                                    arg: "account"
                                },
                                {
                                    type: "asset",
                                    value: op[1].asset_to_settle,
                                    arg: "asset"
                                },
                                {
                                    type: "price",
                                    value: op[1].settle_price,
                                    arg: "price"
                                }
                            ]}
                        />
                    </span>
                );
                break;

            case "asset_publish_feed":
                color = "warning";
                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.publish_feed"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].publisher,
                                    arg: "account"
                                },
                                {
                                    type: "price",
                                    value: op[1].feed.settlement_price,
                                    arg: "price"
                                }
                            ]}
                        />
                    </span>
                );
                break;

            case "witness_create":
                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.witness_create"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].witness_account,
                                    arg: "account"
                                }
                            ]}
                        />
                    </span>
                );

                break;

            case "witness_update":
                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.witness_update"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].witness_account,
                                    arg: "account"
                                }
                            ]}
                        />
                    </span>
                );

                break;

            case "witness_withdraw_pay":
                if (current === op[1].witness_account) {
                    column = (
                        <span>
                            <Translate
                                component="span"
                                content="transaction.witness_pay"
                            />
                            &nbsp;
                            <FormattedAsset
                                amount={op[1].amount}
                                asset={"1.3.0"}
                            />
                            <Translate
                                component="span"
                                content="transaction.to"
                            />
                            &nbsp;
                            {this.linkToAccount(op[1].witness_account)}
                        </span>
                    );
                } else {
                    column = (
                        <span>
                            <Translate
                                component="span"
                                content="transaction.received"
                            />
                            &nbsp;
                            <FormattedAsset
                                amount={op[1].amount}
                                asset={"1.3.0"}
                            />
                            <Translate
                                component="span"
                                content="transaction.from"
                            />
                            &nbsp;
                            {this.linkToAccount(op[1].witness_account)}
                        </span>
                    );
                }
                break;

            case "proposal_create":
                column = (
                    <div className="inline-block">
                        <span>
                            <TranslateWithLinks
                                string="operation.proposal_create"
                                keys={[
                                    {
                                        type: "account",
                                        value: op[1].fee_paying_account,
                                        arg: "account"
                                    }
                                ]}
                            />
                            :
                        </span>
                        <div>
                            {op[1].proposed_ops.map((o, index) => {
                                return (
                                    <ProposedOperation
                                        op={o.op}
                                        key={index}
                                        index={index}
                                        inverted={false}
                                        hideFee={true}
                                        hideOpLabel={true}
                                        hideDate={true}
                                        proposal={true}
                                    />
                                );
                            })}
                        </div>
                    </div>
                );
                break;

            case "proposal_update":
                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.proposal_update"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].fee_paying_account,
                                    arg: "account"
                                }
                            ]}
                        />
                    </span>
                );
                break;

            case "proposal_delete":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="transaction.trxTypes.proposal_delete"
                        />
                    </span>
                );
                break;

            case "withdraw_permission_create":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="transaction.withdraw_permission_create"
                        />
                        &nbsp;
                        {this.linkToAccount(op[1].withdraw_from_account)}
                        <Translate component="span" content="transaction.to" />
                        &nbsp;
                        {this.linkToAccount(op[1].authorized_account)}
                    </span>
                );
                break;

            case "withdraw_permission_update":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="transaction.withdraw_permission_update"
                        />
                        &nbsp;
                        {this.linkToAccount(op[1].withdraw_from_account)}
                        <Translate component="span" content="transaction.to" />
                        &nbsp;
                        {this.linkToAccount(op[1].authorized_account)}
                    </span>
                );
                break;

            case "withdraw_permission_claim":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="transaction.withdraw_permission_claim"
                        />
                        &nbsp;
                        {this.linkToAccount(op[1].withdraw_from_account)}
                        <Translate component="span" content="transaction.to" />
                        &nbsp;
                        {this.linkToAccount(op[1].withdraw_to_account)}
                    </span>
                );
                break;

            case "withdraw_permission_delete":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="transaction.withdraw_permission_delete"
                        />
                        &nbsp;
                        {this.linkToAccount(op[1].withdraw_from_account)}
                        <Translate component="span" content="transaction.to" />
                        &nbsp;
                        {this.linkToAccount(op[1].authorized_account)}
                    </span>
                );
                break;

            case "fill_order":
                color = "success";
                o = op[1];

                /*
                marketName = OPEN.ETH_USD
                if (!inverted) (default)
                    price = USD / OPEN.ETH
                    buy / sell OPEN.ETH
                    isBid = amount_to_sell.asset_symbol = USD
                    amount = to_receive
                if (inverted)
                    price =  OPEN.ETH / USD
                    buy / sell USD
                    isBid = amount_to_sell.asset_symbol = OPEN.ETH
                    amount =

                    const {marketName, first, second} = marketUtils.getMarketName(base, quote);
                    const inverted = this.props.marketDirections.get(marketName);
                    // const paySymbol = base.get("symbol");
                    // const receiveSymbol = quote.get("symbol");

                    const isBid = o.amount_to_sell.asset_id === (inverted ? first.get("id") : second.get("id"));

                    let priceBase = (isBid) ? o.amount_to_sell : o.min_to_receive;
                    let priceQuote = (isBid) ? o.min_to_receive : o.amount_to_sell;
                    const amount = isBid ? op[1].min_to_receive : op[1].amount_to_sell;
                */

                column = (
                    <span>
                        <BindToChainState.Wrapper
                            base={o.receives.asset_id}
                            quote={o.pays.asset_id}
                        >
                            {({base, quote}) => {
                                const {
                                    marketName,
                                    first,
                                    second
                                } = marketUtils.getMarketName(base, quote);
                                const inverted = this.props.marketDirections.get(
                                    marketName
                                );
                                const isBid =
                                    o.pays.asset_id ===
                                    (inverted
                                        ? first.get("id")
                                        : second.get("id"));

                                // const paySymbol = base.get("symbol");
                                // const receiveSymbol = quote.get("symbol");
                                let priceBase = isBid ? o.receives : o.pays;
                                let priceQuote = isBid ? o.pays : o.receives;
                                let amount = isBid ? o.receives : o.pays;
                                let receivedAmount =
                                    o.fee.asset_id === amount.asset_id
                                        ? amount.amount - o.fee.amount
                                        : amount.amount;

                                return (
                                    <TranslateWithLinks
                                        string={`operation.fill_order_${
                                            isBid ? "buy" : "sell"
                                        }`}
                                        keys={[
                                            {
                                                type: "account",
                                                value: op[1].account_id,
                                                arg: "account"
                                            },
                                            {
                                                type: "amount",
                                                value: {
                                                    amount: receivedAmount,
                                                    asset_id: amount.asset_id
                                                },
                                                arg: "amount",
                                                decimalOffset:
                                                    op[1].receives.asset_id ===
                                                    "1.3.0"
                                                        ? 3
                                                        : null
                                            },
                                            {
                                                type: "price",
                                                value: {
                                                    base: priceBase,
                                                    quote: priceQuote
                                                },
                                                arg: "price"
                                            }
                                        ]}
                                    />
                                );
                            }}
                        </BindToChainState.Wrapper>
                    </span>
                );
                break;

            case "global_parameters_update":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="transaction.global_parameters_update"
                        />
                    </span>
                );
                break;

            case "vesting_balance_create":
                column = (
                    <span>
                        &nbsp;
                        {this.linkToAccount(op[1].creator)}
                        <Translate
                            component="span"
                            content="transaction.vesting_balance_create"
                        />
                        &nbsp;
                        <FormattedAsset
                            amount={op[1].amount.amount}
                            asset={op[1].amount.asset_id}
                        />
                        &nbsp;
                        {this.linkToAccount(op[1].owner)}
                    </span>
                );
                break;

            case "vesting_balance_withdraw":
                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.vesting_balance_withdraw"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].owner,
                                    arg: "account"
                                },
                                {
                                    type: "amount",
                                    value: op[1].amount,
                                    arg: "amount"
                                }
                            ]}
                        />
                    </span>
                );
                break;

            case "worker_create":
                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.worker_create"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].owner,
                                    arg: "account"
                                },
                                {
                                    type: "amount",
                                    value: {
                                        amount: op[1].daily_pay,
                                        asset_id: "1.3.0"
                                    },
                                    arg: "pay"
                                }
                            ]}
                            params={{
                                name: op[1].name
                            }}
                        />
                    </span>
                );
                break;

            case "balance_claim":
                color = "success";
                op[1].total_claimed.amount = parseInt(
                    op[1].total_claimed.amount,
                    10
                );
                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.balance_claim"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].deposit_to_account,
                                    arg: "account"
                                },
                                {
                                    type: "amount",
                                    value: op[1].total_claimed,
                                    arg: "amount"
                                }
                            ]}
                        />
                    </span>
                );
                break;

            case "committee_member_create":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="transaction.committee_member_create"
                        />
                        &nbsp;
                        {this.linkToAccount(op[1].committee_member_account)}
                    </span>
                );
                break;

            case "transfer_to_blind":
                column = (
                    <span>
                        {this.linkToAccount(op[1].from)}
                        &nbsp;
                        <Translate
                            component="span"
                            content="transaction.sent"
                        />
                        &nbsp;
                        <FormattedAsset
                            amount={op[1].amount.amount}
                            asset={op[1].amount.asset_id}
                        />
                    </span>
                );
                break;

            case "transfer_from_blind":
                column = (
                    <span>
                        {this.linkToAccount(op[1].to)}
                        &nbsp;
                        <Translate
                            component="span"
                            content="transaction.received"
                        />
                        &nbsp;
                        <FormattedAsset
                            amount={op[1].amount.amount}
                            asset={op[1].amount.asset_id}
                        />
                    </span>
                );
                break;

            case "asset_claim_fees":
                color = "success";
                op[1].amount_to_claim.amount = parseInt(
                    op[1].amount_to_claim.amount,
                    10
                );
                column = (
                    <span>
                        {this.linkToAccount(op[1].issuer)}
                        &nbsp;
                        <BindToChainState.Wrapper
                            asset={op[1].amount_to_claim.asset_id}
                        >
                            {({asset}) => (
                                <Translate
                                    component="span"
                                    content="transaction.asset_claim_fees"
                                    balance_amount={utils.format_asset(
                                        op[1].amount_to_claim.amount,
                                        asset
                                    )}
                                    asset={asset.get("symbol")}
                                />
                            )}
                        </BindToChainState.Wrapper>
                    </span>
                );
                break;

            case "custom":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="transaction.custom"
                        />
                    </span>
                );
                break;

            case "asset_reserve":
                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.asset_reserve"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].payer,
                                    arg: "account"
                                },
                                {
                                    type: "amount",
                                    value: op[1].amount_to_reserve,
                                    arg: "amount"
                                }
                            ]}
                        />
                    </span>
                );
                break;

            case "committee_member_update_global_parameters":
                // console.log(
                //     "committee_member_update_global_parameters op:",
                //     op
                // );
                column = (
                    <span>
                        <TranslateWithLinks
                            string="operation.committee_member_update_global_parameters"
                            keys={[
                                {
                                    type: "account",
                                    value: "1.2.0",
                                    arg: "account"
                                }
                            ]}
                        />
                    </span>
                );
                break;

            case "override_transfer":
                column = (
                    <TranslateWithLinks
                        string="operation.override_transfer"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "issuer"
                            },
                            {type: "account", value: op[1].from, arg: "from"},
                            {type: "account", value: op[1].to, arg: "to"},
                            {type: "amount", value: op[1].amount, arg: "amount"}
                        ]}
                    />
                );
                break;

            case "committee_member_update":
                column = (
                    <TranslateWithLinks
                        string="operation.committee_member_update"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "issuer"
                            }
                        ]}
                    />
                );
                break;

            // case "blind_transfer":
            // case "assert":
            // case "fba_distribute":
            // case "bid_collateral":
            // case "asset_settle_cancel":
            // case "execute_bid":
            case "gateway_withdraw":
                column = (
                    <TranslateWithLinks
                        string="operation.gateway_withdraw"
                        keys={[
                            {
                                type: "account",
                                value: op[1].to,
                                arg: "to"
                            },
                            {
                                type: "amount",
                                value: op[1].withdraw,
                                arg: "withdraw"
                            }
                        ]}
                    />
                );
                break;

            case "gateway_deposit":
                column = (
                    <TranslateWithLinks
                        string="operation.gateway_deposit"
                        keys={[
                            {
                                type: "account",
                                value: op[1].from,
                                arg: "from"
                            },
                            {
                                type: "amount",
                                value: op[1].deposit,
                                arg: "deposit"
                            }
                        ]}
                    />
                );
                break;

            case "gateway_issue_currency":
                let issue = op[1].revoke ? "revoke" : "issue";
                column = (
                    <TranslateWithLinks
                        string={`proposal.gateway_issue_currency.${issue}`}
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "account"
                            },
                            {
                                type: "amount",
                                value: op[1].issue_currency,
                                arg: "issue_currency"
                            }
                        ]}
                    />
                );
                break;

            case "bitlender_option_create":
                column = (
                    <TranslateWithLinks
                        string="operation.bitlender_option_create"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "issuer"
                            },
                            {
                                type: "bitlender",
                                value: op[1].option_id,
                                arg: "currency"
                            }
                        ]}
                    />
                );
                break;

            case "bitlender_option_author":
                column = (
                    <TranslateWithLinks
                        string="operation.bitlender_option_author"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "issuer"
                            },
                            {
                                type: "bitlender",
                                value: op[1].option_id,
                                arg: "currency"
                            }
                        ]}
                    />
                );
                break;

            case "bitlender_option_update":
                column = (
                    <TranslateWithLinks
                        string="operation.bitlender_option_update"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "issuer"
                            },
                            {
                                type: "bitlender",
                                value: op[1].option_id,
                                arg: "currency"
                            }
                        ]}
                    />
                );
                break;

            case "bitlender_rate_update":
                column = (
                    <TranslateWithLinks
                        string="operation.bitlender_rate_update"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "issuer"
                            },
                            {
                                type: "bitlender",
                                value: op[1].option_id,
                                arg: "currency"
                            }
                        ]}
                    />
                );
                break;

            case "asset_property":
                column = (
                    <TranslateWithLinks
                        string="operation.asset_property"
                        keys={[]}
                    />
                );
                break;

            case "bitlender_lend_order":
                column = (
                    <TranslateWithLinks
                        string="operation.bitlender_lend_order"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "issuer"
                            },
                            {
                                type: "unknown",
                                value: result[1],
                                arg: "id"
                            }
                        ]}
                    />
                );
                break;

            case "bitlender_invest":
                column = (
                    <TranslateWithLinks
                        string="operation.bitlender_invest"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "issuer"
                            },
                            {
                                type: "unknown",
                                value: op[1].order_id,
                                arg: "id"
                            }
                        ]}
                    />
                );
                break;

            case "bitlender_repay_interest":
                column = (
                    <TranslateWithLinks
                        string="operation.bitlender_repay_interest"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "issuer"
                            },
                            {
                                type: "unknown",
                                value: op[1].order_id,
                                arg: "id"
                            },
                            {
                                type: "unknown",
                                value: op[1].repay_period + 1,
                                arg: "n"
                            }
                        ]}
                    />
                );
                break;

            case "bitlender_overdue_interest":
                column = (
                    <TranslateWithLinks
                        string="operation.bitlender_overdue_interest"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "issuer"
                            },
                            {
                                type: "unknown",
                                value: op[1].order_id,
                                arg: "id"
                            },
                            {
                                type: "unknown",
                                value: op[1].repay_period + 1,
                                arg: "n"
                            }
                        ]}
                    />
                );
                break;

            case "bitlender_repay_principal":
                column = (
                    <TranslateWithLinks
                        string="operation.bitlender_repay_principal"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "issuer"
                            },
                            {
                                type: "unknown",
                                value: op[1].order_id,
                                arg: "id"
                            }
                        ]}
                    />
                );
                break;

            case "bitlender_prepayment":
                column = (
                    <TranslateWithLinks
                        string="operation.bitlender_prepayment"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "issuer"
                            },
                            {
                                type: "unknown",
                                value: op[1].order_id,
                                arg: "id"
                            }
                        ]}
                    />
                );
                break;

            case "bitlender_overdue_repay":
                column = (
                    <TranslateWithLinks
                        string="operation.bitlender_overdue_repay"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "issuer"
                            },
                            {
                                type: "unknown",
                                value: op[1].order_id,
                                arg: "id"
                            }
                        ]}
                    />
                );
                break;

            case "bitlender_add_collateral":
                column = (
                    <TranslateWithLinks
                        string="operation.bitlender_add_collateral"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "issuer"
                            },
                            {
                                type: "unknown",
                                value: op[1].order_id,
                                arg: "id"
                            },
                            {
                                type: "amount",
                                value: op[1].collateral,
                                arg: "collateral"
                            }
                        ]}
                    />
                );
                break;

            case "bitlender_recycle":
                column = (
                    <TranslateWithLinks
                        string="operation.bitlender_recycle"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "issuer"
                            },
                            {
                                type: "unknown",
                                value: op[1].order_id,
                                arg: "id"
                            }
                        ]}
                    />
                );
                break;

            // case "bitlender_setautorepayer:
            // case "fill_object_history":
            // case "finance_option_create":
            // case "finance_option_update":
            // case "finance_create":
            // case "finance_enable":
            case "account_coupon":
                column = (
                    <TranslateWithLinks
                        string="operation.account_coupon"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "issuer"
                            }
                        ]}
                    />
                );
                break;

            case "change_identity":
                // console.log("Operation.op[1]", op[1]);
                break;

            // case "bitlender_autorepayment":
            case "account_withdraw_fee":
                column = (
                    <TranslateWithLinks
                        string="operation.account_withdraw_fee"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "issuer"
                            },
                            {
                                type: "asset",
                                value: op[1].withdraw_asset_id,
                                arg: "withdraw_asset_id"
                            }
                        ]}
                    />
                );
                break;

            // case "no_use_1":
            case "gateway_create":
                // console.log("gateway_create", op);
                column = (
                    <TranslateWithLinks
                        string="operation.gateway_create"
                        keys={[
                            {
                                type: "account",
                                value: op[1].gateway_account,
                                arg: "issuer"
                            }
                        ]}
                    />
                );
                break;

            case "gateway_update":
                column = (
                    <TranslateWithLinks
                        string="operation.gateway_update"
                        keys={[
                            {
                                type: "account",
                                value: op[1].gateway_account,
                                arg: "issuer"
                            }
                        ]}
                    />
                );
                break;

            case "carrier_create":
                column = (
                    <TranslateWithLinks
                        string="operation.carrier_create"
                        keys={[
                            {
                                type: "account",
                                value: op[1].carrier_account,
                                arg: "issuer"
                            }
                        ]}
                    />
                );
                break;

            case "carrier_update":
                column = (
                    <TranslateWithLinks
                        string="operation.carrier_update"
                        keys={[
                            {
                                type: "account",
                                value: op[1].carrier_account,
                                arg: "issuer"
                            }
                        ]}
                    />
                );
                break;

            case "budget_member_create":
                column = (
                    <TranslateWithLinks
                        string="operation.budget_member_create"
                        keys={[
                            {
                                type: "account",
                                value: op[1].budget_member_account,
                                arg: "issuer"
                            }
                        ]}
                    />
                );
                break;

            case "budget_member_update":
                column = (
                    <TranslateWithLinks
                        string="operation.budget_member_update"
                        keys={[
                            {
                                type: "account",
                                value: op[1].budget_member_account,
                                arg: "issuer"
                            }
                        ]}
                    />
                );
                break;

            case "transfer_vesting_operation":
                // console.log("transfer_vesting_operation", op);
                column = (
                    <TranslateWithLinks
                        string="operation.transfer_vesting_operation"
                        keys={[
                            {
                                type: "account",
                                value: op[1].from,
                                arg: "from"
                            },
                            {
                                type: "amount",
                                value: op[1].amount,
                                arg: "currency"
                            },
                            {
                                type: "account",
                                value: op[1].to,
                                arg: "to"
                            }
                        ]}
                    />
                );
                break;

            case "revoke_vesting_operation":
                // console.log("revoke_vesting_operation", op);
                column = (
                    <TranslateWithLinks
                        string="operation.revoke_vesting_operation"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "issuer"
                            }
                        ]}
                    />
                );
                break;

            case "bitlender_remove_operation":
                // console.log("bitlender_remove_operation", op);
                column = (
                    <TranslateWithLinks
                        string="operation.bitlender_remove_operation"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "issuer"
                            },
                            {
                                type: "unknown",
                                value: op[1].order_id,
                                arg: "id"
                            }
                        ]}
                    />
                );
                break;

            // case "bitlender_squeeze_operation":

            case "bitlender_publish_feed_operation":
                column = (
                    <TranslateWithLinks
                        string="operation.bitlender_publish_feed_operation"
                        keys={[
                            {
                                type: "account",
                                value: op[1].publisher,
                                arg: "issuer"
                            },
                            {
                                type: "price",
                                value: op[1].feed.settlement_price,
                                arg: "price"
                            }
                        ]}
                    />
                );
                break;

            case "bitlender_option_fee_mode":
                column = (
                    <TranslateWithLinks
                        string="operation.bitlender_option_fee_mode"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "issuer"
                            }
                        ]}
                    />
                );
                break;

            // case "bitlender_update_feed_producers_operation":
            // case "bitlender_test_operation":
            // case "account_lock_balances_operation":

            // case "transfer_vesting":
            default:
                // console.log("unimplemented op:", op);
                column = (
                    <span>
                        <Link to={`/explorer/block/${block}`}>#{block}</Link>
                    </span>
                );
        }

        if (this.props.csvExportMode) {
            const globalObject = ChainStore.getObject("2.0.0");
            const dynGlobalObject = ChainStore.getObject("2.1.0");
            const block_time = utils.calc_block_time(
                block,
                globalObject,
                dynGlobalObject
            );
            return (
                <div>
                    <div>{block_time ? block_time.toLocaleString() : ""}</div>
                    <div>{ops[op[0]]}</div>
                    <div>{column}</div>
                    <div>
                        <FormattedAsset
                            amount={parseInt(op[1].fee.amount, 10)}
                            asset={op[1].fee.asset_id}
                        />
                    </div>
                </div>
            );
        }

        line = column ? (
            <Row
                operationId={this.props.operationId}
                includeOperationId={this.props.includeOperationId}
                block={block}
                type={op[0]}
                color={color}
                fee={op[1].fee}
                hideOpLabel={this.props.hideOpLabel}
                hideDate={this.props.hideDate}
                info={column}
                hideFee={this.props.hideFee}
                hidePending={this.props.hidePending}
            />
        ) : null;

        return line ? line : <tr />;
    }
}

Operation = connect(
    Operation,
    {
        listenTo() {
            return [SettingsStore];
        },
        getProps() {
            return {
                marketDirections: SettingsStore.getState().marketDirections
            };
        }
    }
);

export default Operation;

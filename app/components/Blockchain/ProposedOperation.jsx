import React from "react";
import FormattedAsset from "../Utility/FormattedAsset";
import {Link} from "react-router/es";
import classNames from "classnames";
import Translate from "react-translate-component";
import counterpart from "counterpart";
import market_utils from "common/market_utils";
import utils from "common/utils";
import LinkToAccountById from "../Utility/LinkToAccountById";
import LinkToAssetById from "../Utility/LinkToAssetById";
import BindToChainState from "../Utility/BindToChainState";
import FormattedPrice from "../Utility/FormattedPrice";
import {ChainStore, ChainTypes as grapheneChainTypes} from "zosjs/es";
import account_constants from "chain/account_constants";
import MemoText from "./MemoText";
import TranslateWithLinks from "../Utility/TranslateWithLinks";
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
            <span className={labelClass}>{trxTypes[ops[this.props.type]]}</span>
        );
    }
}

class Row extends React.Component {
    static contextTypes = {
        router: React.PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);
        this.showDetails = this.showDetails.bind(this);
    }

    showDetails(e) {
        e.preventDefault();
        this.context.router.push(`/explorer/block/${this.props.block}`);
    }

    render() {
        let {
            block,
            fee,
            color,
            type,
            hideDate,
            hideFee,
            hideOpLabel
        } = this.props;

        fee.amount = parseInt(fee.amount, 10);
        let endDate = counterpart.localize(new Date(this.props.expiration), {
            format: "short"
        });

        return (
            <div style={{padding: "5px 0", textAlign: "left"}}>
                {hideOpLabel ? null : (
                    <span className="left-td">
                        <a href onClick={this.showDetails}>
                            <TransactionLabel color={color} type={type} />
                        </a>
                    </span>
                )}
                <span>
                    {this.props.info}
                    &nbsp;
                    {hideFee ? null : (
                        <span className="facolor-fee">
                            (
                            <FormattedAsset
                                amount={fee.amount}
                                asset={fee.asset_id}
                            />{" "}
                            fee)
                        </span>
                    )}
                </span>
                {this.props.expiration ? (
                    <div style={{paddingTop: 5, fontSize: "0.85rem"}}>
                        <span>#{this.props.id} | </span>
                        <span>
                            <Translate content="proposal.expires" />: {endDate}
                        </span>
                    </div>
                ) : null}
                {this.props.onclick ? (
                    <span
                        style={{
                            marginTop: 2,
                            fontSize: "0.85rem",
                            color: "#0667d0",
                            borderBottom: "1px solid",
                            textAlign: "center",
                            cursor: "pointer"
                        }}
                        onClick={this.props.onclick}
                    >
                        <Translate content="proposal.details" />
                    </span>
                ) : null}
            </div>
        );
    }
}

class ProposedOperation extends React.Component {
    static defaultProps = {
        op: [],
        current: "",
        block: null,
        hideDate: false,
        hideFee: false,
        hideOpLabel: false,
        csvExportMode: false
    };

    static propTypes = {
        op: React.PropTypes.array.isRequired,
        current: React.PropTypes.string,
        block: React.PropTypes.number,
        hideDate: React.PropTypes.bool,
        hideFee: React.PropTypes.bool,
        csvExportMode: React.PropTypes.bool
    };

    // shouldComponentUpdate(nextProps) {
    //     return utils.are_equal_shallow(nextProps.op, this.props.op);
    // }

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

    render() {
        let {op, current, block} = this.props;
        let status = 0;
        if (this.props.status) {
            status = this.props.status;
        }
        let line = null,
            column = null,
            color = "info";
        let bitlender_option_asset_id = null;

        //console.log(op);

        switch (
            ops[op[0]] // For a list of trx types, see chain_types.coffee
        ) {
            //[0-4]
            case "transfer":
                let memoComponent = null;

                if (op[1].memo) {
                    memoComponent = <MemoText memo={op[1].memo} />;
                }

                color = "success";
                op[1].amount.amount = parseFloat(op[1].amount.amount);

                column = (
                    <span className="right-td">
                        <TranslateWithLinks
                            string="proposal.transfer"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].from,
                                    arg: "from"
                                },
                                {
                                    type: "amount",
                                    value: op[1].amount,
                                    arg: "amount",
                                    decimalOffset:
                                        op[1].amount.asset_id === "1.3.0"
                                            ? 5
                                            : null
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

                let isAsk = market_utils.isAskOp(op[1]);

                column = (
                    <span>
                        <TranslateWithLinks
                            string={
                                isAsk
                                    ? "proposal.limit_order_sell"
                                    : "proposal.limit_order_buy"
                            }
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].seller,
                                    arg: "account"
                                },
                                {
                                    type: "amount",
                                    value: isAsk
                                        ? op[1].amount_to_sell
                                        : op[1].min_to_receive,
                                    arg: "amount"
                                },
                                {
                                    type: "price",
                                    value: {
                                        base: isAsk
                                            ? op[1].min_to_receive
                                            : op[1].amount_to_sell,
                                        quote: isAsk
                                            ? op[1].amount_to_sell
                                            : op[1].min_to_receive
                                    },
                                    arg: "price"
                                }
                            ]}
                        />
                    </span>
                );
                break;

            case "limit_order_cancel":
                color = "cancel";
                column = (
                    <span>
                        {this.linkToAccount(op[1].fee_paying_account)}
                        &nbsp;
                        <Translate
                            component="span"
                            content="proposal.limit_order_cancel"
                        />
                        &nbsp;#
                        {op[1].order.substring(4)}
                    </span>
                );
                break;

            case "call_order_update":
                color = "warning";
                column = (
                    <span>
                        <TranslateWithLinks
                            string="proposal.call_order_update"
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

            case "fill_order":
                color = "success";
                o = op[1];
                column = (
                    <span>
                        {this.linkToAccount(op[1].account_id)}
                        &nbsp;
                        <Translate component="span" content="proposal.paid" />
                        &nbsp;
                        <FormattedAsset
                            style={{fontWeight: "bold"}}
                            amount={op[1].pays.amount}
                            asset={op[1].pays.asset_id}
                        />
                        &nbsp;
                        <Translate component="span" content="proposal.obtain" />
                        &nbsp;
                        <FormattedAsset
                            style={{fontWeight: "bold"}}
                            amount={op[1].receives.amount}
                            asset={op[1].receives.asset_id}
                        />
                        &nbsp;
                        <Translate component="span" content="proposal.at" />
                        &nbsp;
                        <FormattedPrice
                            base_asset={o.pays.asset_id}
                            base_amount={o.pays.amount}
                            quote_asset={o.receives.asset_id}
                            quote_amount={o.receives.amount}
                        />
                    </span>
                );
                break;

            //[5-9]
            case "account_create":
                if (current === op[1].registrar) {
                    column = (
                        <span>
                            <Translate
                                component="span"
                                content="proposal.reg_account"
                            />
                            &nbsp;
                            {this.linkToAccount(op[1].name)}
                        </span>
                    );
                } else {
                    column = (
                        <span>
                            &nbsp;
                            {this.linkToAccount(op[1].registrar)}
                            &nbsp;
                            <Translate
                                component="span"
                                content="proposal.was_reg_account"
                            />
                            {this.linkToAccount(op[1].name)}
                        </span>
                    );
                }
                break;

            case "account_update":
                column = (
                    <span>
                        <TranslateWithLinks
                            string="proposal.update_account"
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

            case "account_whitelist":
                let label =
                    op[1].new_listing === listings.no_listing
                        ? "unlisted_by"
                        : op[1].new_listing === listings.white_listed
                            ? "whitelisted_by"
                            : "blacklisted_by";
                column = (
                    <span>
                        <BindToChainState.Wrapper
                            lister={op[1].authorizing_account}
                            listee={op[1].account_to_list}
                        >
                            {({lister, listee}) => (
                                <Translate
                                    component="span"
                                    content={"transaction." + label}
                                    lister={lister.get("name")}
                                    listee={listee.get("name")}
                                />
                            )}
                        </BindToChainState.Wrapper>
                    </span>
                );
                // if (current === op[1].authorizing_account) {
                //     column = (
                //         <span>
                //             <Translate component="span" content="proposal.whitelist_account" />
                //             &nbsp;{this.linkToAccount(op[1].account_to_list)}
                //         </span>
                //     );
                // } else {
                //     column = (
                //         <span>
                //             <Translate component="span" content="proposal.whitelisted_by" />
                //             &nbsp;{this.linkToAccount(op[1].authorizing_account)}
                //         </span>
                //     );
                // }
                break;

            case "account_upgrade":
                if (op[1].upgrade_to_lifetime_member) {
                    column = (
                        <span>
                            {this.linkToAccount(op[1].account_to_upgrade)}{" "}
                            &nbsp;
                            <Translate
                                component="span"
                                content="proposal.lifetime_upgrade_account"
                            />
                        </span>
                    );
                } else {
                    column = (
                        <span>
                            {this.linkToAccount(op[1].account_to_upgrade)}{" "}
                            &nbsp;
                            <Translate
                                component="span"
                                content="proposal.annual_upgrade_account"
                            />
                        </span>
                    );
                }
                break;

            case "account_transfer":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="proposal.transfer_account"
                        />
                        &nbsp;
                        {this.linkToAccount(op[1].account_id)}
                        <Translate component="span" content="proposal.to" />
                        &nbsp;
                        {this.linkToAccount(op[1].new_owner)}
                    </span>
                );
                break;

            //[10-14]
            case "asset_create":
                color = "warning";
                column = (
                    <TranslateWithLinks
                        string="proposal.asset_create"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "account"
                            }
                        ]}
                        params={{
                            asset: op[1].symbol
                        }}
                    />
                );
                break;

            case "asset_update":
            case "asset_update_bitasset":
                color = "warning";
                column = (
                    <TranslateWithLinks
                        string="proposal.asset_update"
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
                );
                break;

            case "asset_property": //新增更新资产属性
                color = "warning";
                column = (
                    <TranslateWithLinks
                        string="proposal.asset_property"
                        keys={[
                            {
                                type: "account",
                                value: op[1].issuer,
                                arg: "account"
                            },
                            {
                                type: "asset",
                                value: op[1].asset_id,
                                arg: "asset"
                            }
                        ]}
                    />
                );
                break;

            case "asset_update_feed_producers":
                color = "warning";
                column = (
                    <TranslateWithLinks
                        string="proposal.feed_producer"
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
                            string="proposal.asset_issue"
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

            //[15-19]
            case "asset_reserve":
                column = (
                    <span>
                        <TranslateWithLinks
                            string="proposal.asset_reserve"
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

            case "asset_fund_fee_pool":
                color = "warning";
                let asset = ChainStore.getAsset(op[1].asset_id);
                if (asset) asset = asset.get("symbol");
                else asset = op[1].asset_id;
                column = (
                    <span>
                        {this.linkToAccount(op[1].from_account)} &nbsp;
                        <Translate
                            component="span"
                            content="proposal.fund_pool"
                            asset={asset}
                        />
                        &nbsp;
                        <FormattedAsset
                            style={{fontWeight: "bold"}}
                            amount={op[1].amount}
                            asset="1.3.0"
                        />
                    </span>
                );
                break;

            case "asset_settle":
                color = "warning";
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="proposal.asset_settle"
                        />
                        &nbsp;
                        <FormattedAsset
                            style={{fontWeight: "bold"}}
                            amount={op[1].amount.amount}
                            asset={op[1].amount.asset_id}
                        />
                    </span>
                );
                break;

            case "asset_global_settle":
                color = "warning";
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="proposal.asset_global_settle"
                        />
                        &nbsp;
                        {this.linkToAsset(op[1].asset_to_settle)}
                        &nbsp;
                        <Translate component="span" content="proposal.at" />
                        &nbsp;
                        <FormattedPrice
                            style={{fontWeight: "bold"}}
                            quote_amount={op[1].settle_price.quote.amount}
                            quote_asset={op[1].settle_price.quote.asset_id}
                            base_asset={op[1].settle_price.base.asset_id}
                            base_amount={op[1].settle_price.base.amount}
                        />
                    </span>
                );
                break;

            case "asset_publish_feed":
                color = "warning";
                column = (
                    <span>
                        {this.linkToAccount(op[1].publisher)}
                        &nbsp;
                        <Translate
                            component="span"
                            content="proposal.publish_feed"
                        />
                        &nbsp;
                        <FormattedPrice
                            base_asset={
                                op[1].feed.settlement_price.base.asset_id
                            }
                            quote_asset={
                                op[1].feed.settlement_price.quote.asset_id
                            }
                            base_amount={
                                op[1].feed.settlement_price.base.amount
                            }
                            quote_amount={
                                op[1].feed.settlement_price.quote.amount
                            }
                        />
                    </span>
                );
                break;

            //[20-24]
            case "witness_create":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="transaction.trxTypes.witness_create"
                        />
                        &nbsp;
                        {this.linkToAccount(op[1].witness_account)}
                    </span>
                );

                break;

            case "witness_update":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="transaction.trxTypes.witness_update"
                        />
                        &nbsp;
                        {this.linkToAccount(op[1].witness_account)}
                    </span>
                );

                break;

            case "proposal_create":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="proposal.proposal_create"
                        />
                    </span>
                );
                break;

            case "proposal_update":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="proposal.proposal_update"
                        />
                    </span>
                );
                break;

            case "proposal_delete":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="proposal.proposal_delete"
                        />
                    </span>
                );
                break;

            //[25-29]
            case "withdraw_permission_create":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="proposal.withdraw_permission_create"
                        />
                        &nbsp;
                        {this.linkToAccount(op[1].withdraw_from_account)}
                        <Translate component="span" content="proposal.to" />
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
                            content="proposal.withdraw_permission_update"
                        />
                        &nbsp;
                        {this.linkToAccount(op[1].withdraw_from_account)}
                        <Translate component="span" content="proposal.to" />
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
                            content="proposal.withdraw_permission_claim"
                        />
                        &nbsp;
                        {this.linkToAccount(op[1].withdraw_from_account)}
                        <Translate component="span" content="proposal.to" />
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
                            content="proposal.withdraw_permission_delete"
                        />
                        &nbsp;
                        {this.linkToAccount(op[1].withdraw_from_account)}
                        <Translate component="span" content="proposal.to" />
                        &nbsp;
                        {this.linkToAccount(op[1].authorized_account)}
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

            //[30-34]
            case "committee_member_update":
            case "committee_member_update_global_parameters":
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

            case "vesting_balance_create":
                column = (
                    <span>
                        &nbsp;
                        {this.linkToAccount(op[1].creator)}
                        <Translate
                            component="span"
                            content="proposal.vesting_balance_create"
                        />
                        &nbsp;
                        <FormattedAsset
                            style={{fontWeight: "bold"}}
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
                    <TranslateWithLinks
                        string={"proposal.vesting_balance_withdraw"}
                        keys={[
                            {
                                type: "account",
                                value: op[1].owner,
                                arg: "account"
                            },
                            {type: "amount", value: op[1].amount, arg: "amount"}
                        ]}
                    />
                );
                break;

            case "worker_create":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="proposal.create_worker"
                        />
                        &nbsp;
                        <FormattedAsset
                            style={{fontWeight: "bold"}}
                            amount={op[1].daily_pay}
                            asset={"1.3.0"}
                        />
                    </span>
                );
                break;

            //[35-39]
            case "custom":
                column = (
                    <span>
                        <Translate component="span" content="proposal.custom" />
                    </span>
                );
                break;
            // case "assert":
            case "balance_claim":
                color = "success";
                op[1].total_claimed.amount = parseInt(
                    op[1].total_claimed.amount,
                    10
                );
                column = (
                    <span>
                        {this.linkToAccount(op[1].deposit_to_account)}
                        &nbsp;
                        <BindToChainState.Wrapper
                            asset={op[1].total_claimed.asset_id}
                        >
                            {({asset}) => (
                                <Translate
                                    component="span"
                                    content="proposal.balance_claim"
                                    balance_amount={utils.format_asset(
                                        op[1].total_claimed.amount,
                                        asset
                                    )}
                                    balance_id={op[1].balance_to_claim.substring(
                                        5
                                    )}
                                />
                            )}
                        </BindToChainState.Wrapper>
                    </span>
                );
                break;

            case "override_transfer":
                column = (
                    <TranslateWithLinks
                        string="proposal.override_transfer"
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

            case "transfer_to_blind":
                column = (
                    <span>
                        {this.linkToAccount(op[1].from)}
                        &nbsp;
                        <Translate component="span" content="proposal.sent" />
                        &nbsp;
                        <FormattedAsset
                            style={{fontWeight: "bold"}}
                            amount={op[1].amount.amount}
                            asset={op[1].amount.asset_id}
                        />
                    </span>
                );
                break;

            //[40-44]
            // case "blind_transfer":
            case "transfer_from_blind":
                column = (
                    <span>
                        {this.linkToAccount(op[1].to)}
                        &nbsp;
                        <Translate
                            component="span"
                            content="proposal.received"
                        />
                        &nbsp;
                        <FormattedAsset
                            style={{fontWeight: "bold"}}
                            amount={op[1].amount.amount}
                            asset={op[1].amount.asset_id}
                        />
                    </span>
                );
                break;
            // case "asset_settle_cancel":
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
                                    content="proposal.asset_claim_fees"
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
            // case "fba_distribute":

            //[45-49]
            // case "bid_collateral":
            // case "execute_bid":
            // case "account_property":
            // case "gateway_withdraw":
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

            //[50-54]
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
                                value: op[1].asset_id,
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
                bitlender_option_asset_id = op[1];
                break;
            // case "bitlender_rate_update":

            //[55-59]
            // case "asset_property":
            // case "bitlender_lend_order":
            // case "bitlender_invest":
            // case "bitlender_repay_interest":
            // case "bitlender_overdue_interest":

            //[60-64]
            // case "bitlender_repay_principal":
            // case "bitlender_prepayment":
            // case "bitlender_overdue_repay":
            // case "bitlender_add_collateral":
            // case "bitlender_recycle":

            //[65-69]
            // case "bitlender_setautorepayer":
            // case "fill_loan":
            // case "finance_option_create":
            // case "finance_option_update":
            // case "finance_create":

            //[70-74]
            // case "finance_enable":
            // case "account_coupon":
            case "change_identity":
                if (op[1].object_id.indexOf("1.20.") > -1) {
                    column = op[1].enable ? (
                        <TranslateWithLinks
                            string="proposal.change_identity.enable_gateway"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].issuer,
                                    arg: "issuer"
                                }
                            ]}
                        />
                    ) : (
                        <TranslateWithLinks
                            string="proposal.change_identity.disabled_gateway"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].issuer,
                                    arg: "issuer"
                                }
                            ]}
                        />
                    );
                } else if (op[1].object_id.indexOf("1.21.") > -1) {
                    column = op[1].enable ? (
                        <TranslateWithLinks
                            string="proposal.change_identity.enable_carrier"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].issuer,
                                    arg: "issuer"
                                }
                            ]}
                        />
                    ) : (
                        <TranslateWithLinks
                            string="proposal.change_identity.disabled_carrier"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].issuer,
                                    arg: "issuer"
                                }
                            ]}
                        />
                    );
                }
                break;

            // case "bitlender_autorepayment":
            // case "account_withdraw_fee":

            //[75-79]
            // case "no_use_1":
            case "gateway_create":
                column = (
                    <TranslateWithLinks
                        string="proposal.gateway_create"
                        keys={[
                            {
                                type: "account",
                                value: op[1].gateway_account,
                                arg: "issuer"
                            },
                            {
                                type: "assets",
                                value: op[1].allowed_asset,
                                arg: "asset"
                            }
                        ]}
                    />
                );
                break;

            case "gateway_update":
                column = (
                    <TranslateWithLinks
                        string="proposal.gateway_update"
                        keys={[
                            {
                                type: "account",
                                value: op[1].gateway_account,
                                arg: "issuer"
                            },
                            {
                                type: "assets",
                                value: op[1].allowed_asset,
                                arg: "asset"
                            }
                        ]}
                    />
                );
                break;

            case "carrier_create":
                column = (
                    <TranslateWithLinks
                        string="proposal.carrier_create"
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
                        string="proposal.carrier_update"
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

            case "author_create":
                column = (
                    <TranslateWithLinks
                        string="proposal.author_create"
                        keys={[
                            {
                                type: "account",
                                value: op[1].author_account,
                                arg: "issuer"
                            }
                        ]}
                    />
                );
                break;

            case "author_update":
                column = (
                    <TranslateWithLinks
                        string="proposal.author_update"
                        keys={[
                            {
                                type: "account",
                                value: op[1].author_account,
                                arg: "issuer"
                            }
                        ]}
                    />
                );
                break;

            //[80-84]
            case "budget_member_create":
                column = (
                    <TranslateWithLinks
                        string="proposal.budget_member_create"
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
                        string="proposal.budget_member_update"
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
            case "account_authenticate":
                column = (
                    <span>
                        <TranslateWithLinks
                            string="proposal.account_authenticate"
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

            // case "transfer_vesting_operation":
            // case "revoke_vesting_operation":
            // case "bitlender_remove_operation":

            //[85-89]
            // case "bitlender_squeeze_operation":
            // case "bitlender_publish_feed_operation":
            case "bitlender_update_feed_producers_operation":
                color = "warning";
                column = (
                    <TranslateWithLinks
                        string="proposal.bitlender_update_feed_producer"
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
                );
                break;
            // case "bitlender_test_operation":
            // case "account_lock_balances_operation":

            case "bitlender_option_fee_mode":
                column = (
                    <TranslateWithLinks
                        string="proposal.bitlender_option_fee_mode"
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

            case "asset_locktoken":
                column =
                    Number(op[1].op_type) == 0 ? (
                        <TranslateWithLinks
                            string="operation.asset_locktoken_create_operation"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].issuer,
                                    arg: "account"
                                },
                                {
                                    type: "asset",
                                    value: op[1].asset_lock,
                                    arg: "asset"
                                }
                            ]}
                        />
                    ) : (
                        <TranslateWithLinks
                            string="operation.asset_locktoken_modify_operation"
                            keys={[
                                {
                                    type: "account",
                                    value: op[1].issuer,
                                    arg: "account"
                                },
                                {
                                    type: "asset",
                                    value: op[1].asset_lock,
                                    arg: "asset"
                                }
                            ]}
                        />
                    );
                break;

            // others
            case "global_parameters_update":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="proposal.global_parameters_update"
                        />
                    </span>
                );
                break;

            case "file_write":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="proposal.file_write"
                        />
                    </span>
                );
                break;

            case "bond_create_offer":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="proposal.bond_create_offer"
                        />
                        &nbsp;
                        <FormattedAsset
                            style={{fontWeight: "bold"}}
                            amount={op[1].amount.amount}
                            asset={op[1].amount.asset_id}
                        />
                    </span>
                );
                break;

            case "bond_cancel_offer":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="proposal.bond_cancel_offer"
                        />
                        &nbsp;
                        {op[1].offer_id}
                    </span>
                );
                break;

            case "bond_accept_offer":
                if (current === op[1].lender) {
                    column = (
                        <span>
                            <Translate
                                component="span"
                                content="proposal.bond_accept_offer"
                            />
                            &nbsp;
                            <FormattedAsset
                                style={{fontWeight: "bold"}}
                                amount={op[1].amount_borrowed.amount}
                                asset={op[1].amount_borrowed.asset_id}
                            />
                            <Translate component="span" content="proposal.to" />
                            &nbsp;
                            {this.linkToAccount(op[1].borrower)}
                        </span>
                    );
                } else if (current === op[1].borrower) {
                    column = (
                        <span>
                            <Translate
                                component="span"
                                content="proposal.bond_accept_offer"
                            />
                            &nbsp;
                            <FormattedAsset
                                style={{fontWeight: "bold"}}
                                amount={op[1].amount_borrowed.amount}
                                asset={op[1].amount_borrowed.asset_id}
                            />
                            <Translate
                                component="span"
                                content="proposal.from"
                            />
                            &nbsp;
                            {this.linkToAccount(op[1].lender)}
                        </span>
                    );
                }
                break;

            case "bond_claim_collateral":
                if (current === op[1].lender) {
                    column = (
                        <span>
                            <Translate
                                component="span"
                                content="proposal.bond_pay_collateral"
                            />
                            &nbsp;
                            <FormattedAsset
                                style={{fontWeight: "bold"}}
                                amount={op[1].collateral_claimed.amount}
                                asset={op[1].collateral_claimed.asset_id}
                            />
                            <Translate component="span" content="proposal.to" />
                            &nbsp;
                            {this.linkToAccount(op[1].claimer)}
                        </span>
                    );
                } else if (current === op[1].claimer) {
                    column = (
                        <span>
                            <Translate
                                component="span"
                                content="proposal.bond_claim_collateral"
                            />
                            &nbsp;
                            <FormattedAsset
                                style={{fontWeight: "bold"}}
                                amount={op[1].collateral_claimed.amount}
                                asset={op[1].collateral_claimed.asset_id}
                            />
                            <Translate
                                component="span"
                                content="proposal.from"
                            />
                            &nbsp;
                            {this.linkToAccount(op[1].lender)}
                        </span>
                    );
                }
                break;

            case "key_create":
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="proposal.create_key"
                        />
                    </span>
                );
                break;

            case "short_order_cancel":
                color = "cancel";
                column = (
                    <span>
                        <Translate
                            component="span"
                            content="proposal.short_order_cancel"
                        />
                        &nbsp;
                        {op[1].order}
                    </span>
                );
                break;

            case "witness_withdraw_pay":
                if (current === op[1].witness_account) {
                    column = (
                        <span>
                            <Translate
                                component="span"
                                content="proposal.witness_pay"
                            />
                            &nbsp;
                            <FormattedAsset
                                style={{fontWeight: "bold"}}
                                amount={op[1].amount}
                                asset={"1.3.0"}
                            />
                            <Translate component="span" content="proposal.to" />
                            &nbsp;
                            {this.linkToAccount(op[1].witness_account)}
                        </span>
                    );
                } else {
                    column = (
                        <span>
                            <Translate
                                component="span"
                                content="proposal.received"
                            />
                            &nbsp;
                            <FormattedAsset
                                style={{fontWeight: "bold"}}
                                amount={op[1].amount}
                                asset={"1.3.0"}
                            />
                            <Translate
                                component="span"
                                content="proposal.from"
                            />
                            &nbsp;
                            {this.linkToAccount(op[1].witness_account)}
                        </span>
                    );
                }
                break;

            default:
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
                <div key={this.props.key}>
                    <div>{block_time ? block_time.toLocaleString() : ""}</div>
                    <div>{ops[op[0]]}</div>
                    <div>{column}</div>
                    <div>
                        <FormattedAsset
                            amount={parseInt(op[1].fee.amount, 10)}
                            asset={op[1].fee.asset_id}
                        />
                    </div>
                    <div>{trxid}</div>
                    <div>{block}</div>
                </div>
            );
        }

        line = column ? (
            <Row
                index={this.props.index}
                id={this.props.id}
                trxid={this.props.trxid}
                block={block}
                type={op[0]}
                color={color}
                fee={op[1].fee}
                hideDate={this.props.hideDate}
                hideFee={this.props.hideFee}
                hideOpLabel={this.props.hideOpLabel}
                info={column}
                expiration={this.props.expiration}
                onclick={this.props.onclick ? this.props.onclick : null}
            />
        ) : null;

        return line ? line : <div />;
    }
}

export default ProposedOperation;

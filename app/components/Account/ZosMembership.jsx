import React from "react";
import {Link} from "react-router/es";
import Translate from "react-translate-component";
import {
    Aes,
    TransactionHelper,
    FetchChain,
    ChainStore,
    ChainTypes as grapheneChainTypes
} from "zosjs/es";
import {Apis} from "zosjs-ws";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import AccountActions from "actions/AccountActions";
import TimeAgo from "../Utility/TimeAgo";
import HelpContent from "../Utility/HelpContent";
import accountUtils from "common/account_utils";
import {Tabs, Tab} from "../Utility/Tabs";
import FormattedAsset from "../Utility/FormattedAsset";
import counterpart from "counterpart";
import BaseModal from "components/Modal/BaseModal";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import WalletUnlockActions from "actions/WalletUnlockActions";
import WalletDb from "stores/WalletDb";
import notify from "actions/NotificationActions";
import SettingsStore from "../../stores/SettingsStore";
import ApplicationApi from "api/ApplicationApi";
import ZosMemberNeedAuth from "./ZosMemberNeedAuth";

class FeeHelp extends React.Component {
    static propTypes = {
        dprops: ChainTypes.ChainObject.isRequired
    };
    static defaultProps = {
        dprops: "2.1.0"
    };

    render() {
        let {dprops} = this.props;

        return (
            <HelpContent
                {...this.props}
                path="components/AccountMembership"
                section="fee-division"
                nextMaintenanceTime={{
                    time: dprops.get("next_maintenance_time")
                }}
            />
        );
    }
}
FeeHelp = BindToChainState(FeeHelp);

class ZosMembership extends React.Component {
    static propTypes = {
        account: ChainTypes.ChainAccount.isRequired,
        gprops: ChainTypes.ChainObject.isRequired,
        core: ChainTypes.ChainAsset.isRequired
    };
    static defaultProps = {
        gprops: "2.0.0",
        core: "1.3.0"
    };

    constructor(props) {
        super(props);
        this.state = {
            witness: null,
            committee_member: null,
            carrier: null,
            gateway: null,
            budget_member: null,
            author: null
        };
    }

    upgradeAccount(id, lifetime, e) {
        // console.log("upgradeAccount.id", id)
        // console.log("upgradeAccount.lifetime", lifetime)
        e && e.preventDefault();
        AccountActions.upgradeAccount(id, lifetime);
    }

    updatedPrettyPayAccount(account, flags, is_lifetime, e) {
        e && e.preventDefault();
        if (is_lifetime) {
            let updateObject = {issuer: account.id};
            updateObject.op_type = 1;
            updateObject.flags = flags;
            ApplicationApi.account_authenticate(updateObject);
        } else {
            // console.log("showModal", ref, is_lifetime)
            this.setState(() => {
                this.refs["not_lifetime_member_modal"].show();
            });
        }
    }

    createWitness(id, url, signing_key, e) {
        e && e.preventDefault();
        AccountActions.createWitness(id, url, signing_key);
    }

    updateWitness(witness, id, url, signing_key, e) {
        e && e.preventDefault();
        AccountActions.updateWitness(witness, id, url, signing_key);
    }

    createCommitteeMember(id, url, e) {
        e && e.preventDefault();
        AccountActions.createCommitteeMember(id, url);
    }

    updateCommitteeMember(committee_member, id, url, e) {
        e && e.preventDefault();
        AccountActions.updateCommitteeMember(committee_member, id, url);
    }

    splitSymbolsToAssetIds(symbols) {
        console.log("symbols", symbols);
        if (!symbols) {
            return Promise.resolve([]);
        }
        let promises = [];
        if (symbols.indexOf(",") > 0) {
            symbols = symbols.split(",");
            symbols.forEach(one => {
                if (one.length) {
                    promises.push(
                        FetchChain("getAsset", (one.toUpperCase(): ""), 5000)
                    );
                }
            });
        } else {
            promises.push(
                FetchChain("getAsset", (symbols.toUpperCase(): ""), 5000)
            );
        }

        return Promise.all(promises).then(res => {
            if (res && res.length) {
                let assetIds = [];
                res.forEach(asset => {
                    asset.get("id") && assetIds.push(asset.get("id"));
                });
                console.log("assetIds", assetIds);
                return assetIds;
            }
        });
    }

    createGateway(id, url, symbol, e) {
        e && e.preventDefault();
        this.splitSymbolsToAssetIds(symbol).then(assetIds => {
            AccountActions.createGateway(id, url, assetIds);
        });
    }

    updateGateway(
        gateway,
        id,
        url,
        symbol,
        signing_key,
        need_auth,
        trust_auth,
        def_auth,
        e
    ) {
        e && e.preventDefault();

        this.splitSymbolsToAssetIds(symbol).then(assetIds => {
            AccountActions.updateGateway(
                gateway,
                id,
                url,
                assetIds,
                need_auth,
                trust_auth,
                def_auth
            );
        });
    }

    gatewayIssueCurrency(issuer, account_to, issue_currency, revoke, memo, e) {
        e && e.preventDefault();

        let unlock_promise = WalletUnlockActions.unlock();
        let optional_nonce = null;
        let encrypt_memo = true;

        return Promise.all([
            FetchChain("getAccount", issuer),
            FetchChain("getAccount", account_to),
            unlock_promise
        ]).then(res => {
            let [account_issuer, issue_account_to] = res;

            let memo_from_public, memo_to_public;
            if (memo && encrypt_memo) {
                memo_from_public = account_issuer.getIn([
                    "options",
                    "memo_key"
                ]);

                // The 1s are base58 for all zeros (null)
                if (
                    /111111111111111111111/.test(memo_from_public) ||
                    /6FUsQ2hYRj1JSvabewWfUWTXyoDq6btmfLFjmXwby5GJgzEvT5/.test(
                        memo_from_public
                    )
                ) {
                    memo_from_public = null;
                }

                memo_to_public = issue_account_to.getIn([
                    "options",
                    "memo_key"
                ]);
                if (
                    /111111111111111111111/.test(memo_to_public) ||
                    /6FUsQ2hYRj1JSvabewWfUWTXyoDq6btmfLFjmXwby5GJgzEvT5/.test(
                        memo_to_public
                    )
                ) {
                    memo_to_public = null;
                }
            }

            let memo_from_privkey;
            if (memo && encrypt_memo) {
                memo_from_privkey = WalletDb.getPrivateKey(memo_from_public);

                if (!memo_from_privkey) {
                    notify.addNotification({
                        message: counterpart.translate(
                            "account.errors.memo_missing"
                        ),
                        level: "error",
                        autoDismiss: 10
                    });
                    throw new Error(
                        "Missing private memo key for sender: " + memo_sender
                    );
                }
            }

            let memo_object;
            if (memo && memo_to_public && memo_from_public) {
                let nonce =
                    optional_nonce == null
                        ? TransactionHelper.unique_nonce_uint64()
                        : optional_nonce;

                memo_object = {
                    from: memo_from_public,
                    to: memo_to_public,
                    nonce,
                    message: encrypt_memo
                        ? Aes.encrypt_with_checksum(
                              memo_from_privkey,
                              memo_to_public,
                              nonce,
                              memo
                          )
                        : Buffer.isBuffer(memo)
                            ? memo.toString("utf-8")
                            : memo
                };
            }

            // console.log(
            //     issuer,
            //     account_to,
            //     issue_currency,
            //     revoke,
            //     memo_object,
            //     memo
            // );

            return AccountActions.gatewayIssueCurrency(
                issuer,
                account_to,
                issue_currency,
                revoke,
                memo_object,
                memo
            );
        });
    }

    createCarrier(id, url, e) {
        e && e.preventDefault();
        AccountActions.createCarrier(id, url);
    }

    updateCarrier(carrier, id, url, need_auth, trust_auth, def_auth, e) {
        e && e.preventDefault();
        AccountActions.updateCarrier(
            carrier,
            id,
            url,
            need_auth,
            trust_auth,
            def_auth
        );
    }

    createBudgetMember(id, url, e) {
        e && e.preventDefault();
        AccountActions.createBudgetMember(id, url);
    }

    updateBudgetMember(budget_member, id, url, e) {
        e && e.preventDefault();
        AccountActions.updateBudgetMember(budget_member, id, url);
    }

    createAuthor(id, url, gateway_asset, e) {
        e && e.preventDefault();
        this.splitSymbolsToAssetIds(gateway_asset).then(assetIds => {
            //console.log("gateway_asset:",assetIds)
            AccountActions.createAuthor(id, url, assetIds);
        });
    }

    updateAuthor(author, id, url, gateway_asset, e) {
        e && e.preventDefault();
        this.splitSymbolsToAssetIds(gateway_asset).then(assetIds => {
            AccountActions.updateAuthor(author, id, url, assetIds);
        });
    }

    componentWillMount() {
        accountUtils.getFinalFeeAsset(this.props.account, "account_upgrade");
    }

    componentDidMount() {
        let account = this.props.account.toJS();
        let account_name = account.name;
        let uaccount_property = (account.uaccount_property || 0)
            .toString(2)
            .split("")
            .reverse();
        let is_gateway = uaccount_property[0] == 1;
        let is_carrier = uaccount_property[1] == 1;
        let is_genesis = uaccount_property[2] == 1;
        let is_platform = uaccount_property[3] == 1;
        let is_witness = uaccount_property[4] == 1;
        let is_committee_memmber = uaccount_property[5] == 1;
        let is_budget_member = uaccount_property[6] == 1;
        let is_author = uaccount_property[25] == 1;

        this.setState({
            is_gateway,
            is_carrier,
            is_genesis,
            is_platform,
            is_witness,
            is_committee_memmber,
            is_budget_member,
            is_author
        });

        if (is_witness) {
            Apis.instance()
                .db_api()
                .exec("lookup_witness_accounts", [account_name, 1])
                .then(res => {
                    if (res && res[0] && res[0][1]) {
                        Apis.instance()
                            .db_api()
                            .exec("get_witnesses", [[res[0][1]]])
                            .then(witnesses => {
                                this.setState({witness: witnesses[0]});
                            });
                    }
                });
        }

        if (is_committee_memmber) {
            Apis.instance()
                .db_api()
                .exec("lookup_committee_member_accounts", [account_name, 1])
                .then(res => {
                    if (res && res[0] && res[0][1]) {
                        Apis.instance()
                            .db_api()
                            .exec("get_committee_members", [[res[0][1]]])
                            .then(committee_members => {
                                this.setState({
                                    committee_member: committee_members[0]
                                });
                            });
                    }
                });
        }

        if (is_carrier) {
            Apis.instance()
                .db_api()
                .exec("lookup_carrier_accounts", [account_name, 1])
                .then(res => {
                    if (res && res[0] && res[0][1]) {
                        Apis.instance()
                            .db_api()
                            .exec("get_carrieres", [[res[0][1]]])
                            .then(carrieres => {
                                this.setState({carrier: carrieres[0]});
                            });
                    }
                });
        }

        if (is_gateway) {
            //查询gateway的所有信息
            /*gateway={
                id
                gateway_account
                ....
                allowed_assets_map[asset_id] = asset
                dynamic_datas
            }*/
            console.log("is_gateway");
            Apis.instance()
                .db_api()
                .exec("lookup_gateway_accounts", [account_name, 1])
                .then(res => {
                    if (res && res[0] && res[0][1]) {
                        return Apis.instance()
                            .db_api()
                            .exec("get_gatewayes", [[res[0][1]]])
                            .then(gatewayes => {
                                this.setState({gateway: gatewayes[0]});
                                //console.log("gatewayes",gatewayes)
                                return this.getGatewayAssets(gatewayes[0]);
                            });
                    }
                })
                .then(gateway => {
                    if (gateway) {
                        this.getGatewayDynamicData(gateway).then(newGateway => {
                            if (newGateway) {
                                this.setState({gateway: newGateway});
                            }
                        });
                    }
                });
        }

        if (is_budget_member) {
            Apis.instance()
                .db_api()
                .exec("lookup_budget_member_accounts", [account_name, 1])
                .then(res => {
                    if (res && res[0] && res[0][1]) {
                        Apis.instance()
                            .db_api()
                            .exec("get_budget_members", [[res[0][1]]])
                            .then(budget_members => {
                                this.setState({
                                    budget_member: budget_members[0]
                                });
                            });
                    }
                });
        }

        if (is_author) {
            Apis.instance()
                .db_api()
                .exec("lookup_author_accounts", [account_name, 1])
                .then(res => {
                    if (res && res[0] && res[0][1]) {
                        console.log("is_author|res:", res);
                        Apis.instance()
                            .db_api()
                            .exec("get_authors", [[res[0][1]]])
                            .then(authores => {
                                console.log("is_author|authors:", authores);
                                this.setState({author: authores[0]});
                            });
                    }
                });
        }
    }

    onSubmitModal(ref, accountId, params, e) {
        e.preventDefault();
        this.refs[ref].onClose();

        if (params === false) {
            return this.upgradeAccount(accountId, true);
        }

        switch (ref) {
            case "witness_create_modal":
                return this.createWitness(
                    accountId,
                    params.url,
                    params.signing_key
                );
            case "witness_update_modal":
                return this.updateWitness(
                    params.updateMember ? params.updateMember.id : "",
                    accountId,
                    params.url,
                    params.signing_key
                );

            case "committee_member_create_modal":
                return this.createCommitteeMember(accountId, params.url);
            case "committee_member_update_modal":
                return this.updateCommitteeMember(
                    params.updateMember ? params.updateMember.id : "",
                    accountId,
                    params.url
                );

            case "carrier_create_modal":
                return this.createCarrier(accountId, params.url);
            case "carrier_update_modal":
                return this.updateCarrier(
                    params.updateMember ? params.updateMember.id : "",
                    accountId,
                    params.url,
                    params.need_auth,
                    params.trust_auth,
                    params.def_auth
                );

            case "gateway_create_modal":
                return this.createGateway(
                    accountId,
                    params.url,
                    params.gateway_asset,
                    params.signing_key
                );
            case "gateway_update_modal":
                return this.updateGateway(
                    params.updateMember ? params.updateMember.id : "",
                    accountId,
                    params.url,
                    params.gateway_asset,
                    params.signing_key,
                    params.need_auth,
                    params.trust_auth,
                    params.def_auth
                );
            case "gateway_issue_currency_modal":
                return this.gatewayIssueCurrency(
                    accountId,
                    params.account_to,
                    params.issue_currency,
                    false,
                    params.memo
                );
            case "gateway_revoke_currency_modal":
                return this.gatewayIssueCurrency(
                    accountId,
                    params.account_to,
                    params.issue_currency,
                    true,
                    params.memo
                );

            case "carrier_change_identity_modal":
            case "gateway_change_identity_modal":
            case "witness_update_enable_modal":
                return AccountActions.changeIdentity(
                    accountId,
                    params.object_id,
                    !params.enable
                );

            case "budget_member_create_modal":
                return this.createBudgetMember(accountId, params.url);
            case "budget_member_update_modal":
                return this.updateBudgetMember(
                    params.updateMember ? params.updateMember.id : "",
                    accountId,
                    params.url
                );

            case "author_create_modal":
                return this.createAuthor(
                    accountId,
                    params.url,
                    params.gateway_asset
                );
            case "author_update_modal":
                return this.updateAuthor(
                    params.updateMember ? params.updateMember.id : "",
                    accountId,
                    params.url,
                    params.gateway_asset
                );
            default:
                break;
        }
        return false;
    }

    showModal(ref, is_lifetime) {
        if (is_lifetime) {
            this.refs[ref].show();
        } else {
            // console.log("showModal", ref, is_lifetime)
            this.setState(
                {
                    apply_type: ref
                },
                () => {
                    this.refs["not_lifetime_member_modal"].show();
                }
            );
        }
    }

    closeModal(ref) {
        this.refs[ref].onClose();
    }

    getGatewayAssets(gateway) {
        if (
            !gateway ||
            !gateway.allowed_assets ||
            !gateway.allowed_assets.length
        ) {
            return false;
        }
        return Apis.instance()
            .db_api()
            .exec("get_assets", [gateway.allowed_assets])
            .then(gateway_assets => {
                let dynamic_asset_data_ids = [];
                let gateway_assets_map = {};
                if (gateway_assets && gateway_assets.length) {
                    gateway_assets.forEach(one => {
                        dynamic_asset_data_ids.push(one.dynamic_asset_data_id);
                        gateway_assets_map[one.dynamic_asset_data_id] = one;
                    });
                    return Apis.instance()
                        .db_api()
                        .exec("get_objects", [dynamic_asset_data_ids])
                        .then(dynamic_assets => {
                            if (dynamic_assets && dynamic_assets.length) {
                                dynamic_assets.forEach(dyn => {
                                    gateway_assets_map[
                                        dyn.id
                                    ].dynamic_asset_data = dyn;
                                });
                            }
                            let allowed_assets_map = {};
                            Object.keys(gateway_assets_map).forEach(key => {
                                let asset = gateway_assets_map[key];
                                allowed_assets_map[asset.id] = asset;
                            });
                            gateway.allowed_assets_map = allowed_assets_map;
                            return gateway;
                        });
                }
            });
    }

    getGatewayDynamicData(gateway) {
        if (!gateway || !gateway.dynamic_id) {
            return false;
        }
        return Apis.instance()
            .db_api()
            .exec("get_objects", [[gateway.dynamic_id]])
            .then(dynamic_data => {
                gateway.dynamic_datas = dynamic_data;
                //console.log("gateway:",gateway)
                return gateway;
            });
    }

    render() {
        let {gprops, core} = this.props;
        let {
            witness,
            committee_member,
            budget_member,
            gateway,
            carrier,
            author,
            is_gateway,
            is_carrier,
            is_genesis,
            is_platform,
            is_witness,
            is_committee_memmber,
            is_budget_member,
            is_author
        } = this.state;

        let account = this.props.account.toJS();

        let memo_key =
            account && account.options && account.options.memo_key
                ? account.options.memo_key
                : null;

        let ltr = ChainStore.getAccount(account.lifetime_referrer, false);
        if (ltr) account.lifetime_referrer_name = ltr.get("name");
        let ref = ChainStore.getAccount(account.referrer, false);
        if (ref) account.referrer_name = ref.get("name");
        let reg = ChainStore.getAccount(account.registrar, false);
        if (reg) account.registrar_name = reg.get("name");

        let network_fee = account.network_fee_percentage / 100;
        let lifetime_fee = account.lifetime_referrer_fee_percentage / 100;
        let referrer_total_fee = 100 - network_fee - lifetime_fee;
        let referrer_fee =
            (referrer_total_fee * account.referrer_rewards_percentage) / 10000;
        let registrar_fee = 100 - referrer_fee - lifetime_fee - network_fee;

        let lifetime_cost =
            (gprops.getIn([
                "parameters",
                "current_fees",
                "parameters",
                8,
                1,
                "membership_lifetime_fee"
            ]) *
                gprops.getIn(["parameters", "current_fees", "scale"])) /
            10000;

        let member_status = ChainStore.getAccountMemberStatus(
            this.props.account
        );
        let membership = "account.member." + member_status;
        // console.log("membership", membership)
        let expiration = null;
        if (member_status === "annual")
            expiration = (
                <span>
                    (<Translate content="account.member.expires" />{" "}
                    <TimeAgo time={account.membership_expiration_date} />)
                </span>
            );
        let expiration_date = account.membership_expiration_date;
        if (expiration_date === "1969-12-31T23:59:59")
            expiration_date = "Never";
        else if (expiration_date === "1970-01-01T00:00:00")
            expiration_date = "N/A";

        let locale = SettingsStore.getSetting("locale");

        let is_lifetime = member_status == "lifetime";

        // let showCreateGateway = is_lifetime && !is_gateway;
        // let showCreateCarrier = is_lifetime && !is_carrier;
        // let showCreateWitness = is_lifetime && !is_witness;
        // let showCreateCommitteeMemmber = is_lifetime && !is_committee_memmber;
        // let showCreateBudgetMember = is_lifetime && !is_budget_member;

        let showUpdateWitness = is_lifetime && is_witness;
        let showUpdateCommitteeMemmber = is_lifetime && is_committee_memmber;
        let showUpdateGateway = is_lifetime && is_gateway;
        let showUpdateCarrier = is_lifetime && is_carrier;
        let showUpdateBudgetMember = is_lifetime && is_budget_member;
        let showUpdateAuthor = is_lifetime && is_author;

        //是否靓号付费人
        let flag = 0x01000000;
        let pertty_state = "state_no";
        if ((account.uaccount_property & flag) === flag) {
            pertty_state = "state_yes";
        }
        let pretty_pay_state = "account.pretty_pay." + pertty_state;

        return (
            <div>
                <div style={{height: 10, background: "#f9fbfe"}} />
                <div className="zos-card-bg" style={{marginBottom: 0}}>
                    <div className="zos-block-content-header">
                        <Translate content="account.basic_info.title" />
                        <div
                            style={{
                                position: "absolute",
                                right: "1rem",
                                top: "0.6rem",
                                display: "flex",
                                alignItems: "center",
                                height: "2.6rem"
                            }}
                        >
                            <Translate
                                content={membership}
                                style={{
                                    display: "inline-block",
                                    padding: "0 1rem"
                                }}
                            />
                            {member_status === "lifetime" ? null : (
                                <div
                                    className="button"
                                    onClick={this.upgradeAccount.bind(
                                        this,
                                        account.id,
                                        true
                                    )}
                                >
                                    <Translate content="account.member.upgrade_lifetime" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="zos-membership-intro">
                        <HelpContent
                            locale={locale}
                            path={"components/AccountMembership"}
                            section="lifetime"
                            feesCashback={100 - network_fee}
                            price={{
                                amount: lifetime_cost,
                                asset: core
                            }}
                        />
                    </div>

                    <div>
                        <table className="table">
                            <tbody>
                                {/*<tr>
                                    <td style={{width: "30%"}}>
                                        <Translate content="account.member.account_type" />
                                    </td>
                                    <td style={{width: "30%"}}>
                                        <Translate content={membership} />
                                    </td>
                                    <td style={{width: "40%"}}>
                                        {member_status === "lifetime" ? null : (
                                            <div
                                                className="button no-margin"
                                                onClick={this.upgradeAccount.bind(
                                                    this,
                                                    account.id,
                                                    true
                                                )}
                                            >
                                                <Translate content="account.member.upgrade_lifetime" />
                                            </div>
                                        )}
                                    </td>
                                </tr>*/}
                                <tr>
                                    <td style={{width: "30%"}}>
                                        <Translate content="account.member.registrar" />
                                    </td>
                                    <td style={{width: "30%"}}>
                                        <Link
                                            to={`/account/${
                                                account.registrar_name
                                            }`}
                                        >
                                            {account.registrar_name}
                                        </Link>
                                    </td>
                                    <td style={{width: "40%"}}>
                                        {registrar_fee}%
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{width: "30%"}}>
                                        <Translate content="account.member.referrer" />
                                    </td>
                                    <td style={{width: "30%"}}>
                                        <Link
                                            to={`/account/${
                                                account.referrer_name
                                            }`}
                                        >
                                            {account.referrer_name}
                                        </Link>
                                    </td>
                                    <td style={{width: "40%"}}>
                                        {referrer_fee}%
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{width: "30%"}}>
                                        <Translate content="account.member.lifetime_referrer" />
                                    </td>
                                    <td style={{width: "30%"}}>
                                        <Link
                                            to={`/account/${
                                                account.lifetime_referrer_name
                                            }`}
                                        >
                                            {account.lifetime_referrer_name}
                                        </Link>
                                    </td>
                                    <td style={{width: "40%"}}>
                                        {lifetime_fee}%
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div style={{height: 10, background: "#f9fbfe"}} />
                <div className="zos-card-bg" style={{marginBottom: 0}}>
                    <div className="zos-block-content-header">
                        <Translate content="account.pretty_pay.title" />
                        <Translate
                            content={pretty_pay_state}
                            style={{
                                display: "inline-block",
                                padding: "0 1rem"
                            }}
                        />
                        <div
                            style={{
                                position: "absolute",
                                right: "1rem",
                                top: "0.6rem",
                                display: "flex",
                                alignItems: "center",
                                height: "2.6rem"
                            }}
                        >
                            {(account.uaccount_property & flag) == flag ? (
                                <div
                                    className="button"
                                    onClick={this.updatedPrettyPayAccount.bind(
                                        this,
                                        account,
                                        0
                                    )}
                                >
                                    <Translate content="account.pretty_pay.remove_pretty_regist" />
                                </div>
                            ) : (
                                <div
                                    className="button"
                                    onClick={this.updatedPrettyPayAccount.bind(
                                        this,
                                        account,
                                        flag,
                                        is_lifetime
                                    )}
                                >
                                    <Translate content="account.pretty_pay.become_pretty_regist" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="zos-membership-intro">
                        <div className="help-content">
                            <h3>
                                <Translate content="account.pretty_pay.info1" />
                            </h3>
                            <h3>
                                <Translate content="account.pretty_pay.info2" />
                            </h3>
                            <h3>
                                <Translate content="account.pretty_pay.info3" />
                            </h3>
                        </div>
                    </div>
                </div>

                <div style={{height: 10, background: "#f9fbfe"}} />
                <div className="zos-card-bg" style={{marginBottom: 0}}>
                    <div className="zos-block-content-header">
                        <Translate content="account.role_info.title" />
                    </div>
                    <div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{width: "20%"}}>
                                        <Translate content="account.position" />
                                    </th>
                                    <th style={{width: "30%"}}>
                                        <Translate content="account.role_info.url" />
                                    </th>
                                    <th style={{width: "10%"}}>
                                        <Translate content="proposal.status" />
                                    </th>
                                    <th style={{width: "40%"}}>
                                        <Translate content="proposal.action" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{width: "20%"}}>
                                        <Translate content="account.uaccount_property.witness" />
                                    </td>
                                    <td style={{width: "30%"}}>
                                        {witness && witness.url ? (
                                            <a
                                                href={witness.url}
                                                target="_blank"
                                            >
                                                {witness.url}
                                            </a>
                                        ) : null}
                                    </td>
                                    <td style={{width: "10%"}}>
                                        {is_witness ? (
                                            <span>
                                                <Translate content="settings.yes" />
                                                /
                                                {witness &&
                                                witness.enable ===
                                                    "identity_enable" ? (
                                                    <Translate content="account.membership.in_business" />
                                                ) : null}
                                                {witness &&
                                                witness.enable ===
                                                    "identity_disable" ? (
                                                    <Translate content="account.membership.stop_business" />
                                                ) : null}
                                                {witness &&
                                                witness.enable ===
                                                    "identity_enable_lost" ? (
                                                    <Translate content="account.membership.lost_business" />
                                                ) : null}
                                            </span>
                                        ) : (
                                            <Translate content="settings.no" />
                                        )}
                                    </td>
                                    <td style={{width: "40%"}}>
                                        {!is_witness ? (
                                            <a
                                                onClick={this.showModal.bind(
                                                    this,
                                                    "witness_create_modal",
                                                    is_lifetime
                                                )}
                                                className="zos-link button zos-small"
                                            >
                                                <Translate content="account.membership.apply" />
                                            </a>
                                        ) : null}
                                        {showUpdateWitness && witness ? (
                                            <a
                                                onClick={this.showModal.bind(
                                                    this,
                                                    "witness_update_modal",
                                                    is_lifetime
                                                )}
                                                className="zos-link button zos-small"
                                            >
                                                <Translate content="account.membership.witness.update" />
                                            </a>
                                        ) : null}
                                        {showUpdateWitness &&
                                        witness &&
                                        witness.enable ===
                                            "identity_enable_lost" ? (
                                            <a
                                                onClick={this.showModal.bind(
                                                    this,
                                                    "witness_update_enable_modal",
                                                    is_lifetime
                                                )}
                                                className="zos-link button zos-small"
                                            >
                                                <Translate content="account.membership.witness.activation" />
                                            </a>
                                        ) : null}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{width: "20%"}}>
                                        <Translate content="account.uaccount_property.committe" />
                                    </td>
                                    <td style={{width: "30%"}}>
                                        {committee_member &&
                                        committee_member.url ? (
                                            <a
                                                href={committee_member.url}
                                                target="_blank"
                                            >
                                                {committee_member.url}
                                            </a>
                                        ) : null}
                                    </td>
                                    <td style={{width: "10%"}}>
                                        {is_committee_memmber ? (
                                            <Translate content="settings.yes" />
                                        ) : (
                                            <Translate content="settings.no" />
                                        )}
                                    </td>
                                    <td style={{width: "40%"}}>
                                        {!is_committee_memmber ? (
                                            <a
                                                onClick={this.showModal.bind(
                                                    this,
                                                    "committee_member_create_modal",
                                                    is_lifetime
                                                )}
                                                className="zos-link button zos-small"
                                            >
                                                <Translate content="account.membership.apply" />
                                            </a>
                                        ) : null}
                                        {showUpdateCommitteeMemmber &&
                                        committee_member ? (
                                            <a
                                                onClick={this.showModal.bind(
                                                    this,
                                                    "committee_member_update_modal",
                                                    is_lifetime
                                                )}
                                                className="zos-link button zos-small"
                                            >
                                                <Translate content="account.membership.committee_member.update" />
                                            </a>
                                        ) : null}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{width: "20%"}}>
                                        <Translate content="account.uaccount_property.carrier" />
                                    </td>
                                    <td style={{width: "30%"}}>
                                        {carrier && carrier.url ? (
                                            <a
                                                href={carrier.url}
                                                target="_blank"
                                            >
                                                {carrier.url}
                                            </a>
                                        ) : null}
                                    </td>
                                    <td style={{width: "10%"}}>
                                        {is_carrier ? (
                                            <span>
                                                <Translate content="settings.yes" />
                                                /
                                                {carrier &&
                                                carrier.enable ===
                                                    "identity_enable" ? (
                                                    <Translate content="account.membership.in_business" />
                                                ) : null}
                                                {carrier &&
                                                carrier.enable !==
                                                    "identity_enable" ? (
                                                    <Translate content="account.membership.stop_business" />
                                                ) : null}
                                            </span>
                                        ) : (
                                            <Translate content="settings.no" />
                                        )}
                                    </td>
                                    <td style={{width: "40%"}}>
                                        {!is_carrier ? (
                                            <a
                                                onClick={this.showModal.bind(
                                                    this,
                                                    "carrier_create_modal",
                                                    is_lifetime
                                                )}
                                                className="zos-link button zos-small"
                                            >
                                                <Translate content="account.membership.apply" />
                                            </a>
                                        ) : null}
                                        {showUpdateCarrier ? (
                                            <a
                                                onClick={this.showModal.bind(
                                                    this,
                                                    "carrier_update_modal",
                                                    is_lifetime
                                                )}
                                                className="zos-link button zos-small"
                                            >
                                                <Translate content="account.membership.carrier.update" />
                                            </a>
                                        ) : null}
                                        {showUpdateCarrier &&
                                        carrier &&
                                        carrier.enable === "identity_enable" ? (
                                            <a
                                                onClick={this.showModal.bind(
                                                    this,
                                                    "carrier_change_identity_modal",
                                                    is_lifetime
                                                )}
                                                className="zos-link button zos-small"
                                            >
                                                <Translate content="account.membership.carrier.disabled" />
                                            </a>
                                        ) : null}
                                        {showUpdateCarrier &&
                                        carrier &&
                                        carrier.enable !== "identity_enable" ? (
                                            <a
                                                onClick={this.showModal.bind(
                                                    this,
                                                    "carrier_change_identity_modal",
                                                    is_lifetime
                                                )}
                                                className="zos-link button zos-small"
                                            >
                                                <Translate content="account.membership.carrier.enable" />
                                            </a>
                                        ) : null}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{width: "20%"}}>
                                        <Translate content="account.uaccount_property.gateway" />
                                    </td>
                                    <td style={{width: "30%"}}>
                                        {gateway && gateway.url ? (
                                            <a
                                                href={gateway.url}
                                                target="_blank"
                                            >
                                                {gateway.url}
                                            </a>
                                        ) : null}
                                    </td>
                                    <td style={{width: "10%"}}>
                                        {is_gateway ? (
                                            <span>
                                                <Translate content="settings.yes" />
                                                /
                                                {gateway &&
                                                gateway.enable ===
                                                    "identity_enable" ? (
                                                    <Translate content="account.membership.in_business" />
                                                ) : null}
                                                {gateway &&
                                                gateway.enable !==
                                                    "identity_enable" ? (
                                                    <Translate content="account.membership.stop_business" />
                                                ) : null}
                                            </span>
                                        ) : (
                                            <Translate content="settings.no" />
                                        )}
                                    </td>
                                    <td style={{width: "40%"}}>
                                        {!is_gateway ? (
                                            <a
                                                onClick={this.showModal.bind(
                                                    this,
                                                    "gateway_create_modal",
                                                    is_lifetime
                                                )}
                                                className="zos-link button zos-small"
                                            >
                                                <Translate content="account.membership.apply" />
                                            </a>
                                        ) : null}
                                        {showUpdateGateway ? (
                                            <a
                                                onClick={this.showModal.bind(
                                                    this,
                                                    "gateway_update_modal",
                                                    is_lifetime
                                                )}
                                                className="zos-link button zos-small"
                                            >
                                                <Translate content="account.membership.gateway.update" />
                                            </a>
                                        ) : null}
                                        {showUpdateGateway &&
                                        gateway &&
                                        gateway.enable === "identity_enable" ? (
                                            <a
                                                onClick={this.showModal.bind(
                                                    this,
                                                    "gateway_change_identity_modal",
                                                    is_lifetime
                                                )}
                                                className="zos-link button zos-small"
                                            >
                                                <Translate content="account.membership.gateway.disabled" />
                                            </a>
                                        ) : null}
                                        {showUpdateGateway &&
                                        gateway &&
                                        gateway.enable !== "identity_enable" ? (
                                            <a
                                                onClick={this.showModal.bind(
                                                    this,
                                                    "gateway_change_identity_modal",
                                                    is_lifetime
                                                )}
                                                className="zos-link button zos-small"
                                            >
                                                <Translate content="account.membership.gateway.enable" />
                                            </a>
                                        ) : null}
                                        {showUpdateGateway &&
                                        gateway &&
                                        gateway.enable === "identity_enable" ? (
                                            <a
                                                onClick={this.showModal.bind(
                                                    this,
                                                    "gateway_issue_currency_modal",
                                                    is_lifetime
                                                )}
                                                className="zos-link button zos-small"
                                            >
                                                <Translate content="account.membership.gateway.issue_currency" />
                                            </a>
                                        ) : null}
                                        {showUpdateGateway &&
                                        gateway &&
                                        gateway.enable === "identity_enable" ? (
                                            <a
                                                onClick={this.showModal.bind(
                                                    this,
                                                    "gateway_revoke_currency_modal",
                                                    is_lifetime
                                                )}
                                                className="zos-link button zos-small"
                                            >
                                                <Translate content="account.membership.gateway.revoke_currency" />
                                            </a>
                                        ) : null}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{width: "20%"}}>
                                        <Translate content="account.uaccount_property.budget" />
                                    </td>
                                    <td style={{width: "30%"}}>
                                        {budget_member && budget_member.url ? (
                                            <a
                                                href={budget_member.url}
                                                target="_blank"
                                            >
                                                {budget_member.url}
                                            </a>
                                        ) : null}
                                    </td>
                                    <td style={{width: "10%"}}>
                                        {is_budget_member ? (
                                            <Translate content="settings.yes" />
                                        ) : (
                                            <Translate content="settings.no" />
                                        )}
                                    </td>
                                    <td style={{width: "40%"}}>
                                        {!is_budget_member ? (
                                            <a
                                                onClick={this.showModal.bind(
                                                    this,
                                                    "budget_member_create_modal",
                                                    is_lifetime
                                                )}
                                                className="zos-link button zos-small"
                                            >
                                                <Translate content="account.membership.apply" />
                                            </a>
                                        ) : null}
                                        {showUpdateBudgetMember &&
                                        budget_member ? (
                                            <a
                                                onClick={this.showModal.bind(
                                                    this,
                                                    "budget_member_update_modal",
                                                    is_lifetime
                                                )}
                                                className="zos-link button zos-small"
                                            >
                                                <Translate content="account.membership.budget_member.update" />
                                            </a>
                                        ) : null}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{width: "20%"}}>
                                        <Translate content="account.uaccount_property.author" />
                                    </td>
                                    <td style={{width: "30%"}}>
                                        {author && author.url ? (
                                            <a
                                                href={author.url}
                                                target="_blank"
                                            >
                                                {author.url}
                                            </a>
                                        ) : null}
                                    </td>
                                    <td style={{width: "10%"}}>
                                        {is_author ? (
                                            <Translate content="settings.yes" />
                                        ) : (
                                            <Translate content="settings.no" />
                                        )}
                                    </td>
                                    <td style={{width: "40%"}}>
                                        {!is_author ? (
                                            <a
                                                onClick={this.showModal.bind(
                                                    this,
                                                    "author_create_modal",
                                                    is_lifetime
                                                )}
                                                className="zos-link button zos-small"
                                            >
                                                <Translate content="account.membership.apply" />
                                            </a>
                                        ) : null}
                                        {showUpdateAuthor && author ? (
                                            <a
                                                onClick={this.showModal.bind(
                                                    this,
                                                    "author_update_modal",
                                                    is_lifetime
                                                )}
                                                className="zos-link button zos-small"
                                            >
                                                <Translate content="account.membership.author.update" />
                                            </a>
                                        ) : null}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* create start */}
                <UaccountPropertyModal
                    modalId="witness_create_modal"
                    ref="witness_create_modal"
                    onCancel={this.closeModal.bind(this)}
                    onSubmit={this.onSubmitModal.bind(this)}
                    title="explorer.witnesses.create"
                    operation="witness_create"
                    signingkey={memo_key}
                    accountId={account.id}
                    {...this.props}
                />

                <UaccountPropertyModal
                    modalId="committee_member_create_modal"
                    ref="committee_member_create_modal"
                    onCancel={this.closeModal.bind(this)}
                    onSubmit={this.onSubmitModal.bind(this)}
                    title="explorer.committee_members.create"
                    operation="committee_member_create"
                    accountId={account.id}
                    {...this.props}
                />

                <UaccountPropertyModal
                    modalId="gateway_create_modal"
                    ref="gateway_create_modal"
                    onCancel={this.closeModal.bind(this)}
                    onSubmit={this.onSubmitModal.bind(this)}
                    title="explorer.gateways.create"
                    operation="gateway_create"
                    accountId={account.id}
                    {...this.props}
                />

                <UaccountPropertyModal
                    modalId="carrier_create_modal"
                    ref="carrier_create_modal"
                    onCancel={this.closeModal.bind(this)}
                    onSubmit={this.onSubmitModal.bind(this)}
                    title="explorer.carriers.create"
                    operation="carrier_create"
                    accountId={account.id}
                    {...this.props}
                />

                <UaccountPropertyModal
                    modalId="budget_member_create_modal"
                    ref="budget_member_create_modal"
                    onCancel={this.closeModal.bind(this)}
                    onSubmit={this.onSubmitModal.bind(this)}
                    title="explorer.budget_members.create"
                    operation="budget_member_create"
                    accountId={account.id}
                    {...this.props}
                />

                <UaccountPropertyModal
                    modalId="author_create_modal"
                    ref="author_create_modal"
                    onCancel={this.closeModal.bind(this)}
                    onSubmit={this.onSubmitModal.bind(this)}
                    title="explorer.authors.create"
                    operation="author_create"
                    accountId={account.id}
                    {...this.props}
                />

                {/* create end */}

                {/* update start */}
                {showUpdateWitness && this.state.witness ? (
                    <UaccountPropertyModal
                        modalId="witness_update_modal"
                        ref="witness_update_modal"
                        onCancel={this.closeModal.bind(this)}
                        onSubmit={this.onSubmitModal.bind(this)}
                        title="explorer.witnesses.update"
                        operation="witness_update"
                        updateMember={this.state.witness}
                        signingkey={memo_key}
                        accountId={account.id}
                        {...this.props}
                    />
                ) : null}

                {/* {console.log("this.state.witness", this.state.witness)} */}
                {showUpdateWitness &&
                this.state.witness &&
                this.state.witness.enable === "identity_enable_lost" ? (
                    <ChangeIdentityModal
                        modalId="witness_update_enable_modal"
                        ref="witness_update_enable_modal"
                        onCancel={this.closeModal.bind(this)}
                        onSubmit={this.onSubmitModal.bind(this)}
                        title="account.membership.witness.activation"
                        operation="change_identity"
                        membership="witness"
                        enable={witness.enable === "identity_enable"}
                        accountId={account.id}
                        updateMember={this.state.witness}
                        {...this.props}
                    />
                ) : null}

                {showUpdateCommitteeMemmber && this.state.committee_member ? (
                    <UaccountPropertyModal
                        modalId="committee_member_update_modal"
                        ref="committee_member_update_modal"
                        onCancel={this.closeModal.bind(this)}
                        onSubmit={this.onSubmitModal.bind(this)}
                        title="explorer.committee_members.update"
                        operation="committee_member_update"
                        updateMember={this.state.committee_member}
                        accountId={account.id}
                        {...this.props}
                    />
                ) : null}

                {showUpdateGateway && this.state.gateway ? (
                    <UaccountPropertyModal
                        modalId="gateway_update_modal"
                        ref="gateway_update_modal"
                        onCancel={this.closeModal.bind(this)}
                        onSubmit={this.onSubmitModal.bind(this)}
                        title="explorer.gateways.update"
                        operation="gateway_update"
                        updateMember={this.state.gateway}
                        accountId={account.id}
                        {...this.props}
                    />
                ) : null}

                {showUpdateCarrier && this.state.carrier ? (
                    <UaccountPropertyModal
                        modalId="carrier_update_modal"
                        ref="carrier_update_modal"
                        onCancel={this.closeModal.bind(this)}
                        onSubmit={this.onSubmitModal.bind(this)}
                        title="explorer.carriers.update"
                        operation="carrier_update"
                        updateMember={this.state.carrier}
                        accountId={account.id}
                        {...this.props}
                    />
                ) : null}

                {showUpdateBudgetMember && this.state.budget_member ? (
                    <UaccountPropertyModal
                        modalId="budget_member_update_modal"
                        ref="budget_member_update_modal"
                        onCancel={this.closeModal.bind(this)}
                        onSubmit={this.onSubmitModal.bind(this)}
                        title="explorer.budget_members.update"
                        operation="budget_member_update"
                        updateMember={this.state.budget_member}
                        accountId={account.id}
                        {...this.props}
                    />
                ) : null}
                {showUpdateAuthor && this.state.author ? (
                    <UaccountPropertyModal
                        modalId="author_update_modal"
                        ref="author_update_modal"
                        onCancel={this.closeModal.bind(this)}
                        onSubmit={this.onSubmitModal.bind(this)}
                        title="explorer.authors.update"
                        operation="author_update"
                        updateMember={this.state.author}
                        accountId={account.id}
                        {...this.props}
                    />
                ) : null}

                {/* update end */}

                {/* change identity start */}
                {showUpdateGateway && gateway ? (
                    <ChangeIdentityModal
                        modalId="gateway_change_identity_modal"
                        ref="gateway_change_identity_modal"
                        onCancel={this.closeModal.bind(this)}
                        onSubmit={this.onSubmitModal.bind(this)}
                        title={`account.membership.gateway.${
                            gateway.enable === "identity_enable"
                                ? "disabled"
                                : "enable"
                        }`}
                        operation="change_identity"
                        membership="gateway"
                        enable={gateway.enable === "identity_enable"}
                        accountId={account.id}
                        updateMember={this.state.gateway}
                        {...this.props}
                    />
                ) : null}

                {showUpdateCarrier && carrier ? (
                    <ChangeIdentityModal
                        modalId="carrier_change_identity_modal"
                        ref="carrier_change_identity_modal"
                        onCancel={this.closeModal.bind(this)}
                        onSubmit={this.onSubmitModal.bind(this)}
                        title={`account.membership.carrier.${
                            carrier.enable === "identity_enable"
                                ? "disabled"
                                : "enable"
                        }`}
                        operation="change_identity"
                        membership="carrier"
                        enable={carrier.enable === "identity_enable"}
                        accountId={account.id}
                        updateMember={this.state.carrier}
                        {...this.props}
                    />
                ) : null}

                {/* change identity end */}

                {/* gateway issue currency start */}
                {showUpdateGateway && this.state.gateway ? (
                    <GatewayIssueCurrencyModel
                        modalId="gateway_revoke_currency_modal"
                        ref="gateway_revoke_currency_modal"
                        onCancel={this.closeModal.bind(this)}
                        onSubmit={this.onSubmitModal.bind(this)}
                        title="account.membership.gateway.revoke_currency"
                        operation="gateway_issue_currency"
                        revoke={true}
                        updateMember={this.state.gateway}
                        account={account}
                        {...this.props}
                    />
                ) : null}

                {showUpdateGateway && this.state.gateway ? (
                    <GatewayIssueCurrencyModel
                        modalId="gateway_issue_currency_modal"
                        ref="gateway_issue_currency_modal"
                        onCancel={this.closeModal.bind(this)}
                        onSubmit={this.onSubmitModal.bind(this)}
                        title="account.membership.gateway.issue_currency"
                        operation="gateway_issue_currency"
                        revoke={false}
                        updateMember={this.state.gateway}
                        account={account}
                        {...this.props}
                    />
                ) : null}
                {/* gateway issue currency end */}

                {is_lifetime ? null : (
                    <NotLifetimeMemberModal
                        modalId="not_lifetime_member_modal"
                        ref="not_lifetime_member_modal"
                        type={this.state.apply_type}
                        onCancel={this.closeModal.bind(this)}
                        onSubmit={this.onSubmitModal.bind(this)}
                        accountId={account.id}
                        {...this.props}
                    />
                )}
            </div>
        );
    }
}
ZosMembership = BindToChainState(ZosMembership);

class UaccountPropertyModal extends React.Component {
    constructor() {
        super();
        this.state = {
            open: false,
            url: "",
            gateway_asset: "",
            signing_key: "",
            updateMember: null,
            need_auth: null, //修改网关/运行商 权限时用到(检查一系列值)
            trust_auth: null, //修改网关/运行商 权限认证人
            def_auth: null //修改网关/运行商 默认权限认证人
        };
    }

    show() {
        let newState = {
            open: true,
            url: "",
            gateway_asset: "",
            signing_key: "",
            updateMember: null,
            need_auth: null,
            trust_auth: null,
            def_auth: null
        };
        if (this.props.signingkey) {
            newState.signing_key = this.props.signingkey;
        }
        if (this.props.updateMember) {
            newState.updateMember = this.props.updateMember;
            if (
                this.props.updateMember.url &&
                this.props.updateMember.url != ""
            ) {
                newState.url = this.props.updateMember.url;
            }
            if (this.props.operation == "gateway_update") {
                let gatewaySymbols = [];
                let updateMember = this.props.updateMember;
                if (this.props.updateMember.allowed_assets) {
                    this.props.updateMember.allowed_assets.forEach(alowed => {
                        if (updateMember.allowed_assets_map[alowed]) {
                            gatewaySymbols.push(
                                updateMember.allowed_assets_map[alowed].symbol
                            );
                        }
                    });
                }
                newState.gateway_asset = gatewaySymbols.join(",");
            }
            if (this.props.operation == "author_update") {
                let gatewaySymbols = [];
                let promises = [];
                let updateMember = this.props.updateMember;
                if (this.props.updateMember.allow_asset) {
                    //console.log("allow_asset:",this.props.updateMember.allow_asset)
                    this.props.updateMember.allow_asset.forEach(allowedId => {
                        promises.push(FetchChain("getObject", allowedId, 5000));
                    });
                }
                Promise.all(promises).then(objs => {
                    //console.log("objs:",objs)
                    if (objs && objs.length > 0) {
                        objs.forEach(obj => {
                            gatewaySymbols.push(obj.get("symbol"));
                        });
                        //console.log("gatewaySymbols",gatewaySymbols)
                        this.setState({
                            gateway_asset: gatewaySymbols.join(",")
                        });
                    }
                });
            }
            if (
                this.props.operation == "gateway_update" ||
                this.props.operation == "carrier_update"
            ) {
                newState.trust_auth = JSON.stringify(
                    this.props.updateMember.trust_auth
                );
                newState.need_auth = this.props.updateMember.need_auth;
                let def_auth = this.props.updateMember.def_auth;
                this.getAccountByDefAuth(def_auth);
            }
        }
        this.setState(newState, () => {
            ZfApi.publish(this.props.modalId, "open");
        });
    }

    onClose() {
        this.setState({
            open: false,
            signing_key: ""
        });
    }

    getAccountByDefAuth(def_auth) {
        FetchChain("getObject", def_auth, 5000).then(res => {
            console.log("getAccountByDefAuth:", res.toJS());
            if (res && res.get("author_account")) {
                console.log("getAccountByDefAuth:", res.get("author_account"));
                this.setState({
                    def_auth: res.get("author_account")
                });
            }
        });
    }

    onChangeNeedAuth(need_auth) {
        console.log("onChangeNeedAuth|need_auth:", need_auth);
        this.setState({
            need_auth: need_auth
        });
    }

    render() {
        let {
            gprops,
            accountId,
            modalId,
            title,
            updateMember, //网关或者运行商
            operation
        } = this.props;
        //console.log("UaccountPropertyModal:", this.props);

        let fee_asset_id = accountUtils.getFinalFeeAsset(accountId, operation);

        let operation_id = grapheneChainTypes.operations[operation];

        let amount_fee = gprops.getIn([
            "parameters",
            "current_fees",
            "parameters",
            operation_id,
            1,
            "fee"
        ]);
        let amount_lock_fee = gprops.getIn([
            "parameters",
            "current_fees",
            "parameters",
            operation_id,
            1,
            "lock_fee"
        ]);

        let disabled = false;
        let urlRow = null;
        let gatewaySymbolRow = null;

        // console.log("gateway_asset", this.state.gateway_asset);
        switch (operation) {
            case "gateway_create":
                disabled = this.state.gateway_asset == "";
            case "author_create":
                disabled = this.state.gateway_asset == "";
            case "gateway_update":
            case "carrier_create":
                urlRow = (
                    <tr>
                        <td colSpan="2">
                            <input
                                onChange={e => {
                                    this.setState({
                                        url: e.target.value
                                    });
                                }}
                                defaultValue={this.state.url}
                                type="text"
                                placeholder={counterpart.translate(
                                    `explorer.gateways.website`
                                )}
                            />
                        </td>
                    </tr>
                );

                break;
            // case 'witness_create':
            // case 'committee_member_create':
            // case 'budget_member_create':
            default:
                urlRow = (
                    <tr>
                        <td colSpan="2">
                            <textarea
                                onChange={e => {
                                    this.setState({
                                        url: e.target.value
                                    });
                                }}
                                placeholder={counterpart.translate(
                                    `explorer.witnesses.url`
                                )}
                                defaultValue={this.state.url}
                                style={{
                                    marginBottom: 0
                                }}
                            />
                        </td>
                    </tr>
                );
                break;
        }

        return !this.state.open ? null : (
            <BaseModal id={modalId} overlay={true} modalHeader={title} noLoggo>
                <div style={{marginBottom: "1em"}}>
                    <table className="table op-table">
                        <caption />
                        <tbody>
                            {urlRow}
                            {operation === "gateway_create" ||
                            operation === "gateway_update" ||
                            operation === "author_create" ||
                            operation === "author_update" ? (
                                <tr>
                                    <td colSpan="2">
                                        <input
                                            onChange={e => {
                                                this.setState({
                                                    gateway_asset: e.target.value.trim()
                                                });
                                            }}
                                            value={this.state.gateway_asset}
                                            type="text"
                                            placeholder={counterpart.translate(
                                                `explorer.gateways.asset`
                                            )}
                                        />
                                    </td>
                                </tr>
                            ) : null}

                            {operation === "gateway_update" ||
                            operation === "carrier_update" ? (
                                <tr>
                                    <td colSpan="2">
                                        <input
                                            onChange={e => {
                                                this.setState({
                                                    trust_auth: e.target.value.trim()
                                                });
                                            }}
                                            defaultValue={this.state.trust_auth}
                                            type="text"
                                            placeholder={counterpart.translate(
                                                `explorer.authors.trust_auth`
                                            )}
                                        />
                                    </td>
                                </tr>
                            ) : null}
                            {operation === "gateway_update" ||
                            operation === "carrier_update" ? (
                                <tr>
                                    <td colSpan="2">
                                        <input
                                            onChange={e => {
                                                this.setState({
                                                    def_auth: e.target.value.trim()
                                                });
                                            }}
                                            value={this.state.def_auth}
                                            type="text"
                                            placeholder={counterpart.translate(
                                                `explorer.authors.def_auth`
                                            )}
                                        />
                                    </td>
                                </tr>
                            ) : null}

                            {operation === "gateway_update" ||
                            operation === "carrier_update" ? (
                                <tr colSpan="2">
                                    <ZosMemberNeedAuth
                                        onChangeNeedAuth={this.onChangeNeedAuth.bind(
                                            this
                                        )}
                                        updateMember={updateMember}
                                        operation={operation}
                                    />
                                </tr>
                            ) : null}

                            {!updateMember ? (
                                <tr>
                                    <td>
                                        <Translate
                                            component="span"
                                            content="operation.feeTypes.lock_fee"
                                        />
                                    </td>
                                    <td>
                                        <FormattedAsset
                                            color="fee"
                                            amount={amount_lock_fee}
                                            asset={fee_asset_id}
                                        />
                                    </td>
                                </tr>
                            ) : null}
                            <tr>
                                <td>
                                    <Translate
                                        component="span"
                                        content="operation.feeTypes.fee"
                                    />
                                </td>
                                <td>
                                    <FormattedAsset
                                        color="fee"
                                        amount={amount_fee}
                                        asset={fee_asset_id}
                                    />
                                </td>
                            </tr>

                            {operation == "carrier_create" ? (
                                <tr>
                                    <td colSpan="2">
                                        <HelpContent
                                            path="components/AccountMembership"
                                            section="carrier_create"
                                        />
                                    </td>
                                </tr>
                            ) : null}

                            {operation == "witness_create" ? (
                                <tr>
                                    <td colSpan="2">
                                        <HelpContent
                                            path="components/AccountMembership"
                                            section="witness_create"
                                        />
                                    </td>
                                </tr>
                            ) : null}

                            {operation == "committee_member_create" ? (
                                <tr>
                                    <td colSpan="2">
                                        <HelpContent
                                            path="components/AccountMembership"
                                            section="committee_member_create"
                                        />
                                    </td>
                                </tr>
                            ) : null}

                            {operation == "budget_member_create" ? (
                                <tr>
                                    <td colSpan="2">
                                        <HelpContent
                                            path="components/AccountMembership"
                                            section="budget_member_create"
                                        />
                                    </td>
                                </tr>
                            ) : null}
                            {/*{operation == "author_create" ? (
                                <tr>
                                    <td colSpan="2">
                                        <HelpContent
                                            path="components/AccountMembership" //内容待定
                                            section="budget_member_create" //内容待定
                                        />
                                    </td>
                                </tr>
                            ) : null}*/}
                        </tbody>
                    </table>
                </div>
                <div className="button-group">
                    <button
                        className="button primary hollow"
                        onClick={this.props.onCancel.bind(this, modalId)}
                    >
                        <Translate content="cancel" />
                    </button>
                    <button
                        className="button primary"
                        onClick={this.props.onSubmit.bind(
                            this,
                            modalId,
                            accountId,
                            this.state
                        )}
                        disabled={disabled}
                    >
                        <Translate content="confirm" />
                    </button>
                </div>
            </BaseModal>
        );
    }
}

class ChangeIdentityModal extends React.Component {
    constructor() {
        super();
        this.state = {
            open: false,
            url: ""
        };
    }

    show() {
        let newState = {
            open: true,
            url: "",
            enable: !!this.props.enable
        };
        if (this.props.updateMember) {
            newState.updateMember = this.props.updateMember;
        }
        this.setState(newState, () => {
            ZfApi.publish(this.props.modalId, "open");
        });
    }

    onClose() {
        this.setState({
            open: false,
            signing_key: ""
        });
    }

    render() {
        let {
            gprops,
            accountId,
            modalId,
            title,
            enable,
            membership,
            updateMember,
            operation
        } = this.props;

        let fee_asset_id = accountUtils.getFinalFeeAsset(accountId, operation);

        let operation_id = grapheneChainTypes.operations[operation];

        let amount_fee = gprops.getIn([
            "parameters",
            "current_fees",
            "parameters",
            operation_id,
            1,
            "fee"
        ]);
        let amount_lock_fee = gprops.getIn([
            "parameters",
            "current_fees",
            "parameters",
            operation_id,
            1,
            "lock_fee"
        ]);

        return !this.state.open ? null : (
            <BaseModal id={modalId} overlay={true} modalHeader={title} noLoggo>
                <div style={{marginBottom: "1em"}}>
                    <table className="table op-table op-lr">
                        <caption />
                        <tbody>
                            <tr>
                                <td>
                                    <Translate
                                        component="span"
                                        content="operation.feeTypes.fee"
                                    />
                                </td>
                                <td>
                                    <FormattedAsset
                                        color="fee"
                                        amount={amount_fee}
                                        asset={fee_asset_id}
                                    />
                                </td>
                            </tr>
                            {enable ? (
                                <tr>
                                    {membership == "carrier" ? (
                                        <td colSpan="2">
                                            <HelpContent
                                                path="components/AccountMembership"
                                                section="carrier_delete"
                                            />
                                        </td>
                                    ) : (
                                        <td colSpan="2">
                                            <HelpContent
                                                path="components/AccountMembership"
                                                section="gateway_delete"
                                            />
                                        </td>
                                    )}
                                </tr>
                            ) : (
                                // 激活见证人
                                <tr>
                                    {membership == "witness" ? (
                                        <td colSpan="2">
                                            <HelpContent
                                                path="components/AccountMembership"
                                                section="witness_activation"
                                            />
                                        </td>
                                    ) : null}
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="button-group">
                    <button
                        className="button primary hollow"
                        onClick={this.props.onCancel.bind(this, modalId)}
                    >
                        <Translate content="cancel" />
                    </button>
                    <button
                        className="button primary"
                        onClick={this.props.onSubmit.bind(
                            this,
                            modalId,
                            accountId,
                            {
                                object_id: updateMember ? updateMember.id : 0,
                                enable: enable
                            }
                        )}
                    >
                        <Translate content="confirm" />
                    </button>
                </div>
            </BaseModal>
        );
    }
}

class GatewayIssueCurrencyModel extends React.Component {
    constructor() {
        super();
        this.state = {
            open: false,
            url: "",
            current_asset: null,
            current_asset_balance: null,
            gateway_assets: null,
            updateMember: null,
            issue_amount: 0,
            memo: null,
            error: null
        };
    }

    show() {
        let newState = {
            open: true,
            url: "",
            current_asset: null,
            current_asset_balance: null,
            gateway_assets: null,
            updateMember: null,
            issue_amount: 0,
            memo: null,
            error: null
        };
        if (this.props.updateMember) {
            newState.updateMember = this.props.updateMember;
            let gatewayAssets = {};
            let updateMember = this.props.updateMember;
            let issueAmountMap = {};
            let dynamic_datas = this.props.updateMember.dynamic_datas;
            if (dynamic_datas && dynamic_datas[0]) {
                let dynamic_data = dynamic_datas[0];
                dynamic_data.issue_amount.forEach(amount => {
                    issueAmountMap[amount[0]] = amount;
                });
            }
            if (this.props.updateMember.allowed_assets) {
                this.props.updateMember.allowed_assets.forEach(alowed => {
                    if (alowed in updateMember.allowed_assets_map) {
                        let alowed_asset =
                            updateMember.allowed_assets_map[alowed];

                        let issue_amount =
                            alowed_asset &&
                            issueAmountMap &&
                            issueAmountMap[alowed_asset.id] &&
                            issueAmountMap[alowed_asset.id][1]
                                ? issueAmountMap[alowed_asset.id][1]
                                : 0;
                        //console.log("issue_amount:",issue_amount)
                        gatewayAssets[alowed_asset.id] = {
                            id: alowed_asset.id,
                            symbol: alowed_asset.symbol,
                            precision: alowed_asset.precision,
                            max_supply: alowed_asset.options.max_supply,
                            current_supply:
                                alowed_asset.dynamic_asset_data.current_supply,
                            max_issue:
                                alowed_asset.options.max_supply -
                                alowed_asset.dynamic_asset_data.current_supply,
                            issue_amount: issue_amount
                        };
                    }
                });
            }
            if (this.props.balances) {
                newState.balances_map = {};
                this.props.balances.map(a => {
                    newState.balances_map[a.get("asset_type")] = a
                        .get("balance")
                        .toString();
                });
            }

            if (gatewayAssets) {
                Object.keys(gatewayAssets).forEach(assetId => {
                    let asset = gatewayAssets[assetId];
                    if (!newState.current_asset) {
                        newState.current_asset = asset;
                        newState.current_asset_balance =
                            newState.balances_map[asset.id];
                    }
                });
            }

            newState.gateway_assets = gatewayAssets;
            console.log("--newState:", newState);
        }
        this.setState(newState, () => {
            ZfApi.publish(this.props.modalId, "open");
        });
    }

    onChangeAsset(e) {
        let {gateway_assets, balances_map} = this.state;
        if (gateway_assets && gateway_assets[e.target.value]) {
            let state = {};
            state.current_asset = gateway_assets[e.target.value];
            state.current_asset_balance = balances_map[e.target.value];
            this.setState(state);
        }
    }

    onChangeIssueAmount(asset, current_asset_balance, e) {
        let {revoke} = this.props;
        let amount = e.target.value;
        if (
            asset &&
            amount &&
            amount.length &&
            amount.indexOf(".") > 0 &&
            amount.length > asset.precision + amount.indexOf(".")
        ) {
            amount = Number(amount).toFixed(asset.precision);
        }
        let max_value = 0;
        let min_value = 0;
        if (revoke) {
            let max_issue_amount = current_asset_balance || asset.issue_amount;
            max_value = max_issue_amount / Math.pow(10, asset.precision);
        } else {
            max_value = asset.max_issue / Math.pow(10, asset.precision);
        }

        if (Number(amount) > max_value) {
            e.target.value = max_value;
            amount = max_value;
        } else {
            e.target.value = amount;
        }

        let issue_amount = Number(amount) * Math.pow(10, asset.precision);
        this.setState({
            current_asset: asset,
            issue_amount: `${issue_amount}`
        });
    }

    onClose() {
        this.setState({open: false});
    }

    render() {
        let {
            gprops,
            account,
            modalId,
            title,
            revoke,
            updateMember,
            operation,
            error
        } = this.props;

        let {
            current_asset,
            balances_map,
            current_asset_balance,
            gateway_assets,
            issue_amount
        } = this.state;

        console.log("this.state:", this.state);

        let accountId = account.get("id");
        let accountName = account.get("name");

        let fee_asset_id = accountUtils.getFinalFeeAsset(accountId, operation);

        let operation_id = grapheneChainTypes.operations[operation];

        let amount_fee = gprops.getIn([
            "parameters",
            "current_fees",
            "parameters",
            operation_id,
            1,
            "fee"
        ]);
        let amount_lock_fee = gprops.getIn([
            "parameters",
            "current_fees",
            "parameters",
            operation_id,
            1,
            "lock_fee"
        ]);

        let issueAssetOptions = [];
        gateway_assets &&
            Object.keys(gateway_assets).forEach(assetId => {
                let asset = gateway_assets[assetId];
                issueAssetOptions.push(
                    <option key={asset.id} value={asset.id}>
                        {asset.symbol}
                    </option>
                );
            });

        // console.log("gateway_assets", gateway_assets)
        // console.log("current_asset", current_asset)
        // console.log("current_asset_balance", current_asset_balance)

        let disabled = Number(issue_amount) <= 0 ? true : false;

        let max_supply = current_asset
            ? (
                  current_asset.max_supply /
                  Math.pow(10, current_asset.precision)
              ).toFixed(current_asset.precision)
            : 0;
        let current_supply = current_asset
            ? (
                  current_asset.current_supply /
                  Math.pow(10, current_asset.precision)
              ).toFixed(current_asset.precision)
            : 0;
        let max_issue = current_asset
            ? (
                  current_asset.max_issue /
                  Math.pow(10, current_asset.precision)
              ).toFixed(current_asset.precision)
            : 0;

        // console.log("this.state.current_asset", this.state.current_asset)

        let submitParams = {
            account_to: accountId,
            issue_currency: {
                amount: this.state.issue_amount ? this.state.issue_amount : 0,
                asset_id: this.state.current_asset
                    ? this.state.current_asset.id
                    : null
            },
            revoke: revoke,
            memo: this.state.memo ? this.state.memo : ""
        };

        return !this.state.open ? null : (
            <BaseModal id={modalId} overlay={true} modalHeader={title} noLoggo>
                <div style={{marginBottom: "1em"}}>
                    <table className="table op-table op-lr">
                        <caption />
                        <tbody>
                            <tr>
                                <td>
                                    {revoke ? (
                                        <Translate
                                            content={`account.membership.gateway_revoke.account_to`}
                                        />
                                    ) : (
                                        <Translate
                                            content={`account.membership.gateway_issue.account_to`}
                                        />
                                    )}
                                </td>
                                <td>{accountName}</td>
                            </tr>
                            <tr>
                                <td>
                                    {revoke ? (
                                        <Translate
                                            content={`account.membership.gateway_revoke.asset`}
                                        />
                                    ) : (
                                        <Translate
                                            content={`account.membership.gateway_issue.asset`}
                                        />
                                    )}
                                </td>
                                <td>
                                    <select
                                        className="bts-select"
                                        value={
                                            current_asset && current_asset.id
                                                ? current_asset.id
                                                : ""
                                        }
                                        onChange={this.onChangeAsset.bind(this)}
                                    >
                                        {issueAssetOptions}
                                    </select>
                                </td>
                            </tr>
                            {revoke ? (
                                <tr>
                                    <td>
                                        <Translate content="account.membership.gateway_revoke.amount" />
                                    </td>
                                    <td>
                                        <div>
                                            <input
                                                onChange={this.onChangeIssueAmount.bind(
                                                    this,
                                                    current_asset,
                                                    current_asset_balance
                                                )}
                                                type="number"
                                            />
                                        </div>
                                        <div style={{width: "100%"}}>
                                            <div
                                                style={{
                                                    fontSize: 12,
                                                    color: "#aaa"
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        marginRight: "1rem"
                                                    }}
                                                >
                                                    <Translate content="transfer.balances" />{" "}
                                                    {current_asset_balance
                                                        ? (
                                                              current_asset_balance /
                                                              Math.pow(
                                                                  10,
                                                                  current_asset.precision
                                                              )
                                                          ).toFixed(
                                                              current_asset.precision
                                                          )
                                                        : "0"}
                                                    ;
                                                </span>
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        marginRight: "1rem"
                                                    }}
                                                >
                                                    <Translate content="account.membership.gateway.issued_amount" />{" "}
                                                    {current_asset &&
                                                    current_asset.issue_amount
                                                        ? (
                                                              current_asset.issue_amount /
                                                              Math.pow(
                                                                  10,
                                                                  current_asset.precision
                                                              )
                                                          ).toFixed(
                                                              current_asset.precision
                                                          )
                                                        : 0}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                <tr>
                                    <td>
                                        <Translate content="account.membership.gateway_issue.amount" />
                                    </td>
                                    <td>
                                        <div>
                                            <input
                                                onChange={this.onChangeIssueAmount.bind(
                                                    this,
                                                    current_asset,
                                                    current_asset_balance
                                                )}
                                                type="number"
                                            />
                                        </div>
                                        <div style={{width: "100%"}}>
                                            <div
                                                style={{
                                                    fontSize: 12,
                                                    color: "#aaa"
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        marginRight: "1rem"
                                                    }}
                                                >
                                                    <Translate content="account.membership.gateway.max_supply" />{" "}
                                                    {max_supply}
                                                </span>
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        marginRight: "1rem"
                                                    }}
                                                >
                                                    <Translate content="account.membership.gateway.current_supply" />{" "}
                                                    {current_supply}
                                                </span>
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        marginRight: "1rem"
                                                    }}
                                                >
                                                    <Translate content="account.membership.gateway.max_issue" />{" "}
                                                    {max_issue}
                                                </span>
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        marginRight: "1rem"
                                                    }}
                                                >
                                                    <Translate content="account.membership.gateway.issued_amount" />{" "}
                                                    {current_asset &&
                                                    current_asset.issue_amount
                                                        ? (
                                                              current_asset.issue_amount /
                                                              Math.pow(
                                                                  10,
                                                                  current_asset.precision
                                                              )
                                                          ).toFixed(
                                                              current_asset.precision
                                                          )
                                                        : 0}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            <tr>
                                <td>
                                    <Translate content="account.membership.gateway.issuer" />
                                </td>
                                <td>{accountName}</td>
                            </tr>
                            <tr>
                                <td>
                                    <Translate content="account.membership.gateway.memo" />
                                </td>
                                <td>
                                    <textarea
                                        onChange={e => {
                                            this.setState({
                                                memo: e.target.value
                                            });
                                        }}
                                        style={{marginBottom: 0}}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <Translate
                                        component="span"
                                        content="operation.feeTypes.fee"
                                    />
                                </td>
                                <td>
                                    <FormattedAsset
                                        color="fee"
                                        amount={amount_fee}
                                        asset={fee_asset_id}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="button-group">
                    <button
                        className="button primary hollow"
                        onClick={this.props.onCancel.bind(this, modalId)}
                    >
                        <Translate content="cancel" />
                    </button>
                    <button
                        className="button primary"
                        onClick={this.props.onSubmit.bind(
                            this,
                            modalId,
                            accountId,
                            submitParams
                        )}
                        disabled={disabled}
                    >
                        <Translate content="confirm" />
                    </button>
                </div>
            </BaseModal>
        );
    }
}

class NotLifetimeMemberModal extends React.Component {
    constructor() {
        super();
        this.state = {
            open: false
        };
    }

    show() {
        let newState = {
            open: true
        };
        this.setState(newState, () => {
            ZfApi.publish(this.props.modalId, "open");
        });
    }

    onClose() {
        this.setState({
            open: false
        });
    }

    render() {
        let {modalId, accountId, type} = this.props;

        let title = counterpart.translate("account.membership.apply");
        let message = counterpart.translate("account.membership.apply_need");

        if (type == "witness_create_modal") {
            title += counterpart.translate("account.uaccount_property.witness");
            message = title + ", " + message;
        } else if (type == "committee_member_create_modal") {
            title += counterpart.translate(
                "account.uaccount_property.committe"
            );
            message = title + ", " + message;
        } else if (type == "gateway_create_modal") {
            title += counterpart.translate("account.uaccount_property.gateway");
            message = title + ", " + message;
        } else if (type == "carrier_create_modal") {
            title += counterpart.translate("account.uaccount_property.carrier");
            message = title + ", " + message;
        } else if (type == "budget_member_create_modal") {
            title += counterpart.translate("account.uaccount_property.budget");
            message = title + ", " + message;
        }

        // console.log("NotLifetimeMemberModal", type)

        return !this.state.open ? null : (
            <BaseModal id={modalId} overlay={true} noHeader noLoggo>
                <div className="text-center">
                    <div className="modal__title">{title}</div>
                </div>
                <div style={{marginBottom: "1em", padding: "1rem 0"}}>
                    {message}
                </div>
                <div className="button-group">
                    <button
                        className="button primary hollow"
                        onClick={this.props.onCancel.bind(this, modalId)}
                    >
                        <Translate content="cancel" />
                    </button>
                    <button
                        className="button primary"
                        onClick={this.props.onSubmit.bind(
                            this,
                            modalId,
                            accountId,
                            false
                        )}
                    >
                        <Translate content="confirm" />
                    </button>
                </div>
            </BaseModal>
        );
    }
}

export default ZosMembership;

import alt from "alt-instance";
import accountUtils from "common/account_utils";
import AccountApi from "api/accountApi";

import WalletApi from "api/WalletApi";
import ApplicationApi from "api/ApplicationApi";
import WalletDb from "stores/WalletDb";
import WalletActions from "actions/WalletActions";
// import {TransactionBuilder} from "zosjs/es";

let accountSearch = {};

/**
 *  @brief  Actions that modify linked accounts
 *
 *  @note this class also includes accountSearch actions which keep track of search result state.  The presumption
 *  is that there is only ever one active "search result" at a time.
 */
class AccountActions {
    /**
     *  Account search results are not managed by the ChainStore cache so are
     *  tracked as part of the AccountStore.
     */
    accountSearch(start_symbol, limit = 50) {
        let uid = `${start_symbol}_${limit}}`;
        return dispatch => {
            if (!accountSearch[uid]) {
                accountSearch[uid] = true;
                return AccountApi.lookupAccounts(start_symbol, limit).then(
                    result => {
                        accountSearch[uid] = false;
                        dispatch({accounts: result, searchTerm: start_symbol});
                        //result=[accountname,id]
                    }
                );
            }
        };
    }

    /**
     *  TODO:  The concept of current accounts is deprecated and needs to be removed
     */
    setCurrentAccount(name) {
        return name;
    }

    tryToSetCurrentAccount() {
        return true;
    }

    addStarAccount(account) {
        return account;
    }

    removeStarAccount(account) {
        return account;
    }

    toggleHideAccount(account, hide) {
        return {account, hide};
    }

    /**
     *  TODO:  This is a function of teh WalletApi and has no business being part of AccountActions
     */
    transfer(
        from_account,
        to_account,
        amount,
        asset,
        memo,
        propose_account = null,
        fee_asset_id = "1.3.0"
    ) {
        // Set the fee asset to use
        fee_asset_id = accountUtils.getFinalFeeAsset(
            propose_account || from_account,
            "transfer",
            fee_asset_id
        );

        try {
            return dispatch => {
                return ApplicationApi.transfer({
                    from_account,
                    to_account,
                    amount,
                    asset,
                    memo,
                    propose_account,
                    fee_asset_id
                }).then(result => {
                    // console.log( "transfer result: ", result )

                    dispatch(result);
                });
            };
        } catch (error) {
            console.log(
                "[AccountActions.js:90] ----- transfer error ----->",
                error
            );
            return new Promise((resolve, reject) => {
                reject(error);
            });
        }
    }

    account_withdraw_fee(account_id, core_amount, withdraw_asset_id) {
        let fee_asset_id = accountUtils.getFinalFeeAsset(
            account_id,
            "account_withdraw_fee"
        );
        let tr = WalletApi.new_transaction();
        tr.add_type_operation("account_withdraw_fee", {
            fee: {
                amount: 0,
                asset_id: fee_asset_id
            },
            issuer: account_id,
            core_amount,
            withdraw_asset_id
        });
        return WalletDb.process_transaction(tr, null, true);
    }

    /**
     *  TODO:  This is a function of teh WalletApi and has no business being part of AccountActions
     */
    gateway_issue_currency(
        from_account,
        to_account,
        amount,
        asset,
        memo,
        propose_account = null,
        revoke = false,
        fee_asset_id = "1.3.0"
    ) {
        // Set the fee asset to use
        fee_asset_id = accountUtils.getFinalFeeAsset(
            propose_account || from_account,
            "gateway_issue_currency",
            fee_asset_id
        );

        try {
            return dispatch => {
                return ApplicationApi.gateway_issue_currency({
                    from_account,
                    to_account,
                    amount,
                    asset,
                    memo,
                    propose_account,
                    revoke,
                    fee_asset_id
                }).then(result => {
                    // console.log( "transfer result: ", result )

                    dispatch(result);
                });
            };
        } catch (error) {
            console.log(
                "[AccountActions.js:90] ----- gateway_issue_currency error ----->",
                error
            );
            return new Promise((resolve, reject) => {
                reject(error);
            });
        }
    }

    /**
     *  This method exists ont he AccountActions because after creating the account via the wallet, the account needs
     *  to be linked and added to the local database.
     */
    createAccount(
        account_name,
        registrar,
        referrer,
        referrer_percent,
        refcode,
        captcha, //增加验证码
        captchaid,
        advanced_account_registrar
    ) {
        return dispatch => {
            return WalletActions.createAccount(
                account_name,
                registrar,
                referrer,
                referrer_percent,
                refcode,
                captcha,
                captchaid,
                advanced_account_registrar
            ).then(() => {
                dispatch(account_name);
                return account_name;
            });
        };
    }

    createAccountWithPassword(
        account_name,
        password,
        registrar,
        referrer,
        referrer_percent,
        refcode,
        captcha,
        captchaid,
        advanced_account_registrar
    ) {
        return dispatch => {
            return WalletActions.createAccountWithPassword(
                account_name,
                password,
                registrar,
                referrer,
                referrer_percent,
                refcode,
                captcha,
                captchaid,
                advanced_account_registrar
            ).then(() => {
                dispatch(account_name);
                return account_name;
            });
        };
    }

    gatewayIssueCurrency(
        account_id,
        account_to,
        issue_currency,
        revoke,
        memo,
        memo_str
    ) {
        let fee_asset_id = accountUtils.getFinalFeeAsset(
            account_id,
            "gateway_issue_currency"
        );

        let tr = WalletApi.new_transaction();
        let transfer_op = tr.get_type_operation("gateway_issue_currency", {
            fee: {
                amount: 0,
                asset_id: fee_asset_id
            },
            issuer: account_id,
            account_to: account_to,
            issue_currency: issue_currency,
            revoke: revoke,
            memo: memo
        });

        return tr.update_head_block().then(() => {
            tr.add_type_operation("proposal_create", {
                proposed_ops: [{op: transfer_op}],
                fee_paying_account: account_id,
                memo: memo_str
            });

            return WalletDb.process_transaction(tr, null, true);
        });
    }

    changeIdentity(account_id, object_id, enable) {
        let fee_asset_id = accountUtils.getFinalFeeAsset(
            account_id,
            "change_identity"
        );

        var tr = WalletApi.new_transaction();
        tr.add_type_operation("change_identity", {
            fee: {
                amount: 0,
                asset_id: fee_asset_id
            },
            issuer: account_id,
            object_id: object_id,
            enable: enable
        });
        return WalletDb.process_transaction(tr, null, true);
    }

    createGateway(account_id, url, allowed_asset, memo = " ") {
        let fee_asset_id = accountUtils.getFinalFeeAsset(
            account_id,
            "gateway_create"
        );
        let tr = WalletApi.new_transaction();
        let transfer_op = tr.get_type_operation("gateway_create", {
            fee: {
                amount: 0,
                asset_id: fee_asset_id
            },
            gateway_account: account_id,
            url: url,
            memo: memo,
            allowed_asset: allowed_asset
        });

        return tr.update_head_block().then(() => {
            tr.add_type_operation("proposal_create", {
                proposed_ops: [{op: transfer_op}],
                fee_paying_account: account_id
            });

            return WalletDb.process_transaction(tr, null, true);
        });
    }

    updateGateway(
        gateway,
        account_id,
        new_url,
        allowed_asset,
        need_auth,
        trust_auth,
        def_auth,
        new_memo = " "
    ) {
        let fee_asset_id = accountUtils.getFinalFeeAsset(
            account_id,
            "gateway_update"
        );

        let tr = WalletApi.new_transaction();
        let transfer_ops = [];
        //更改网关内容
        let gateway_update_op = tr.get_type_operation("gateway_update", {
            fee: {
                amount: 0,
                asset_id: fee_asset_id
            },
            gateway: gateway,
            need_auth: need_auth,
            gateway_account: account_id,
            new_url: new_url,
            new_memo: new_memo,
            allowed_asset: allowed_asset
        });
        transfer_ops.push({op: gateway_update_op});

        //更改网关认证权限
        /*console.log(
            "gateway_update_needauth_op|need_auth:",
            JSON.parse(trust_auth)
        );*/

        let gateway_update_needauth_op = tr.get_type_operation(
            "account_authenticate",
            {
                issuer: account_id,
                op_type: 7, //7更新网关 8更新运营商
                auth_data: {
                    authenticator: def_auth
                },
                trust_auth: JSON.parse(trust_auth)
            }
        );
        transfer_ops.push({op: gateway_update_needauth_op});

        return tr.update_head_block().then(() => {
            tr.add_type_operation("proposal_create", {
                proposed_ops: transfer_ops,
                fee_paying_account: account_id
            });

            console.log("updateGateway|tr:", tr);
            return WalletDb.process_transaction(tr, null, true);
        });
    }

    createCarrier(account_id, url, memo = " ") {
        let fee_asset_id = accountUtils.getFinalFeeAsset(
            account_id,
            "carrier_create"
        );
        let tr = WalletApi.new_transaction();
        let transfer_op = tr.get_type_operation("carrier_create", {
            fee: {
                amount: 0,
                asset_id: fee_asset_id
            },
            carrier_account: account_id,
            url: url,
            memo: memo
        });

        return tr.update_head_block().then(() => {
            tr.add_type_operation("proposal_create", {
                proposed_ops: [{op: transfer_op}],
                fee_paying_account: account_id
            });

            return WalletDb.process_transaction(tr, null, true);
        });
    }

    updateCarrier(
        carrier,
        account_id,
        new_url,
        need_auth,
        trust_auth,
        def_auth,
        new_memo = " "
    ) {
        let fee_asset_id = accountUtils.getFinalFeeAsset(
            account_id,
            "carrier_update"
        );
        let tr = WalletApi.new_transaction();
        let transfer_ops = [];
        let carrier_update_op = tr.get_type_operation("carrier_update", {
            fee: {
                amount: 0,
                asset_id: fee_asset_id
            },
            carrier: carrier,
            carrier_account: account_id,
            need_auth: need_auth,
            new_url: new_url,
            new_memo: new_memo
        });

        transfer_ops.push({op: carrier_update_op});

        let carrier_update_needauth_op = tr.get_type_operation(
            "account_authenticate",
            {
                issuer: account_id,
                op_type: 8, //7更新网关 8更新运营商
                auth_data: {
                    authenticator: def_auth
                },
                trust_auth: JSON.parse(trust_auth)
            }
        );
        transfer_ops.push({op: carrier_update_needauth_op});

        return tr.update_head_block().then(() => {
            tr.add_type_operation("proposal_create", {
                proposed_ops: transfer_ops,
                fee_paying_account: account_id
            });

            return WalletDb.process_transaction(tr, null, true);
        });
    }

    createWitness(account_id, url, signing_key, memo = " ") {
        let fee_asset_id = accountUtils.getFinalFeeAsset(
            account_id,
            "witness_create"
        );

        var tr = WalletApi.new_transaction();
        tr.add_type_operation("witness_create", {
            fee: {
                amount: 0,
                asset_id: fee_asset_id
            },
            witness_account: account_id,
            url: url,
            memo: memo,
            block_signing_key: signing_key
        });
        return WalletDb.process_transaction(tr, null, true);
    }

    updateWitness(
        witness,
        account_id,
        new_url,
        new_signing_key,
        new_memo = " "
    ) {
        let fee_asset_id = accountUtils.getFinalFeeAsset(
            account_id,
            "witness_update"
        );

        var tr = WalletApi.new_transaction();
        tr.add_type_operation("witness_update", {
            fee: {
                amount: 0,
                asset_id: fee_asset_id
            },
            witness: witness,
            witness_account: account_id,
            new_url: new_url,
            new_memo: new_memo,
            new_signing_key: new_signing_key
        });
        return WalletDb.process_transaction(tr, null, true);
    }

    createCommitteeMember(account_id, url, memo = " ") {
        // Set the fee asset to use
        let fee_asset_id = accountUtils.getFinalFeeAsset(
            account_id,
            "committee_member_create"
        );

        var tr = WalletApi.new_transaction();
        tr.add_type_operation("committee_member_create", {
            fee: {
                amount: 0,
                asset_id: fee_asset_id
            },
            committee_member_account: account_id,
            url: url,
            memo: memo
        });
        return WalletDb.process_transaction(tr, null, true);
    }

    updateCommitteeMember(
        committee_member,
        account_id,
        new_url,
        new_memo = " "
    ) {
        let fee_asset_id = accountUtils.getFinalFeeAsset(
            account_id,
            "committee_member_update"
        );

        var tr = WalletApi.new_transaction();
        tr.add_type_operation("committee_member_update", {
            fee: {
                amount: 0,
                asset_id: fee_asset_id
            },
            committee_member: committee_member,
            committee_member_account: account_id,
            new_url: new_url,
            new_memo: new_memo
        });
        return WalletDb.process_transaction(tr, null, true);
    }

    createBudgetMember(account_id, url, memo = " ") {
        // Set the fee asset to use
        let fee_asset_id = accountUtils.getFinalFeeAsset(
            account_id,
            "budget_member_create"
        );

        var tr = WalletApi.new_transaction();
        tr.add_type_operation("budget_member_create", {
            fee: {
                amount: 0,
                asset_id: fee_asset_id
            },
            budget_member_account: account_id,
            url: url,
            memo: memo
        });
        return WalletDb.process_transaction(tr, null, true);
    }

    updateBudgetMember(budget_member, account_id, new_url, new_memo = " ") {
        // Set the fee asset to use
        let fee_asset_id = accountUtils.getFinalFeeAsset(
            account_id,
            "budget_member_update"
        );

        var tr = WalletApi.new_transaction();
        tr.add_type_operation("budget_member_update", {
            fee: {
                amount: 0,
                asset_id: fee_asset_id
            },
            budget_member: budget_member,
            budget_member_account: account_id,
            new_url: new_url,
            new_memo: new_memo
        });
        return WalletDb.process_transaction(tr, null, true);
    }

    createAuthor(account_id, url, assetIds, memo = " ") {
        // Set the fee asset to use
        let fee_asset_id = accountUtils.getFinalFeeAsset(
            account_id,
            "author_create"
        );

        var tr = WalletApi.new_transaction();
        //console.log("createAuthor,assetIds",assetIds)
        let transfer_op = tr.get_type_operation("author_create", {
            fee: {
                amount: 0,
                asset_id: fee_asset_id
            },
            author_account: account_id,
            auth_type: 0,
            allow_asset: assetIds,
            url: url,
            memo: memo
        });

        return tr.update_head_block().then(() => {
            tr.add_type_operation("proposal_create", {
                proposed_ops: [{op: transfer_op}],
                fee_paying_account: account_id
            });

            return WalletDb.process_transaction(tr, null, true);
        });
    }

    updateAuthor(author, account_id, new_url, assetIds, new_memo = " ") {
        // Set the fee asset to use
        let fee_asset_id = accountUtils.getFinalFeeAsset(
            account_id,
            "author_update"
        );
        console.log("createAuthor,assetIds", assetIds);
        var tr = WalletApi.new_transaction();
        let transfer_op = tr.get_type_operation("author_update", {
            fee: {
                amount: 0,
                asset_id: fee_asset_id
            },
            author: author,
            author_account: account_id,
            new_url: new_url,
            new_memo: new_memo,
            new_allow_asset: assetIds
        });
        return tr.update_head_block().then(() => {
            tr.add_type_operation("proposal_create", {
                proposed_ops: [{op: transfer_op}],
                fee_paying_account: account_id
            });

            return WalletDb.process_transaction(tr, null, true);
        });
    }

    /**
     *  TODO:  This is a function of the WalletApi and has no business being part of AccountActions, the account should already
     *  be linked.
     */
    upgradeAccount(account_id, lifetime) {
        // Set the fee asset to use
        let fee_asset_id = accountUtils.getFinalFeeAsset(
            account_id,
            "account_upgrade"
        );

        var tr = WalletApi.new_transaction();
        tr.add_type_operation("account_upgrade", {
            fee: {
                amount: 0,
                asset_id: fee_asset_id
            },
            account_to_upgrade: account_id,
            upgrade_to_lifetime_member: lifetime
        });
        return WalletDb.process_transaction(tr, null, true);
    }

    addAccountContact(name) {
        return name;
    }

    removeAccountContact(name) {
        return name;
    }

    setPasswordAccount(account) {
        return account;
    }
}

export default alt.createActions(AccountActions);

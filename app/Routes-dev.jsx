import React from "react";

import {
    Router,
    Route,
    IndexRoute,
    browserHistory,
    hashHistory,
    Redirect,
    IndexRedirect
} from "react-router/es";
import willTransitionTo from "./routerTransition";
import App from "./App";

// Components imported here for react hot loader (does not work with async route loading)
import DashboardPage from "./components/Dashboard/DashboardPage";
import DashboardAccountsOnly from "./components/Dashboard/DashboardAccountsOnly";
import Witnesses from "./components/Explorer/Witnesses";
import CommitteeMembers from "./components/Explorer/CommitteeMembers";
import BudgetMembers from "./components/Explorer/BudgetMembers";
import Gateways from "./components/Explorer/Gateways";
import Carriers from "./components/Explorer/Carriers";
import Authors from "./components/Explorer/Authors";
import Business from "./components/Business/Business";
import BusinessExchangeContainer from "./components/Business/BusinessExchangeContainer";
import BitlenderStatistics from "./components/Business/BitlenderStatistics";
import BitlenderCommittee from "./components/Business/BitlenderCommittee";
import BitlenderFeeMode from "./components/Business/BitlenderFeeMode";
import FeesContainer from "./components/Explorer/FeesContainer";
import BlocksContainer from "./components/Explorer/BlocksContainer";
import AssetsContainer from "./components/Explorer/AssetsContainer";
import AccountsContainer from "./components/Explorer/AccountsContainer";
import Explorer from "components/Explorer/Explorer";
import AccountPage from "./components/Account/AccountPage";
import SetAccount from "./components/Account/SetAccount";
import AccountOverview from "./components/Account/AccountOverview";
import AccountAssets from "./components/Account/AccountAssets";
import {AccountAssetCreate} from "./components/Account/AccountAssetCreate";
import AccountAssetUpdate from "./components/Account/AccountAssetUpdate";
import AccountMembership from "./components/Account/AccountMembership";
import ZosVesting from "./components/Account/ZosVesting";
import AccountDepositWithdraw from "./components/Account/AccountDepositWithdraw";
import AccountPermissions from "./components/Account/AccountPermissions";
import AccountWhitelist from "./components/Account/AccountWhitelist";
import AccountVoting from "./components/Account/AccountVoting";
import AccountVotingWitnesses from "./components/Account/AccountVotingWitnesses";
import AccountVotingCommittees from "./components/Account/AccountVotingCommittees";
import AccountVotingBudgets from "./components/Account/AccountVotingBudgets";
import AccountVotingWorkers from "./components/Account/AccountVotingWorkers";
// import AccountOrders from "./components/Account/AccountOrders";
import AccountSignedMessages from "./components/Account/AccountSignedMessages";
import ExchangeContainer from "./components/Exchange/ExchangeContainer";
import MarketsContainer from "./components/Explorer/MarketsContainer";
import Transfer from "./components/Transfer/Transfer";
import AuthorizeGateway from "./components/Transfer/AuthorizeGateway";
import SettingsContainer from "./components/Settings/SettingsContainer";
import BlockContainer from "./components/Blockchain/BlockContainer";
import SearchProposalContainer from "./components/Explorer/SearchProposalContainer";
import Asset from "./components/Blockchain/Asset";
import CreateAccount from "./components/Account/CreateAccount";
import CreateAccountPassword from "./components/Account/CreateAccountPassword";
import {
    ExistingAccount,
    ExistingAccountOptions
} from "./components/Wallet/ExistingAccount";
import {
    WalletCreate,
    CreateWalletFromBrainkey
} from "./components/Wallet/WalletCreate";
import ImportKeys from "./components/Wallet/ImportKeys";
import Invoice from "./components/Transfer/Invoice";
import {BackupCreate, BackupRestore} from "./components/Wallet/Backup";
import WalletChangePassword from "./components/Wallet/WalletChangePassword";
import {
    WalletManager,
    WalletOptions,
    ChangeActiveWallet,
    WalletDelete
} from "./components/Wallet/WalletManager";
import BalanceClaimActive from "./components/Wallet/BalanceClaimActive";
import BackupBrainkey from "./components/Wallet/BackupBrainkey";
import Brainkey from "./components/Wallet/Brainkey";
import News from "./components/News";
import Help from "./components/Help";
import InitError from "./components/InitError";
import LoginSelector from "./components/LoginSelector";
import CreateWorker from "./components/Account/CreateWorker";
import DepositWithdrawAssetSelector from "./components/DepositWithdraw/DepositWithdrawAssetSelector";

const history = __HASH_HISTORY__ ? hashHistory : browserHistory;

class Auth extends React.Component {
    render() {
        return null;
    }
}

const routes = (
    <Route path="/" component={App} onEnter={willTransitionTo}>
        <IndexRedirect to="/dashboard" />
        <Route path="business" component={BitlenderCommittee} />
        <Route path="/business/bitlender" component={BitlenderCommittee} />
        <Route
            path="/business/bitlender-statistics"
            component={BitlenderStatistics}
        />
        <Route
            path="/business/bitlender-committee"
            component={BitlenderCommittee}
        />
        <Route
            path="/business/bitlender-feemodel"
            component={BitlenderFeeMode}
        />
        <Route
            path="/business/exchange"
            component={BusinessExchangeContainer}
        />
        <Route path="/auth/:data" component={Auth} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="explorer" component={Explorer} />
        <Route path="/explorer/fees" component={FeesContainer} />
        <Route path="/explorer/blocks" component={BlocksContainer} />
        <Route path="/explorer/assets" component={AssetsContainer} />
        <Route path="/explorer/accounts" component={AccountsContainer} />
        <Route path="/explorer/witnesses" component={Witnesses} />
        <Route
            path="/explorer/committee-members"
            component={CommitteeMembers}
        />
        <Route path="/explorer/budget-members" component={BudgetMembers} />
        <Route path="/explorer/gateways" component={Gateways} />
        <Route path="/explorer/carriers" component={Carriers} />
        <Route path="/explorer/authors" component={Authors} />
        <Route path="/explorer/block/:height" component={BlockContainer}>
            <Route path=":trid" component={BlockContainer} />
        </Route>

        <Route path="wallet" component={WalletManager}>
            {/* wallet management console */}
            <IndexRoute component={WalletOptions} />
            <Route path="change" component={ChangeActiveWallet} />
            <Route path="change-password" component={WalletChangePassword} />
            <Route path="import-keys" component={ImportKeys} />
            <Route path="brainkey" component={ExistingAccountOptions} />
            <Route path="create" component={WalletCreate} />
            <Route path="delete" component={WalletDelete} />
            <Route path="backup/restore" component={BackupRestore} />
            <Route path="backup/create" component={BackupCreate} />
            <Route path="backup/brainkey" component={BackupBrainkey} />
            <Route path="balance-claims" component={BalanceClaimActive} />
        </Route>

        <Route path="create-wallet" component={WalletCreate} />
        <Route
            path="create-wallet-brainkey"
            component={CreateWalletFromBrainkey}
        />

        <Route path="transfer" component={Transfer} />
        <Route path="authorize-gateway" component={AuthorizeGateway} />

        <Route path="invoice/:data" component={Invoice} />
        <Route path="explorer/markets" component={MarketsContainer} />
        <Route path="market/:marketID" component={ExchangeContainer} />
        <Route path="settings" component={SettingsContainer} />
        <Route path="settings/:tab" component={SettingsContainer} />
        {/* <Route path="block/:height" component={BlockContainer}>
            <Route path=":trid" component={BlockContainer}/>
        </Route> */}
        <Route
            path="search-proposal/:pid"
            component={SearchProposalContainer}
        />
        <Route path="asset/:symbol" component={Asset} />
        <Route path="create-account" component={LoginSelector}>
            <Route path="wallet" component={CreateAccount} />
            <Route path="password" component={CreateAccountPassword} />
        </Route>

        <Route path="existing-account" component={ExistingAccount}>
            <IndexRoute component={BackupRestore} />
            <Route path="import-backup" component={ExistingAccountOptions} />
            <Route path="import-keys" component={ImportKeys} />
            <Route path="brainkey" component={Brainkey} />
            <Route path="balance-claim" component={BalanceClaimActive} />
        </Route>

        <Route path="/accounts" component={DashboardAccountsOnly} />

        <Route path="/set-account/:account_name" component={SetAccount} />
        <Route path="/account/:account_name" component={AccountPage}>
            <IndexRoute component={AccountOverview} />
            {/* <Route path="dashboard" component={AccountOverview} /> */}
            {/* <Route path="deposit-withdraw" component={AccountDepositWithdraw} /> */}
            {/* <Route path="orders" component={AccountOrders} /> */}

            <Route path="assets" component={AccountAssets} />
            <Route path="create-asset" component={AccountAssetCreate} />
            <Route path="update-asset/:asset" component={AccountAssetUpdate} />
            <Route path="member-stats" component={AccountMembership} />
            <Route path="vesting" component={ZosVesting} />
            <Route path="permissions" component={AccountPermissions} />
            <Route path="voting" component={AccountVoting} />
            {/* <Route path="voting" component={AccountVotingCommittees} />
            <Route path="voting-witnesses" component={AccountVotingWitnesses} />
            <Route
                path="voting-committees"
                component={AccountVotingCommittees}
            />
            <Route path="voting-budgets" component={AccountVotingBudgets} />

            <Route path="voting-workers" component={AccountVotingWorkers} />  */}
            <Route path="whitelist" component={AccountWhitelist} />
            <Route path="signedmessages" component={AccountSignedMessages} />
            <Redirect from="overview" to="/account/:account_name" />
            <Redirect from="dashboard" to="/account/:account_name" />
            <Redirect from="orders" to="/account/:account_name" />
        </Route>

        <Route path="deposit-withdraw" component={AccountDepositWithdraw} />
        <Route path="create-worker" component={CreateWorker} />
        <Route path="/init-error" component={InitError} />
        <Route path="/news" component={News} />
        <Route path="/help" component={Help}>
            <Route path=":path1" component={Help}>
                <Route path=":path2" component={Help}>
                    <Route path=":path3" component={Help} />
                </Route>
            </Route>
        </Route>
    </Route>
);

export default class Routes extends React.Component {
    render() {
        return <Router history={history} routes={routes} />;
    }
}
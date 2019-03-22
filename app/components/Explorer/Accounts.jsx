import React from "react";
import {PropTypes} from "react";
import {Link} from "react-router/es";
import Immutable from "immutable";
import Translate from "react-translate-component";
import AccountActions from "actions/AccountActions";
import {debounce} from "lodash";
import ChainTypes from "../Utility/ChainTypes";
import Icon from "../Icon/Icon";
import BindToChainState from "../Utility/BindToChainState";
import BalanceComponent from "../Utility/BalanceComponent";
import AccountStore from "stores/AccountStore";
import {connect} from "alt-react";
import LoadingIndicator from "../LoadingIndicator";
import {Apis} from "zosjs-ws";
import {ChainStore, FetchChainObjects} from "zosjs/es";
import LinkToAccountById from "../Utility/LinkToAccountById";

class AccountPropertyTags extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            resDiv: null
        };
    }

    componentDidMount() {
        this.updateFlag(this.props);
    }

    updateFlag({account, index}) {
        let resDiv = null;
        let uaccount_property_types = [
            "gateway",
            "carrier",
            "genesis",
            "platform",
            "witness",
            "committe",
            "budget"
        ];
        switch (uaccount_property_types[index]) {
            case "gateway":
                FetchChainObjects(
                    ChainStore.getGatewayById,
                    [account.get("id")],
                    4000
                ).then(res => {
                    if (res[0].get("enable") === "identity_enable") {
                        resDiv = (
                            <Translate
                                key={index}
                                className="label info"
                                content={`account.uaccount_property.${
                                    uaccount_property_types[index]
                                }`}
                            />
                        );
                        this.setState({resDiv});
                    }
                });
                break;
            case "carrier":
                FetchChainObjects(
                    ChainStore.getCarrierById,
                    [account.get("id")],
                    4000
                ).then(res => {
                    if (res[0].get("enable") === "identity_enable") {
                        resDiv = (
                            <Translate
                                key={index}
                                className="label info"
                                content={`account.uaccount_property.${
                                    uaccount_property_types[index]
                                }`}
                            />
                        );
                        this.setState({resDiv});
                    }
                });
                break;
            case "witness":
                FetchChainObjects(
                    ChainStore.getWitnessById,
                    [account.get("id")],
                    4000
                ).then(res => {
                    if (res[0].get("enable") === "identity_enable") {
                        resDiv = (
                            <Translate
                                key={index}
                                className="label info"
                                content={`account.uaccount_property.${
                                    uaccount_property_types[index]
                                }`}
                            />
                        );
                        this.setState({resDiv});
                    }
                });
                break;
            case "committe":
                FetchChainObjects(
                    ChainStore.getCommitteeMemberById,
                    [account.get("id")],
                    4000
                ).then(res => {
                    if (res[0].get("enable") === "identity_enable") {
                        resDiv = (
                            <Translate
                                key={index}
                                className="label info"
                                content={`account.uaccount_property.${
                                    uaccount_property_types[index]
                                }`}
                            />
                        );
                        this.setState({resDiv});
                    }
                });
                break;
            case "budget":
                FetchChainObjects(
                    ChainStore.getBudgetMemberById,
                    [account.get("id")],
                    4000
                ).then(res => {
                    if (res[0].get("enable") === "identity_enable") {
                        resDiv = (
                            <Translate
                                key={index}
                                className="label info"
                                content={`account.uaccount_property.${
                                    uaccount_property_types[index]
                                }`}
                            />
                        );
                        this.setState({resDiv});
                    }
                });
                break;
        }
    }

    render() {
        let {account, index} = this.props;

        let translate = null;
        let {resDiv} = this.state;

        return <span>{resDiv}</span>;
    }
}
class AccountRow extends React.Component {
    static propTypes = {
        account: ChainTypes.ChainAccount.isRequired
    };

    static defaultProps = {
        tempComponent: "tr",
        autosubscribe: false
    };

    shouldComponentUpdate(nextProps) {
        return (
            nextProps.contacts !== this.props.contacts ||
            nextProps.account !== this.props.account
        );
    }

    _onAddContact(account, e) {
        e.preventDefault();
        AccountActions.addAccountContact(account);
    }

    _onRemoveContact(account, e) {
        e.preventDefault();
        AccountActions.removeAccountContact(account);
    }

    _is_lifetime_member(expiration_date) {
        return expiration_date == "1969-12-31T23:59:59";
    }

    _is_basic_member(expiration_date) {
        return (
            new Date(expiration_date).getTime() >
            new Date("1969-12-31T23:59:59").getTime()
        );
    }

    _getMemberShip(account) {
        let membership = "basic";
        let membership_expiration_date = account.get(
            "membership_expiration_date"
        );
        if (membership_expiration_date) {
            if (this._is_lifetime_member(membership_expiration_date)) {
                membership = "lifetime";
            } else if (!this._is_basic_member(membership_expiration_date)) {
                membership = "annual";
            }
        }
        return membership;
    }

    render() {
        let {account, contacts} = this.props;

        let balance = account.getIn(["balances", "1.3.0"]) || null;
        let accountName = account.get("name");

        let membership = this._getMemberShip(account);
        let uaccount_property = account.get("uaccount_property");

        let uaccount_property_tags = [];
        let uaccount_property_types = [
            "gateway",
            "carrier",
            "genesis",
            "platform",
            "witness",
            "committe",
            "budget"
        ];

        if (uaccount_property) {
            uaccount_property = uaccount_property
                .toString(2)
                .split("")
                .reverse();
            if (uaccount_property && uaccount_property.length) {
                uaccount_property.forEach((a, i) => {
                    if (a == 1 && uaccount_property_types[i] !== "genesis") {
                        uaccount_property_tags.push(
                            <AccountPropertyTags
                                account={account}
                                index={i}
                                key={i}
                            />
                        );
                    }
                });
            }
        }

        return (
            <tr key={account.get("id")}>
                <td className="p-l-1_5">{account.get("id")}</td>
                {/*contacts.has(accountName) ? (
                    <td onClick={this._onRemoveContact.bind(this, accountName)}>
                        <Icon name="minus-circle" />
                    </td>
                ) : (
                    <td onClick={this._onAddContact.bind(this, accountName)}>
                        <Icon name="plus-circle" />
                    </td>
                )*/}
                <td>
                    <Link to={`/account/${accountName}/overview`}>
                        {accountName}
                    </Link>
                </td>
                <td>
                    <Translate
                        className="label info"
                        content={`account.membership.${membership}`}
                    />
                </td>
                <td>{uaccount_property_tags}</td>
                <td>
                    <LinkToAccountById account={account.get("referrer")} />
                </td>
                <td>
                    <LinkToAccountById
                        account={account.get("lifetime_referrer")}
                    />
                </td>
                <td>
                    <LinkToAccountById account={account.get("registrar")} />
                </td>
                <td>
                    {!balance ? "0" : <BalanceComponent balance={balance} />}
                </td>
                <td>
                    {!balance ? (
                        "0"
                    ) : (
                        <BalanceComponent
                            balance={balance}
                            asPercentage={true}
                        />
                    )}
                </td>
            </tr>
        );
    }
}
AccountRow = BindToChainState(AccountRow);

let AccountRowWrapper = props => {
    return <AccountRow {...props} />;
};

AccountRowWrapper = connect(
    AccountRowWrapper,
    {
        listenTo() {
            return [AccountStore];
        },
        getProps() {
            return {
                contacts: AccountStore.getState().accountContacts
            };
        }
    }
);

class Accounts extends React.Component {
    constructor(props) {
        super();
        this.state = {
            searchTerm: props.searchTerm,
            isLoading: false
        };

        this._searchAccounts = debounce(this._searchAccounts, 200);
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            !Immutable.is(
                nextProps.searchAccounts,
                this.props.searchAccounts
            ) ||
            nextState.searchTerm !== this.state.searchTerm ||
            nextState.isLoading !== this.state.isLoading
        );
    }

    _onSearchChange(e) {
        this.setState({
            searchTerm: e.target.value.toLowerCase(),
            isLoading: true
        });
        this._searchAccounts(e.target.value);
    }

    _searchAccounts(searchTerm) {
        AccountActions.accountSearch(searchTerm);
        this.setState({isLoading: false});
    }

    render() {
        let {searchAccounts} = this.props;
        let {searchTerm} = this.state;
        let accountRows = null;

        if (searchAccounts.size > 0 && searchTerm && searchTerm.length > 0) {
            accountRows = searchAccounts
                .filter(a => {
                    return a.indexOf(searchTerm) !== -1;
                })
                .sort((a, b) => {
                    if (a > b) {
                        return 1;
                    } else if (a < b) {
                        return -1;
                    } else {
                        return 0;
                    }
                })
                .map((account, id) => {
                    return <AccountRowWrapper key={id} account={account} />;
                })
                .toArray();
        }

        return (
            <div
                className="grid-block"
                style={{
                    paddingTop: 10
                }}
            >
                <div
                    className="grid-block vertical zos-card-bg"
                    style={{
                        paddingTop: 20
                    }}
                >
                    {/* <div className="grid-content shrink">
                        <Translate
                            component="h3"
                            content="explorer.accounts.title"
                        />
                        <input
                            type="text"
                            value={this.state.searchTerm}
                            onChange={this._onSearchChange.bind(this)}
                        />
                    </div> */}
                    <div className="grid-block zos-filter">
                        <Translate
                            className="title"
                            content="explorer.accounts.filter"
                        />
                        <input
                            type="text"
                            value={this.state.searchTerm}
                            onChange={this._onSearchChange.bind(this)}
                            className="zos-filter"
                        />
                    </div>
                    <div
                        className="grid-content"
                        style={{
                            padding: 0
                        }}
                    >
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="p-l-1_5">
                                        <Translate
                                            component="span"
                                            content="explorer.assets.id"
                                        />
                                    </th>
                                    {/*<th>
                                        <Icon name="user" />
                                    </th>*/}
                                    <th>
                                        <Translate
                                            component="span"
                                            content="account.name"
                                        />
                                    </th>
                                    <th>
                                        <Translate
                                            component="span"
                                            content="account.properties"
                                        />
                                    </th>
                                    <th>
                                        <Translate
                                            component="span"
                                            content="account.position"
                                        />
                                    </th>
                                    <th>
                                        <Translate
                                            component="span"
                                            content="account.member.referrer"
                                        />
                                    </th>
                                    <th>
                                        <Translate
                                            component="span"
                                            content="account.member.lifetime_referrer"
                                        />
                                    </th>
                                    <th>
                                        <Translate
                                            component="span"
                                            content="account.member.registrar"
                                        />
                                    </th>
                                    <th>
                                        <Translate
                                            component="span"
                                            content="gateway.balance"
                                        />
                                    </th>
                                    <th>
                                        <Translate
                                            component="span"
                                            content="account.percent"
                                        />
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {this.state.isLoading ? (
                                    <tr colSpan="7" />
                                ) : (
                                    accountRows
                                )}
                            </tbody>
                        </table>
                        {this.state.isLoading ? (
                            <div style={{textAlign: "center", padding: 10}}>
                                <LoadingIndicator type="three-bounce" />
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    }
}

Accounts.defaultProps = {
    searchAccounts: {}
};

Accounts.propTypes = {
    searchAccounts: PropTypes.object.isRequired
};

export default Accounts;

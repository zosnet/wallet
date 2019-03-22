import React from "react";
import Immutable from "immutable";
import AccountImage from "../Account/AccountImage";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import {ChainStore} from "zosjs/es";
import FormattedAsset from "../Utility/FormattedAsset";
import Translate from "react-translate-component";
import {connect} from "alt-react";
import SettingsActions from "actions/SettingsActions";
import SettingsStore from "stores/SettingsStore";
import Explorer from "./Explorer";

class BudgetMemberCard extends React.Component {
    static propTypes = {
        budget_member: ChainTypes.ChainAccount.isRequired
    };

    static contextTypes = {
        router: React.PropTypes.object.isRequired
    };

    _onCardClick(e) {
        e.preventDefault();
        this.context.router.push(
            `/account/${this.props.budget_member.get("name")}`
        );
    }

    render() {
        let budget_member_data = ChainStore.getBudgetMemberById(
            this.props.budget_member.get("id")
        );

        if (!budget_member_data) {
            return null;
        }

        return (
            <div
                className="grid-content account-card"
                onClick={this._onCardClick.bind(this)}
            >
                <div className="card">
                    <h4 className="text-center">
                        {this.props.budget_member.get("name")}
                    </h4>
                    <div className="card-content clearfix">
                        <div className="float-left">
                            <AccountImage
                                account={this.props.budget_member.get("name")}
                                size={{height: 64, width: 64}}
                            />
                        </div>
                        <ul className="balances">
                            <li>
                                <Translate content="account.votes.votes" />:{" "}
                                <FormattedAsset
                                    decimalOffset={5}
                                    amount={budget_member_data.get(
                                        "total_votes"
                                    )}
                                    asset={"1.3.0"}
                                />
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }
}
BudgetMemberCard = BindToChainState(BudgetMemberCard, {
    keep_updating: true
});

class BudgetMemberRow extends React.Component {
    static propTypes = {
        budget_member: ChainTypes.ChainAccount.isRequired
    };

    static contextTypes = {
        router: React.PropTypes.object.isRequired
    };

    _onRowClick(e) {
        e.preventDefault();
        this.context.router.push(
            `/account/${this.props.budget_member.get("name")}`
        );
    }

    render() {
        let {budget_member, rank} = this.props;
        let budget_member_data = ChainStore.getBudgetMemberById(
            budget_member.get("id")
        );
        if (!budget_member_data) return null;

        let url = budget_member_data.get("url");
        url =
            url && url.length > 0 && url.indexOf("http") === -1
                ? "http://" + url
                : url;

        return (
            <tr>
                <td onClick={this._onRowClick.bind(this)}>{rank}</td>
                <td onClick={this._onRowClick.bind(this)}>
                    {budget_member.get("name")}
                </td>
                <td onClick={this._onRowClick.bind(this)}>
                    <FormattedAsset
                        amount={budget_member_data.get("total_votes")}
                        asset="1.3.0"
                    />
                </td>
                <td>
                    <a href={url} rel="noopener noreferrer" target="_blank">
                        {budget_member_data.get("url")}
                    </a>
                </td>
                <td>{budget_member_data.get("memo")}</td>
            </tr>
        );
    }
}
BudgetMemberRow = BindToChainState(BudgetMemberRow, {
    keep_updating: true
});

class BudgetMemberList extends React.Component {
    static propTypes = {
        budget_members: ChainTypes.ChainObjectsList.isRequired
    };

    constructor() {
        super();
        this.state = {
            sortBy: "rank",
            inverseSort: true
        };
    }

    _setSort(field) {
        this.setState({
            sortBy: field,
            inverseSort:
                field === this.state.sortBy
                    ? !this.state.inverseSort
                    : this.state.inverseSort
        });
    }

    render() {
        let {budget_members, cardView, membersList} = this.props;
        let {sortBy, inverseSort} = this.state;

        let itemRows = null;

        let ranks = {};

        budget_members
            .filter(a => {
                if (!a) {
                    return false;
                }
                return membersList.indexOf(a.get("id")) !== -1;
            })
            .sort((a, b) => {
                if (a && b) {
                    return (
                        parseInt(b.get("total_votes"), 10) -
                        parseInt(a.get("total_votes"), 10)
                    );
                }
            })
            .forEach((c, index) => {
                if (c) {
                    ranks[c.get("id")] = index + 1;
                }
            });

        if (budget_members.length > 0 && budget_members[1]) {
            itemRows = budget_members
                .filter(a => {
                    if (!a) {
                        return false;
                    }
                    let account = ChainStore.getObject(
                        a.get("budget_member_account")
                    );
                    if (!account) {
                        return false;
                    }

                    return (
                        account.get("name").indexOf(this.props.filter) !== -1
                    );
                })
                .sort((a, b) => {
                    let a_account = ChainStore.getObject(
                        a.get("budget_member_account")
                    );
                    let b_account = ChainStore.getObject(
                        b.get("budget_member_account")
                    );
                    if (!a_account || !b_account) {
                        return 0;
                    }

                    switch (sortBy) {
                        case "name":
                            if (a_account.get("name") > b_account.get("name")) {
                                return inverseSort ? 1 : -1;
                            } else if (
                                a_account.get("name") < b_account.get("name")
                            ) {
                                return inverseSort ? -1 : 1;
                            } else {
                                return 0;
                            }
                            break;

                        case "rank":
                            return !inverseSort
                                ? ranks[b.get("id")] - ranks[a.get("id")]
                                : ranks[a.get("id")] - ranks[b.get("id")];
                            break;

                        default:
                            return !inverseSort
                                ? parseInt(b.get(sortBy), 10) -
                                      parseInt(a.get(sortBy), 10)
                                : parseInt(a.get(sortBy), 10) -
                                      parseInt(b.get(sortBy), 10);
                    }
                })
                .map(a => {
                    if (!cardView) {
                        return (
                            <BudgetMemberRow
                                key={a.get("id")}
                                rank={ranks[a.get("id")]}
                                budget_member={a.get("budget_member_account")}
                            />
                        );
                    } else {
                        return (
                            <BudgetMemberCard
                                key={a.get("id")}
                                rank={ranks[a.get("id")]}
                                budget_member={a.get("budget_member_account")}
                            />
                        );
                    }
                });
        }

        // table view
        if (!cardView) {
            return (
                <table className="table table-hover">
                    <thead>
                        <tr>
                            <th
                                className="clickable"
                                onClick={this._setSort.bind(this, "rank")}
                            >
                                <Translate content="explorer.witnesses.rank" />
                            </th>
                            <th
                                className="clickable"
                                onClick={this._setSort.bind(this, "name")}
                            >
                                <Translate content="account.votes.name" />
                            </th>
                            <th
                                className="clickable"
                                onClick={this._setSort.bind(
                                    this,
                                    "total_votes"
                                )}
                            >
                                <Translate content="account.votes.votes" />
                            </th>
                            <th>
                                <Translate content="account.votes.url" />
                            </th>
                            <th>
                                <Translate content="explorer.gateways.memo" />
                            </th>
                        </tr>
                    </thead>
                    <tbody>{itemRows}</tbody>
                </table>
            );
        } else {
            return (
                <div className="grid-block no-margin small-up-1 medium-up-2 large-up-3">
                    {itemRows}
                </div>
            );
        }
    }
}
BudgetMemberList = BindToChainState(BudgetMemberList, {
    keep_updating: true,
    show_loader: true
});

class BudgetMembers extends React.Component {
    static propTypes = {
        globalObject: ChainTypes.ChainObject.isRequired
    };

    static defaultProps = {
        globalObject: "2.0.0"
    };

    constructor(props) {
        super(props);
        this.state = {
            filterBudgetMember: props.filterBudgetMember || "",
            cardView: props.cardView
        };
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            !Immutable.is(nextProps.globalObject, this.props.globalObject) ||
            nextState.filterBudgetMember !== this.state.filterBudgetMember ||
            nextState.cardView !== this.state.cardView
        );
    }

    _onFilter(e) {
        e.preventDefault();
        this.setState({filterBudgetMember: e.target.value.toLowerCase()});

        SettingsActions.changeViewSetting({
            filterBudgetMember: e.target.value.toLowerCase()
        });
    }

    _toggleView() {
        SettingsActions.changeViewSetting({
            cardViewBudget: !this.state.cardView
        });

        this.setState({
            cardView: !this.state.cardView
        });
    }

    render() {
        let {globalObject} = this.props;
        globalObject = globalObject.toJS();

        let activeBudgetMembers = [];
        for (let key in globalObject.active_budget_members) {
            if (globalObject.active_budget_members.hasOwnProperty(key)) {
                activeBudgetMembers.push(
                    globalObject.active_budget_members[key]
                );
            }
        }

        let content = (
            <div
                className="grid-block vertical"
                style={{
                    paddingTop: 10
                }}
            >
                <div
                    className="zos-card-bg"
                    style={{
                        paddingTop: 20
                    }}
                >
                    <div className="grid-block zos-filter">
                        <div className="grid-content" style={{padding: 0}}>
                            <h5>
                                <Translate content="explorer.budget_members.active" />:{" "}
                                {
                                    Object.keys(
                                        globalObject.active_budget_members
                                    ).length
                                }
                            </h5>
                        </div>
                    </div>
                    <div className="grid-block zos-filter">
                        <Translate
                            className="title"
                            content="explorer.budget_members.filter_title"
                        />
                        <input
                            type="text"
                            value={this.state.filterBudgetMember}
                            onChange={this._onFilter.bind(this)}
                            className="zos-filter"
                        />
                        <div className="view-switcher">
                            <span
                                className="button outline"
                                onClick={this._toggleView.bind(this)}
                            >
                                {!this.state.cardView ? (
                                    <Translate content="explorer.witnesses.card" />
                                ) : (
                                    <Translate content="explorer.witnesses.table" />
                                )}
                            </span>
                        </div>
                    </div>
                    <div className="grid-block vertical">
                        <div className="grid-content" style={{padding: 0}}>
                            <BudgetMemberList
                                budget_members={Immutable.List(
                                    activeBudgetMembers
                                )}
                                membersList={activeBudgetMembers}
                                filter={this.state.filterBudgetMember}
                                cardView={this.state.cardView}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );

        return <Explorer tab="budget_members" content={content} />;
    }
}
BudgetMembers = BindToChainState(BudgetMembers, {keep_updating: true});

class BudgetMembersStoreWrapper extends React.Component {
    render() {
        return <BudgetMembers {...this.props} />;
    }
}

BudgetMembersStoreWrapper = connect(BudgetMembersStoreWrapper, {
    listenTo() {
        return [SettingsStore];
    },
    getProps() {
        return {
            cardView: SettingsStore.getState().viewSettings.get(
                "cardViewBudget"
            ),
            filterBudgetMember: SettingsStore.getState().viewSettings.get(
                "filterBudgetMember"
            )
        };
    }
});

export default BudgetMembersStoreWrapper;

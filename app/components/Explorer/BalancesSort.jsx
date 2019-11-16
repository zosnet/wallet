import React from "react";
import Immutable from "immutable";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import {ChainStore} from "zosjs/es";
import Translate from "react-translate-component";
import {connect} from "alt-react";
import SettingsStore from "stores/SettingsStore";
import Explorer from "./Explorer";
class BalancesSortList extends React.Component {
    static propTypes = {
        committee_members: ChainTypes.ChainObjectsList.isRequired
    };
    constructor(props) {
        super(props);
    }

    render() {
        // table view
        return (
            <table className="table table-hover">
                <thead>
                    <tr>
                        <th>
                            <Translate content="explorer.witnesses.rank" />
                        </th>
                        <th>
                            <Translate content="account.votes.name" />
                        </th>
                        <th>
                            <Translate content="account.votes.name" />
                            id
                        </th>
                        <th>
                            <Translate content="account.balance_history.amount" />
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {this.props.tableList.map((item, index) => (
                        <tr key={`${index}`}>
                            <td>{index + 1}</td>
                            <td>{item.name}</td>
                            <td>{item.owner}</td>
                            <td>
                                {Number(item.balance) /
                                    Math.pow(10, item.precision)}
                                {item.symbol}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }
}
BalancesSortList = BindToChainState(BalancesSortList, {
    keep_updating: true,
    show_loader: true
});

class BalancesSort extends React.Component {
    static propTypes = {
        globalObject: ChainTypes.ChainObject.isRequired
    };

    static defaultProps = {
        globalObject: "2.0.0"
    };
    constructor(props) {
        super(props);
        this.state = {
            defaultSel: "",
            selectList: [],
            tableList: []
        };
    }
    componentDidMount() {
        let asset_item_data = null;
        ChainStore.getAssetList(0x7fffffff).then(object => {
            asset_item_data = object;
            this.setState({selectList: asset_item_data}, () => {
                console.log("selectList", this.state.selectList);
            });
        });
        let balance_item_data = null;
        ChainStore.getBalancesSortById("1.3.0", 0x7ffffffffffff, 100).then(
            object => {
                balance_item_data = object;
                this.setState({tableList: balance_item_data}, () => {
                    console.log("tableList", this.state.tableList);
                });
            }
        );
    }

    handleChange = e => {
        let balance_item_data = null;
        ChainStore.getBalancesSortById(
            e.target.value,
            0x7ffffffffffff,
            100
        ).then(object => {
            balance_item_data = object;
            this.setState({tableList: balance_item_data}, () => {
                console.log("tableList", this.state.tableList);
            });
        });
    };

    render() {
        let {globalObject} = this.props;
        globalObject = globalObject.toJS();

        let activeCommitteeMembers = [];
        for (let key in globalObject.active_committee_members) {
            if (globalObject.active_committee_members.hasOwnProperty(key)) {
                activeCommitteeMembers.push(
                    globalObject.active_committee_members[key]
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
                        <Translate
                            className="title"
                            content="explorer.gateways.symbol"
                        />
                        <select
                            style={{width: 120}}
                            onChange={this.handleChange}
                        >
                            {this.state.selectList.map((item, index) => {
                                return (
                                    <option value={item.id} key={index}>
                                        {item.symbol}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    <div className="grid-block vertical">
                        <div className="grid-content" style={{padding: 0}}>
                            <BalancesSortList
                                tableList={this.state.tableList}
                                committee_members={Immutable.List(
                                    globalObject.active_committee_members
                                )}
                                membersList={
                                    globalObject.active_committee_members
                                }
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
        return <Explorer tab="balances" content={content} />;
    }
}
BalancesSort = BindToChainState(BalancesSort, {keep_updating: true});

class BalancesSortStoreWrapper extends React.Component {
    render() {
        return <BalancesSort {...this.props} />;
    }
}

BalancesSortStoreWrapper = connect(
    BalancesSortStoreWrapper,
    {
        listenTo() {
            return [SettingsStore];
        },
        getProps() {
            return {
                filterCommitteeMember: SettingsStore.getState().viewSettings.get(
                    "filterCommitteeMember"
                )
            };
        }
    }
);

export default BalancesSortStoreWrapper;

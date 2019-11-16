import React from "react";
import {FormattedDate} from "react-intl";
import Translate from "react-translate-component";
import {saveAs} from "file-saver";
import Operation from "../Blockchain/Operation";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import utils from "common/utils";
import {ChainTypes as grapheneChainTypes} from "zosjs/es";
import TransitionWrapper from "../Utility/TransitionWrapper";
import ps from "perfect-scrollbar";
import counterpart from "counterpart";
import Icon from "../Icon/Icon";
import cnames from "classnames";
import {Apis} from "zosjs-ws";
import {FetchChain, ChainStore} from "zosjs/es";
import FormattedAsset from "../Utility/FormattedAsset";

const {operations} = grapheneChainTypes;
const alignLeft = {textAlign: "left"};
const alignRight = {textAlign: "right"};

function compareOps(b, a) {
    if (a.block_num === b.block_num) {
        return a.virtual_op - b.virtual_op;
    } else {
        return a.block_num - b.block_num;
    }
}

function textContent(n) {
    return n ? `"${n.textContent.replace(/[\s\t\r\n]/gi, " ")}"` : "";
}

class BalanceHistory extends React.Component {
    static propTypes = {
        accountsList: ChainTypes.ChainAccountsList.isRequired,
        compactView: React.PropTypes.bool,
        limit: React.PropTypes.number,
        maxHeight: React.PropTypes.number,
        fullHeight: React.PropTypes.bool,
        showFilters: React.PropTypes.bool,
        contained: React.PropTypes.bool
    };

    static defaultProps = {
        limit: 25,
        maxHeight: 500,
        fullHeight: false,
        showFilters: false,
        contained: false
    };

    constructor(props) {
        super();
        this.state = {
            history: [],
            limit: props.limit || 20,
            offset: props.offset || 30,
            csvExport: false,
            headerHeight: 85,
            filter: "",
            start: 0x7fffffff,
            typeFilter: 0x7fffffff
        };
    }

    componentDidMount() {
        if (!this.props.fullHeight) {
            let t = this.refs.transactions;
            ps.initialize(t);

            this._setHeaderHeight();
        }
    }

    _setHeaderHeight() {
        let height = this.refs.header.offsetHeight;

        if (height !== this.state.headerHeight) {
            this.setState({
                headerHeight: height
            });
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        if (this.props.maxHeight !== nextProps.maxHeight) return true;
        if (this.state.headerHeight !== nextState.headerHeight) return true;
        if (this.state.filter !== nextState.filter) return true;
        if (this.state.typeFilter !== nextState.typeFilter) return true;
        if (this.props.customFilter) {
            if (
                !utils.are_equal_shallow(
                    this.props.customFilter.fields,
                    nextProps.customFilter.fields
                ) ||
                !utils.are_equal_shallow(
                    this.props.customFilter.values,
                    nextProps.customFilter.values
                )
            ) {
                return true;
            }
        }
        if (this.state.history !== nextState.history) return true;
        if (this.props.maxHeight !== nextProps.maxHeight) return true;
        if (nextState.csvExport !== this.state.csvExport) return true;
        return false;
    }

    componentDidUpdate() {
        if (this.state.csvExport) {
            this.state.csvExport = false;
            const csv_export_container = document.getElementById(
                "csv_export_container"
            );
            const nodes = csv_export_container.childNodes;
            let csv = "";
            for (const n of nodes) {
                //console.log("-- RecentTransactions._downloadCSV -->", n);
                const cn = n.childNodes;
                if (csv !== "") csv += "\n";
                csv += [
                    textContent(cn[0]),
                    textContent(cn[1]),
                    textContent(cn[2]),
                    textContent(cn[3]),
                    textContent(cn[4]),
                    textContent(cn[5])
                ].join(",");
            }
            var blob = new Blob([csv], {type: "text/csv;charset=utf-8"});
            var today = new Date();
            saveAs(
                blob,
                "zosbalances-" +
                    today.getFullYear() +
                    "-" +
                    ("0" + (today.getMonth() + 1)).slice(-2) +
                    "-" +
                    ("0" + today.getDate()).slice(-2) +
                    "-" +
                    ("0" + today.getHours()).slice(-2) +
                    ("0" + today.getMinutes()).slice(-2) +
                    ".csv"
            );
        }

        if (!this.props.fullHeight) {
            let t = this.refs.transactions;
            ps.update(t);

            this._setHeaderHeight();
        }

        if (!this.props.fullHeight) {
            let t = this.refs.transactions;
            ps.update(t);

            this._setHeaderHeight();
        }
    }

    componentWillMount() {
        this._onSearchHistory();
    }

    _onIncreaseLimit() {
        this.setState({
            limit: this.state.limit + this.state.offset
        });
    }

    _doSearch() {
        let {accountsList} = this.props;
        let current_account_id =
            accountsList.length === 1 && accountsList[0]
                ? accountsList[0].get("id")
                : null;
        let assetNames = this.state.filter;
        assetNames = assetNames.replace(" ", "").split(",");

        let fetchChains = [];
        for (let x of assetNames) {
            if (x !== "") {
                fetchChains.push(FetchChain("getAsset", x.toUpperCase(), 5000));
            }
        }

        if (!fetchChains.length) {
            return this._getHistory(current_account_id, []);
        } else {
            return Promise.all(fetchChains).then(res => {
                if (res && res.length) {
                    let assetIds = [];
                    res.forEach(function(a) {
                        if (a && a.get("id")) {
                            assetIds.push(a.get("id"));
                        }
                    });
                    assetIds.length &&
                        this._getHistory(current_account_id, assetIds);
                }
            });
        }
    }

    _onSearchHistory(clear) {
        if (clear) {
            this.setState(
                {
                    start: 0x7fffffff,
                    history: []
                },
                () => {
                    this._doSearch();
                }
            );
        } else {
            this._doSearch();
        }
    }

    _getHistory(account_id, assetIds) {
        Apis.instance()
            .history_api()
            .exec("get_balance_history", [
                account_id,
                assetIds,
                this.state.typeFilter,
                this.state.start,
                this.state.limit
            ])
            .then(results => {
                if (results && results.length > 0) {
                    this.setState({
                        start: results[results.length - 1].index - 1,
                        history: this.state.history.concat(results)
                    });
                }
            })
            .catch(error => {
                console.log("Error in get_balance_history: ", error);
            });

        // this.setState({
        //     limit: this.state.limit + 30
        // });
    }

    _downloadCSV() {
        this.setState({csvExport: true});
    }

    _onChangeFilter(e) {
        this.setState({
            filter: e.target.value
        });
    }

    _onChangeTypeFilter(e) {
        let value = parseInt(e.target.value);
        this.setState({
            typeFilter: value
        });
    }

    render() {
        let {
            accountsList,
            compactView,
            filter,
            customFilter,
            style,
            maxHeight
        } = this.props;
        let {limit, headerHeight, history} = this.state;
        let options = [
            0x7fffffff,
            1,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            13,
            16,
            17,
            18,
            20,
            21,
            22,
            23,
            24,
            25,
            26,
            27,
            28,
            29,
            30,
            31,
            32,
            33,
            34,
            35,
            36,
            37,
            38,
            39,
            40,
            41,
            42,
            43,
            44,
            45,
            47,
            52,
            53,
            60,
            61,
            62,
            63,
            64,
            69,
            70,
            71,
            75,
            78,
            79,
            81,
            83,
            84,
            85,
            86,
            88,
            90
        ].map(type => {
            return (
                <option value={type} key={type}>
                    {counterpart.translate("balance_utypes." + type)}
                </option>
            );
        });

        let current_account_id =
            accountsList.length === 1 && accountsList[0]
                ? accountsList[0].get("id")
                : null;

        let historyCount = 0;
        let display_history = "";
        if (history && history.length) {
            display_history = this.state.history.length
                ? history
                      .slice(0, this.state.history.length) //返回一个新的数组，包含从 start 到 end （不包括该元素）的 arrayObject 中的元素。
                      .map((o, i) => {
                          o.block_time = !/Z$/.test(o.block_time)
                              ? o.block_time + "Z"
                              : o.block_time;

                          return (
                              <tr key={i}>
                                  <td style={{paddingLeft: 15}}>
                                      <Translate
                                          content={`balance_utypes.${o.utype}`}
                                      />
                                  </td>
                                  <td>{o.info}</td>
                                  <td>
                                      <FormattedAsset
                                          amount={o.asset_op.amount}
                                          asset={o.asset_op.asset_id}
                                      />
                                  </td>
                                  <td>
                                      <FormattedAsset
                                          amount={o.balance}
                                          asset={o.asset_op.asset_id}
                                      />
                                  </td>
                                  <td>
                                      <FormattedDate
                                          value={o.block_time}
                                          format="full"
                                      />
                                  </td>
                                  <td style={{textAlign: "center"}}>
                                      {o.block_num}
                                  </td>
                              </tr>
                          );
                      })
                : [
                      <tr key="no_recent">
                          <td colSpan="5">
                              <Translate content="operation.no_recent" />
                          </td>
                      </tr>
                  ];

            historyCount = this.state.history.length;
            // console.log(this.state.limit, historyCount, this.state.limit - historyCount, this.state.offset)
            // if(this.state.limit - historyCount <= this.state.offset) {
            display_history.push(
                <tr className="total-value" key="total_value">
                    <td />
                    <td style={alignRight} />
                    <td style={{textAlign: "left"}}>
                        &nbsp;
                        {this.props.showMore ? (
                            <a
                                onClick={this._onSearchHistory.bind(
                                    this,
                                    false
                                )}
                            >
                                {/*<Icon name="chevron-down" className="icon-14px" />*/}
                                <Translate content="account.more_transactions_page" />
                            </a>
                        ) : null}
                    </td>
                    <td style={{textAlign: "left"}} />
                </tr>
            );
            // }
        }

        return (
            <div
                className="recent-transactions no-overflow"
                style={{
                    width: "100%",
                    height: "100%"
                }}
            >
                {this.props.contained ? null : (
                    <div style={{height: 10, background: "#f9fbfe"}} />
                )}
                <div
                    className="generic-bordered-box zos-card-bg"
                    style={{
                        marginBottom: 0
                    }}
                >
                    {this.props.dashboard ? null : (
                        <div ref="header">
                            <div className="zos-block-content-header">
                                <span>
                                    {this.props.title ? (
                                        this.props.title
                                    ) : (
                                        <Translate content="account.recent" />
                                    )}
                                </span>

                                <span
                                    className="button outline"
                                    style={{
                                        position: "absolute",
                                        right: 15,
                                        top: "50%",
                                        marginTop: -19
                                    }}
                                >
                                    <a
                                        className="inline-block"
                                        onClick={this._downloadCSV.bind(this)}
                                        data-tip={counterpart.translate(
                                            "transaction.csv_tip"
                                        )}
                                        data-place="bottom"
                                    >
                                        <Translate content="transaction.csv" />
                                    </a>
                                </span>
                            </div>
                        </div>
                    )}
                    {this.props.contained ? null : (
                        <div
                            className="header-selector"
                            style={{
                                borderBottom: this.props.dashboard
                                    ? "1px solid #f0f2f8"
                                    : "0",
                                position: "relative"
                            }}
                        >
                            <div className="selector">
                                <div
                                    style={{
                                        paddingLeft: 0,
                                        marginBottom: 0
                                    }}
                                >
                                    <select
                                        data-place="left"
                                        data-tip={counterpart.translate(
                                            "tooltip.filter_ops"
                                        )}
                                        style={{
                                            paddingTop: 5,
                                            width: "auto"
                                        }}
                                        className="bts-select"
                                        value={this.state.typeFilter}
                                        onChange={this._onChangeTypeFilter.bind(
                                            this
                                        )}
                                    >
                                        {options}
                                    </select>
                                    {this.props.showFilters ? (
                                        <div
                                            className="zos-filter"
                                            style={{
                                                marginBottom: 0,
                                                paddingLeft: 0
                                            }}
                                        >
                                            <input
                                                type="text"
                                                value={this.state.filter}
                                                onChange={this._onChangeFilter.bind(
                                                    this
                                                )}
                                                className="zos-filter"
                                                placeholder={counterpart.translate(
                                                    "account.balance_history_filter.placeholder"
                                                )}
                                                style={{
                                                    marginBottom: 0,
                                                    marginRight: 10
                                                }}
                                            />
                                            <div
                                                className="button no-margin"
                                                style={{
                                                    borderRadius: 5,
                                                    fontSize: "0.875rem"
                                                }}
                                                onClick={this._onSearchHistory.bind(
                                                    this,
                                                    true
                                                )}
                                            >
                                                <Translate content="account.balance_history_filter.title" />
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {this.props.dashboard ? (
                                <span
                                    className="button outline"
                                    style={{
                                        position: "absolute",
                                        right: 15,
                                        top: "50%",
                                        marginTop: -19
                                    }}
                                >
                                    <a
                                        className="inline-block"
                                        onClick={this._downloadCSV.bind(this)}
                                        data-tip={counterpart.translate(
                                            "transaction.csv_tip"
                                        )}
                                        data-place="bottom"
                                    >
                                        {/*<Icon name="excel" className="icon-14px" />*/}
                                        <Translate content="transaction.csv" />
                                    </a>
                                </span>
                            ) : null}
                        </div>
                    )}
                    <div
                        className="box-content grid-block no-margin"
                        style={
                            !this.props.fullHeight
                                ? {
                                      maxHeight: maxHeight - headerHeight
                                  }
                                : null
                        }
                        ref="transactions"
                    >
                        <table
                            className={
                                "table table-striped " +
                                (compactView ? "compact" : "") +
                                ""
                                // (this.props.dashboard
                                //     ? " dashboard-table table-hover"
                                //     : "")
                            }
                        >
                            <thead>
                                <tr>
                                    <th
                                        style={{
                                            paddingLeft: 15
                                        }}
                                    >
                                        <Translate content="account.balance_history.utype" />
                                    </th>
                                    <th style={alignLeft}>
                                        <Translate content="account.balance_history.info" />
                                    </th>
                                    <th style={alignLeft}>
                                        <Translate content="account.balance_history.asset_op" />
                                    </th>
                                    <th style={alignLeft}>
                                        <Translate content="account.balance_history.balance" />
                                    </th>
                                    <th style={alignLeft}>
                                        <Translate content="account.balance_history.block_time" />
                                    </th>
                                    <th
                                        style={{
                                            textAlign: "center"
                                        }}
                                    >
                                        <Translate content="account.balance_history.block_num" />
                                    </th>
                                </tr>
                            </thead>
                            <TransitionWrapper
                                component="tbody"
                                transitionName="newrow"
                            >
                                {display_history}
                            </TransitionWrapper>
                        </table>
                    </div>
                    {historyCount > 0 &&
                        this.state.csvExport && (
                            <div
                                id="csv_export_container"
                                style={{display: "none"}}
                            >
                                <div>
                                    <div>UTYPE</div>
                                    <div>INFO</div>
                                    <div>ASSET_OP</div>
                                    <div>BALANCE</div>
                                    <div>BLOCK_TIME</div>
                                    <div>BLOCK_NUM</div>
                                </div>
                                {history.map(o => {
                                    return (
                                        <div>
                                            <div>
                                                <Translate
                                                    content={`balance_utypes.${
                                                        o.utype
                                                    }`}
                                                />
                                            </div>
                                            <div>{o.info}</div>
                                            <div>
                                                <FormattedAsset
                                                    amount={o.asset_op.amount}
                                                    asset={o.asset_op.asset_id}
                                                />
                                            </div>
                                            <div>
                                                <FormattedAsset
                                                    amount={o.balance}
                                                    asset={o.asset_op.asset_id}
                                                />
                                            </div>
                                            <div>{o.block_time}</div>
                                            <div>{o.block_num}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                </div>
            </div>
        );
    }
}
BalanceHistory = BindToChainState(BalanceHistory, {
    keep_updating: true
});

class TransactionWrapper extends React.Component {
    static propTypes = {
        asset: ChainTypes.ChainAsset.isRequired,
        to: ChainTypes.ChainAccount.isRequired,
        fromAccount: ChainTypes.ChainAccount.isRequired
    };

    static defaultProps = {
        asset: "1.3.0"
    };

    render() {
        return (
            <span className="wrapper">{this.props.children(this.props)}</span>
        );
    }
}
TransactionWrapper = BindToChainState(TransactionWrapper);

export {BalanceHistory, TransactionWrapper};

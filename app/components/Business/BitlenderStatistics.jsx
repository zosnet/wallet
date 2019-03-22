import React from "react";
import {connect} from "alt-react";
import Translate from "react-translate-component";
import {Link} from "react-router/es";
import {Apis} from "zosjs-ws";
import {ChainStore, FetchChain} from "zosjs/es";
import AccountStore from "stores/AccountStore";
import FormattedAsset from "../Utility/FormattedAsset";
import Business from "./Business";
import Bitlender from "./Bitlender";
import ZosPaginatedList from "../Utility/ZosPaginatedList";
import {settingsAPIs} from "api/apiConfig";

class BitlenderStatistics extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            account_name: "",
            account: null,
            loan_historys: null
        };

        let currentAccount = AccountStore.getState().currentAccount;
        if (currentAccount) {
            this.state.account_name = currentAccount;
            this.state.account = ChainStore.getAccount(currentAccount);
        }
    }

    componentDidMount() {
        this._getBitlenderLoanHistory();
    }

    _getBitlenderLoanHistory() {
        Apis.instance()
            .history_api()
            .exec("get_bitlender_loan_history", ["1.3.0", "1.3.20", 0])
            .then(historys => {
                //console.log("loan_historys", historys);
                this.setState({loan_historys: historys});
            });
    }

    render() {
        let {assets, account, loan_historys} = this.state;
        let member_status = ChainStore.getAccountMemberStatus(account);

        let statisticsHeader = (
            <tr>
                <th />
                <th>
                    <Translate content="business.bitlender_loan_history.symbol" />
                </th>
                <th>
                    <Translate content="business.bitlender_loan_history.laon_amount" />
                </th>
                <th>
                    <Translate content="business.bitlender_loan_history.collateralize_amount" />
                </th>
                <th>
                    <Translate content="business.bitlender_loan_history.laon_count" />
                </th>
                <th>
                    <Translate content="business.bitlender_loan_history.invest_count" />
                </th>
                <th style={{textAlign: "right"}}>
                    <Translate content="business.bitlender_loan_history.earnings_amount" />
                </th>
                <th />
            </tr>
        );
        let todayRow = [];
        let totalRow = [];

        if (loan_historys && loan_historys.length) {
            loan_historys.forEach((a, k) => {
                todayRow.push(
                    <tr key={k}>
                        <td />
                        <td>
                            <FormattedAsset asset={a.key.base} hide_amount /> /{" "}
                            <FormattedAsset asset={a.key.quote} hide_amount />
                        </td>
                        <td>
                            <FormattedAsset
                                amount={a.today_laon_amount}
                                asset={a.key.base}
                            />
                        </td>
                        <td>
                            <FormattedAsset
                                amount={a.today_collateralize_amount}
                                asset={a.key.quote}
                            />
                        </td>
                        <td>{a.today_laon_count}</td>
                        <td>{a.today_invest_count}</td>
                        <td style={{textAlign: "right"}}>
                            <FormattedAsset
                                amount={a.today_earnings_amount}
                                asset={a.key.base}
                            />
                        </td>
                        <td />
                    </tr>
                );

                totalRow.push(
                    <tr key={k}>
                        <td />
                        <td>
                            <FormattedAsset asset={a.key.base} hide_amount /> /{" "}
                            <FormattedAsset asset={a.key.quote} hide_amount />
                        </td>
                        <td>
                            <FormattedAsset
                                amount={a.total_laon_amount}
                                asset={a.key.base}
                            />
                        </td>
                        <td>
                            <FormattedAsset
                                amount={a.total_collateralize_amount}
                                asset={a.key.quote}
                            />
                        </td>
                        <td>{a.total_laon_count}</td>
                        <td>{a.total_invest_count}</td>
                        <td style={{textAlign: "right"}}>
                            <FormattedAsset
                                amount={a.total_earnings_amount}
                                asset={a.key.base}
                            />
                        </td>
                        <td />
                    </tr>
                );
            });
        }

        let content = (
            <div
                ref="outerWrapper"
                className="grid-block vertical"
                style={{
                    borderTop: "1px solid rgb(240, 242, 248)"
                }}
            >
                <div>
                    <div className="zos-card-bg" style={{paddingTop: 10}}>
                        <div className="zos-block-content-header">
                            <Translate content="business.bitlender.today_trade" />
                        </div>
                        <ZosPaginatedList
                            header={statisticsHeader}
                            rows={todayRow}
                            pageSize={100}
                            style={{paddingLeft: 0, paddingRight: 0}}
                        />
                    </div>
                </div>
                <div>
                    <div className="zos-card-bg" style={{paddingTop: 10}}>
                        <div className="zos-block-content-header">
                            <Translate content="business.bitlender.total_trade" />
                        </div>
                        <ZosPaginatedList
                            header={statisticsHeader}
                            rows={totalRow}
                            pageSize={100}
                            style={{paddingLeft: 0, paddingRight: 0}}
                        />
                    </div>
                </div>
            </div>
        );

        let bitlender = (
            <Bitlender tab="bitlender_statistics" content={content} />
        );

        return <Business tab="bitlender" content={bitlender} />;
    }
}

export default BitlenderStatistics;

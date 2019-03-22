import React from "react";
import counterpart from "counterpart";
import utils from "common/utils";
import ChainTypes from "../Utility/ChainTypes";
import FormattedAsset from "../Utility/FormattedAsset";
import LinkToAccountById from "../Utility/LinkToAccountById";
import BindToChainState from "../Utility/BindToChainState";
import {EquivalentValueComponent} from "../Utility/EquivalentValueComponent";
import Icon from "components/Icon/Icon";
import Translate from "react-translate-component";
import cnames from "classnames";

class WorkerApproval extends React.Component {
    static propTypes = {
        worker: ChainTypes.ChainObject,
        workerExpired: ChainTypes.ChainHistoryObject, //新增历史对象
        onAddVote: React.PropTypes.func, /// called with vote id to add
        onRemoveVote: React.PropTypes.func, /// called with vote id to remove
        vote_ids: React.PropTypes.object /// Set of items currently being voted for
    };

    static defaultProps = {
        tempComponent: "tr"
    };

    constructor(props) {
        super(props);
    }

    //同意
    onApprove() {
        let addVotes = [],
            removeVotes = [];

        if (this.props.vote_ids.has(this.props.worker.get("vote_against"))) {
            removeVotes.push(this.props.worker.get("vote_against"));
        }

        if (!this.props.vote_ids.has(this.props.worker.get("vote_for"))) {
            addVotes.push(this.props.worker.get("vote_for"));
        }

        this.props.onChangeVotes(addVotes, removeVotes);
    }

    //反对
    onAgainst() {
        let addVotes = [],
            removeVotes = [];

        if (!this.props.vote_ids.has(this.props.worker.get("vote_against"))) {
            addVotes.push(this.props.worker.get("vote_against"));
        }

        if (this.props.vote_ids.has(this.props.worker.get("vote_for"))) {
            removeVotes.push(this.props.worker.get("vote_for"));
        }

        this.props.onChangeVotes(addVotes, removeVotes);
    }

    //取消
    onReject() {
        let addVotes = [],
            removeVotes = [];

        if (this.props.vote_ids.has(this.props.worker.get("vote_against"))) {
            removeVotes.push(this.props.worker.get("vote_against"));
        }

        if (this.props.vote_ids.has(this.props.worker.get("vote_for"))) {
            removeVotes.push(this.props.worker.get("vote_for"));
        }

        this.props.onChangeVotes(addVotes, removeVotes);
    }

    render() {
        let {rank} = this.props;
        let {can_vote_worker} = this.props;
        let maintenance_interval = 0;
        let worker = null;

        let halfVotes = 0;
        if (this.props.halfVotes) {
            halfVotes = this.props.halfVotes;
        }
        if (this.props.maintenance_interval) {
            maintenance_interval = this.props.maintenance_interval;
        }
        if (this.props.worker) {
            worker = this.props.worker.toJS();
        }
        if (this.props.workerExpired) {
            worker = this.props.workerExpired.toJS();
        }

        let total_votes = worker.total_votes_for - worker.total_votes_against;
        let approvalState = this.props.vote_ids.has(worker.vote_for)
            ? true
            : this.props.vote_ids.has(worker.vote_against)
                ? false
                : null;

        let fundedPercent = 0;

        // if (worker.daily_pay < this.props.rest) {
        //     fundedPercent = 100;
        // } else if (this.props.rest > 0) {
        //     fundedPercent = this.props.rest / worker.daily_pay * 100;
        // }

        //最小计算单位内所需要的预算
        let min_pay = (worker.daily_pay / 86400) * maintenance_interval;
        if (min_pay < worker.last_pay) {
            fundedPercent = 100;
        } else if (min_pay > 0) {
            fundedPercent = (worker.last_pay / min_pay) * 100;
        }

        let startDate = counterpart.localize(
            new Date(worker.work_begin_date + "Z"),
            {type: "date", format: "short_custom"}
        );
        let endDate = counterpart.localize(
            new Date(worker.work_end_date + "Z"),
            {type: "date", format: "short_custom"}
        );

        let now = new Date();
        // let isExpired = new Date(worker.work_end_date + "Z") <= now;
        let isExpired = false;
        if (this.props.workerExpired) {
            isExpired = true;
        }
        let hasStarted = new Date(worker.work_begin_date + "Z") <= now;
        //提案的预算项目
        let isProposed =
            !hasStarted ||
            (!isExpired &&
                (total_votes < this.props.voteThreshold ||
                    worker.total_votes_for < halfVotes));
        let actionButtons = (
            <span>
                <button
                    className={cnames("button")}
                    onClick={this.onApprove.bind(this)}
                >
                    <Translate content="account.votes.approve_worker" />
                </button>
                <button
                    className={cnames("button")}
                    onClick={this.onAgainst.bind(this)}
                >
                    <Translate content="account.votes.reject_worker" />
                </button>
            </span>
        );
        let cancelButton = (
            <button
                className={cnames("button")}
                onClick={this.onReject.bind(this)}
            >
                <Translate content="account.votes.waiver_worker" />
            </button>
        );

        let approve_dis = approvalState === true ? true : false;
        let against_dis = approvalState === false ? true : false;
        let cancel_dis = approvalState === null ? true : false;
        let allButtons = (
            <span>
                <button
                    className={cnames("button", {disabled: approve_dis})}
                    onClick={this.onApprove.bind(this)}
                >
                    <Translate content="account.votes.approve_worker" />
                </button>
                <button
                    className={cnames("button", {disabled: against_dis})}
                    onClick={this.onAgainst.bind(this)}
                >
                    <Translate content="account.votes.reject_worker" />
                </button>
                <button
                    className={cnames("button", {disabled: cancel_dis})}
                    onClick={this.onReject.bind(this)}
                >
                    <Translate content="account.votes.waiver_worker" />
                </button>
            </span>
        );

        return (
            <tr className={approvalState !== null ? "" : "unsupported"}>
                {isExpired ? null : (
                    <td
                        style={{
                            textAlign: "right",
                            paddingRight: 10,
                            paddingLeft: 0
                        }}
                    >
                        {/*rank*/}
                    </td>
                )}

                <td className="worker-id">{worker.id}</td>

                <td className="worker-name">
                    <div
                        className="inline-block"
                        style={{paddingRight: 5, position: "relative", top: -1}}
                    >
                        <a
                            style={{
                                visibility:
                                    worker.url && worker.url.indexOf(".") !== -1
                                        ? "visible"
                                        : "hidden"
                            }}
                            href={worker.url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Icon name="share" />
                        </a>
                    </div>
                    <div
                        data-tip={worker.name}
                        className="inline-block tooltip"
                    >
                        {worker.name}
                        <br />
                        <LinkToAccountById account={worker.worker_account} />
                    </div>
                </td>

                <td>
                    {startDate} - {endDate}
                </td>

                <td>
                    {worker.worker[0] == 3 ? (
                        <Translate content="explorer.workers.worker_initializer.exchange" />
                    ) : (
                        <Translate content="explorer.workers.worker_initializer.vesting" />
                    )}
                </td>

                <td style={{textAlign: "right"}}>
                    <EquivalentValueComponent
                        hide_asset
                        fromAsset="1.3.0"
                        toAsset={this.props.preferredUnit}
                        amount={worker.daily_pay}
                    />
                </td>

                <td style={{textAlign: "right"}}>
                    <EquivalentValueComponent
                        hide_asset
                        fromAsset="1.3.0"
                        toAsset={this.props.preferredUnit}
                        amount={worker.need_pay}
                    />
                </td>

                {isExpired || isProposed ? null : (
                    <td style={{textAlign: "right"}}>
                        <EquivalentValueComponent
                            hide_asset
                            fromAsset="1.3.0"
                            toAsset={this.props.preferredUnit}
                            amount={worker.total_pay}
                        />
                    </td>
                )}

                {/*删掉所需票数*/
                /*!isProposed ? null : (
                    <td style={{textAlign: "right"}}>
                        <FormattedAsset
                            amount={Math.max(
                                0,
                                this.props.voteThreshold - total_votes
                            )}
                            asset="1.3.0"
                            hide_asset
                            decimalOffset={5}
                        />
                    </td>
                )*/}

                {isExpired || isProposed ? null : (
                    <td style={{textAlign: "right"}}>
                        {utils.format_number(fundedPercent, 2)}%
                    </td>
                )}

                {isExpired || isProposed ? null : (
                    <td style={{textAlign: "right"}}>
                        <EquivalentValueComponent
                            hide_asset
                            fromAsset="1.3.0"
                            toAsset={this.props.preferredUnit}
                            amount={worker.last_pay}
                        />
                    </td>
                )}

                {/*isExpired || isProposed ? null : (
                    <td style={{textAlign: "right"}}>
                        {this.props.rest <= 0 ? (
                            "0.00"
                        ) : (
                            <EquivalentValueComponent
                                hide_asset
                                fromAsset="1.3.0"
                                toAsset={this.props.preferredUnit}
                                amount={this.props.rest}
                            />
                        )}
                    </td>
                )*/}

                <td style={{textAlign: "right"}}>
                    {worker.total_votes_for}/{worker.total_votes_against}
                </td>
                <td
                    className="clickable"
                    // onClick={
                    //     this.props.proxy
                    //         ? () => {}
                    //         : this[
                    //               approvalState ? "onReject" : "onApprove"
                    //           ].bind(this)
                    // }
                >
                    {/*!this.props.proxy ? (
                        <Icon
                            name={
                                approvalState
                                    ? "checkmark-circle"
                                    : "minus-circle"
                            }
                        />
                    ) : (
                        <Icon name="locked" />
                    )*/}
                    {isExpired || !can_vote_worker ? null : allButtons}
                </td>
            </tr>
        );
    }
}

export default BindToChainState(WorkerApproval);

import React from "react";
import Immutable from "immutable";
import counterpart from "counterpart";
import classNames from "classnames";
import Translate from "react-translate-component";
import HelpContent from "../Utility/HelpContent";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import FormattedAsset from "../Utility/FormattedAsset";
import {EquivalentValueComponent} from "../Utility/EquivalentValueComponent";
import {ChainStore, ChainTypes as grapheneChainTypes} from "zosjs/es";
import SettingsStore from "../../stores/SettingsStore";
const {operations} = grapheneChainTypes;
let ops = Object.keys(operations);

// Define groups and their corresponding operation ids
let fee_grouping_original = {
    general: [0, 25, 26, 27, 28, 32, 33, 37, 39, 40, 41, 43, 74],
    asset: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 38],
    market: [1, 2, 3, 4, 17, 18],
    account: [5, 6, 7, 8, 9],
    business: [
        20,
        21,
        22,
        23,
        24,
        29,
        30,
        31,
        34,
        35,
        36,
        72,
        76,
        77,
        78,
        79,
        80,
        81
    ],
    lend: [
        47,
        48,
        49,
        50,
        51,
        52,
        53,
        54,
        55,
        56,
        57,
        58,
        59,
        60,
        61,
        62,
        63,
        64,
        65,
        71
    ],
    finance: [67, 68, 69, 70]
};

// Operations that require LTM
let ltm_required = [5, 7, 20, 21, 34];

let fee_excludes = {
    seal: [1, 2, 3, 14, 15, 25, 26, 27, 28, 34, 35, 36, 38, 39, 40, 41, 45], //封掉了
    virtual: [4, 42, 44, 46, 66], //虚函数
    noused: [75], //无用
    test: [82] //测试
};

let fee_grouping = {
    general: [0, 32, 33, 37, 43, 74],
    asset: [10, 11, 12, 13, 16, 17, 18, 19],
    market: [17, 18],
    account: [5, 6, 7, 8, 9],
    business: [20, 21, 22, 23, 24, 29, 30, 31, 72, 76, 77, 78, 79, 80, 81],
    lend: [
        47,
        48,
        49,
        50,
        51,
        52,
        53,
        54,
        55,
        56,
        57,
        58,
        59,
        60,
        61,
        62,
        63,
        64,
        65,
        71
    ],
    finance: [67, 68, 69, 70]
};

class FeeGroup extends React.Component {
    static propTypes = {
        globalObject: ChainTypes.ChainObject.isRequired
    };

    static defaultProps = {
        globalObject: "2.0.0"
    };

    constructor(props) {
        super(props);
    }

    shouldComponentUpdate(nextProps) {
        return !Immutable.is(nextProps.globalObject, this.props.globalObject);
    }

    render() {
        let {globalObject, settings, opIds, title} = this.props;
        globalObject = globalObject.toJSON();
        const core_asset = ChainStore.getAsset("1.3.0");

        let network_percent_of_fee =
            globalObject.parameters.network_percent_of_fee;
        let current_fees = globalObject.parameters.current_fees;
        let scale = current_fees.scale;
        let feesRaw = current_fees.parameters;
        let preferredUnit = settings.get("unit") || core_asset.get("symbol");

        let trxTypes = counterpart.translate("transaction.trxTypes");

        let fees = opIds.map(feeIdx => {
            if (feeIdx >= feesRaw.length) {
                console.warn(
                    "Asking for non-existing fee id %d! Check group settings in Fees.jsx",
                    feeIdx
                );
                return; // FIXME, if I ask for a fee that does not exist?
            }

            let feeStruct = feesRaw[feeIdx];

            let opId = feeStruct[0];
            let fee = feeStruct[1];
            let operation_name = ops[opId];
            let feename = trxTypes[operation_name];

            let feeRateForLTM = 0.2;
            if (opId === 10) {
                // Asset creation fee for LTM is 60% of standart user
                // See https://github.com/zos/zos-ui/issues/996
                feeRateForLTM = 0.6;
            }
            if (network_percent_of_fee !== undefined) {
                network_percent_of_fee = parseInt(network_percent_of_fee, 10);
                feeRateForLTM = network_percent_of_fee / 10000;
            }

            let rows = [];
            let headIncluded = false;
            let labelClass = classNames("label", "info");

            for (let key in fee) {
                let amount = fee[key] * scale / 1e4;
                let amountForLTM = amount * feeRateForLTM;
                let feeTypes = counterpart.translate("transaction.feeTypes");
                let assetAmount = amount ? (
                    <FormattedAsset amount={amount} asset="1.3.0" />
                ) : (
                    feeTypes["_none"]
                );
                let equivalentAmount = amount ? (
                    <EquivalentValueComponent
                        fromAsset="1.3.0"
                        fullPrecision={true}
                        amount={amount}
                        toAsset={preferredUnit}
                        fullDecimals={true}
                    />
                ) : (
                    feeTypes["_none"]
                );
                let assetAmountLTM = amountForLTM ? (
                    <FormattedAsset amount={amountForLTM} asset="1.3.0" />
                ) : (
                    feeTypes["_none"]
                );
                let equivalentAmountLTM = amountForLTM ? (
                    <EquivalentValueComponent
                        fromAsset="1.3.0"
                        fullPrecision={true}
                        amount={amountForLTM}
                        toAsset={preferredUnit}
                        fullDecimals={true}
                    />
                ) : (
                    feeTypes["_none"]
                );
                let title = null;

                if (!headIncluded) {
                    headIncluded = true;
                    title = (
                        <td rowSpan="6" className="fee-row-group">
                            <span className={labelClass}>{feename}</span>
                        </td>
                    );
                }

                if (ltm_required.indexOf(opId) < 0) {
                    rows.push(
                        <tr
                            key={opId.toString() + key}
                            className={
                                feeTypes[key] === "Annual Membership"
                                    ? "linethrough"
                                    : ""
                            }
                        >
                            {title}
                            <td>{feeTypes[key]}</td>
                            <td style={{textAlign: "right"}}>
                                {assetAmount}
                                {amount !== 0 &&
                                    preferredUnit !== "ZOS" && [
                                        " / ",
                                        equivalentAmount
                                    ]}
                            </td>
                            <td style={{textAlign: "right"}}>
                                {feeIdx !== 8 ? assetAmountLTM : null}
                                {feeIdx !== 8 &&
                                    amount !== 0 &&
                                    preferredUnit !== "ZOS" && [
                                        " / ",
                                        equivalentAmountLTM
                                    ]}
                            </td>
                        </tr>
                    );
                } else {
                    rows.push(
                        <tr key={opId.toString() + key}>
                            {title}
                            <td>{feeTypes[key]}</td>
                            <td style={{textAlign: "right"}}>
                                - <sup>*</sup>
                            </td>
                            <td style={{textAlign: "right"}}>
                                {assetAmountLTM}
                                {amount !== 0 &&
                                    preferredUnit !== "ZOS" && [
                                        " / ",
                                        equivalentAmountLTM
                                    ]}
                            </td>
                        </tr>
                    );
                }
            }
            return (
                <tbody
                    key={feeIdx}
                    style={{
                        bordor: "1px solid #000000"
                    }}
                >
                    {rows}
                </tbody>
            );
        });

        return (
            <div className="feegroup-card">
                <div className="zos-card-bg">
                    <div className="zos-block-content-header">
                        {this.props.title}
                    </div>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>
                                    <Translate content={"explorer.block.op"} />
                                </th>
                                <th>
                                    <Translate content={"explorer.fees.type"} />
                                </th>
                                <th style={{textAlign: "right"}}>
                                    <Translate content={"explorer.fees.fee"} />
                                </th>
                                <th style={{textAlign: "right"}}>
                                    <Translate
                                        content={"explorer.fees.feeltm"}
                                    />
                                </th>
                            </tr>
                        </thead>
                        {fees}
                    </table>
                </div>
            </div>
        );
    }
}
FeeGroup = BindToChainState(FeeGroup, {keep_updating: true});

class Fees extends React.Component {
    render() {
        let FeeGroupsTitle = counterpart.translate("transaction.feeGroups");
        let feeGroups = [];

        for (let groupName in fee_grouping) {
            let groupNameText = FeeGroupsTitle[groupName];
            let feeIds = fee_grouping[groupName];

            feeGroups.push(
                <FeeGroup
                    key={groupName}
                    settings={this.props.settings}
                    opIds={feeIds}
                    title={groupNameText}
                />
            );
        }

        let locale = SettingsStore.getSetting("locale");

        return (
            <div
                className="grid-block vertical"
                style={{
                    overflow: "visible",
                    paddingTop: 10
                }}
            >
                <div className="zos-card-bg">
                    <div className="grid-block small-12 shrink zos-fee-intro">
                        <HelpContent locale={locale} path={"components/Fees"} />
                    </div>
                </div>

                <div
                    className="grid-block small-12"
                    style={{overflow: "visible"}}
                >
                    <div
                        className="grid-content"
                        style={{
                            paddingLeft: 0,
                            paddingRight: 0
                        }}
                    >
                        {feeGroups}
                    </div>
                </div>
            </div>
        );
    }
}

export default Fees;

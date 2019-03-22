import React from "react";
import Translate from "react-translate-component";
import HelpContent from "../Utility/HelpContent";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import utils from "common/utils";
import counterpart from "counterpart";
import AssetActions from "actions/AssetActions";
import BaseModal from "components/Modal/BaseModal";
import FormattedAsset from "../Utility/FormattedAsset";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";

const ASSET_CASH = 0x00000001; //1 ASSET_CASH   法币
const ASSET_LENDER = 0x0000002; //2 ASSET_LENDER 可抵押
const ASSET_LOAN = 0x00000008; //8 ASSET_LOAN  可借贷
//const ASSET_CORE: 0x00000010, //16,是否core资产(链内部使用)
const ASSET_IS_LOAN_OR_LENDER = 0x00000020; //32, 是否设置了借贷属性(链内部使用)
const ASSET_BIT = 0x00000040; //64 ASSET_BIT   数字货币

class AssetPropertyModal extends React.Component {
    static propTypes = {
        property: React.PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);
    }

    onSubmit(uasset_property, uasset_mask) {
        let {property} = this.props;
        let issuer = property.issuer;
        let asset_id = property.asset_id;
        let pay_account_id = property.pay_account_id;
        AssetActions.changeAssetProperty(
            issuer,
            asset_id,
            pay_account_id,
            uasset_property,
            uasset_mask
        ).then(result => {
            if (result) {
                console.log(result);
                this.props.onClose();
            }
        });
        this.props.onClose(); //关闭前一个窗口
    }

    render() {
        let tabIndex = 1;
        let {property, modalId} = this.props;
        let uasset_prop = property.uasset_property;
        let uasset_property = property.uasset_property;
        //判断数字货币的属性
        let isAssetCash = uasset_prop & ASSET_CASH;
        let isAssetLender = uasset_prop & ASSET_LENDER;
        let isAssetLoan = uasset_prop & ASSET_LOAN;
        let isAssetBit = uasset_prop & ASSET_BIT;
        let isIsLoanOrLender = uasset_prop & ASSET_IS_LOAN_OR_LENDER;

        if (isIsLoanOrLender) {
            uasset_prop -= ASSET_IS_LOAN_OR_LENDER; //内部属性不能改动
        }
        //
        let uasset_mask = 0;
        if (isAssetCash) uasset_mask += ASSET_CASH;
        if (isAssetLender) uasset_mask += ASSET_LENDER;
        if (isAssetLoan) uasset_mask += ASSET_LOAN;
        if (isAssetBit) uasset_mask += ASSET_BIT;

        //根据修改类型判断弹出框标题
        let title = "global.apply";
        if (property.assetType === ASSET_CASH) {
            if (!isAssetCash) {
                title = "transaction.trxTypes.apply_asset_cash";
                //申请为法币，必须要撤销数字货币
                uasset_property = uasset_prop - ASSET_BIT + ASSET_CASH;
                uasset_mask += ASSET_CASH;
            } else {
                title = "transaction.trxTypes.cancel_asset_cash";
                uasset_property = uasset_prop + ASSET_BIT - ASSET_CASH;
                uasset_mask += ASSET_BIT;
            }
        } else if (property.assetType === ASSET_LENDER) {
            if (!isAssetLender) {
                title = "transaction.trxTypes.apply_asset_lender";
                uasset_property = uasset_prop + ASSET_LENDER;
                uasset_mask += ASSET_LENDER;
            } else {
                title = "transaction.trxTypes.cancel_asset_lender";
                uasset_property = uasset_prop - ASSET_LENDER;
            }
        } else if (property.assetType === ASSET_LOAN) {
            if (!isAssetLoan) {
                title = "transaction.trxTypes.apply_asset_loan";
                uasset_property = uasset_prop + ASSET_LOAN;
                uasset_mask += ASSET_LOAN;
            } else {
                title = "transaction.trxTypes.cancel_asset_loan";
                uasset_property = uasset_prop - ASSET_LOAN;
            }
        }

        //console.log("title:", title);
        //console.log("uasset_mask:", uasset_mask);
        //console.log("uasset_property:", uasset_property);

        return (
            <BaseModal id={modalId} overlay={true} modalHeader={title} noLoggo>
                <div style={{marginBottom: "1em"}}>
                    <div style={{marginBottom: "1em", padding: "1rem 0"}}>
                        <table className="table op-table">
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
                                            amount={10000}
                                            asset={"1.3.0"}
                                        />
                                    </td>
                                </tr>

                                <tr>
                                    <td colSpan="2">
                                        <HelpContent
                                            path="assets/Asset"
                                            section="asset_property"
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div
                        className="grid-container "
                        style={{paddingTop: "1rem"}}
                    >
                        <div className="content-block button-group">
                            <div
                                className="button success"
                                onClick={this.onSubmit.bind(
                                    this,
                                    uasset_property,
                                    uasset_mask
                                )}
                                tabIndex={tabIndex++}
                            >
                                {counterpart.translate("global.confirm")}
                            </div>

                            <div
                                className="button"
                                onClick={this.props.onClose}
                                tabIndex={tabIndex++}
                            >
                                {counterpart.translate("cancel")}
                            </div>
                        </div>
                    </div>
                </div>
            </BaseModal>
        );
    }
}

export default BindToChainState(AssetPropertyModal);

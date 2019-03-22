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
import WalletDb from "../../stores/WalletDb";
import WalletApi from "../../api/WalletApi";
import Immutable from "immutable";

class FeeModeModal extends React.Component {
    static propTypes = {
        feeModeObj: React.PropTypes.object
    };
    static defaultProps = {
        feeModeObj: {fee_invest: 0, fee_loan: 1}
    };

    constructor(props) {
        super(props);
        this.state = {
            mode: this.props.current_mode
        };
    }

    componentWillReceiveProps(nextProps) {
        console.log("nextProps:", nextProps);
        if (this.state.mode != nextProps.current_mode) {
            this.setState({
                mode: nextProps.current_mode
            });
        }
    }

    onChangeCurrentMode(e) {
        let mode = e.target.value;
        console.log("current_mode1:", mode);
        this.setState({mode: mode});
    }

    onConfirm() {
        let {account, option_id} = this.props;
        let account_id = account.get("id");

        let fee_mode = this.props.feeModeObj[this.state.mode];

        var tr = WalletApi.new_transaction();
        let transfer_op = tr.get_type_operation("bitlender_option_fee_mode", {
            fee: {
                amount: 0,
                asset_id: "1.3.0"
            },
            issuer: account_id,
            option_id: option_id,
            fee_mode: fee_mode
        });

        let trPromise = tr.update_head_block().then(() => {
            tr.add_type_operation("proposal_create", {
                proposed_ops: [{op: transfer_op}],
                fee_paying_account: account_id
            });

            return WalletDb.process_transaction(tr, null, true);
        });

        this.props.onClose();

        return trPromise;
    }

    render() {
        let tabIndex = 1;
        let {current_asset, modalId, feeModeObj} = this.props;

        let feemodeOptions = [];
        Object.keys(feeModeObj).map(a => {
            feemodeOptions.push(
                <option key={a} value={a}>
                    <span>
                        {counterpart.translate(`business.feemodel.${a}`)}
                    </span>
                </option>
            );
        });

        let assetSelector = (
            <select
                value={this.state.mode}
                className="bts-select"
                onChange={this.onChangeCurrentMode.bind(this)}
            >
                {feemodeOptions}
            </select>
        );

        let title = "business.feemodel.change_feemode";

        return (
            <BaseModal id={modalId} overlay={true} modalHeader={title} noLoggo>
                <div style={{marginBottom: "1em"}}>
                    <div style={{marginBottom: "1em", padding: "1rem 0"}}>
                        <table className="table">
                            <caption />
                            <tbody>
                                <tr>
                                    <td>
                                        <Translate
                                            component="span"
                                            content="business.bitlender.symbol"
                                        />
                                    </td>
                                    <td>
                                        {current_asset
                                            ? current_asset.symbol
                                            : null}
                                    </td>
                                    <td>{""}</td>
                                </tr>

                                <tr>
                                    <td>
                                        <Translate
                                            component="span"
                                            content="business.feemodel.selectfeemode"
                                        />
                                    </td>
                                    <td>{assetSelector}</td>
                                    <td>{""}</td>
                                </tr>
                                <tr>
                                    <td colSpan="2">
                                        <HelpContent
                                            path="components/Bussiness"
                                            section="fee_mode"
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
                                onClick={this.onConfirm.bind(this)}
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

export default BindToChainState(FeeModeModal);

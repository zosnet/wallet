import React from "react";
import utils from "common/utils";
import {ChainStore} from "zosjs/es";
import ChainTypes from "./ChainTypes";
import BindToChainState from "./BindToChainState";
import AssetName from "./AssetName";

class FormattedBitlenderOperation extends React.Component {
    static propTypes = {
        opertion: ChainTypes.ChainObject.isRequired
    };

    render() {
        let {opertion} = this.props;
        // console.log("FormattedBitlenderOperation", this.props);
        let opertion_obj = opertion;
        let asset_id = opertion_obj.get("asset_id");
        if (!asset_id) {
            //opertion是资产对象
            asset_id = opertion_obj.get("id");
        }
        return <AssetName name={asset_id} />;
    }
}

FormattedBitlenderOperation = BindToChainState(FormattedBitlenderOperation);

export default FormattedBitlenderOperation;

import alt from "alt-instance";
import {Apis} from "zosjs-ws";
import {centerAPIs} from "api/apiConfig";

let latestBlocks = {};

class BlockchainActions {
    getLatest(height, maxBlock) {
        // let start = new Date();
        return dispatch => {
            if (!latestBlocks[height] && maxBlock) {
                latestBlocks[height] = true;
                Apis.instance()
                    .db_api()
                    .exec("get_block_ids", [height])
                    .then(result => {
                        if (!result) {
                            return;
                        }
                        result.id = height; // The returned object for some reason does not include the block height..
                        // console.log("time to fetch block #" + height,":", new Date() - start, "ms");

                        dispatch({block: result, maxBlock: maxBlock});
                    })
                    .catch(error => {
                        console.log(
                            "Error in BlockchainActions.getLatest: ",
                            error
                        );
                    });
            }
        };
    }

    getBlock(height, trid) {
        if (!height || height == 0) {
            return dispatch => {
                let url =
                    centerAPIs.CHAININFO + "/chain/api/blockinfo?txid=" + trid;
                fetch(url)
                    .then(result => {
                        if (!result) {
                            return false;
                        }
                        result.json().then(data => {
                            if (!data || data.code == 400) {
                                return false;
                            }
                            height = data.data.height;
                            data.data.id = data.data.height; // The returned object for some reason does not include the block height..
                            dispatch(data.data);
                        });
                    })
                    .catch(error => {
                        console.log(
                            "Error in BlockchainActions.getBlock: ",
                            error
                        );
                    });
            };
        } else if (!trid) {
            return dispatch => {
                Apis.instance()
                    .db_api()
                    .exec("get_block_ids", [height])
                    .then(result => {
                        if (!result) {
                            return false;
                        }
                        result.id = height; // The returned object for some reason does not include the block height..

                        dispatch(result);
                    })
                    .catch(error => {
                        console.log(
                            "Error in BlockchainActions.getBlock: ",
                            error
                        );
                    });
            };
        } else {
            return dispatch => {
                Apis.instance()
                    .db_api()
                    .exec("get_block_with_id", [height, trid])
                    .then(result => {
                        if (!result) {
                            return false;
                        }
                        result.id = height; // The returned object for some reason does not include the block height..

                        dispatch(result);
                    })
                    .catch(error => {
                        console.log(
                            "Error in BlockchainActions.getBlock: ",
                            error
                        );
                    });
            };
        }
    }

    setBlockAndTrxID(height, trid) {
        return {height, trid};
    }

    updateRpcConnectionStatus(status) {
        return status;
    }
}

const BlockchainActionsInstance = alt.createActions(BlockchainActions);
Apis.setRpcConnectionStatusCallback(
    BlockchainActionsInstance.updateRpcConnectionStatus
);

export default BlockchainActionsInstance;

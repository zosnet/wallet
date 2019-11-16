import BaseStore from "./BaseStore";
import Immutable from "immutable";
import alt from "alt-instance";
import BlockchainActions from "actions/BlockchainActions";
import {ChainStore} from "zosjs/es";
// import {Block} from "./tcomb_structs";

class BlockchainStore extends BaseStore {
    constructor() {
        super();
        // This might not need to be an immutable map, a normal structure might suffice..
        this.blocks = Immutable.Map();
        this.latestBlocks = Immutable.List();
        this.latestTransactions = Immutable.List();
        this.rpc_connection_status = null;
        this.no_ws_connection = false;
        this.blocksHeight = 0;
        this.LastHeight = 0;
        this.blocksTrxid = "";

        this.bindListeners({
            onGetBlock: BlockchainActions.getBlock,
            onSetBlockAndTrxID: BlockchainActions.setBlockAndTrxID,
            onGetLatest: BlockchainActions.getLatest,
            onUpdateRpcConnectionStatus:
                BlockchainActions.updateRpcConnectionStatus
        });

        this._export("onSetBlockAndTrxID");

        this.maxBlocks = 30;
    }

    onGetBlock(block) {
        this.blocks = Immutable.Map();
        this.LastHeight = block.id;
        if (!this.blocks.get(block.id)) {
            if (!/Z$/.test(block.timestamp)) {
                block.timestamp += "Z";
            }
            block.timestamp = new Date(block.timestamp);
            this.blocks = this.blocks.set(block.id, block);
        }
    }

    onSetBlockAndTrxID({height, trid}) {
        this.blocksHeight = height;
        this.blocksTrxid = trid;
    }
    filterTrx(trx) {
        //if (op[0] === "asset_publish_feed" || op[0] === "bitlender_publish_feed_operation" ) return null;
        // console.log(trx);
        if (trx.operations.length <= 0) return false;
        if (trx.operations[0][0] === 19) return false;
        if (trx.operations[0][0] === 86) return false;
        return true;
    }

    onGetLatest(payload) {
        let {block, maxBlock} = payload;
        if (typeof block.timestamp === "string") {
            if (!/Z$/.test(block.timestamp)) {
                block.timestamp += "Z";
            }
        }
        block.timestamp = new Date(block.timestamp);
        this.blocks = this.blocks.set(block.id, block);
        if (block.id > maxBlock - this.maxBlocks) {
            this.latestBlocks = this.latestBlocks.unshift(block);
            if (this.latestBlocks.size > this.maxBlocks) {
                this.latestBlocks = this.latestBlocks.pop();
            }

            if (block.transactions.length > 0) {
                block.transactions.forEach((trx, index) => {
                    trx.trxid = block.trxids[index];
                    trx.block_num = block.id;
                    if (this.filterTrx(trx)) {
                        this.latestTransactions = this.latestTransactions.unshift(
                            trx
                        );
                    }
                });
            }

            if (this.latestTransactions.size > this.maxBlocks) {
                this.latestTransactions = this.latestTransactions.pop();
            }
        }
    }

    onUpdateRpcConnectionStatus(status) {
        let prev_status = this.rpc_connection_status;
        if (status === "reconnect") ChainStore.resetCache(false);
        else this.rpc_connection_status = status;
        if (prev_status === null && status === "error")
            this.no_ws_connection = true;
        if (this.no_ws_connection && status === "open")
            this.no_ws_connection = false;
    }
}

export default alt.createStore(BlockchainStore, "BlockchainStore");

import React from "react";
import BlockchainStore from "stores/BlockchainStore";
import AltContainer from "alt-container";
import Block from "./Block";
import Explorer from "../Explorer/Explorer";

class BlockContainer extends React.Component {
    render() {
        let height = parseInt(this.props.params.height, 10);
        let trid = this.props.params.trid;

        let content = (
            <AltContainer
                stores={[BlockchainStore]}
                inject={{
                    blocks: () => {
                        return BlockchainStore.getState().blocks;
                    },
                    storeHeight: () => {
                        return BlockchainStore.getState().blocksHeight;
                    },
                    storeTrxid: () => {
                        return BlockchainStore.getState().blocksTrxid;
                    },
                    LastHeight: () => {
                        return BlockchainStore.getState().LastHeight;
                    }
                }}
            >
                <Block {...this.props} height={height} trid={trid} />
            </AltContainer>
        );
        return <Explorer tab="block" content={content} />;
    }
}

export default BlockContainer;

import React from "react";
import {PropTypes} from "react";
import {FormattedDate} from "react-intl";
import Immutable from "immutable";
import BlockchainActions from "actions/BlockchainActions";
import BlockchainStore from "stores/BlockchainStore";
import Transaction from "./Transaction";
import Translate from "react-translate-component";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import LinkToWitnessById from "../Utility/LinkToWitnessById";
import {FetchChain, hash, ops} from "zosjs/es";

class TransactionList extends React.Component {
    render() {
        let {block} = this.props;
        let transactions = null;

        transactions = [];

        if (block.transactions.length > 0) {
            transactions = [];

            block.transactions.forEach((trx, index) => {
                let tr_buffer = ops.transaction.toBuffer(trx);
                let tr_id = hash
                    .sha256(tr_buffer)
                    .toString("hex")
                    .substring(0, 40);
                transactions.push(
                    <Transaction
                        key={index}
                        trx={trx}
                        index={index}
                        trId={tr_id}
                    />
                );
            });
        }

        return <div>{transactions}</div>;
    }
}

class Block extends React.Component {
    static propTypes = {
        dynGlobalObject: ChainTypes.ChainObject.isRequired,
        blocks: PropTypes.object.isRequired,
        height: PropTypes.number.isRequired
    };

    static defaultProps = {
        dynGlobalObject: "2.1.0",
        blocks: {},
        height: 1
    };

    constructor(props) {
        super(props);

        this.state = {
            showInput: false,
            input_height: 0,
            input_trxid: "",
            search_height: 0,
            search_trxid: ""
        };
    }

    //参数说明
    // props.height: 网址里的块高度
    // props.trid: 网址里的交易ID
    // input_height, input_trxid: input输入值
    // props.storeHeight, props.storeTrxid: Store缓存的值

    //如果网址里面height为0,则查找Store缓存的height和trxid
    //如果缓存里面height为0,则查找最新的块高度的值
    componentDidMount() {
        // FetchChain("getObject", "2.1.0").then(res => {
        //     this.props.dynGlobalObject = res
        // })
        if (this.props.height > 0) {
            this.setState(
                {
                    input_height: this.props.height,
                    input_trxid: this.props.trid
                },
                () => {
                    this._getBlock(this.props.height, this.props.trid, true);
                }
            );
        } else {
            if (this.props.storeHeight > 0) {
                this.setState(
                    {
                        input_height: this.props.storeHeight,
                        input_trxid: this.props.storeTrxid
                    },
                    () => {
                        this._getBlock(
                            this.props.storeHeight,
                            this.props.storeTrxid,
                            true
                        );
                    }
                );
            } else {
                FetchChain("getObject", "2.1.0").then(res => {
                    this._getBlock(res.get("head_block_number"), "");
                    this.setState(
                        {
                            input_height: res.get("head_block_number"),
                            input_trxid: ""
                        },
                        () => {
                            this._getBlock(
                                res.get("head_block_number"),
                                "",
                                false
                            );
                        }
                    );
                });
            }
        }
    }

    componentWillReceiveProps(np) {
        if (np.height !== this.props.height || np.trid !== this.props.trid) {
            this.setState(
                {
                    input_height: np.height,
                    input_trxid: np.trid ? np.trid : ""
                },
                () => {
                    this._getBlock(np.height, np.trid, true);
                }
            );
        }
    }

    shouldComponentUpdate(np, ns) {
        return (
            !Immutable.is(np.blocks, this.props.blocks) ||
            np.height !== this.props.height ||
            np.trid !== this.props.trid ||
            np.input_height !== this.state.input_height ||
            np.input_trxid !== this.state.input_trxid
        );
    }

    _getBlock(height, trid, updateStore = false) {
        if (height) {
            height = parseInt(height, 10);
            // if (!this.props.blocks.get(height)) {
            //     BlockchainActions.getBlock(height);
            // }
            BlockchainActions.getBlock(height, trid);
            if (updateStore) {
                BlockchainStore.onSetBlockAndTrxID({height, trid});
            }
            this.setState({
                search_height: height,
                search_trxid: trid
            });
        }
    }

    _nextBlock() {
        let height = this.state.search_height;
        let nextBlock = Math.min(
            this.props.dynGlobalObject.get("head_block_number"),
            parseInt(height, 10) + 1
        );
        this.props.router.push(`/explorer/block/${nextBlock}`);
    }

    _previousBlock() {
        let height = this.state.search_height;
        let previousBlock = Math.max(1, parseInt(height, 10) - 1);
        this.props.router.push(`/explorer/block/${previousBlock}`);
    }

    _onHeightChange(e) {
        this.setState({
            input_height: e.target.value
        });
    }

    _onTrxidChange(e) {
        this.setState({
            input_trxid: e.target.value
        });
    }

    _onKeyDown(e) {
        if (e && e.keyCode === 13) {
            const heightValue = this.refs.blockInput.value;
            const tridValue = this.refs.trxidInput.value;
            var url = "";
            if (parseInt(heightValue) <= 0) {
                return;
            }
            if (heightValue) {
                url = `/explorer/block/${heightValue}`;
            } else {
                return;
            }
            if (tridValue) {
                url = url + `/${tridValue}`;
            }
            // this.props.router.push(`/block/${e.target.value}`);
            this.props.router.push(url);
        }
    }

    _onSubmit() {
        this._onKeyDown({keyCode: 13});
        // this.props.router.push(`/block/${e.target.value}`);
    }

    render() {
        let {blocks} = this.props;
        let {search_height} = this.state;
        let height = parseInt(search_height, 10);
        let block = blocks.get(height);

        let blockInput = (
            <span>
                <span className="inline-label">
                    <span
                        style={{
                            display: "flex",
                            flexFlow: "column nowrap",
                            alignItems: "stretch",
                            flex: 1,
                            margin: "10px 10px 10px 0"
                        }}
                    >
                        <input
                            ref="blockInput"
                            type="number"
                            placeholder="Block Number"
                            value={this.state.input_height}
                            onKeyDown={this._onKeyDown.bind(this)}
                            onChange={this._onHeightChange.bind(this)}
                        />
                        <input
                            ref="trxidInput"
                            type="text"
                            placeholder="Transaction ID"
                            value={this.state.input_trxid}
                            onKeyDown={this._onKeyDown.bind(this)}
                            onChange={this._onTrxidChange.bind(this)}
                        />
                    </span>
                    <button
                        onClick={this._onSubmit.bind(this)}
                        className="button"
                        style={{margin: "10px 0 20px 0"}}
                    >
                        <Translate content="explorer.block.go_to" />
                    </button>
                </span>
            </span>
        );

        let blockHeight = (
            <span>
                <Translate
                    style={{textTransform: "uppercase"}}
                    component="span"
                    content="explorer.block.title"
                />
                <a>
                    &nbsp;#
                    {height}
                </a>
            </span>
        );

        return (
            <div
                className="grid-block"
                style={{
                    paddingTop: 20
                }}
            >
                <div className="grid-block">
                    <div className="grid-content">
                        <div className="grid-content no-overflow medium-offset-2 medium-8 large-offset-3 large-6 small-12 zos-card-bg">
                            <h4 className="text-center">{blockInput}</h4>
                            <h4 className="text-center">{blockHeight}</h4>
                            <ul>
                                <li>
                                    <Translate
                                        component="span"
                                        content="explorer.block.date"
                                    />
                                    :{" "}
                                    {block ? (
                                        <FormattedDate
                                            value={block.timestamp}
                                            format="full"
                                        />
                                    ) : null}
                                </li>
                                <li>
                                    <Translate
                                        component="span"
                                        content="explorer.block.witness"
                                    />
                                    :{" "}
                                    {block ? (
                                        <LinkToWitnessById
                                            witness={block.witness}
                                        />
                                    ) : null}
                                </li>
                                <li>
                                    <Translate
                                        component="span"
                                        content="explorer.block.previous"
                                    />
                                    : {block ? block.previous : null}
                                </li>
                                <li>
                                    <Translate
                                        component="span"
                                        content="explorer.block.transactions"
                                    />
                                    : {block ? block.transactions.length : null}
                                </li>
                            </ul>
                            <div
                                className="clearfix"
                                style={{marginBottom: "1rem"}}
                            >
                                <div
                                    className="button float-left outline"
                                    onClick={this._previousBlock.bind(this)}
                                >
                                    &#8592;
                                </div>
                                <div
                                    className="button float-right outline"
                                    onClick={this._nextBlock.bind(this)}
                                >
                                    &#8594;
                                </div>
                            </div>
                            {block ? <TransactionList block={block} /> : null}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

// export default Block;
export default BindToChainState(Block, {keep_updating: true});

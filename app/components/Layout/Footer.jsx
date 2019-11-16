import React, {Component} from "react";
import AltContainer from "alt-container";
import Translate from "react-translate-component";
import BindToChainState from "../Utility/BindToChainState";
import ChainTypes from "../Utility/ChainTypes";
import CachedPropertyStore from "stores/CachedPropertyStore";
import BlockchainStore from "stores/BlockchainStore";
import WalletDb from "stores/WalletDb";
import SettingsStore from "stores/SettingsStore";
import SettingsActions from "actions/SettingsActions";
import Icon from "../Icon/Icon";
import counterpart from "counterpart";
// import { launchIntroJS } from "";
import "intro.js/introjs.css";
import guide from "intro.js";

var logo = require("assets/zos-ui-logo.png");

class Footer extends React.Component {
    static propTypes = {
        dynGlobalObject: ChainTypes.ChainObject.isRequired,
        synced: React.PropTypes.bool.isRequired
    };

    static defaultProps = {
        dynGlobalObject: "2.1.0"
    };

    static contextTypes = {
        router: React.PropTypes.object
    };

    constructor(props) {
        super(props);

        this.state = {};
    }

    componentDidMount() {
        this.checkNewVersionAvailable.call(this);

        this.downloadLink = "https://zos.org/download";
    }

    shouldComponentUpdate(nextProps) {
        return (
            nextProps.dynGlobalObject !== this.props.dynGlobalObject ||
            nextProps.backup_recommended !== this.props.backup_recommended ||
            nextProps.rpc_connection_status !==
                this.props.rpc_connection_status ||
            nextProps.synced !== this.props.synced
        );
    }

    checkNewVersionAvailable() {
        if (__ELECTRON__) {
            fetch("https://api.github.com/repos/zos/zos-ui/releases/latest")
                .then(res => {
                    return res.json();
                })
                .then(
                    function(json) {
                        let oldVersion = String(json.tag_name);
                        let newVersion = String(APP_VERSION);
                        if (oldVersion !== newVersion) {
                            this.setState({newVersion});
                        }
                    }.bind(this)
                );
        }
    }

    downloadVersion() {
        var a = document.createElement("a");
        a.href = this.downloadLink;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.style = "display: none;";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    launchIntroJS() {
        const translator = require("counterpart");

        var hintData = document.querySelectorAll("[data-intro]");
        var theme = SettingsStore.getState().settings.get("themes");

        if (hintData.length == 0) {
            window.open("http://docs.zos.org/zos/user/index.html", "_blank");
        } else {
            guide
                .introJs()
                .setOptions({
                    tooltipClass: theme,
                    highlightClass: theme,
                    showBullets: false,
                    hideNext: true,
                    hidePrev: true,
                    nextLabel: translator.translate("walkthrough.next_label"),
                    prevLabel: translator.translate("walkthrough.prev_label"),
                    skipLabel: translator.translate("walkthrough.skip_label"),
                    doneLabel: translator.translate("walkthrough.done_label")
                })
                .start();
        }
    }

    render() {
        const {state} = this;
        const {synced} = this.props;
        const connected = !(this.props.rpc_connection_status === "closed");

        // Current Node Details
        let currentNode = SettingsStore.getState().settings.get("activeNode");
        let currentNodePing = SettingsStore.getState().apiLatencies[
            currentNode
        ];

        let block_height = this.props.dynGlobalObject.get("head_block_number");
        let version_match = APP_VERSION.match(/2\.0\.(\d\w+)/);
        let version = version_match
            ? `.${version_match[1]}`
            : ` ${APP_VERSION}`;
        let updateStyles = {display: "inline-block", verticalAlign: "top"};
        let logoProps = {};

        return (
            <div className="zos-container">
                <div className="show-for-medium grid-block shrink footer">
                    <div className="align-justify grid-block">
                        <div className="grid-block">
                            <div
                                className="logo"
                                style={{
                                    fontSize: state.newVersion
                                        ? "0.9em"
                                        : "1em",
                                    cursor: state.newVersion
                                        ? "pointer"
                                        : "normal",
                                    marginTop: state.newVersion
                                        ? "-5px"
                                        : "0px",
                                    overflow: "hidden"
                                }}
                                onClick={
                                    state.newVersion
                                        ? this.downloadVersion.bind(this)
                                        : null
                                }
                                {...logoProps}
                            >
                                <img
                                    style={{
                                        margin: 0,
                                        height: 20,
                                        marginRight: 10
                                    }}
                                    src={logo}
                                />
                                {state.newVersion && (
                                    <Icon
                                        name="download"
                                        style={{
                                            marginRight: "20px",
                                            marginTop: "10px",
                                            fontSize: "1.35em",
                                            display: "inline-block"
                                        }}
                                    />
                                )}
                                <span style={updateStyles}>
                                    <Translate content="footer.title" />
                                    <span> V2019.11.10</span>
                                    {/* <span className="version">{version}</span> */}
                                </span>

                                {state.newVersion && (
                                    <Translate
                                        content="footer.update_available"
                                        style={{
                                            color: "#FCAB53",
                                            position: "absolute",
                                            top: "8px",
                                            left: "36px"
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                        {synced ? null : (
                            <div className="grid-block shrink txtlabel cancel">
                                <Translate content="footer.nosync" />
                                &nbsp; &nbsp;
                            </div>
                        )}
                        {!connected ? (
                            <div className="grid-block shrink txtlabel error">
                                <Translate content="footer.connection" />
                                &nbsp; &nbsp;
                            </div>
                        ) : null}
                        {this.props.backup_recommended ? (
                            <span>
                                <div className="grid-block">
                                    <a
                                        className="shrink txtlabel facolor-alert"
                                        data-tip="Please understand that you are responsible for making your own backup&hellip;"
                                        data-type="warning"
                                        onClick={this.onBackup.bind(this)}
                                    >
                                        <Translate content="footer.backup" />
                                    </a>
                                    &nbsp;&nbsp;
                                </div>
                            </span>
                        ) : null}
                        {this.props.backup_brainkey_recommended ? (
                            <span>
                                <div className="grid-block">
                                    <a
                                        className="grid-block shrink txtlabel facolor-alert"
                                        onClick={this.onBackupBrainkey.bind(
                                            this
                                        )}
                                    >
                                        <Translate content="footer.brainkey" />
                                    </a>
                                    &nbsp;&nbsp;
                                </div>
                            </span>
                        ) : null}
                        {block_height ? (
                            <div className="grid-block shrink">
                                <div
                                    className="tooltip"
                                    style={{position: "relative"}}
                                    onClick={this.onAccess.bind(this)}
                                    data-tip={
                                        counterpart.translate(
                                            `tooltip.${
                                                !connected
                                                    ? "disconnected"
                                                    : synced
                                                        ? "sync_yes"
                                                        : "sync_no"
                                            }`
                                        ) +
                                        " " +
                                        currentNode
                                    }
                                    data-place="top"
                                >
                                    <div className="footer-current-node">
                                        {currentNode}
                                    </div>
                                    <div className="footer-status">
                                        {!connected ? (
                                            <span className="warning">
                                                <Translate content="footer.disconnected" />
                                            </span>
                                        ) : (
                                            <span className="success">
                                                <Translate content="footer.connected" />
                                            </span>
                                        )}
                                    </div>
                                    <div className="footer-block">
                                        <span>
                                            <span className="footer-block-title">
                                                <Translate content="footer.latency" />
                                            </span>
                                            &nbsp;
                                            {!connected
                                                ? "-"
                                                : !currentNodePing
                                                    ? "-"
                                                    : currentNodePing + "ms"}
                                            &nbsp;/&nbsp;
                                            <span className="footer-block-title">
                                                <Translate content="footer.block" />
                                            </span>
                                            &nbsp;#
                                            {block_height}
                                        </span>
                                    </div>
                                </div>
                                {/* <div className="grid-block">
                                    <div
                                        className="introjs-launcher"
                                        onClick={() => {
                                            this.launchIntroJS();
                                        }}
                                    >
                                        Help
                                    </div>
                                </div> */}
                            </div>
                        ) : (
                            <div className="grid-block shrink">
                                <Translate content="footer.loading" />
                            </div>
                        )}
                    </div>
                </div>
                {/* <div
                    className="introjs-launcher show-for-small-only"
                    onClick={() => {
                        this.launchIntroJS();
                    }}
                >
                    Help
                </div> */}
            </div>
        );
    }

    onBackup() {
        this.context.router.push("/wallet/backup/create");
    }

    onBackupBrainkey() {
        this.context.router.push("/wallet/backup/brainkey");
    }

    onAccess() {
        SettingsActions.changeViewSetting({activeSetting: 6});
        this.context.router.push("/settings/access");
    }
}
Footer = BindToChainState(Footer, {keep_updating: true});

class AltFooter extends Component {
    render() {
        var wallet = WalletDb.getWallet();
        return (
            <AltContainer
                stores={[CachedPropertyStore, BlockchainStore, WalletDb]}
                inject={{
                    backup_recommended: () =>
                        wallet &&
                        (!wallet.backup_date ||
                            CachedPropertyStore.get("backup_recommended")),
                    rpc_connection_status: () =>
                        BlockchainStore.getState().rpc_connection_status
                }}
            >
                <Footer {...this.props} />
            </AltContainer>
        );
    }
}

export default AltFooter;

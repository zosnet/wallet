import React from "react";
import Translate from "react-translate-component";
import SettingsActions from "actions/SettingsActions";
import SettingsStore from "stores/SettingsStore";
import {settingsAPIs} from "../../api/apiConfig";
import willTransitionTo from "../../routerTransition";
import {withRouter} from "react-router/es";
import {connect} from "alt-react";
import cnames from "classnames";

const autoSelectAPI = "wss://fake.automatic-selection.com";
const testnetAPI = settingsAPIs.WS_NODE_LIST.find(
    a => a.url.indexOf("127.0.0.1") !== -1
);
const testnetAPI2 = settingsAPIs.WS_NODE_LIST.find(
    a => a.url.indexOf("18.218.179.234") !== -1
);

class ApiNode extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            hovered: false
        };
    }

    setHovered() {
        this.setState({hovered: true});
    }

    clearHovered() {
        this.setState({hovered: false});
    }

    activate() {
        SettingsActions.changeSetting({
            setting: "apiServer",
            value: this.props.url
        });
        setTimeout(
            function() {
                willTransitionTo(
                    this.props.router,
                    this.props.router.replace,
                    () => {},
                    false
                );
            }.bind(this),
            50
        );
    }

    remove(url, name, e) {
        this.props.triggerModal(e, url, name);
    }

    show(url) {
        SettingsActions.showWS(url);
    }

    hide(url) {
        SettingsActions.hideWS(url);
    }

    render() {
        const {props, state} = this;
        const {
            allowActivation,
            allowRemoval,
            automatic,
            autoActive,
            name,
            url,
            displayUrl,
            ping,
            up,
            hidden
        } = props;

        let color;
        let latencyKey;
        let friendlyPing;

        if (ping < 400) {
            color = "low";
            latencyKey = "low_latency";
        } else if (ping >= 400 && ping < 800) {
            color = "medium";
            latencyKey = "medium_latency";
        } else {
            color = "high";
            latencyKey = "high_latency";
        }

        if (ping >= 1000) {
            friendlyPing = +(ping / 1000).toFixed(2) + "s";
        } else {
            friendlyPing = ping + "ms";
        }

        /*
        * The testnet latency is not checked in the connection manager,
        * so we force enable activation of it even though it shows as 'down'
        */
        const isTestnet = false; //url === testnetAPI.url || url === testnetAPI2.url;

        var Status =
            isTestnet && !ping ? null : (
                <div
                    className="api-status"
                    style={{
                        position: "absolute",
                        textAlign: "right",
                        right: "1em",
                        top: "50%",
                        height: 20,
                        lineHeight: "20px",
                        marginTop: -10
                    }}
                >
                    {up && (
                        <span className={color}>
                            <Translate content={`settings.${latencyKey}`} /> (
                            {friendlyPing})
                        </span>
                    )}
                    {!up && <span className="high">__</span>}
                </div>
            );

        let showApiStatus =
            (allowActivation && !automatic) ||
            (!allowActivation && !allowRemoval && !automatic);

        return (
            <div
                className="api-node"
                onMouseOver={this.setHovered.bind(this)}
                onMouseLeave={this.clearHovered.bind(this)}
            >
                <h3 style={{marginBottom: 0, marginTop: 0}}>{name}</h3>
                <div className="api-status">
                    <span style={{marginBottom: 0}}>{displayUrl}</span>
                    {showApiStatus && <span> | </span>}
                    {showApiStatus && (
                        <Translate
                            className={up ? "low" : "high"}
                            style={{marginBottom: 0}}
                            component="span"
                            content={
                                "settings." + (up ? "node_up" : "node_down")
                            }
                        />
                    )}
                </div>
                {automatic && autoActive ? (
                    <div
                        className="api-status"
                        style={{
                            position: "absolute",
                            textAlign: "right",
                            right: "1em",
                            top: "0.5em"
                        }}
                    >
                        <Translate
                            content="account.votes.active_short"
                            component="h3"
                            className="low"
                            style={{marginBottom: 0}}
                        />
                    </div>
                ) : null}
                {!allowActivation && !allowRemoval && !automatic && Status}
                {allowActivation &&
                    !automatic &&
                    (up
                        ? !state.hovered
                        : allowRemoval
                            ? !state.hovered
                            : true) &&
                    Status}
                {(allowActivation || allowRemoval) &&
                    state.hovered &&
                    !(automatic && autoActive) && (
                        <div
                            style={{
                                position: "absolute",
                                right: "1em",
                                top: "1em"
                            }}
                        >
                            {!automatic &&
                                (hidden ? (
                                    <div
                                        className="button"
                                        onClick={this.show.bind(this, url)}
                                    >
                                        <Translate content="settings.show" />
                                    </div>
                                ) : (
                                    <div
                                        className="button"
                                        onClick={this.hide.bind(this, url)}
                                    >
                                        <Translate content="settings.hide" />
                                    </div>
                                ))}
                            {allowRemoval && (
                                <div
                                    className="button"
                                    onClick={this.remove.bind(this, url, name)}
                                >
                                    <Translate
                                        id="remove"
                                        content="settings.remove"
                                    />
                                </div>
                            )}
                            {(automatic || isTestnet ? true : true) &&
                                allowActivation && (
                                    <div
                                        className="button"
                                        onClick={this.activate.bind(this)}
                                    >
                                        <Translate content="settings.activate" />
                                    </div>
                                )}
                        </div>
                    )}
            </div>
        );
    }
}

ApiNode.defaultProps = {
    name: "Test node",
    url: "wss://testnode.net/wss",
    displayUrl: "wss://testnode.net/wss",
    up: true,
    ping: null,
    allowActivation: false,
    allowRemoval: false,
    hidden: false
};

const ApiNodeWithRouter = withRouter(ApiNode);

class AccessSettings extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            activeTab: "available-nodes"
        };

        let isDefaultNode = {};

        settingsAPIs.WS_NODE_LIST.forEach(node => {
            isDefaultNode[node.url] = true;
        });

        this.isDefaultNode = isDefaultNode;
    }

    getNodeIndexByURL(url) {
        const {nodes} = this.props;

        let index = nodes.findIndex(node => node.url === url);
        if (index === -1) {
            return null;
        }
        return index;
    }

    getCurrentNodeIndex() {
        const {props} = this;
        let currentNode = this.getNodeIndexByURL.call(this, props.currentNode);

        return currentNode;
    }

    getNode(node) {
        const {props} = this;

        return {
            name: node.location || "Unknown location",
            url: node.url,
            up: node.url in props.apiLatencies,
            ping: props.apiLatencies[node.url],
            hidden: !!node.hidden
        };
    }

    renderNode(node, allowActivation) {
        const {props} = this;

        let automatic = node.url === autoSelectAPI;

        let displayUrl = automatic ? "..." : node.url;

        let name =
            !!node.name &&
            typeof node.name === "object" &&
            "translate" in node.name ? (
                <Translate component="span" content={node.name.translate} />
            ) : (
                node.name
            );

        let allowRemoval =
            !automatic && !this.isDefaultNode[node.url] ? true : false;

        return (
            <ApiNodeWithRouter
                {...node}
                autoActive={props.currentNode === autoSelectAPI}
                automatic={automatic}
                allowActivation={allowActivation}
                allowRemoval={allowActivation && allowRemoval}
                key={node.url}
                name={name}
                displayUrl={displayUrl}
                triggerModal={props.triggerModal}
            />
        );
    }

    _changeTab(tab) {
        this.setState({
            activeTab: tab
        });
    }

    render() {
        const {props} = this;
        let getNode = this.getNode.bind(this);
        let renderNode = this.renderNode.bind(this);
        let currentNodeIndex = this.getCurrentNodeIndex.call(this);
        let hc = "nodes-header clickable";
        let showAvailableNodes = this.state.activeTab === "available-nodes";
        let availableClass = cnames(hc, {inactive: !showAvailableNodes});
        let hiddenClass = cnames(hc, {inactive: showAvailableNodes});
        let nodes = props.nodes
            .map(node => {
                return getNode(node);
            })
            .filter(node => {
                return node.hidden !== showAvailableNodes;
            });

        let activeNode = getNode(
            props.nodes[currentNodeIndex] || props.nodes[0]
        );

        if (activeNode.url == autoSelectAPI) {
            let nodeUrl = props.activeNode;
            currentNodeIndex = this.getNodeIndexByURL.call(this, nodeUrl);
            activeNode = getNode(props.nodes[currentNodeIndex]);
        }

        nodes = nodes
            .slice(0, currentNodeIndex)
            .concat(nodes.slice(currentNodeIndex + 1))
            .sort(function(a, b) {
                let isTestnet = false; //  a.url === testnetAPI.url || a.url === testnetAPI2.url;
                if (a.url == autoSelectAPI) {
                    return -1;
                } else if (a.up && b.up) {
                    return a.ping - b.ping;
                } else if (!a.up && !b.up) {
                    if (isTestnet) return -1;
                    return 1;
                } else if (a.up && !b.up) {
                    return -1;
                } else if (b.up && !a.up) {
                    return 1;
                }

                return 0;
            });

        nodes = nodes.filter(node => {
            return node.hidden !== showAvailableNodes;
        });

        return (
            <div style={{paddingTop: "1em"}}>
                <Translate component="p" content="settings.active_node" />
                <div className="active-node" style={{marginBottom: "2em"}}>
                    {renderNode(activeNode, false)}
                </div>

                <div
                    className="nodes"
                    style={{position: "relative", marginBottom: "2em"}}
                >
                    <div className="account-tabs" style={{marginBottom: 20}}>
                        <div className="service-selector">
                            <ul className="button-group no-margin account-overview bordered-header content-block">
                                <li
                                    className={
                                        this.state.activeTab ===
                                        "available-nodes"
                                            ? "is-active"
                                            : ""
                                    }
                                    style={{float: "left"}}
                                    onClick={this._changeTab.bind(
                                        this,
                                        "available-nodes"
                                    )}
                                >
                                    <a>
                                        <Translate
                                            className="tab-title"
                                            content="settings.available_nodes"
                                        />
                                    </a>
                                </li>
                                <li
                                    className={
                                        this.state.activeTab === "hidden-nodes"
                                            ? "is-active"
                                            : ""
                                    }
                                    style={{float: "left"}}
                                    onClick={this._changeTab.bind(
                                        this,
                                        "hidden-nodes"
                                    )}
                                >
                                    <a>
                                        <Translate
                                            className="tab-title"
                                            content="settings.hidden_nodes"
                                        />
                                    </a>
                                </li>

                                <li
                                    style={{color: "blue"}}
                                    onClick={props.triggerModal.bind(this)}
                                    /*style={{
                                        cursor: "pointer",
                                        position: "absolute",
                                        right: 0,
                                        color: "#049cce",
                                        display: "inline-block",
                                        fontsize: 14,
                                        padding: "20px",
                                        top: "50%",
                                        height: 60,
                                        marginTop: -30
                                    }}*/
                                >
                                    <Translate
                                        id="add"
                                        component="span"
                                        content="settings.add_api"
                                    />
                                </li>
                            </ul>
                        </div>
                    </div>

                    {nodes.map(node => {
                        return renderNode(node, true);
                    })}
                </div>
            </div>
        );
    }
}

AccessSettings = connect(
    AccessSettings,
    {
        listenTo() {
            return [SettingsStore];
        },
        getProps() {
            return {
                currentNode: SettingsStore.getState().settings.get("apiServer"),
                activeNode: SettingsStore.getState().settings.get("activeNode"),
                apiLatencies: SettingsStore.getState().apiLatencies
            };
        }
    }
);

export default AccessSettings;

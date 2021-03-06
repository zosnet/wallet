import React from "react";
import Translate from "react-translate-component";
import Icon from "../../components/Icon/Icon";

function _getAvailableGateways(selectedAsset, boolCheck = "depositAllowed") {
    let {gatewayStatus} = this.state;

    for (let g in gatewayStatus) {
        gatewayStatus[g].enabled = false;
    }

    for (let g in gatewayStatus) {
        this.props.backedCoins.get(g.toUpperCase(), []).find(c => {
            if (
                g == "OPEN" &&
                selectedAsset == c.backingCoinType &&
                c[boolCheck] &&
                c.isAvailable
            ) {
                gatewayStatus.OPEN.enabled = true;
            }
            if (
                g == "RUDEX" &&
                selectedAsset == c.backingCoin &&
                c[boolCheck]
            ) {
                gatewayStatus.RUDEX.enabled = true;
            }
        });
    }

    return gatewayStatus;
}

function _getCoinToGatewayMapping(boolCheck = "depositAllowed") {
    let coinToGatewayMapping = {};

    this.props.backedCoins.forEach((gateway, gatewayName) => {
        gateway.forEach(coin => {
            // let symbol = coin.backingCoinType || coin.symbol;
            let symbolOnly = coin.symbol.split(".").pop();

            if (!coinToGatewayMapping[symbolOnly])
                coinToGatewayMapping[symbolOnly] = [];

            if (
                coin[boolCheck] &&
                (gateway == "OPEN" ? coin.isAvailable : true)
            )
                coinToGatewayMapping[symbolOnly].push(gatewayName);
        });
    });

    return coinToGatewayMapping;
}

function _openGatewaySite() {
    let {selectedGateway, gatewayStatus} = this.state;
    let win = window.open(gatewayStatus[selectedGateway].support_url, "_blank");
    win.focus();
}

function _getNumberAvailableGateways() {
    const {gatewayStatus, selectedAsset} = this.state;

    var nAvailableGateways = 0;
    for (let g in gatewayStatus) {
        this.props.backedCoins.get(g.toUpperCase(), []).find(c => {
            if (
                g == "OPEN" &&
                selectedAsset == c.backingCoinType &&
                c.depositAllowed &&
                c.isAvailable
            ) {
                nAvailableGateways++;
            }
            if (
                g == "RUDEX" &&
                selectedAsset == c.backingCoin &&
                c.depositAllowed
            ) {
                nAvailableGateways++;
            }
        });
    }

    return nAvailableGateways;
}

function _onAssetSelected(selectedAsset, boolCheck = "depositAllowed") {
    const {balances, assets} = this.props || {}; //Function must be bound on calling component and these props must be passed to calling component
    let gatewayStatus = _getAvailableGateways.call(
        this,
        selectedAsset,
        boolCheck
    );
    let selectedGateway = this.state.selectedGateway || null;
    let balancesByAssetAndGateway = {};

    if (balances && assets) {
        balances.forEach(balance => {
            if (balance && balance.toJS) {
                let asset = assets.get(balance.get("asset_type"));

                if (asset) {
                    let symbolSplit = asset.symbol.split(".");

                    if (symbolSplit.length == 2) {
                        let symbol = symbolSplit[1];
                        let gateway = symbolSplit[0];

                        if (!balancesByAssetAndGateway[symbol])
                            balancesByAssetAndGateway[symbol] = {};
                        balancesByAssetAndGateway[symbol][
                            gateway
                        ] = balance.get("balance");
                    }
                }
            }
        });
    }

    let {coinToGatewayMapping} = this.state;
    if (
        selectedAsset != this.state.selectedAsset &&
        coinToGatewayMapping &&
        coinToGatewayMapping[selectedAsset]
    ) {
        let gateways = coinToGatewayMapping[selectedAsset];
        if (gateways.length) {
            if (balancesByAssetAndGateway[selectedAsset]) {
                let greatestBalance = null;
                let greatestBalanceGateway = null;
                for (var gateway in balancesByAssetAndGateway[selectedAsset]) {
                    let balance =
                        balancesByAssetAndGateway[selectedAsset][gateway];

                    if (!greatestBalance) greatestBalance = balance;
                    if (!greatestBalanceGateway)
                        greatestBalanceGateway = gateway;
                }

                selectedGateway =
                    gateways[gateways.indexOf(greatestBalanceGateway)] ||
                    gateways[0];
            } else {
                selectedGateway = gateways[0];
            }
        }
    }

    this.setState({
        selectedAsset,
        selectedGateway,
        gatewayStatus
    });

    return {selectedAsset, selectedGateway};
}

function gatewaySelector(args) {
    let {
        selectedGateway,
        gatewayStatus,
        nAvailableGateways,
        error,
        onGatewayChanged
    } = args;

    return (
        <div className="container-row">
            <div className="no-margin no-padding">
                <section className="block-list">
                    <label className="left-label">
                        <Translate content="modal.deposit_withdraw.gateway" />
                        {selectedGateway ? (
                            <span style={{cursor: "pointer"}}>
                                &nbsp;<Icon
                                    name="question-circle"
                                    onClick={_openGatewaySite.bind(this)}
                                />
                            </span>
                        ) : null}
                        <span className="floatRight error-msg">
                            {selectedGateway &&
                            !gatewayStatus[selectedGateway].enabled ? (
                                <Translate content="modal.deposit_withdraw.disabled" />
                            ) : null}
                            {error ? (
                                <Translate content="modal.deposit_withdraw.wallet_error" />
                            ) : null}
                            {!selectedGateway && nAvailableGateways == 0 ? (
                                <Translate content="modal.deposit_withdraw.no_gateway_available" />
                            ) : null}
                        </span>
                    </label>

                    <div className="inline-label input-wrapper">
                        <select
                            role="combobox"
                            className="selectWrapper"
                            value={!selectedGateway ? "" : selectedGateway}
                            onChange={onGatewayChanged}
                            id="gatewaySelector"
                            style={{cursor: "default"}}
                        >
                            {!selectedGateway && nAvailableGateways != 0 ? (
                                <Translate
                                    component="option"
                                    value=""
                                    content="modal.deposit_withdraw.select_gateway"
                                />
                            ) : null}
                            {gatewayStatus.RUDEX.enabled ? (
                                <option value="RUDEX">
                                    {gatewayStatus.RUDEX.name}
                                </option>
                            ) : null}
                            {gatewayStatus.OPEN.enabled ? (
                                <option value="OPEN">
                                    {gatewayStatus.OPEN.name}
                                </option>
                            ) : null}
                        </select>
                        <Icon
                            name="chevron-down"
                            style={{
                                position: "absolute",
                                right: "10px",
                                top: "10px"
                            }}
                        />
                    </div>
                </section>
            </div>
        </div>
    );
}

export {
    _getAvailableGateways,
    gatewaySelector,
    _getNumberAvailableGateways,
    _onAssetSelected,
    _getCoinToGatewayMapping
};

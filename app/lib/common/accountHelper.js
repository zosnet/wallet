import {FetchChain} from "zosjs/es";
import {FeedPrice, Asset} from "./MarketClasses";

function checkMarginStatus(account) {
    return new Promise((res, rej) => {
        if (!account || (account && !account.get("call_orders", []).size))
            return res(null);

        FetchChain("getObject", account.get("call_orders").toArray())
            .then(call_orders => {
                let assets = [];
                call_orders.forEach(a => {
                    let baseId = a.getIn(["call_price", "base", "asset_id"]);
                    let quoteId = a.getIn(["call_price", "quote", "asset_id"]);
                    if (assets.indexOf(baseId) === -1) assets.push(baseId);
                    if (assets.indexOf(quoteId) === -1) assets.push(quoteId);
                });
                FetchChain("getAsset", assets).then(assets => {
                    let assetsMap = {};
                    assets.forEach(asset => {
                        assetsMap[asset.get("id")] = asset.toJS();
                    });
                    let status = {};
                    call_orders.forEach(co => {
                        let debtAsset =
                            assetsMap[
                                co.getIn(["call_price", "quote", "asset_id"])
                            ];
                        let collateralAsset =
                            assetsMap[
                                co.getIn(["call_price", "base", "asset_id"])
                            ];
                        let sp =
                            debtAsset.bitasset.current_feed.settlement_price;
                        if (sp.base.asset_id === sp.quote.asset_id) {
                            status[debtAsset.id] = {ratio: null};
                        } else {
                            let collateral = new Asset({
                                amount: co.get("collateral"),
                                asset_id: collateralAsset.id,
                                precision: collateralAsset.precision
                            });
                            let debt = new Asset({
                                amount: co.get("debt"),
                                asset_id: debtAsset.id,
                                precision: debtAsset.precision
                            });
                            let mr =
                                debtAsset.bitasset.current_feed
                                    .maintenance_collateral_ratio / 1000;
                            let price = new FeedPrice({
                                priceObject:
                                    debtAsset.bitasset.current_feed
                                        .settlement_price,
                                market_base:
                                    debtAsset.bitasset.current_feed
                                        .settlement_price.quote.asset_id,
                                sqr:
                                    debtAsset.bitasset.current_feed
                                        .maximum_short_squeeze_ratio,
                                assets: assetsMap
                            });
                            let current = {
                                ratio:
                                    collateral.getAmount({real: true}) /
                                    (debt.getAmount({real: true}) /
                                        price.toReal())
                            };
                            if (isNaN(current.ratio)) return null;
                            if (current.ratio < mr) {
                                current.statusClass = "danger";
                            } else if (current.ratio < mr + 0.5) {
                                current.statusClass = "warning";
                            } else {
                                current.statusClass = null;
                            }
                            status[debtAsset.id] = current;
                        }
                    });
                    res(status);
                });
            })
            .catch(rej);
    });
}

export {checkMarginStatus};

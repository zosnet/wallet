import React from "react";
import counterpart from "counterpart";
import utils from "common/utils";
import LinkToAccountById from "../Utility/LinkToAccountById";
import LinkToAssetById from "../Utility/LinkToAssetById";
import {Link} from "react-router/es";
import FormattedAsset from "../Utility/FormattedAsset";
import FormattedPrice from "../Utility/FormattedPrice";
import FormattedBitlenderOperation from "../Utility/FormattedBitlenderOperation";
import AssetName from "../Utility/AssetName";
import Translate from "react-translate-component";
import Icon from "../Icon/Icon";

/**
 *  Given a string and a list of interpolation parameters, this component
 *  will translate that string and replace the following:
 *
 *  account ids/names with links to accounts
 *  asset ids/names with links to assets
 *  amounts with fully formatted amounts with asset symbol
 *  prices with fully formatted prices with symbols
 *
 *  Expected Properties:
 *     string:  translation string key. Objects to interpolate should be wrapped in curly brackets: {amount}
 *     keys: array of objects to interpolate in the string.
 *         lookup goes by arg, which should match the name given inside the curly brackets in the translation string
 *         example:
 *         [{
 *             type: "account"|"amount"|"asset"|"price",
 *             value: "1.2.1"|{amount: 10, asset_id: "1.3.0"}|"1.3.1"|{base: {amount: 1, asset_id: "1.3.0"}, quote: {amount: 100, asset_id: "1.3.20"}}},
 *             arg: "account"|"amount"|"asset"|"price",
 *             decimalOffset: 1 (optional, only used for amounts)
 *         }
 *         ]
 *     params: object contaning simple strings to be interpolated using standard counterpart syntax: %(string)s
 *
 */

export default class TranslateWithLinks extends React.Component {
    shouldComponentUpdate(nextProps) {
        return !utils.are_equal_shallow(nextProps.keys, this.props.keys);
    }

    linkToAccount(name_or_id) {
        const {noLink} = this.props;
        if (!name_or_id) return <span>-</span>;
        return utils.is_object_id(name_or_id) ? (
            <LinkToAccountById account={name_or_id} noLink={noLink} />
        ) : noLink ? (
            <span>{name_or_id}</span>
        ) : (
            <Link to={`/account/${name_or_id}/overview`}>{name_or_id}</Link>
        );
    }

    linkToAsset(symbol_or_id) {
        const {noLink, noTip} = this.props;
        if (!symbol_or_id) return <span>-</span>;
        return utils.is_object_id(symbol_or_id) ? (
            <LinkToAssetById asset={symbol_or_id} noLink={noLink} />
        ) : noLink ? (
            <AssetName name={symbol_or_id} dataPlace="top" noTip={noTip} />
        ) : (
            <Link to={`/asset/${symbol_or_id}`}>
                <AssetName name={symbol_or_id} dataPlace="top" noTip={noTip} />
            </Link>
        );
    }

    linkToAssets(symbols_or_ids) {
        const {noLink, noTip} = this.props;
        if (!Array.isArray(symbols_or_ids) || !symbols_or_ids.length)
            return <span>-</span>;

        let assets = [];
        symbols_or_ids.forEach(symbol_or_id => {
            assets.push(
                utils.is_object_id(symbol_or_id) ? (
                    <LinkToAssetById
                        key={symbol_or_id}
                        asset={symbol_or_id}
                        noLink={noLink}
                    />
                ) : noLink ? (
                    <AssetName
                        key={symbol_or_id}
                        name={symbol_or_id}
                        dataPlace="top"
                        noTip={noTip}
                    />
                ) : (
                    <Link key={symbol_or_id} to={`/asset/${symbol_or_id}`}>
                        <AssetName
                            name={symbol_or_id}
                            dataPlace="top"
                            noTip={noTip}
                        />
                    </Link>
                )
            );
        });

        return assets;
    }

    render() {
        let {string, params, keys} = this.props;

        let text = counterpart.translate(string, params);
        let splitText = utils.get_translation_parts(text);
        //console.log("TranslateWithLinks:",text,splitText)
        /* example:
           text =Optionally, {restore_link} or create an account using the {restore_form}.
           splitText = ["Optionally, ", "restore_link", " or create an account using the ", "restore_form", "."]
           type = "link",
           arg = "restore_link"
        */

        keys.forEach(key => {
            if (splitText.indexOf(key.arg)) {
                let value;
                switch (key.type) {
                    case "account":
                        value = this.linkToAccount(key.value);
                        break;

                    case "amount":
                        value = (
                            <FormattedAsset
                                amount={key.value.amount}
                                asset={key.value.asset_id}
                                decimalOffset={key.decimalOffset}
                            />
                        );
                        break;

                    case "price":
                        value = (
                            <FormattedPrice
                                base_asset={key.value.base.asset_id}
                                base_amount={key.value.base.amount}
                                quote_asset={key.value.quote.asset_id}
                                quote_amount={key.value.quote.amount}
                            />
                        );
                        break;

                    case "asset":
                        value = this.linkToAsset(key.value);
                        break;

                    case "assets":
                        value = this.linkToAssets(key.value);
                        break;

                    case "translate":
                        value = <Translate content={key.value} />;
                        break;

                    case "link":
                        value = (
                            <Link
                                to={key.value}
                                data-intro={
                                    key.dataIntro ? key.dataIntro : null
                                }
                                onClick={key.onClick ? key.onClick : null}
                            >
                                <Translate content={key.translation} />
                            </Link>
                        );
                        break;

                    case "icon":
                        value = (
                            <Icon className={key.className} name={key.value} />
                        );
                        break;

                    case "bitlender":
                        value = (
                            <FormattedBitlenderOperation opertion={key.value} />
                        );
                        break;

                    default:
                        value = key.value;
                        break;
                }

                splitText[splitText.indexOf(key.arg)] = value;
            }
        });

        let finalText = splitText.map((text, index) => {
            return <span key={index}>{text}</span>;
        });

        return <span>{finalText}</span>;
    }
}

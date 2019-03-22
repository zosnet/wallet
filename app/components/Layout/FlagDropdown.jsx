import React from "react";
import {connect} from "alt-react";
import Translate from "react-translate-component";
import ActionSheet from "react-foundation-apps/src/action-sheet";
import SettingsStore from "stores/SettingsStore";
import IntlActions from "actions/IntlActions";

const FlagImage = ({flag, width = 35, height = 35}) => {
    return (
        <img
            height={height}
            width={width}
            src={`${__BASE_URL__}language-dropdown/${flag.toUpperCase()}.png`}
        />
    );
};

class FlagDropdown extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            locales: SettingsStore.getState().defaults.locale,
            currentLocale: SettingsStore.getState().settings.get("locale")
        };
    }

    SwitchLocaleClick(locale, e) {
        e.preventDefault();
        IntlActions.switchLocale(locale);
        this.setState({
            currentLocale: locale
        });
    }

    render() {
        const translator = require("counterpart");
        const flagDropdown = (
            <ActionSheet>
                <ActionSheet.Button title="">
                    <a className="arrow-down">
                        <FlagImage flag={this.state.currentLocale} />
                    </a>
                </ActionSheet.Button>
                <ActionSheet.Content>
                    <ul className="no-first-element-top-border">
                        {this.state.locales.map(locale => {
                            return (
                                <li key={locale}>
                                    <a
                                        href
                                        onClick={this.SwitchLocaleClick.bind(
                                            this,
                                            locale
                                        )}
                                    >
                                        <div className="table-cell">
                                            <FlagImage
                                                width="20"
                                                height="20"
                                                flag={locale}
                                            />
                                        </div>
                                        <div
                                            className="table-cell"
                                            style={{paddingLeft: 10}}
                                        >
                                            <Translate
                                                content={"languages." + locale}
                                            />
                                        </div>
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                </ActionSheet.Content>
            </ActionSheet>
        );

        return (
            <div
                style={{margin: "0 auto"}}
                data-intro={translator.translate("walkthrough.language_flag")}
            >
                {flagDropdown}
            </div>
        );
    }
}

export default FlagDropdown;

import React from "react";
import {connect} from "alt-react";
import AccountStore from "stores/AccountStore";
import {Link} from "react-router/es";
import Translate from "react-translate-component";
import TranslateWithLinks from "./Utility/TranslateWithLinks";
import {isIncognito} from "feature_detect";
import SettingsActions from "actions/SettingsActions";
import WalletUnlockActions from "actions/WalletUnlockActions";

var logo = require("assets/logo-ico-blue.png");

class LoginSelector extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            step: 1,
            //walletFlag用来控制当前界面显示:（钱包模式/账户模式) 的创建界面
            walletFlag: this.props.location
                ? this.props.location.pathname.endsWith("wallet")
                : false
        };
    }

    /*componentDidUpdate() {
        const myAccounts = AccountStore.getMyAccounts();

        // use ChildCount to make sure user is on /create-account page except /create-account/!*
        // to prevent redirect when user just registered and need to make backup of wallet or password
        const childCount = React.Children.count(this.props.children);

        // do redirect to portfolio if user already logged in
        if (
            Array.isArray(myAccounts) &&
            myAccounts.length !== 0 &&
            childCount === 0
        )
            this.props.router.push("/account/" + this.props.currentAccount);
    }*/

    componentDidMount() {
        //console.log("componentDidMount")
        this.scrollIntoView();
    }

    scrollIntoView() {
        // if (this.props.children) {
        //     //console.log(this.el);
        //     this.el.scrollIntoView(true, {behavior: "smooth"});
        // }
    }

    componentWillMount() {
        isIncognito(incognito => {
            this.setState({incognito});
        });
    }

    onSelect(route) {
        this.props.router.push("/create-account/" + route);
    }

    _createWithLocal() {
        this.setState({walletFlag: false});
        this.scrollIntoView();
    }

    _toggleWalletFlag(falg) {
        this.setState({walletFlag: !this.state.walletFlag});
        this.scrollIntoView();
    }
    renderS() {
        const translator = require("counterpart");
        //const childCount = React.Children.count(this.props.children);
        const cloudOrLocal = this.state.walletFlag ? "cloud" : "local";

        return (
            <div>
                <div>
                    <Translate content="header.create_account" component="h4" />
                </div>

                <div>
                    <Translate
                        content="account.intro_text_title"
                        component="h4"
                    />
                    <Translate
                        unsafe
                        content="account.intro_text_1"
                        component="p"
                    />
                </div>

                <div className="grid-block account-login-options">
                    <Link
                        to="/create-account/password"
                        className="button primary"
                        data-intro={translator.translate(
                            "walkthrough.create_cloud_wallet"
                        )}
                        onClick={this._createWithLocal.bind(this)}
                    >
                        <Translate content="header.create_account" />
                    </Link>

                    <span
                        className="button hollow primary"
                        onClick={() => {
                            SettingsActions.changeSetting({
                                setting: "passwordLogin",
                                value: true
                            });
                            WalletUnlockActions.unlock.defer();
                        }}
                    >
                        <Translate content="header.unlock_short" />
                    </span>
                </div>
                {/*设置一个ref(在react vDom中可以引用),当有children 页面是,页面顶部滑动到此ref*/}
                <div
                    ref={el => {
                        this.el = el;
                    }}
                />

                <div className="additional-account-options">
                    <h5 style={{textAlign: "center"}}>
                        {/*{optionally}*/}
                        <TranslateWithLinks
                            string="account.optional.formatter"
                            params={{restore_from: cloudOrLocal}}
                            keys={[
                                {
                                    type: "link",
                                    value: "/wallet/backup/restore",
                                    translation:
                                        "account.optional.restore_link",
                                    dataIntro: translator.translate(
                                        "walkthrough.restore_account"
                                    ),
                                    arg: "restore_link"
                                },
                                {
                                    type: "link",
                                    value: `/create-account/${
                                        !this.state.walletFlag
                                            ? "wallet"
                                            : "password"
                                    }`,
                                    translation: `account.optional.${cloudOrLocal}`,
                                    dataIntro: translator.translate(
                                        "walkthrough.create_local_wallet"
                                    ),
                                    onClick: this._toggleWalletFlag.bind(this),
                                    arg: cloudOrLocal
                                }
                            ]}
                        />
                    </h5>
                </div>
            </div>
        );
    }

    render() {
        const translator = require("counterpart");

        const childCount = React.Children.count(this.props.children) <= 0;
        const cloudOrLocal = this.state.walletFlag ? "cloud" : "local";

        return (
            <div className="grid-block align-center">
                <div className="grid-block shrink vertical">
                    <div className="grid-content shrink text-center account-creation">
                        {/*<div>
                            <img src={logo} />
                        </div>*/}
                        {childCount ? this.renderS() : this.props.children}
                    </div>
                </div>
            </div>
        );
    }
}

export default connect(
    LoginSelector,
    {
        listenTo() {
            return [AccountStore];
        },
        getProps() {
            return {
                currentAccount:
                    AccountStore.getState().currentAccount ||
                    AccountStore.getState().passwordAccount
            };
        }
    }
);

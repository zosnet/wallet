import React from "react";
import {connect} from "alt-react";
import classNames from "classnames";
import AccountActions from "actions/AccountActions";
import AccountStore from "stores/AccountStore";
import AccountNameInput from "./../Forms/AccountNameInput";
import PasswordInput from "./../Forms/PasswordInput";
import WalletDb from "stores/WalletDb";
import notify from "actions/NotificationActions";
import {Link} from "react-router/es";
import AccountSelect from "../Forms/AccountSelect";
import AccountSelector from "../Account/AccountSelector";
import WalletUnlockActions from "actions/WalletUnlockActions";
import TransactionConfirmStore from "stores/TransactionConfirmStore";
import LoadingIndicator from "../LoadingIndicator";
import WalletActions from "actions/WalletActions";
import Translate from "react-translate-component";
import {ChainStore, FetchChain} from "zosjs/es";
import {BackupCreate} from "../Wallet/Backup";
import ReactTooltip from "react-tooltip";
import utils from "common/utils";
import SettingsActions from "actions/SettingsActions";
import counterpart from "counterpart";
import MyCaptcha from "./../Forms/MyCaptcha"; //验证码

class CreateAccount extends React.Component {
    constructor() {
        super();
        this.state = {
            validAccountName: false,
            registrarInputValid: false,
            accountName: "",
            validPassword: false,
            registrar_account: null,
            captchaCode: "",
            advanced_account_registrar: "",
            loading: false,
            hide_refcode: true,
            show_identicon: false,
            step: 1
        };
        this.onFinishConfirm = this.onFinishConfirm.bind(this);

        this.accountNameInput = null;
        this.captchaCodeInput = null;
    }

    componentWillMount() {
        SettingsActions.changeSetting({
            setting: "passwordLogin",
            value: false
        });
    }

    componentDidMount() {
        ReactTooltip.rebuild();
    }

    shouldComponentUpdate(nextProps, nextState) {
        return !utils.are_equal_shallow(nextState, this.state);
    }

    isValid() {
        let firstAccount = true; //AccountStore.getMyAccounts().length === 0;
        let valid = this.state.validAccountName;
        if (!WalletDb.getWallet()) {
            valid = valid && this.state.validPassword;
        }
        //如果是第一次并且为靓号模式
        if (firstAccount && this.state.is_advanced_name) {
            valid = valid && this.state.registrarInputValid;
        }
        //如果不是第一次
        if (!firstAccount) {
            valid = valid && this.state.registrar_account;
        }
        return valid;
    }

    onAccountNameChange(e) {
        const state = {};
        if (e.valid !== undefined) state.validAccountName = e.valid;
        if (e.value !== undefined) state.accountName = e.value;
        if (e.is_advanced_name !== undefined)
            state.is_advanced_name = e.is_advanced_name;
        if (!this.state.show_identicon) state.show_identicon = true;
        this.setState(state);
    }

    onAdvancedRegistrarChanged(registrarInputName) {
        //console.log("RegistrarInputName:",registrarInputName)
        const state = {};
        state.advanced_account_registrar = registrarInputName;
        state.registrarInput_error = "";
        state.registrarInputValid = false;
        this.setState(state);
    }

    onAdvancedRegistrarSelected(e) {
        //console.log("onAdvancedRegistrarChange:",e)
        const state = {};
        state.advanced_account_registrar = e.get("name");
        let error = this._isAdvanceRegistrar(e.get("name"));
        state.registrarInput_error = error;
        state.registrarInputValid = error ? false : true;
        this.setState(state);
    }

    _isAdvanceRegistrar(account_name) {
        let flag = 0x01000000;
        let error = "";
        let accountObj = ChainStore.getAccount(account_name, false);
        let uaccount_property;
        if (accountObj) {
            uaccount_property = accountObj.getIn(["uaccount_property"]);
        }
        //判断是否靓号付费人
        if ((uaccount_property & flag) === flag) {
            error = "";
        } else {
            error = counterpart.translate(
                "account.name_input.name_not_payfor_premium"
            );
        }
        //console.log("_isAdvanceRegistrar:",error)
        return error;
    }

    onPasswordChange(e) {
        this.setState({validPassword: e.valid});
    }

    onCaptchaCodeChange(e) {
        const state = {};
        if (e.value !== undefined) state.captchaCode = e.value;
        this.setState(state);
    }

    onFinishConfirm(confirm_store_state) {
        if (
            confirm_store_state.included &&
            confirm_store_state.broadcasted_transaction
        ) {
            TransactionConfirmStore.unlisten(this.onFinishConfirm);
            TransactionConfirmStore.reset();

            FetchChain("getAccount", this.state.accountName, undefined, {
                [this.state.accountName]: true
            }).then(() => {
                this.props.router.push("/wallet/backup/create?newAccount=true");
            });
        }
    }

    //新增：验证码 captchacode、验证码 captchaid （by dylan）
    createAccount(name, captcha, captchaid) {
        let refcode = this.refs.refcode ? this.refs.refcode.value() : null;
        let referralAccount = AccountStore.getState().referralAccount;
        WalletUnlockActions.unlock()
            .then(() => {
                //this.setState({loading: true});

                AccountActions.createAccount(
                    name,
                    this.state.registrar_account,
                    referralAccount || this.state.registrar_account,
                    0,
                    refcode,
                    captcha,
                    captchaid,
                    this.state.advanced_account_registrar
                )
                    .then(() => {
                        // User registering his own account
                        if (this.state.registrar_account) {
                            FetchChain("getAccount", name, undefined, {
                                [name]: true
                            }).then(() => {
                                this.setState({
                                    step: 2,
                                    loading: false
                                });
                            });
                            TransactionConfirmStore.listen(
                                this.onFinishConfirm
                            );
                        } else {
                            if (this.state.advanced_account_registrar) {
                                console.log(
                                    "Advanced_account_registrar SUCCESS"
                                );
                                notify.success({
                                    message: counterpart.translate(
                                        "account.advanced_regist.success"
                                    ),
                                    autoDismiss: 10
                                });
                                this.setState({loading: false});
                                this.props.router.push("/explorer/blocks");
                            } else {
                                // Account registered by the faucet
                                FetchChain("getAccount", name, undefined, {
                                    [name]: true
                                }).then(() => {
                                    this.setState({
                                        step: 2,
                                        loading: false
                                    });
                                });
                            }
                        }
                    })
                    .catch(error => {
                        console.log(
                            "ERROR AccountActions.createAccount",
                            error
                        );
                        if (error.code && error.code >= 1 && error.code <= 7) {
                            let errorMsg =
                                "account.advanced_regist.error_" + error.code;
                            console.log("errorMsg", errorMsg);
                            notify.addNotification({
                                message: counterpart.translate(errorMsg),
                                level: "error",
                                autoDismiss: 10
                            });
                        } else {
                            let error_msg =
                                error.base &&
                                error.base.length &&
                                error.base.length > 0
                                    ? error.base[0]
                                    : "unknown error";
                            if (error.remote_ip) error_msg = error.remote_ip[0];
                            notify.addNotification({
                                message: `Failed to create account: ${name} - ${error_msg}`,
                                level: "error",
                                autoDismiss: 10
                            });
                        }
                        this.setState({loading: false});
                    });
            })
            .catch(() => {});
    }

    createWallet(password) {
        return WalletActions.setWallet(
            "default", //wallet name
            password
        )
            .then(() => {
                console.log(
                    "Congratulations, your wallet was successfully created."
                );
            })
            .catch(err => {
                console.log("CreateWallet failed:", err);
                notify.addNotification({
                    message: `Failed to create wallet: ${err}`,
                    level: "error",
                    autoDismiss: 10
                });
            });
    }

    onSubmit(e) {
        e.preventDefault();
        if (!this.isValid()) return;
        let account_name = this.accountNameInput.getValue();
        let captchacode = this.captchaCodeInput
            ? this.captchaCodeInput.getValue()
            : null;
        let captchaid = this.captchaCodeInput
            ? this.captchaCodeInput.getCaptchaid()
            : null;
        if (WalletDb.getWallet()) {
            this.createAccount(account_name, captchacode, captchaid);
        } else {
            let password = this.refs.password.value();
            this.createWallet(password).then(() =>
                this.createAccount(account_name, captchacode, captchaid)
            );
        }
    }

    onRegistrarAccountChange(registrar_account) {
        this.setState({registrar_account});
    }

    // showRefcodeInput(e) {
    //     e.preventDefault();
    //     this.setState({hide_refcode: false});
    // }

    _renderAccountCreateForm() {
        let {registrar_account, advanced_account_registrar} = this.state;

        let my_accounts = AccountStore.getMyAccounts();
        let firstAccount = true; //my_accounts.length === 0;
        let hasWallet = WalletDb.getWallet();
        let valid = this.isValid();
        let isLTM = false;
        let registrar = registrar_account
            ? ChainStore.getAccount(registrar_account)
            : null;
        if (registrar) {
            if (registrar.get("lifetime_referrer") == registrar.get("id")) {
                isLTM = true;
            }
        }

        //靓号:填写靓号付费账户
        let advancedAccountInput = null;
        if (this.state.is_advanced_name) {
            advancedAccountInput = (
                <div style={{padding: "1rem 0"}}>
                    <AccountSelector
                        label="account.pay_from"
                        accountName={advanced_account_registrar}
                        onChange={this.onAdvancedRegistrarChanged.bind(this)}
                        onAccountChanged={this.onAdvancedRegistrarSelected.bind(
                            this
                        )}
                        hideImage={true}
                        error={this.state.registrarInput_error}
                        account={advanced_account_registrar}
                        size={60}
                    />
                </div>
            );
        }

        let buttonClass = classNames("submit-button button no-margin", {
            disabled:
                !valid || (registrar_account && !advancedAccountInput && !isLTM)
        });

        return (
            <form
                style={{maxWidth: "40rem"}}
                onSubmit={this.onSubmit.bind(this)}
                noValidate
            >
                <p
                    style={{
                        fontWeight: "normal",
                        fontFamily: "Roboto-Medium, arial, sans-serif",
                        fontStyle: "normal"
                    }}
                >
                    {firstAccount ? (
                        <Translate content="wallet.create_w_a" />
                    ) : (
                        <Translate content="wallet.create_a" />
                    )}
                </p>
                <AccountNameInput
                    ref={ref => {
                        if (ref) {
                            this.accountNameInput = ref.refs.nameInput;
                        }
                    }}
                    enableAdvanceName={true}
                    onChange={this.onAccountNameChange.bind(this)}
                    accountShouldNotExist={true}
                    placeholder={counterpart.translate("wallet.account_public")}
                    noLabel
                />

                {firstAccount ? ( //首次注册,使用水龙头，需要验证吗
                    <MyCaptcha
                        ref={ref => {
                            if (ref) {
                                this.captchaCodeInput = ref.refs.codeInput;
                            }
                        }}
                        onChange={this.onCaptchaCodeChange.bind(this)}
                    />
                ) : null}

                {/* Only ask for password if a wallet already exists */}
                {!!hasWallet ? null : (
                    <PasswordInput
                        ref="password"
                        confirmation={true}
                        onChange={this.onPasswordChange.bind(this)}
                        noLabel
                        checkStrength
                    />
                )}

                {firstAccount && advancedAccountInput //如果是第一次并且是靓号,则填写靓号付费账户
                    ? advancedAccountInput
                    : null}

                {/* If this is not the first account, show dropdown for fee payment account
                  如果不是第一次创建账户,则需要付费账户付费*/}
                {!firstAccount ? (
                    <div className="full-width-content form-group no-overflow">
                        <label>
                            <Translate content="account.pay_from" />
                        </label>
                        <AccountSelect
                            account_names={my_accounts}
                            onChange={this.onRegistrarAccountChange.bind(this)}
                        />
                        {/*不是靓号则需要终身会员身份(如果是靓号直接用自己的账户付费需要需要终身会员身份)*/}
                        {registrar_account &&
                        !advancedAccountInput &&
                        !isLTM ? (
                            <div
                                style={{textAlign: "left"}}
                                className="facolor-error"
                            >
                                <Translate content="wallet.must_be_ltm" />
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <div className="divider" />

                {/* Submit button */}
                {this.state.loading ? (
                    <LoadingIndicator type="three-bounce" />
                ) : (
                    <button style={{width: "100%"}} className={buttonClass}>
                        <Translate content="account.create_account" />
                    </button>
                )}

                {/* Backup restore option */}
                <div style={{paddingTop: 40}}>
                    <label>
                        <Link to="/existing-account">
                            <Translate content="wallet.restore" />
                        </Link>
                    </label>

                    <label>
                        <Link to="/create-wallet-brainkey">
                            <Translate content="settings.backup_brainkey" />
                        </Link>
                    </label>
                </div>

                {/* Skip to step 3 */}
                {!hasWallet || firstAccount ? null : (
                    <div style={{paddingTop: 20}}>
                        <label>
                            <a
                                onClick={() => {
                                    this.setState({step: 3});
                                }}
                            >
                                <Translate content="wallet.go_get_started" />
                            </a>
                        </label>
                    </div>
                )}
            </form>
        );
    }

    _renderAccountCreateText() {
        let hasWallet = WalletDb.getWallet();
        let my_accounts = AccountStore.getMyAccounts();
        let firstAccount = true; //my_accounts.length === 0;

        return (
            <div className="confirm-checks">
                <h4
                    style={{
                        fontWeight: "normal",
                        fontFamily: "Roboto-Medium, arial, sans-serif",
                        fontStyle: "normal",
                        paddingBottom: 15,
                        marginTop: 0
                    }}
                >
                    <Translate content="wallet.wallet_browser" />
                </h4>

                <p>
                    {!hasWallet ? (
                        <Translate content="wallet.has_wallet" />
                    ) : null}
                </p>

                <Translate
                    style={{textAlign: "left"}}
                    component="p"
                    content="wallet.create_account_text"
                />

                {firstAccount ? (
                    <Translate
                        style={{textAlign: "left"}}
                        component="p"
                        content="wallet.first_account_paid"
                    />
                ) : (
                    <Translate
                        style={{textAlign: "left"}}
                        component="p"
                        content="wallet.not_first_account"
                    />
                )}

                {/* {this.state.hide_refcode ? null :
                    <div>
                        <RefcodeInput ref="refcode" label="refcode.refcode_optional" expandable={true}/>
                        <br/>
                    </div>
                } */}
            </div>
        );
    }

    _renderBackup() {
        return (
            <div className="backup-submit">
                <p>
                    <Translate unsafe content="wallet.wallet_crucial" />
                </p>
                <div className="divider" />
                <BackupCreate noText downloadCb={this._onBackupDownload} />
            </div>
        );
    }

    _onBackupDownload = () => {
        this.setState({
            step: 3
        });
    };

    _renderBackupText() {
        return (
            <div>
                <p
                    style={{
                        fontWeight: "normal",
                        fontFamily: "Roboto-Medium, arial, sans-serif",
                        fontStyle: "normal"
                    }}
                >
                    <Translate content="footer.backup" />
                </p>
                <p>
                    <Translate content="wallet.wallet_move" unsafe />
                </p>
                <p className="txtlabel warning">
                    <Translate unsafe content="wallet.wallet_lose_warning" />
                </p>
            </div>
        );
    }

    _renderGetStarted() {
        return (
            <div>
                <table className="table">
                    <tbody>
                        <tr>
                            <td>
                                <Translate content="wallet.tips_dashboard" />:
                            </td>
                            <td>
                                <Link to="/dashboard">
                                    <Translate content="header.dashboard" />
                                </Link>
                            </td>
                        </tr>

                        <tr>
                            <td>
                                <Translate content="wallet.tips_account" />:
                            </td>
                            <td>
                                <Link
                                    to={`/account/${
                                        this.state.accountName
                                    }/overview`}
                                >
                                    <Translate content="wallet.link_account" />
                                </Link>
                            </td>
                        </tr>

                        {/* <tr>
                            <td>
                                <Translate content="wallet.tips_deposit" />:
                            </td>
                            <td>
                                <Link to="/deposit-withdraw">
                                    <Translate content="wallet.link_deposit" />
                                </Link>
                            </td>
                        </tr>*/}

                        <tr>
                            <td>
                                <Translate content="wallet.tips_transfer" />:
                            </td>
                            <td>
                                <Link to="/transfer">
                                    <Translate content="wallet.link_transfer" />
                                </Link>
                            </td>
                        </tr>

                        <tr>
                            <td>
                                <Translate content="wallet.tips_settings" />:
                            </td>
                            <td>
                                <Link to="/settings">
                                    <Translate content="header.settings" />
                                </Link>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }

    _renderGetStartedText() {
        return (
            <div>
                <p
                    style={{
                        fontWeight: "normal",
                        fontFamily: "Roboto-Medium, arial, sans-serif",
                        fontStyle: "normal"
                    }}
                >
                    <Translate content="wallet.congrat" />
                </p>

                <p>
                    <Translate content="wallet.tips_explore" />
                </p>

                <p>
                    <Translate content="wallet.tips_header" />
                </p>

                <p className="txtlabel warning">
                    <Translate content="wallet.tips_login" />
                </p>
            </div>
        );
    }

    render() {
        let {step} = this.state;

        return (
            <div className="sub-content">
                <div style={{maxWidth: "95vw"}}>
                    {step !== 1 ? (
                        <p
                            style={{
                                fontWeight: "normal",
                                fontFamily: "Roboto-Medium, arial, sans-serif",
                                fontStyle: "normal"
                            }}
                        >
                            <Translate content={"wallet.step_" + step} />
                        </p>
                    ) : null}

                    {step === 1
                        ? this._renderAccountCreateForm()
                        : step === 2
                            ? this._renderBackup()
                            : this._renderGetStarted()}
                </div>

                <div style={{maxWidth: "95vw", paddingTop: "2rem"}}>
                    {step === 1
                        ? this._renderAccountCreateText()
                        : step === 2
                            ? this._renderBackupText()
                            : this._renderGetStartedText()}
                </div>
                <Link to="/dashboard">
                    <button className="button primary hollow">
                        <Translate content="wallet.back" />
                    </button>
                </Link>
            </div>
        );
    }
}

export default connect(
    CreateAccount,
    {
        listenTo() {
            return [AccountStore];
        },
        getProps() {
            return {};
        }
    }
);

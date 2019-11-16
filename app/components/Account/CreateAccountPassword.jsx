import React from "react";
import {connect} from "alt-react";
import classNames from "classnames";
import AccountActions from "actions/AccountActions";
import AccountStore from "stores/AccountStore";
import AccountNameInput from "./../Forms/AccountNameInput";
import AccountSelector from "../Account/AccountSelector";
import MyCaptcha from "./../Forms/MyCaptcha";
import WalletDb from "stores/WalletDb";
import notify from "actions/NotificationActions";
import {Link} from "react-router/es";
import AccountSelect from "../Forms/AccountSelect";
import TransactionConfirmStore from "stores/TransactionConfirmStore";
import LoadingIndicator from "../LoadingIndicator";
import Translate from "react-translate-component";
import counterpart from "counterpart";
import {ChainStore, FetchChain, key} from "zosjs/es";
import ReactTooltip from "react-tooltip";
import utils from "common/utils";
import SettingsActions from "actions/SettingsActions";
import WalletUnlockActions from "actions/WalletUnlockActions";
import Icon from "../Icon/Icon";
import CopyButton from "../Utility/CopyButton";
import {ChainValidation} from "zosjs/es";

class CreateAccountPassword extends React.Component {
    static contextTypes = {
        router: React.PropTypes.object.isRequired
    };

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
            step: 1,
            showPass: false,
            generatedPassword: ("P" + key.get_random_key().toWif()).substr(
                0,
                45
            ),
            confirm_password: "",
            understand_1: false,
            understand_2: false,
            understand_3: false
        };
        this.onFinishConfirm = this.onFinishConfirm.bind(this);

        this.accountNameInput = null;
        this.captchaCodeInput = null;
    }

    componentWillMount() {
        if (!WalletDb.getWallet()) {
            SettingsActions.changeSetting({
                setting: "passwordLogin",
                value: true
            });
        }
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

        return valid && this.state.understand_1 && this.state.understand_2;
    }

    onAccountNameChange(e) {
        //console.log("onAccountNameChange:",e)
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

    _unlockAccount(name, password) {
        SettingsActions.changeSetting({
            setting: "passwordLogin",
            value: true
        });

        WalletDb.validatePassword(password, true, name);
        WalletUnlockActions.checkLock.defer();
    }

    createAccount(name, password, captcha, captchaid) {
        let refcode = this.refs.refcode ? this.refs.refcode.value() : null;
        let referralAccount = AccountStore.getState().referralAccount;
        //this.setState({loading: true});

        AccountActions.createAccountWithPassword(
            name,
            password,
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
                        this._unlockAccount(name, password);
                        AccountActions.setPasswordAccount(name);
                    });
                    TransactionConfirmStore.listen(this.onFinishConfirm);
                } else {
                    if (this.state.advanced_account_registrar) {
                        console.log("Advanced_account_registrar SUCCESS");
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
                                step: 2
                            });
                            this._unlockAccount(name, password);
                            AccountActions.setPasswordAccount(name);
                        });
                    }
                }
            })
            .catch(error => {
                console.log("ERROR AccountActions.createAccount", error);
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
                        error.base && error.base.length && error.base.length > 0
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
        // return false;
        // if (WalletDb.getWallet()) {
        //     this.createAccount(account_name);
        // } else {
        let password = this.state.generatedPassword;
        this.createAccount(account_name, password, captchacode, captchaid);
    }

    onRegistrarAccountChange(registrar_account) {
        this.setState({registrar_account});
    }

    // showRefcodeInput(e) {
    //     e.preventDefault();
    //     this.setState({hide_refcode: false});
    // }

    _onInput(value, e) {
        this.setState({
            [value]:
                value === "confirm_password"
                    ? e.target.value
                    : !this.state[value],
            validPassword:
                value === "confirm_password"
                    ? e.target.value === this.state.generatedPassword
                    : this.state.validPassword
        });
    }

    _renderAccountCreateForm() {
        let {registrar_account, advanced_account_registrar} = this.state;

        let my_accounts = AccountStore.getMyAccounts();
        let firstAccount = true; //my_accounts.length === 0;
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
            <div style={{textAlign: "left"}}>
                <form
                    style={{maxWidth: "60rem"}}
                    onSubmit={this.onSubmit.bind(this)}
                    noValidate
                >
                    <AccountNameInput
                        ref={ref => {
                            if (ref) {
                                this.accountNameInput = ref.refs.nameInput;
                            }
                        }}
                        initial_value=""
                        enableAdvanceName={true}
                        onChange={this.onAccountNameChange.bind(this)}
                        accountShouldNotExist={true}
                        placeholder={counterpart.translate(
                            "wallet.account_public"
                        )}
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

                    <section>
                        <label className="left-label">
                            <Translate content="wallet.generated" />
                            &nbsp;&nbsp;
                            {/* data-html={true} -> data-html={false} */}
                            <span
                                className="tooltip"
                                data-html={false}
                                data-tip={counterpart.translate(
                                    "tooltip.generate"
                                )}
                            >
                                <Icon name="question-circle" />
                            </span>
                        </label>
                        <div style={{paddingBottom: "0.5rem"}}>
                            <span
                                className="inline-label"
                                style={{
                                    marginBottom: "1rem"
                                }}
                            >
                                <input
                                    style={{
                                        maxWidth: "calc(30rem - 48px)",
                                        fontSize: "80%"
                                    }}
                                    disabled
                                    value={this.state.generatedPassword}
                                    type="text"
                                    className="input-button"
                                />
                                <CopyButton
                                    text={this.state.generatedPassword}
                                    tip="tooltip.copy_password"
                                    dataPlace="top"
                                />
                            </span>
                        </div>
                    </section>

                    <section>
                        <label className="left-label">
                            <Translate content="wallet.confirm_password" />
                        </label>
                        <input
                            type="password"
                            name="password"
                            id="password"
                            value={this.state.confirm_password}
                            onChange={this._onInput.bind(
                                this,
                                "confirm_password"
                            )}
                        />
                        {this.state.confirm_password &&
                        this.state.confirm_password !==
                            this.state.generatedPassword ? (
                            <div className="has-error">
                                <Translate content="wallet.confirm_error" />
                            </div>
                        ) : null}
                    </section>

                    {firstAccount && advancedAccountInput //如果是第一次并且是靓号,则填写靓号付费账户
                        ? advancedAccountInput
                        : null}

                    <br />

                    <div
                        className="confirm-checks"
                        onClick={this._onInput.bind(this, "understand_3")}
                    >
                        <label
                            htmlFor="checkbox-1"
                            style={{position: "relative"}}
                        >
                            <input
                                type="checkbox"
                                id="checkbox-1"
                                onChange={() => {}}
                                checked={this.state.understand_3}
                                style={{
                                    position: "absolute",
                                    top: "-5px",
                                    left: "0"
                                }}
                            />
                            <div style={{paddingLeft: "30px"}}>
                                <Translate content="wallet.understand_3" />
                            </div>
                        </label>
                    </div>
                    <br />
                    <div
                        className="confirm-checks"
                        onClick={this._onInput.bind(this, "understand_1")}
                    >
                        <label
                            htmlFor="checkbox-2"
                            style={{position: "relative"}}
                        >
                            <input
                                type="checkbox"
                                id="checkbox-2"
                                onChange={() => {}}
                                checked={this.state.understand_1}
                                style={{
                                    position: "absolute",
                                    top: "-5px",
                                    left: "0"
                                }}
                            />
                            <div style={{paddingLeft: "30px"}}>
                                <Translate content="wallet.understand_1" />
                            </div>
                        </label>
                    </div>
                    <br />

                    <div
                        className="confirm-checks"
                        style={{paddingBottom: "1.5rem"}}
                        onClick={this._onInput.bind(this, "understand_2")}
                    >
                        <label
                            htmlFor="checkbox-3"
                            style={{position: "relative"}}
                        >
                            <input
                                type="checkbox"
                                id="checkbox-3"
                                onChange={() => {}}
                                checked={this.state.understand_2}
                                style={{
                                    position: "absolute",
                                    top: "-5px",
                                    left: "0"
                                }}
                            />
                            <div style={{paddingLeft: "30px"}}>
                                <Translate content="wallet.understand_2" />
                            </div>
                        </label>
                    </div>
                    {/* If this is not the first account, show dropdown for fee payment account
                      如果不是第一次创建账户,则需要付费账户付费*/}
                    {!firstAccount ? (
                        <div className="full-width-content form-group no-overflow">
                            <label>
                                <Translate content="account.pay_from" />
                            </label>
                            <AccountSelect
                                account_names={my_accounts}
                                onChange={this.onRegistrarAccountChange.bind(
                                    this
                                )}
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

                    {/* Submit button */}
                    {this.state.loading ? (
                        <LoadingIndicator type="three-bounce" />
                    ) : (
                        <button style={{width: "100%"}} className={buttonClass}>
                            <Translate content="account.create_account" />
                        </button>
                    )}

                    {/* Backup restore option */}
                    {/* <div style={{paddingTop: 40}}>
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
                </div> */}

                    {/* Skip to step 3 */}
                    {/* {(!hasWallet || firstAccount ) ? null :<div style={{paddingTop: 20}}>
                    <label>
                        <a onClick={() => {this.setState({step: 3});}}><Translate content="wallet.go_get_started" /></a>
                    </label>
                </div>} */}
                </form>
                {/* <br />
                <p>
                    <Translate content="wallet.bts_rules" unsafe />
                </p> */}
            </div>
        );
    }

    _renderAccountCreateText() {
        let my_accounts = AccountStore.getMyAccounts();
        let firstAccount = true; //my_accounts.length === 0;

        return (
            <div>
                <h4
                    style={{
                        fontWeight: "normal",
                        fontFamily: "Roboto-Medium, arial, sans-serif",
                        fontStyle: "normal",
                        paddingBottom: 15
                    }}
                >
                    <Translate content="wallet.wallet_password" />
                </h4>

                <Translate
                    style={{textAlign: "left"}}
                    unsafe
                    component="p"
                    content="wallet.create_account_password_text"
                />

                <Translate
                    style={{textAlign: "left"}}
                    component="p"
                    content="wallet.create_account_text"
                />

                {firstAccount ? null : (
                    <Translate
                        style={{textAlign: "left"}}
                        component="p"
                        content="wallet.not_first_account"
                    />
                )}
            </div>
        );
    }

    _renderBackup() {
        return (
            <div className="backup-submit">
                <p>
                    <Translate unsafe content="wallet.password_crucial" />
                </p>

                <div>
                    {!this.state.showPass ? (
                        <div
                            onClick={() => {
                                this.setState({showPass: true});
                            }}
                            className="button"
                        >
                            <Translate content="wallet.password_show" />
                        </div>
                    ) : (
                        <div>
                            <h5>
                                <Translate content="settings.password" />:
                            </h5>
                            <p
                                style={{
                                    fontWeight: "normal",
                                    fontFamily:
                                        "Roboto-Medium, arial, sans-serif",
                                    fontStyle: "normal",
                                    textAlign: "center"
                                }}
                            >
                                {this.state.generatedPassword}
                            </p>
                        </div>
                    )}
                </div>
                <div className="divider" />
                <p className="txtlabel warning">
                    <Translate unsafe content="wallet.password_lose_warning" />
                </p>

                <div
                    style={{width: "100%"}}
                    onClick={() => {
                        this.context.router.push("/explorer/blocks");
                    }}
                    className="button"
                >
                    <Translate content="wallet.ok_done" />
                </div>
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

                        <tr>
                            <td>
                                <Translate content="wallet.tips_deposit" />:
                            </td>
                            <td>
                                <Link to="/deposit-withdraw">
                                    <Translate content="wallet.link_deposit" />
                                </Link>
                            </td>
                        </tr>

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
                    <Translate content="wallet.tips_explore_pass" />
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
        // let my_accounts = AccountStore.getMyAccounts();
        // let firstAccount = my_accounts.length === 0;
        return (
            <div className="sub-content">
                <div>
                    {step === 2 ? (
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

                    {step === 3 ? this._renderGetStartedText() : null}

                    {step === 1 ? (
                        <div>{this._renderAccountCreateForm()}</div>
                    ) : step === 2 ? (
                        this._renderBackup()
                    ) : (
                        this._renderGetStarted()
                    )}
                </div>
            </div>
        );
    }
}

export default connect(
    CreateAccountPassword,
    {
        listenTo() {
            return [AccountStore];
        },
        getProps() {
            return {};
        }
    }
);

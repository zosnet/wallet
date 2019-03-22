import React from "react";
import {PropTypes} from "react";
import classNames from "classnames";
import ApplicationApi from "api/ApplicationApi";
import AccountActions from "actions/AccountActions";
import AccountStore from "stores/AccountStore";
import {ChainValidation} from "zosjs/es";
import Translate from "react-translate-component";
import counterpart from "counterpart";
import AltContainer from "alt-container";
import SettingsStore from "stores/SettingsStore";

class MyCaptcha extends React.Component {
    static propTypes = {
        id: PropTypes.string,
        onChange: PropTypes.func
    };

    constructor() {
        super();
        this.state = {
            value: null,
            error: null,
            captchaImg: null,
            captchaid: null
        };

        this.handleChange = this.handleChange.bind(this);
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            nextState.value !== this.state.value ||
            nextState.error !== this.state.error ||
            // nextState.captchaImg !== this.state.captchaImg ||
            nextState.captchaid !== this.state.captchaid
        );
    }

    componentDidMount() {
        this.getCaptcha();
    }

    componentDidUpdate() {
        if (this.props.onChange) this.props.onChange({valid: !this.getError()});
    }

    getValue() {
        return this.state.value;
    }

    setValue(value) {
        this.setState({value});
    }

    getCaptchaid() {
        return this.state.captchaid;
    }

    setCaptchaid(captchaid) {
        this.setState({captchaid});
    }

    clear() {
        this.setState({captcha_code: null, error: null, warning: null});
    }

    focus() {
        this.refs.input.focus();
    }

    valid() {
        return !this.getError();
    }

    getError() {
        if (this.state.value === null) return null;
        let error = null;
        if (this.state.error) {
            error = this.state.error;
        }
        return error;
    }

    validateCaptchaCode(value) {
        this.state.error =
            value === "" ? "Please enter valid account name" : "";

        this.state.warning = null;
        this.setState({
            value: value,
            error: this.state.error,
            warning: this.state.warning
        });
        if (this.props.onChange)
            this.props.onChange({value: value, valid: !this.getError()});
    }

    handleChange(e) {
        e.preventDefault();
        e.stopPropagation();
        // Simplify the rules (prevent typing of invalid characters)
        var captcha_code = e.target.value.toLowerCase();
        captcha_code = captcha_code.match(/[a-z0-9\.-]+/);
        captcha_code = captcha_code ? captcha_code[0] : null;
        this.setState({captcha_code});
        this.validateCaptchaCode(captcha_code);
    }

    handleRefreshCaptcha(e) {
        this.getCaptcha();
    }

    getCaptcha() {
        var _that = this;
        let url =
            SettingsStore.getState().settings.get("faucet_address") +
            "/getcaptcha";
        return fetch(url)
            .then(reply =>
                reply.json().then(result => {
                    if (result && result.img && result.captchaid) {
                        // console.log("getCaptcha: ", result);
                        let captcha = {
                            captchaImg: "data:image/png;base64," + result.img,
                            captchaid: result.captchaid
                        };
                        _that.setState(captcha);
                    }
                })
            )
            .catch(err => {
                console.log("error get getcaptcha", err, url);
            });
    }

    render() {
        let error = this.getError() || "";
        let class_name = classNames("form-group", "captcha", {
            "has-error": false
        });
        let warning = this.state.warning;
        let captchaImg = this.state.captchaImg;

        return (
            <div className={class_name}>
                <section>
                    <label className="left-label">
                        <Translate content="wallet.form_captcha" />
                    </label>
                    <div className="form-captcha-wrapper">
                        <div style={{display: "inline-block"}}>
                            <input
                                className="captcha-code"
                                name="username"
                                id="username"
                                type="text"
                                ref="input"
                                autoComplete="off"
                                placeholder={null}
                                onChange={this.handleChange}
                                value={this.state.captcha_code || ""}
                            />
                        </div>
                        <img
                            src={captchaImg}
                            style={{
                                width: "96px",
                                height: "36px",
                                visibility:
                                    captchaImg !== null ? "visible" : "hidden"
                            }}
                        />
                        <button
                            type="button"
                            onClick={this.handleRefreshCaptcha.bind(this)}
                            style={{
                                display: "inline-block",
                                color: "#409eff",
                                fontWeight: "500",
                                padding: "0",
                                background: "transparent",
                                outline: "none"
                            }}
                        >
                            <span>换一张</span>
                        </button>
                    </div>
                </section>
                <div style={{textAlign: "left"}} className="facolor-error">
                    {error}
                </div>
                <div style={{textAlign: "left"}} className="facolor-warning">
                    {error ? null : warning}
                </div>
            </div>
        );
    }
}

export default class StoreWrapper extends React.Component {
    render() {
        return (
            <AltContainer
                stores={[AccountStore]}
                inject={{
                    searchAccounts: () => {
                        return AccountStore.getState().searchAccounts;
                    }
                }}
            >
                <MyCaptcha ref="codeInput" {...this.props} />
            </AltContainer>
        );
    }
}

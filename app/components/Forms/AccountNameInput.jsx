import React from "react";
import {PropTypes} from "react";
import classNames from "classnames";
import AccountActions from "actions/AccountActions";
import AccountStore from "stores/AccountStore";
import {ChainValidation} from "zosjs/es";
import {ChainStore} from "zosjs/es";
import Translate from "react-translate-component";
import counterpart from "counterpart";
import AltContainer from "alt-container";

class AccountNameInput extends React.Component {
    static propTypes = {
        id: PropTypes.string,
        placeholder: PropTypes.string,
        initial_value: PropTypes.string,
        onChange: PropTypes.func,
        onEnter: PropTypes.func,
        accountShouldExist: PropTypes.bool,
        accountShouldNotExist: PropTypes.bool,
        shouldAdvanceRegistrar: PropTypes.bool,
        enableAdvanceName: PropTypes.bool,
        noLabel: PropTypes.bool
    };

    static defaultProps = {
        noLabel: false
    };

    constructor() {
        super();
        this.state = {
            value: null,
            error: null,
            existing_account: false
        };

        this.handleChange = this.handleChange.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            nextState.value !== this.state.value ||
            nextState.error !== this.state.error ||
            nextState.account_name !== this.state.account_name ||
            nextState.existing_account !== this.state.existing_account ||
            nextProps.searchAccounts !== this.props.searchAccounts
        );
    }

    componentDidUpdate() {
        if (this.props.onChange)
            this.props.onChange({
                valid: !this.getError(),
                is_advanced_name: this.state.is_advanced_name
            });
    }

    getValue() {
        return this.state.value;
    }

    setValue(value) {
        this.setState({value});
    }

    clear() {
        this.setState({account_name: null, error: null, warning: null});
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
        } else if (
            this.props.accountShouldExist ||
            this.props.accountShouldNotExist
        ) {
            let account = this.props.searchAccounts.find(
                a => a === this.state.value
            );
            if (this.props.accountShouldNotExist && account) {
                error = counterpart.translate(
                    "account.name_input.name_is_taken"
                );
            }
            if (this.props.accountShouldExist && !account) {
                error = counterpart.translate("account.name_input.not_found");
            }
            if (this.props.shouldAdvanceRegistrar && account) {
                let account_name = this.state.value;
                error = this._isAdvanceRegistrar(account_name);
            }
        }
        return error;
    }

    _isAdvanceRegistrar(account_name) {
        let flag = 0x01000000;
        let error = null;
        let accountObj = ChainStore.getAccount(account_name, false);
        let uaccount_property;
        if (accountObj) {
            uaccount_property = accountObj.getIn(["uaccount_property"]);
        }
        //判断是否靓号付费人
        if ((uaccount_property & flag) === flag) {
            error = null;
        } else {
            error = counterpart.translate(
                "account.name_input.name_not_payfor_premium"
            );
        }
        return error;
    }

    //1-2位账号或者3-8位包含aeiouy的纯字母账户为靓号. 您需要指定已存在账号为高级账号名付费.
    is_cheap_name(account_name) {
        // 1位或者2位的账户为高级账户
        if (account_name.length === 1 || account_name.length === 2) {
            //console.log("length is_cheap_name:",false)
            return false;
        }
        //3-8位 不含数字'0-9'和中划线'-'和号点'.' 并且 含有'aeiouy'中的任何一个字母，则是高级账户 =>is_cheap_name= false
        if (account_name.length <= 8) {
            if (
                !/[0-9-.]/.test(account_name) &&
                /[aeiouy]/.test(account_name)
            ) {
                //console.log("is_cheap_name:",false)
                return false;
            }
        }
        //console.log("is_cheap_name:", true);
        return true;
    }

    // is_account_name_error(value, allow_too_short) {
    //     var i, label, len, length, ref, suffix;
    //     if (allow_too_short == null) {
    //         allow_too_short = false;
    //     }
    //     suffix = "suffix.";
    //     if (value == null || value.length === 0) {
    //         return suffix + "empty";
    //     }
    //     length = value.length;
    //     if (!allow_too_short && length < 3) {
    //         return suffix + "longer";
    //     }
    //     if (length > 63) {
    //         return suffix + "shorter";
    //     }
    //     if (value.indexOf("zos") > -1) {
    //         return suffix + "contain";
    //     }
    //     if (/\./.test(value)) {
    //         suffix = "segment.";
    //     }
    //     ref = value.split(".");
    //     for (i = 0, len = ref.length; i < len; i++) {
    //         label = ref[i];
    //         if (!/^[~a-z]/.test(label)) {
    //             return suffix + "start";
    //         }
    //         if (!/^[~a-z0-9-]*$/.test(label)) {
    //             return suffix + "only";
    //         }
    //         if (/--/.test(label)) {
    //             return suffix + "oneDash";
    //         }
    //         if (!/[a-z0-9]$/.test(label)) {
    //             return suffix + "end";
    //         }
    //         if (!(label.length >= 1)) {
    //             return suffix + "longer";
    //         }
    //     }
    //     return null;
    // }

    validateAccountName(value) {
        if (value === "") {
            this.state.error = counterpart.translate(
                "account.name_input.inValid"
            );
        } else {
            let error = null;
            let localePaths = ChainValidation.is_account_name_error(
                value,
                false,
                3,
                63
            );
            if (localePaths) {
                //console.log("error name", localePaths);
                let localePath = localePaths.split(".");
                if (localePath.length == 2) {
                    error = counterpart.translate(
                        "account.name_input." + localePath[0]
                    );
                    error += counterpart.translate(
                        "account.name_input." + localePath[1]
                    );
                }
            }
            this.state.error = error;
        }
        value = value.trim();
        this.state.warning = null;
        let is_cheap_name = this.is_cheap_name(value);

        if (this.props.enableAdvanceName) {
            //如果要求输入的账户为高级账户，则提示高级账户规则
            if (!this.state.error && !is_cheap_name)
                this.state.warning = counterpart.translate(
                    "account.name_input.advanced_name"
                );
        } else if (!this.props.shouldAdvanceRegistrar) {
            //如果要求输入的账户为高级注册付费账户，则不要提示警告
            if (!this.state.error && !is_cheap_name)
                this.state.warning = counterpart.translate(
                    "account.name_input.premium_name_warning"
                );
        }

        this.setState({
            value: value,
            error: this.state.error,
            warning: this.state.warning,
            is_advanced_name: !is_cheap_name
        });
        if (this.props.onChange)
            this.props.onChange({
                value: value,
                valid: !this.getError(),
                is_advanced_name: !is_cheap_name
            });
        if (this.props.accountShouldExist || this.props.accountShouldNotExist)
            AccountActions.accountSearch(value);
    }

    handleChange(e) {
        e.preventDefault();
        e.stopPropagation();
        // Simplify the rules (prevent typing of invalid characters)
        var account_name = e.target.value.toLowerCase();
        account_name = account_name.match(/[a-z0-9\.-]+/);
        account_name = account_name ? account_name[0] : "";
        this.setState({account_name});
        this.validateAccountName(account_name);
    }

    onKeyDown(e) {
        if (this.props.onEnter && event.keyCode === 13) this.props.onEnter(e);
    }

    render() {
        let error = this.getError() || "";
        let class_name = classNames("form-group", "account-name", {
            "has-error": false
        });
        let warning = this.state.warning;
        // let {noLabel} = this.props;

        return (
            <div className={class_name}>
                {/* {noLabel ? null : <label><Translate content="account.name" /></label>} */}
                <section>
                    <label className="left-label">
                        {this.props.placeholder}
                    </label>
                    <input
                        name="username"
                        id="username"
                        type="text"
                        ref="input"
                        autoComplete="off"
                        placeholder={null}
                        onChange={this.handleChange}
                        onKeyDown={this.onKeyDown}
                        value={
                            this.state.account_name || this.props.initial_value
                        }
                    />
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
                <AccountNameInput ref="nameInput" {...this.props} />
            </AltContainer>
        );
    }
}

import React from "react";
import counterpart from "counterpart";
const gateway_cash = 0x00000001;
const gateway_bit = 0x00000002;
const gateway_deposit = 0x00000004;
const gateway_withdraw = 0x00000008;

class ZosGateWayUpdate extends React.Component {
    constructor(props) {
        super(props);
        console.log("props:", props);
        let need_auth = props.updateMember.need_auth;
        //let trust_auth = props.gateway.trust_auth
        console.log("need_auth:", need_auth);
        //console.log("trust_auth:",trust_auth)
        this.state = {
            can_gateway_cash: !!(need_auth & gateway_cash),
            can_gateway_bit: !!(need_auth & gateway_bit),
            can_gateway_deposit: !!(need_auth & gateway_deposit),
            can_gateway_withdraw: !!(need_auth & gateway_withdraw),
            need_auth: need_auth
            //trust_auth:JSON.stringify(trust_auth)
        };
    }

    componentDidMount() {
        this.forceUpdate();
    }

    handleClickOnChange = (flag, e) => {
        console.log("handleClickOnChange", e.target.checked);
        let checked = e.target.checked;
        let need_auth = 0;
        if (checked) {
            need_auth = this.state.need_auth + flag;
        } else {
            need_auth = this.state.need_auth - flag;
        }
        if (gateway_cash & flag) {
            this.setState({
                can_gateway_cash: checked,
                need_auth: need_auth
            });
        }
        if (gateway_bit & flag) {
            this.setState({
                can_gateway_bit: checked,
                need_auth: need_auth
            });
        }
        if (gateway_deposit & flag) {
            this.setState({
                can_gateway_deposit: checked,
                need_auth: need_auth
            });
        }
        if (gateway_withdraw & flag) {
            this.setState({
                can_gateway_withdraw: checked,
                need_auth: need_auth
            });
        }

        //更新need_auth
        this.props.onChangeNeedAuth(need_auth);
    };

    render() {
        console.log("zosGateWayUpdate:state", this.state);

        let {operation} = this.props;
        return (
            <div>
                <table>
                    <tbody>
                        <tr>
                            <input
                                type="checkbox"
                                name="gateway_check"
                                checked={this.state.can_gateway_cash}
                                onChange={e => {
                                    console.log(
                                        "can_gateway_cash",
                                        e.target.checked
                                    );
                                    this.handleClickOnChange(gateway_cash, e);
                                }}
                            />
                            <label>
                                {counterpart.translate(
                                    "account.membership.author.check_cash"
                                )}
                            </label>
                        </tr>
                        <tr rowSpan="2">
                            <input
                                type="checkbox"
                                name="gateway_check"
                                checked={this.state.can_gateway_bit}
                                onChange={e => {
                                    this.handleClickOnChange(gateway_bit, e);
                                }}
                            />
                            <label>
                                {counterpart.translate(
                                    "account.membership.author.check_bit"
                                )}
                            </label>
                        </tr>
                        <tr>
                            <input
                                type="checkbox"
                                name="gateway_check"
                                checked={this.state.can_gateway_deposit}
                                onChange={e => {
                                    console.log(
                                        "can_gateway_deposit",
                                        e.target.checked
                                    );
                                    this.handleClickOnChange(
                                        gateway_deposit,
                                        e
                                    );
                                }}
                            />
                            <label>
                                {counterpart.translate(
                                    operation == "gateway_update"
                                        ? "account.membership.author.check_deposit"
                                        : "account.membership.author.check_loan"
                                )}
                            </label>
                        </tr>
                        <tr>
                            <input
                                type="checkbox"
                                name="gateway_check"
                                checked={this.state.can_gateway_withdraw}
                                onChange={e => {
                                    console.log(
                                        "can_gateway_withdraw",
                                        e.target.checked
                                    );
                                    this.handleClickOnChange(
                                        gateway_withdraw,
                                        e
                                    );
                                }}
                            />
                            <label>
                                {counterpart.translate(
                                    operation == "gateway_update"
                                        ? "account.membership.author.check_whithdraw"
                                        : "account.membership.author.check_lend"
                                )}
                            </label>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
}

export default ZosGateWayUpdate;

import React from "react";
import counterpart from "counterpart";
import {ChainStore} from "zosjs/es";
import {connect} from "alt-react";
import Translate from "react-translate-component";
import ApplicationApi from "../../api/ApplicationApi";
import {Apis} from "zosjs-ws";
import HelpContent from "../Utility/HelpContent";

class AccountCoupon extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            couponAmount: 0,
            canReceiveCoupon: false
        };
    }

    componentWillMount() {
        let accountId = this.props.account.get("id");
        this._initCoupon(accountId);
    }

    _initCoupon(accountId) {
        console.log("accountId:", accountId);
        this.getAccountCoupon(accountId).then(res => {
            console.log("res:", res);
            if (res) {
                this.setState({couponAmount: res["amount"]});
                this.setState({canReceiveCoupon: res["canReceiveCoupon"]});
            }
        });
    }

    componentDidMount() {}

    /*   showModal = () => {
        ZfApi.publish("known_coupon", "open");
    }*/

    //获取优惠券
    claimCoupon(account_id) {
        console.log("account_id:", account_id);
        ApplicationApi.account_coupon(account_id).then(res => {
            console.log("res:", res);
            setTimeout(() => {
                this._initCoupon(account_id);
            }, 3000);
        });
    }

    getAccountCoupon(account_id) {
        let result = {};
        return Apis.instance()
            .db_api()
            .exec("get_full_accounts", [[account_id], false])
            .then(res_acc => {
                let statistics = res_acc[0][1].statistics;
                let asset = ChainStore.getObject("1.3.0");
                let amount =
                    parseInt(statistics.amount_coupon) /
                    Math.pow(10, asset.get("precision"));
                result["amount"] = amount;

                let coupon_month = statistics.coupon_month;
                let obj = ChainStore.getObject("2.1.0");
                let oDate = new Date(obj.get("time"));
                let oMonth = oDate.getMonth();
                let oYear = oDate.getFullYear();
                let calDate = parseInt(oYear) * 100 + parseInt(oMonth) + 1;
                let canReceiveCoupon = true;
                if (coupon_month === calDate) {
                    canReceiveCoupon = false;
                }
                result["canReceiveCoupon"] = canReceiveCoupon;
                return Promise.resolve(result);
            })
            .catch(error => {
                console.log(error);
                return Promise.reject(error);
            });
    }

    render() {
        let {account} = this.props;
        let {couponAmount, canReceiveCoupon} = this.state;
        let accountId = account.get("id");

        return (
            <div
                className="grid-content no-overflow"
                style={{paddingBottom: 15}}
            >
                <div>
                    <label style={{margin: "1rem 0rem"}}>
                        <Translate content="explorer.assets.coupon" />:
                        <span>{couponAmount} ZOS</span>
                        {canReceiveCoupon ? (
                            <span>
                                <a
                                    onClick={this.claimCoupon.bind(
                                        this,
                                        accountId
                                    )}
                                >
                                    &nbsp;
                                    <Translate content="account.coupon.get_coupon" />
                                </a>
                            </span>
                        ) : (
                            <span style={{color: "grey"}}>
                                &nbsp;
                                <Translate content="account.coupon.received_coupon" />
                            </span>
                        )}
                    </label>

                    <table className="table op-table">
                        <caption />
                        <tbody>
                            <tr>
                                <td colSpan="2">
                                    <HelpContent
                                        path="assets/Asset"
                                        section="asset_coupon"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
}

export default AccountCoupon;

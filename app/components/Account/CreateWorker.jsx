import React from "react";
import {connect} from "alt-react";
import ApplicationApi from "api/ApplicationApi";
import AccountStore from "stores/AccountStore";
import utils from "common/utils";
import notify from "actions/NotificationActions";
import Translate from "react-translate-component";

class CreateWorker extends React.Component {
    constructor() {
        super();

        this.state = {
            title: null,
            start: new Date(),
            end: null,
            pay: null,
            url: "http://",
            type: 0,
            vesting: 7
        };
    }

    shouldComponentUpdate(np, ns) {
        return (
            np.currentAccount !== this.props.currentAccount,
            !utils.are_equal_shallow(ns, this.state)
        );
    }

    onSubmit() {
        if (this.state.pay) {
            this.state.pay = parseFloat(this.state.pay).toFixed(5);
        }

        ApplicationApi.createWorker(
            this.state,
            this.props.currentAccount
        ).catch(error => {
            console.log("error", error);
            let error_msg =
                error.message &&
                error.message.length &&
                error.message.length > 0
                    ? error.message.split("stack")[0]
                    : "unknown error";

            notify.addNotification({
                message: `Failed to create worker: ${error_msg}`,
                level: "error",
                autoDismiss: 10
            });
        });
    }

    onCheckType() {
        this.setState({type: ~this.state.type + 2});
    }

    render() {
        // console.log("state:", this.state);
        return (
            <div className="grid-block">
                <div
                    className="grid-content zos-card-bg"
                    style={{
                        marginTop: 10,
                        paddingTop: 20
                    }}
                >
                    <Translate
                        content="explorer.workers.create"
                        component="h3"
                    />
                    <form style={{maxWidth: 800}}>
                        <Translate
                            content="explorer.workers.create_text_1"
                            component="p"
                        />
                        <Translate
                            content="explorer.workers.create_text_2"
                            component="p"
                        />

                        <label>
                            <Translate content="explorer.workers.title" />
                            <input
                                onChange={e => {
                                    this.setState({title: e.target.value});
                                }}
                                type="text"
                            />
                        </label>
                        <Translate
                            content="explorer.workers.name_text"
                            component="p"
                        />
                        <div
                            style={{
                                width: "50%",
                                paddingRight: "2.5%",
                                display: "inline-block"
                            }}
                        >
                            <label>
                                <Translate content="account.votes.start" />
                                <input
                                    onChange={e => {
                                        this.setState({
                                            start: new Date(e.target.value)
                                        });
                                    }}
                                    type="date"
                                />
                            </label>
                        </div>
                        <div
                            style={{
                                width: "50%",
                                paddingLeft: "2.5%",
                                display: "inline-block"
                            }}
                        >
                            <label>
                                <Translate content="account.votes.end" />
                                <input
                                    onChange={e => {
                                        this.setState({
                                            end: new Date(e.target.value)
                                        });
                                    }}
                                    type="date"
                                />
                            </label>
                        </div>
                        <Translate
                            content="explorer.workers.date_text"
                            component="p"
                        />

                        <label>
                            <Translate content="explorer.workers.daily_pay" />
                            <input
                                onChange={e => {
                                    this.setState({pay: e.target.value});
                                }}
                                type="number"
                            />
                        </label>
                        <Translate
                            content="explorer.workers.pay_text"
                            component="p"
                        />

                        <label>
                            <Translate content="explorer.workers.website" />
                            <input
                                onChange={e => {
                                    this.setState({url: e.target.value});
                                }}
                                type="text"
                            />
                        </label>
                        <Translate
                            content="explorer.workers.url_text"
                            component="p"
                        />

                        <label>
                            <Translate content="explorer.workers.worker_initializer.title" />
                            <div
                                style={{
                                    borderRadius: 5,
                                    marginTop: 5
                                }}
                            >
                                <label
                                    style={{
                                        display: "inline-block",
                                        height: "2.4rem",
                                        marginBottom: 0,
                                        marginRight: "2rem"
                                    }}
                                >
                                    <input
                                        name="workerType"
                                        type="radio"
                                        value={0}
                                        checked={this.state.type == 0}
                                        onChange={this.onCheckType.bind(this)}
                                    />
                                    <Translate content="explorer.workers.worker_initializer.vesting" />
                                </label>
                                <label
                                    style={{
                                        display: "inline-block",
                                        height: "2.4rem",
                                        marginBottom: 0,
                                        marginRight: "2rem"
                                    }}
                                >
                                    <input
                                        name="workerType"
                                        type="radio"
                                        value={1}
                                        checked={this.state.type == 1}
                                        onChange={this.onCheckType.bind(this)}
                                    />
                                    <Translate content="explorer.workers.worker_initializer.exchange" />
                                </label>
                            </div>
                        </label>
                        <Translate
                            content="explorer.workers.url_text"
                            component="p"
                        />

                        {this.state.type == 0 ? (
                            <label>
                                <Translate content="explorer.workers.vesting_pay" />
                                <input
                                    defaultValue={this.state.vesting}
                                    onChange={e => {
                                        this.setState({
                                            vesting: parseInt(e.target.value)
                                        });
                                    }}
                                    type="number"
                                />
                            </label>
                        ) : null}

                        {this.state.type == 0 ? (
                            <Translate
                                content="explorer.workers.vesting_text"
                                component="p"
                            />
                        ) : null}

                        <div
                            className="button-group"
                            onClick={this.onSubmit.bind(this)}
                        >
                            <div className="button" type="submit">
                                <Translate content="explorer.workers.publish" />
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        );
    }
}

export default (CreateWorker = connect(
    CreateWorker,
    {
        listenTo() {
            return [AccountStore];
        },
        getProps() {
            return {
                currentAccount: AccountStore.getState().currentAccount
            };
        }
    }
));

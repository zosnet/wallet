import React from "react";
import {ChainStore, FetchChain, key} from "zosjs/es";
import AccountActions from "actions/AccountActions";

class SetAccount extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            error: ""
        };
    }

    render() {
        let account_name = this.props.params.account_name;
        FetchChain("getAccount", account_name, undefined, {
            [account_name]: true
        })
            .then(() => {
                AccountActions.setPasswordAccount(account_name);
                AccountActions.setCurrentAccount(account_name);
                setTimeout(function() {
                    window.location.href = `/account/${account_name}`;
                });
            })
            .catch(() => {
                this.setState({error: `Not found account '${account_name}'!`});
            });
        return (
            <div
                style={{
                    marginTop: 10
                }}
            >
                <div
                    className="grid-block page-layout zos-card-bg"
                    style={{
                        textAlign: "center",
                        fontSize: 30,
                        padding: 20
                    }}
                >
                    {this.state.error
                        ? this.state.error
                        : `Getting account '${account_name}' from blockchain...`}
                </div>
            </div>
        );
    }
}

export default SetAccount;

import React from "react";
import Immutable from "immutable";
import AccountImage from "../Account/AccountImage";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import FormattedAsset from "../Utility/FormattedAsset";
import AssetName from "../Utility/AssetName";
import {ChainStore} from "zosjs/es";
import Translate from "react-translate-component";
import {connect} from "alt-react";
import SettingsActions from "actions/SettingsActions";
import SettingsStore from "stores/SettingsStore";
import Explorer from "./Explorer";
import {Apis} from "zosjs-ws";
import counterpart from "counterpart";

class AuthorRow extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            assets: null,
            account: null
        };
    }

    componentDidMount() {
        this.getAuthorAccount(this.props.author);
        this.getAuthorAllowAsset(this.props.author);
    }

    getAuthorAccount(author) {
        return Apis.instance()
            .db_api()
            .exec("get_accounts", [[author.author_account]])
            .then(author_accounts => {
                this.setState({account: author_accounts[0]});
            });
    }

    getAuthorAllowAsset(author) {
        ChainStore.FetchChain("getObject", author.allow_asset, 5000).then(
            res => {
                let assets = [];
                console.log("res:", res);
                res.forEach(obj => {
                    assets.push(obj.get("symbol"));
                });
                console.log("assets:", assets);
                if (assets.length > 0) {
                    this.setState({assets: assets.join("/")});
                }
            }
        );
    }

    render() {
        let {author} = this.props;
        let {account, assets} = this.state;

        let enable_state = "";
        if (author.enable === "identity_enable") {
            enable_state = counterpart.translate(
                "explorer.authors.identity_enable"
            );
        }
        if (author.enable === "identity_disable") {
            enable_state = counterpart.translate(
                "explorer.authors.identity_disable"
            );
        }

        if (assets) {
            console.log("enable_state", enable_state);
            enable_state = enable_state.concat("/").concat(assets);
        }

        let url = null;
        if (author.url) {
            url = (
                <a href={author.url} target="_blank">
                    {author.url}
                </a>
            );
        }
        return (
            <tr>
                <td>{account ? account.name : author.author_account}</td>
                <td>{enable_state}</td>
                <td>{url}</td>
                <td style={{textAlign: "right"}}>{author.memo || ""}</td>
                <td />
            </tr>
        );
    }
}

class AuthorList extends React.Component {
    render() {
        let {authors, membersList} = this.props;

        let itemRows = null;

        let ranks = {};

        if (authors && authors.length) {
            itemRows = authors.map(a => {
                return <AuthorRow key={a.id} author={a} />;
            });
        }

        return (
            <table className="table table-hover">
                <thead>
                    <tr>
                        <th>
                            <Translate content="explorer.authors.title" />
                        </th>
                        <th className="clickable">
                            <Translate content="explorer.authors.state" />
                        </th>
                        <th>
                            <Translate content="explorer.authors.url_text" />
                        </th>
                        <th style={{textAlign: "right"}}>
                            <Translate content="explorer.authors.memo" />
                        </th>
                        <th />
                    </tr>
                </thead>
                <tbody>{itemRows}</tbody>
            </table>
        );
    }
}

class Authors extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            limit: 100,
            filterAuthor: props.filterAuthor || "",
            authors: null
        };
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            nextState.filterAuthor !== this.state.filterAuthor ||
            nextState.authors !== this.state.authors
        );
    }

    _onFilter(e) {
        e.preventDefault();
        this.setState(
            {
                filterAuthor: e.target.value.toLowerCase()
            },
            () => {
                this.getAuthors();
            }
        );
    }

    componentDidMount() {
        this.getAuthors();
    }

    getAuthors() {
        let {filterAuthor, limit} = this.state;

        return Apis.instance()
            .db_api()
            .exec("lookup_author_accounts", [filterAuthor, limit])
            .then(res => {
                let authorIds = [];
                if (res && res.length) {
                    res.forEach(one => {
                        authorIds.push(one[1]);
                    });
                }
                if (authorIds.length) {
                    Apis.instance()
                        .db_api()
                        .exec("get_authors", [authorIds])
                        .then(authors => {
                            if (authors && authors.length) {
                                this.setState({authors});
                            } else {
                                this.setState({authors: null});
                            }
                        });
                } else {
                    this.setState({authors: null});
                }
            });
    }

    render() {
        let {filterAuthor, authors} = this.state;

        let content = (
            <div
                className="grid-block vertical"
                style={{
                    paddingTop: 10
                }}
            >
                <div className="zos-card-bg" style={{paddingTop: 20}}>
                    <div className="grid-block zos-filter">
                        <Translate
                            className="title"
                            content="explorer.authors.filter_title"
                        />
                        <input
                            type="text"
                            value={this.state.filterAuthor}
                            onChange={this._onFilter.bind(this)}
                            className="zos-filter"
                        />
                    </div>
                    <div className="grid-block vertical">
                        <div className="grid-content" style={{padding: 0}}>
                            <AuthorList
                                authors={authors}
                                filter={filterAuthor}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );

        return <Explorer tab="authors" content={content} />;
    }
}

export default Authors;

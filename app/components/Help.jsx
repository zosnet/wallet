import React from "react";
import HelpContent from "./Utility/HelpContent";
import {pairs} from "lodash";

class Help extends React.Component {
    render() {
        let path = pairs(this.props.params)
            .map(p => p[1])
            .join("/");
        return (
            <div
                className="grid-container page-layout "
                style={{
                    paddingTop: 10
                }}
            >
                <div
                    className="grid-block page-layout zos-card-bg"
                    style={{
                        marginBottom: 0
                    }}
                >
                    {/* 内容不符合 暂时封掉了 start */}
                    {/*<div className="grid-block wrap regular-padding">
                        <div className="grid-block medium-3">
                            <div className="grid-content help-toc responsive-list">
                                <HelpContent path="toc" />
                            </div>
                        </div>

                        <div className="grid-block medium-9">
                            <div className="grid-content">
                                <HelpContent path={path || "index"} />
                            </div>
                        </div>
                    </div>*/}
                    {/* 内容不符合 暂时封掉了 end */}
                </div>
            </div>
        );
    }
}

export default Help;

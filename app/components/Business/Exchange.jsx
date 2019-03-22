import React from "react";
import Translate from "react-translate-component";

class Exchange extends React.Component {
    render() {
        return (
            <div
                ref="outerWrapper"
                className="grid-block vertical"
                style={{
                    paddingTop: 10
                }}
            >
                <div className="zos-card-bg">
                    <div
                        style={{
                            margin: "0 auto",
                            width: "20rem",
                            height: "20rem",
                            textAlign: "center",
                            lineHeight: "20rem",
                            fontSize: 30
                        }}
                    >
                        <Translate content="development.coming_soon" />
                    </div>
                </div>
            </div>
        );
    }
}

export default Exchange;

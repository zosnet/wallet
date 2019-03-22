import _extends from "babel-runtime/helpers/extends";
import _classCallCheck from "babel-runtime/helpers/classCallCheck";
import _createClass from "babel-runtime/helpers/createClass";
import _possibleConstructorReturn from "babel-runtime/helpers/possibleConstructorReturn";
import _inherits from "babel-runtime/helpers/inherits";
var __rest =
    (this && this.__rest) ||
    function(s, e) {
        var t = {};
        for (var p in s) {
            if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
                t[p] = s[p];
        }
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (
                var i = 0, p = Object.getOwnPropertySymbols(s);
                i < p.length;
                i++
            ) {
                if (e.indexOf(p[i]) < 0) t[p[i]] = s[p[i]];
            }
        return t;
    };
import React from "react";
import RcPagination from "rc-pagination";
import classNames from "classnames";

var ZosPagination = (function(_React$Component) {
    _inherits(ZosPagination, _React$Component);

    function ZosPagination() {
        _classCallCheck(this, ZosPagination);

        var _this = _possibleConstructorReturn(
            this,
            (
                ZosPagination.__proto__ || Object.getPrototypeOf(ZosPagination)
            ).apply(this, arguments)
        );

        _this.renderPagination = function(contextLocale) {
            var _a = _this.props,
                className = _a.className,
                size = _a.size,
                customLocale = _a.locale,
                restProps = __rest(_a, ["className", "size", "locale"]);
            var locale = _extends({}, contextLocale, customLocale);
            var isSmall = size === "small";
            return React.createElement(
                RcPagination,
                _extends({}, restProps, {
                    className: classNames(className, {mini: isSmall}),
                    locale: locale
                })
            );
        };
        return _this;
    }

    _createClass(ZosPagination, [
        {
            key: "render",
            value: function render() {
                return React.createElement(
                    "div",
                    {className: "zos-paginated-list"},
                    this.renderPagination()
                );
            }
        }
    ]);

    return ZosPagination;
})(React.Component);

export default ZosPagination;

ZosPagination.defaultProps = {
    prefixCls: "ant-pagination",
    selectPrefixCls: "ant-select"
};

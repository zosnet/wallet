export const blockTradesAPIs = {
    BASE: "https://api.blocktrades.us/v2",
    // BASE_OL: "https://api.blocktrades.us/ol/v2",
    BASE_OL: "https://ol-api1.openledger.info/api/v0/ol/support",
    COINS_LIST: "/coins",
    ACTIVE_WALLETS: "/active-wallets",
    TRADING_PAIRS: "/trading-pairs",
    DEPOSIT_LIMIT: "/deposit-limits",
    ESTIMATE_OUTPUT: "/estimate-output-amount",
    ESTIMATE_INPUT: "/estimate-input-amount"
};

export const rudexAPIs = {
    BASE: "https://gateway.rudex.org/api/v0_1",
    COINS_LIST: "/coins",
    NEW_DEPOSIT_ADDRESS: "/new-deposit-address"
};

export const centerAPIs = {
    CHAININFO: "https://chaininfo.zos.io/chainapi"
};

export const widechainAPIs = {
    BASE: "https://gateway.winex.pro/api/v0/ol/support",
    COINS_LIST: "/coins",
    ACTIVE_WALLETS: "/active-wallets",
    NEW_DEPOSIT_ADDRESS: "/new-deposit-address",
    WITHDRAW_HISTORY: "/latelyWithdraw",
    TRADING_PAIRS: "/trading-pairs",
    DEPOSIT_HISTORY: "/latelyRecharge"
};

// export const settingsAPIs = {
//     DEFAULT_WS_NODE: "ws://173.248.225.147:8090",
//     WS_NODE_LIST: [
//         {url: "ws://173.248.225.147:8090", location: "zos hk"},
//         {url: "ws://173.248.225.147:8096", location: "zos hk-delay"},
//         {url: "ws://18.218.179.234:8090", location: "zos amazonaws"},
//         {url: "ws://18.218.179.234:9090", location: "zos amazonaws-1"},
//         {url: "ws://127.0.0.1:8090", location: "local host"}
//     ],
//     DEFAULT_FAUCET: "http://173.248.225.147:3000", // 2017-12-infrastructure worker proposal
//     TESTNET_FAUCET: "http://173.248.225.147:3000",
//     RPC_URL: "http://173.248.225.147:8093"
// };

export const settingsAPIs = {
    DEFAULT_WS_NODE: "wss://snode04.zos.io:443",
    WS_NODE_LIST: [
        {url: "wss://snode04.zos.io:443", location: "zos amazonaws 04"},
        {url: "wss://snode05.zos.io:443", location: "zos amazonaws 05"}
    ],
    DEFAULT_FAUCET: "https://faucet.zos.io:8443",
    TESTNET_FAUCET: "192.168.1.200:3000",
    RPC_URL: "wss://snode04.zos.io:443",
    LENDING_URL: "//lending.zos.io"
};

/*
  //27205d0f9ebe10b18b64a9defbd47020b24965819a89b4c4b4100eb55fb7a834
export const settingsAPIs = {
    DEFAULT_WS_NODE: "wss://fake.automatic-selection.com",
    WS_NODE_LIST: [
        {url: "ws://192.168.1.149:8090", location: "Eric hosted"} ,
        {url: "wss://fake.automatic-selection.com", location: {translate: "settings.api_closest"}},
        {url: "ws://127.0.0.1:8090", location: "Locally hosted"},
        {url: "wss://zos.openledger.info/ws", location: "Nuremberg, Germany"},
        {url: "wss://eu.openledger.info/ws", location: "Berlin, Germany"},
        {url: "wss://bit.btsabc.org/ws", location: "Hong Kong"},
        {url: "wss://bts.ai.la/ws", location: "Hong Kong"},
        {url: "wss://zos.apasia.tech/ws", location: "Bangkok, Thailand"},
        {url: "wss://japan.zos.apasia.tech/ws", location: "Tokyo, Japan"},
        {url: "wss://zos.dacplay.org/ws", location:  "Hangzhou, China"},
        {url: "wss://zos-api.wancloud.io/ws", location:  "China"},
        {url: "wss://openledger.hk/ws", location: "Hong Kong"},
        {url: "wss://zos.crypto.fans/ws", location: "Munich, Germany"},
        {url: "wss://node.testnet.zos.eu", location: "Public Testnet Server (Frankfurt, Germany)"},
        {url: "wss://ws.gdex.top", location: "China"},
        {url: "wss://dex.rnglab.org", location: "Netherlands"},
        {url: "wss://dexnode.net/ws", location: "Dallas, USA"},
        {url: "wss://la.dexnode.net/ws", location: "Los Angeles, USA"}
    ],
    DEFAULT_FAUCET: "https://faucet.zos.eu/onboarding",  // 2017-12-infrastructure worker proposal
    TESTNET_FAUCET: "https://faucet.testnet.zos.eu",
    RPC_URL: "https://openledger.info/api/"
};
*/
export const gdexAPIs = {
    BASE: "https://api.gdex.io",
    ASSET_LIST: "/gateway/asset/assetList",
    ASSET_DETAIL: "/gateway/asset/assetDetail",
    GET_DEPOSIT_ADDRESS: "/gateway/address/getAddress",
    CHECK_WITHDRAY_ADDRESS: "/gateway/address/checkAddress",
    DEPOSIT_RECORD_LIST: "/gateway/deposit/recordList",
    DEPOSIT_RECORD_DETAIL: "/gateway/deposit/recordDetail",
    WITHDRAW_RECORD_LIST: "/gateway/withdraw/recordList",
    WITHDRAW_RECORD_DETAIL: "/gateway/withdraw/recordDetail",
    GET_USER_INFO: "/gateway/user/getUserInfo",
    USER_AGREEMENT: "/gateway/user/isAgree",
    WITHDRAW_RULE: "/gateway/withdraw/rule"
};

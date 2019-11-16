module.exports = {
    permission_flags: {
        charge_market_fee: 0x01 /**< an issuer-specified percentage of all market trades in this asset is paid to the issuer */,
        white_list: 0x02 /**< accounts must be whitelisted in order to hold this asset */,
        override_authority: 0x04 /**< issuer may transfer asset back to himself */,
        transfer_restricted: 0x08 /**< require the issuer to be one party to every transfer */,
        disable_force_settle: 0x10 /**< disable force settling */,
        global_settle: 0x20 /**< allow the bitasset issuer to force a global settling -- this may be set in permissions, but not flags */,
        disable_confidential: 0x40 /**< allow the asset to be used with confidential transactions */,
        witness_fed_asset: 0x80 /**< allow the asset to be fed by witnesses */,
        committee_fed_asset: 0x100 /**< allow the asset to be fed by the committee */
    },
    uia_permission_mask: [
        "charge_market_fee",
        "white_list",
        "override_authority",
        "transfer_restricted",
        "disable_confidential"
    ],
    GRAPHENE_100_PERCENT: 10000,
    GRAPHENE_1_PERCENT: 10000 / 100,
    GRAPHENE_MAX_SHARE_SUPPLY: "1000000000000000000",

    asset_property: {
        asset_cash: 0x00000001, //ASSET_CASH   法币
        asset_lender: 0x0000002, //ASSET_LENDER 可抵押
        asset_loan: 0x00000008, // ASSET_LOAN  可借贷
        asset_bit: 0x00000040, // ASSET_BIT   数字货币
        asset_sell: 0x00000080, // ASSET_SELL   可交易
        asset_locktoken: 0x00000100, //
        asset_locknode: 0x00000200 //
    },
    uasset_property_mask: [
        "asset_cash",
        "asset_lender",
        "asset_loan",
        "asset_bit",
        "asset_sell",
        "asset_locktoken",
        "asset_locknode"
    ]
};

/*

const static uint32_t ASSET_ISSUER_PERMISSION_MASK = charge_market_fee|white_list|override_authority|transfer_restricted|disable_force_settle|global_settle|disable_confidential
      |witness_fed_asset|committee_fed_asset;
const static uint32_t UIA_ASSET_ISSUER_PERMISSION_MASK = charge_market_fee|white_list|override_authority|transfer_restricted|disable_confidential;

 */

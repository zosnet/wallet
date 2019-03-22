[# summary]
### 资产 {symbol}

{description}

Issued by: {issuer}

[# annual]

If a lifetime membership is too much you can still get {feesCashback}%  cashback for the next year by becoming an
annual subscriber for just {price} per year.
![GitHub Logo](/images/logo.png)

[# fee-division]
#### Fee Division
Every time {account} pays a transaction fee, that fee is divided among several different accounts.  The network takes
a {networkFee}% cut, and the Lifetime Member who referred {account} gets a {lifetimeFee}% cut.

The _registrar_ is the account that paid the transaction fee to register {account} with the network.  The registrar gets to decide how to
divide the remaining {referrerTotalFee}% between themselves and their own _Affiliate Referrer_ program.

{account}'s registrar chose to share {referrerFee}% of the total fee with the _Affiliate Referrer_ and keep {registrarFee}% of the total fee for themselves.
                            
                            
#### Pending Fees
Fees paid by {account} are only divided among the network, referrers, and registrars once every maintenance interval ({maintenanceInterval} seconds). The
next maintenance time is {nextMaintenanceTime}.
                 
#### Vesting Fees

Most fees are made available immediately, but fees over {vestingThreshold}
(such as those paid to upgrade your membership or register a premium account name) must vest for a total of {vestingPeriod} days.


[# asset_property]
说明：
1. 只能用提案的方式来提交申请,并需要董事会审批通过
2. 法币和数字货币属性不能同时存在,申请(取消)法币->将会自动取消(成为)数字货币
3. 可借贷和可抵押属性不能同时存在,申请可借贷(可抵押)->请先取消另一种属性可抵押(可借贷)
4. 数字货币可抵押或可借贷，法币不能抵押只能借贷
5. 请谨慎更改数字货币属性


[# asset_coupon]
关于优惠券：
1. 优惠券可以抵扣各种操作的燃料费消耗
2. 优惠券每月免费领取1次，10个/月
3. 月底当月未使用的优惠券清零


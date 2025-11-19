Lending Protocol where collateral is RWAs from Stock Exchange

## Base Module

An Issuer issues fungible assets that represent 1 to 1 backed shares of a company in the issuer's reserve.
The issued fungible assets can be redeemed for their equivalent value in USDC based on the last reported price.
Meaning when the market opens, the issuer will need to start liquidating enough shares from the reserve into USDC periodically maybe every hour that's to be loaded onto the on-chain account.
This is to ensure enough liquidity in the reserve to cover all withdrawals.
The issuer will also maintain an oracle which is constantly updated with the realtime values for the current price of the asset converted to USDC.
The oracle will govern how much any new buyer receives for a given amount of USDC.
The issuer will impose limits on how much each account is able to withdraw each business day. 
These limits will get updated after every token pricing update and also after the USDC reserves have been updated for each token. 
Limits are a requirement because the value of the real world asset is constantly changing. and needs to be monitored. This means the amount of USDC in the reserves may reach a point where it's no longer soluble because the price of a given share has risen, but the on-chain reserves don't reflect that, which is what we try to prevent.

## Lending Module
A user holding tokens of share x, can choose to borrow using the tokens of share x as collateral.
A loan will be over collateralised.
A loan will be taken at `80%` of the collateral provided in USDC.
**Liquidation**
- Collateral will be liquidated whenever it's price drops below `110%` of the loan value.

## Approach

### Control
- Has flags meant to stop all interactions with the protocol in cases where it's determined that a possible catastrophe is about to occur.
- Conditions for freezing all trading can be determined during implementation

#### Circuit Break Triggers 
- Unsoluability:
	- Triggered when `tokens * USDC value > 105% Supply reserves`

### PriceOracle 
- Price oracle is responsible for keeping track of the realtime value of assets through a last_price update mechanism. It'll keep track of the pricing for all assets onboarded on the protocol.
#### Price Aggregator
- An off-chain price aggregator collecting data from apis of the stock exchanges where the shares are traded.
- Update the on-chain price whenever their's a change

### Reserve
- Holds the USDC reserves of the protocol and keeps track and updates of the amounts in different pools
- Keeps track of daily withdrawal limits set on accounts based on data collected from price oracle and issuer

### Issuer
- Mints tokens after receiving equivalent USDC
- Burns tokens after receiving them and paying out USDC, stops working incase of `unsoluability`

### Lender
- Handles lending and loan repayments
- Keeps track of all loans taken out
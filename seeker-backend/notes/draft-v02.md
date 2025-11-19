# Hedgehog Lending Protocol

_Version: Draft v0.0.2_

## Abstract

This document outlines a lending protocol that uses real-world assets (RWAs)—specifically, shares traded on stock exchanges—as collateral. The protocol integrates on-chain and off-chain mechanisms to ensure liquidity, accurate pricing, and risk control. It consists of a Base Module for asset issuance and a Lending Module for collateralized borrowing, supported by multiple control systems to mitigate market volatility and operational risks.

## 1. Introduction

The Hedgehog Lending Protocol is designed to enable secure lending by leveraging fungible assets that are backed 1:1 by shares held in reserve. Users can deposit these tokenized shares and use them as collateral to borrow USDC. Key elements of the system include an automated pricing oracle, periodic liquidity management, and comprehensive risk controls.

## 2. Base Module

The Base Module is responsible for the creation, management, and liquidity of the tokenized shares.

### 2.1 Issuance of Tokenized Shares

- **Asset Backing:** An issuer mints fungible tokens, each representing a one-to-one claim on the shares held in the reserve.
- **Redemption Mechanism:** Tokens can be redeemed for their equivalent value in USDC, based on the latest reported market price.
- **Liquidity Provision:** When the market opens, the issuer periodically liquidates a portion of the shares (e.g., hourly) to convert them into USDC. This ensures that sufficient liquidity is available in the on-chain account to cover all user withdrawals.

### 2.2 Price Oracle Integration

- **Real-time Pricing:** The issuer maintains an on-chain oracle that is continuously updated with the latest USDC-equivalent prices of the underlying assets.
- **Pricing Governance:** The oracle determines the conversion rate for new token purchases, ensuring that token valuations reflect current market conditions.

### 2.3 Daily Withdrawal Limits

- **Limit Enforcement:** To manage fluctuations in asset values, the issuer imposes daily withdrawal limits on each account.
- **Dynamic Adjustments:** Limits are updated with every token pricing update and following adjustments in the USDC reserves, preventing insolvency due to rapid price movements.

## 3. Lending Module

The Lending Module allows users to leverage their tokenized shares to secure loans.

### 3.1 Collateralized Loans

- **Loan-to-Value (LTV) Ratio:** Users can borrow up to 80% of the USDC value of their deposited tokens.
- **Over-Collateralization:** Loans are over-collateralized to provide a buffer against market volatility.

### 3.2 Liquidation Policy

- **Liquidation Trigger:** Collateral is liquidated if its market price falls below 110% of the outstanding loan value.
- **Risk Mitigation:** This liquidation threshold is designed to protect both the lender and the protocol by ensuring that the collateral consistently exceeds the value of the borrowed funds.

## 4. Control Mechanisms and System Components

To maintain stability and safeguard against market or systemic risks, the protocol incorporates several control layers.

### 4.1 Circuit Break Triggers

- **Emergency Freezing:** The system includes flags to halt all protocol interactions if market conditions indicate an imminent catastrophe. The specific criteria for triggering a freeze will be defined during the implementation phase.
- **Unsolvability Condition:** The protocol will cease operations if the USDC value of tokens exceeds 105% of the supply reserves, thereby preventing a situation where liabilities outweigh the available liquidity.

### 4.2 Key Components

- **Price Oracle:** Continuously tracks asset prices using a “last_price” update mechanism.
- **Price Aggregator:** An off-chain aggregator collects data from stock exchange APIs and pushes updated prices to the on-chain oracle.
- **Reserve Manager:** Oversees USDC reserves, manages liquidity pools, and enforces daily withdrawal limits based on inputs from the price oracle and issuer.
- **Issuer:** Handles the minting and burning of tokens based on USDC inflows and outflows, respectively. The issuer halts operations if insolvency conditions are detected.
- **Lender:** Manages the loan lifecycle, including issuance, repayment, and monitoring of over-collateralization levels.
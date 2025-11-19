# Project Documentation

## Overview

This project on the Hedera blockchain consists of two main modules:

- **Issuer:** Manages the creation and lifecycle of tokenized assets.
- **Lender:** Handles lending pools, liquidity, and the issuance/repayment of loans.

Both modules integrate with Hedera Token Service (HTS) for token operations and use a `PriceOracle` for asset pricing.

---

## Issuer Module

The **Issuer** contract is responsible for managing tokenized assets. It includes the following functionality:

### Key Responsibilities

- **Asset Creation:**  
  - `createTokenizedAsset(string memory _name, string memory _symbol)`  
    Creates a new tokenized asset by deploying a `TokenizedAssetManager` contract and an associated `AssetCollateralReserve`. The asset is initialized with a name and symbol, and any ETH sent is forwarded to the new contract.

- **Token Management:**  
  - `mint(string memory name, uint64 amount)`  
    Mints a specified amount of tokens for the asset.
  - `burn(string memory name, uint64 amount)`  
    Burns a specified amount of tokens.
  - `grantKYC(string memory name, address account)`  
    Grants KYC clearance to an account, enabling participation in asset transactions.

- **Asset Trading:**  
  - `purchaseAsset(string memory name, uint64 amount)`  
    Allows users to purchase assets. It calculates the total cost using the price from the `PriceOracle`, transfers USDC from the buyer to the reserve, and then airdrops tokens to the buyer.
  - `sellAsset(string memory name, uint64 suppliedAssets)`  
    Enables users to sell their assets back to the contract. The process involves transferring tokens from the seller, refunding USDC from the reserve, and handling collateral withdrawals.

### Events

- **AssetPurchased:**  
  Emitted when an asset is purchased, logging the asset name, amount, and buyer address.
- **AssetSold:**  
  Emitted when an asset is sold, logging the asset name, amount, and seller address.

---

## Lender Module

The **Lender** contract manages lending pools and related loan functionalities.

### Key Responsibilities

- **Lending Pool Management:**  
  - `addLenderPool(address asset, string memory lender_token_name, string memory lender_token_symbol)`  
    Deploys a new `LendingTokenReserve` contract for the specified asset. This reserve will handle token minting, liquidity, and collateral management.
  - `getLpTokenAddress(address asset)` and `getReserveAddress(address asset)`  
    Provide lookup functions for the lending pool token and reserve contract addresses.

- **Liquidity Provision:**  
  - `provideLiquidity(address asset, uint64 amount)`  
    Allows users to deposit USDC into the lending pool. USDC is transferred from the user to the reserve, and the reserve mints and airdrops lending tokens to the user.
  - `withdrawLiquidity(address asset, uint64 amount)`  
    Enables users to withdraw their liquidity. Tokens are transferred back to the reserve, which burns them and returns USDC to the user. (Note: Reward distribution is a planned enhancement.)

- **Loan Issuance:**  
  - `takeOutLoan(address asset, uint64 amount)`  
    Lets users take out a loan by:
    - Calculating the required collateral using a 125% collateralization ratio.
    - Determining a liquidation price (90% of the asset’s USDC price).
    - Computing the repayment amount (110% of the loan amount).
    - Transferring collateral from the borrower to the reserve.
    - Issuing the loan amount in USDC and recording the loan details.

- **Loan Repayment:**  
  - `repayOutstandingLoan(address asset)`  
    Handles loan repayment by transferring the USDC repayment from the borrower, refunding the locked collateral, and updating the loan’s status as repaid.

### Internal Mechanics in LendingTokenReserve

The `LendingTokenReserve` contract (instantiated within the Lender module) handles:

- **Token Operations:**  
  Minting and burning of reserve tokens, airdropping tokens to liquidity providers, and managing token associations via HTS.
  
- **Loan Record Keeping:**  
  Maintains a mapping of active loans with details such as the loan amount, collateral amount, liquidation price, and repayment amount. Functions are provided to record, liquidate, and repay loans.

- **Asset and USDC Transfers:**  
  Leverages HTS functions to handle the transfer of USDC and collateral assets, ensuring that all transfers are validated against Hedera’s response codes.

---

## Integration with Hedera Token Service (HTS)

Both modules heavily rely on HTS for:

- Creating fungible tokens.
- Minting and burning tokens.
- Transferring tokens (USDC, asset tokens, lending pool tokens).
- Airdropping tokens.

These interactions ensure that all operations are compliant with Hedera’s standards and that token transfers are secure and reliable.

--------


# Frontend Integration Guide

This document outlines the steps for integrating your smart contracts on the frontend. It focuses on user interactions where the user (or secondary user) acts as the operator. Admin actions are handled separately.

---

## Issuer Module

### 1. Request KYC Verification

**Purpose:**  
Allow the admin to grant KYC so that users can trade tokenized assets.

**User Flow:**  
- **Admin Action:** Trigger a transaction that calls `grantKYC` with the target user’s address.

**Example Code:**

```javascript
import { ContractExecuteTransaction, ContractFunctionParameters } from "@hashgraph/sdk";

async function grantKYC(userAddress) {
  const contractId = "0.0.xxxx"; // Issuer contract ID
  const tx = new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(4_000_000)
    .setFunction("grantKYC", new ContractFunctionParameters()
      .addString("Safaricom")
      .addAddress(userAddress)
    );
  const signedTx = await tx.freezeWith(client).sign(adminPrivateKey); // Admin signs
  const txResponse = await signedTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  console.log("KYC status:", receipt.status.toString());
}
```

---

### 2. Associate Token

**Purpose:**  
Users must associate their account with a token before holding or trading it.

**User Flow:**  
- **Action:** The user connects their wallet and initiates token association.

**Example Code:**

```javascript
import { TokenAssociateTransaction, TokenId } from "@hashgraph/sdk";

async function associateToken(tokenAddress, userAccountId, userPrivateKey) {
  const tx = new TokenAssociateTransaction()
    .setTokenIds([TokenId.fromSolidityAddress(tokenAddress)])
    .setAccountId(userAccountId);
  const signedTx = await tx.freezeWith(client).sign(userPrivateKey);
  const txResponse = await signedTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  console.log("Association status:", receipt.status.toString());
}
```

---

### 3. Purchase Token

**Purpose:**  
Users can purchase a tokenized asset by sending USDC to the reserve and receiving the asset in return.

**User Flow:**  
- **Action:** The user initiates a purchase transaction via their connected wallet.

**Example Code:**

```javascript
import { ContractExecuteTransaction, ContractFunctionParameters, Hbar } from "@hashgraph/sdk";

async function purchaseAsset() {
  const contractId = "0.0.xxxx"; // Issuer contract ID
  const tx = new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(4_000_000)
    .setFunction("purchaseAsset", new ContractFunctionParameters()
      .addString("Safaricom")
      .addUint64(100) // Purchase 100 tokens
    )
    .setPayableAmount(new Hbar(0)); // If needed
  const signedTx = await tx.freezeWith(client).sign(userPrivateKey); // User signs
  const txResponse = await signedTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  console.log("Purchase status:", receipt.status.toString());
}
```

---

### 4. Sell Token

**Purpose:**  
Enable users to sell their tokens back to the contract in exchange for USDC.

**User Flow:**  
- **Action:** The user signs a transaction to sell tokens.

**Example Code:**

```javascript
import { ContractExecuteTransaction, ContractFunctionParameters } from "@hashgraph/sdk";

async function sellAsset() {
  const contractId = "0.0.xxxx"; // Issuer contract ID
  const tx = new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(4_000_000)
    .setFunction("sellAsset", new ContractFunctionParameters()
      .addString("Safaricom")
      .addUint64(50) // Sell 50 tokens
    );
  const signedTx = await tx.freezeWith(client).sign(userPrivateKey); // User signs
  const txResponse = await signedTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  console.log("Sell status:", receipt.status.toString());
}
```

---

## Lender Module

### 1. Associate LP Tokens

**Purpose:**  
Before interacting with the lending pool, users must associate their account with the LP token.

**User Flow:**  
- **Action:** The user initiates a token association transaction for the LP token.

**Example Code:**

```javascript
import { TokenAssociateTransaction, TokenId } from "@hashgraph/sdk";

async function associateLPTokens(lpTokenSolidityAddress, userAccountId, userPrivateKey) {
  const lpTokenId = TokenId.fromSolidityAddress(lpTokenSolidityAddress);
  const tx = new TokenAssociateTransaction()
    .setTokenIds([lpTokenId])
    .setAccountId(userAccountId);
  const signedTx = await tx.freezeWith(client).sign(userPrivateKey);
  const txResponse = await signedTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  console.log("LP Token Association Status:", receipt.status.toString());
}
```

---

### 2. Approve Lending (USDC Spending)

**Purpose:**  
Users need to approve the contract to spend USDC on their behalf before providing liquidity.

**User Flow:**  
- **Action:** The user approves a USDC allowance for the lending contract.

**Example Code:**

```javascript
import { AccountAllowanceApproveTransaction, TokenAllowance, TokenId, AccountId } from "@hashgraph/sdk";
import Long from "long";

async function approveLendingUSDC(usdcTokenId, userAccountId, spenderContractId, userPrivateKey) {
  const tx = new AccountAllowanceApproveTransaction({
    tokenApprovals: [
      new TokenAllowance({
        tokenId: usdcTokenId,
        ownerAccountId: userAccountId,
        spenderAccountId: AccountId.fromString(spenderContractId),
        amount: Long.fromNumber(1_000 * 1_000_000) // e.g., 1000 USDC
      })
    ]
  });
  const signedTx = await tx.freezeWith(client).sign(userPrivateKey);
  const txResponse = await signedTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  console.log("USDC Allowance Status:", receipt.status.toString());
}
```

---

### 3. Provide Liquidity

**Purpose:**  
Users deposit USDC into the lending pool and receive LP tokens.

**User Flow:**  
- **Action:** The user signs a transaction to provide liquidity.

**Example Code:**

```javascript
import { ContractExecuteTransaction, ContractFunctionParameters, Hbar } from "@hashgraph/sdk";

async function provideLiquidity(safTokenAddress, liquidityAmount, userPrivateKey) {
  const lenderContractId = "0.0.xxxx"; // Lender contract ID
  const tx = new ContractExecuteTransaction()
    .setContractId(lenderContractId)
    .setFunction("provideLiquidity", new ContractFunctionParameters()
      .addAddress(safTokenAddress)
      .addUint64(liquidityAmount) // Amount in micro USDC
    )
    .setGas(3_000_000);
  const signedTx = await tx.freezeWith(client).sign(userPrivateKey);
  const txResponse = await signedTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  console.log("Provide Liquidity Status:", receipt.status.toString());
}
```

---

### 4. Approve Contract to Spend SAF Tokens

**Purpose:**  
Users allow the lending contract to spend a specified amount of SAF tokens for loan-related operations.

**User Flow:**  
- **Action:** The user approves an allowance for SAF tokens.

**Example Code:**

```javascript
import { AccountAllowanceApproveTransaction, TokenAllowance, TokenId, AccountId } from "@hashgraph/sdk";
import Long from "long";

async function approveSAFSpending(safTokenId, userAccountId, spenderContractId, userPrivateKey, amount) {
  const tx = new AccountAllowanceApproveTransaction({
    tokenApprovals: [
      new TokenAllowance({
        tokenId: safTokenId,
        ownerAccountId: userAccountId,
        spenderAccountId: AccountId.fromString(spenderContractId),
        amount: Long.fromNumber(amount)
      })
    ]
  });
  const signedTx = await tx.freezeWith(client).sign(userPrivateKey);
  const txResponse = await signedTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  console.log("SAF Spending Allowance Status:", receipt.status.toString());
}
```

---

### 5. Take Out a Loan

**Purpose:**  
Users lock up collateral (SAF tokens) to obtain a USDC loan from the lending pool.

**User Flow:**  
- **Action:** The user initiates a loan by signing the transaction.

**Example Code:**

```javascript
import { ContractExecuteTransaction, ContractFunctionParameters } from "@hashgraph/sdk";

async function takeOutLoan(safTokenAddress, loanAmount, userPrivateKey) {
  const lenderContractId = "0.0.xxxx"; // Lender contract ID
  const tx = new ContractExecuteTransaction()
    .setContractId(lenderContractId)
    .setFunction("takeOutLoan", new ContractFunctionParameters()
      .addAddress(safTokenAddress)
      .addUint64(loanAmount) // Loan amount in micro USDC
    )
    .setGas(3_000_000);
  const signedTx = await tx.freezeWith(client).sign(userPrivateKey);
  const txResponse = await signedTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  console.log("Take Out Loan Status:", receipt.status.toString());
}
```

---

### 6. Add Allowance for Repayment

**Purpose:**  
Before repaying a loan, users must approve the contract to spend the required USDC for repayment.

**User Flow:**  
- **Action:** The user approves a USDC allowance for repayment.

**Example Code:**

```javascript
import { AccountAllowanceApproveTransaction, TokenAllowance, TokenId, AccountId } from "@hashgraph/sdk";
import Long from "long";

async function addRepaymentAllowance(usdcTokenId, userAccountId, spenderContractId, userPrivateKey, repaymentAmount) {
  const tx = new AccountAllowanceApproveTransaction({
    tokenApprovals: [
      new TokenAllowance({
        tokenId: usdcTokenId,
        ownerAccountId: userAccountId,
        spenderAccountId: AccountId.fromString(spenderContractId),
        amount: Long.fromNumber(repaymentAmount)
      })
    ]
  });
  const signedTx = await tx.freezeWith(client).sign(userPrivateKey);
  const txResponse = await signedTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  console.log("Repayment Allowance Status:", receipt.status.toString());
}
```

---

### 7. Repay a Loan

**Purpose:**  
Users repay their outstanding loan to unlock their collateral.

**User Flow:**  
- **Action:** The user signs a transaction to repay the loan, triggering the collateral refund.

**Example Code:**

```javascript
import { ContractExecuteTransaction, ContractFunctionParameters } from "@hashgraph/sdk";

async function repayLoan(safTokenAddress, userPrivateKey) {
  const lenderContractId = "0.0.xxxx"; // Lender contract ID
  const tx = new ContractExecuteTransaction()
    .setContractId(lenderContractId)
    .setFunction("repayOutstandingLoan", new ContractFunctionParameters()
      .addAddress(safTokenAddress)
    )
    .setGas(3_000_000);
  const signedTx = await tx.freezeWith(client).sign(userPrivateKey);
  const txResponse = await signedTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  console.log("Repay Loan Status:", receipt.status.toString());
}
```

---

## Best Practices

- **Wallet Integration:**  
  Use secure wallet integrations (like HashPack) to sign transactions instead of exposing private keys directly in the frontend.

- **Separate Contexts:**  
  Maintain separate flows for user and admin actions. Each should use its own client instance or wallet provider.

- **Error Handling:**  
  Ensure robust error handling in your UI to inform users of any transaction failures.

- **Gas Estimation:**  
  Dynamically estimate gas limits to avoid over- or under-provisioning.

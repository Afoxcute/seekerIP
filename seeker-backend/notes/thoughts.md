To implement token minting and burning in a Hedera smart contract for a lending protocol, you'll need to use the Hedera Token Service (HTS) system contract functions. Here's how you can approach this:

## Token Management with Smart Contracts

For a lending protocol, you'll want your smart contract to control the minting and burning of tokens based on lending and repayment activities. Hedera provides system contract functions that allow you to programmatically manage tokens.

### Setting Up Token with Supply Key

First, you need to create a token with a supply key that allows minting and burning:

```solidity
pragma solidity ^0.8.0;

interface HederaTokenService {
    function mintToken(address token, int64 amount, bytes[] calldata metadata) external returns (int64 newTotalSupply);
    function burnToken(address token, int64 amount, bytes[] calldata metadata) external returns (int64 newTotalSupply);
}

contract TokenManager {
    HederaTokenService constant hts = HederaTokenService(0x167);
    address public tokenAddress; // HTS token with a supply key

    constructor(address _tokenAddress) {
        tokenAddress = _tokenAddress;
    }

    function mintTokens(int64 amount) external {
        hts.mintToken(tokenAddress, amount, new bytes[](0));
    }

    function burnTokens(int64 amount) external {
        hts.burnToken(tokenAddress, amount, new bytes[](0));
    }
}
```

This example shows the basic structure for minting and burning tokens using the HTS system contract at address `0x167` [Extending Token Management with Smart Contracts](https://docs.hedera.com/hedera/core-concepts/smart-contracts/understanding-hederas-evm-differences-and-compatibility/for-hedera-native-developers-adding-smart-contract-functionality/extending-token-management-with-smart-contracts).

### Implementing Access Control

For a lending protocol, you'll want to implement access control to ensure only authorized operations can mint or burn tokens:

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

interface HederaTokenService {
    function createFungibleToken(
        address treasury,
        uint64 initialSupply,
        string memory tokenName,
        string memory tokenSymbol,
        uint32 decimals
    ) external returns (address tokenAddress);

    function mintToken(address token, int64 amount, bytes[] calldata metadata) external returns (int64 newTotalSupply);

    function burnToken(address token, int64 amount, bytes[] calldata metadata) external returns (int64 newTotalSupply);
}

contract TokenManager {
    HederaTokenService constant hts = HederaTokenService(0x167);
    address public token;
    address public owner;

    constructor(address treasury) {
        owner = msg.sender;
        // Create a fungible token with an initial supply of 1,000 units
        token = hts.createFungibleToken(treasury, 1000, "MyHederaToken", "MHT", 8);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    // Mint additional tokens when users deposit collateral
    function mintTokensForLending(int64 amount) external onlyOwner {
        hts.mintToken(token, amount, new bytes[](0));
    }

    // Burn tokens when loans are repaid
    function burnTokensAfterRepayment(int64 amount) external onlyOwner {
        hts.burnToken(token, amount, new bytes[](0));
    }
}
```

This example is adapted from [Token Management with Hedera Token Service](https://docs.hedera.com/hedera/core-concepts/smart-contracts/understanding-hederas-evm-differences-and-compatibility/for-evm-developers-migrating-to-hedera/token-management-with-hedera-token-service).

### Contract as Token Treasury

For your lending protocol, you might want the contract itself to hold the tokens. When creating the token, set the contract address as the treasury:

```solidity
token = hts.createFungibleToken(address(this), initialSupply, tokenName, tokenSymbol, decimals);
```

This way, the contract will be the treasury for the token and can manage the token supply directly.

### Handling Zero Token Operations

Hedera also supports minting or burning zero tokens, which can be useful for certain operations in your lending protocol:

```solidity
// Mint 0 tokens (e.g., for record-keeping)
function recordLoanWithoutMinting() external onlyOwner {
    hts.mintToken(token, 0, new bytes[](0));
}
```

This functionality is demonstrated in [How to Pass Zero Token Values to Hedera Contracts](https://hedera.com/blog/how-to-pass-zero-token-values-to-hedera-contracts).

### Important Considerations

1. **Supply Key Management**: The supply key controls minting and burning operations. Ensure it's securely managed.

2. **Access Control**: Implement proper access controls to prevent unauthorized minting or burning.

3. **Token Association**: Accounts that will receive tokens must be associated with the token first.

4. **Events for Tracking**: Use events to track minting and burning operations:
   ```solidity
   event TokensMinted(address indexed to, int64 amount);
   event TokensBurned(address indexed from, int64 amount);
   ```

By following these patterns, you can create a lending protocol on Hedera that effectively manages token supply based on lending and repayment activities.
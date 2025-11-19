# IP Asset Usage Guide

This guide explains how to use your deployed IP Asset Management System to create and manage intellectual property assets on Hedera Testnet.

## 🚀 Quick Start

### Prerequisites
- ✅ Contracts deployed on Hedera Testnet
- ✅ `.env` file with your `PRIVATE_KEY`
- ✅ Sufficient testnet HBAR for gas fees

### Contract Addresses
- **IPAssetNFT**: `0x227f1cDcBeb442F07e4A2119ab0AD83C21E6fFE5`
- **IPAssetManagerV2**: `0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a`

## 📝 Scripts Overview

### 1. Simple IP Asset Creation
**File**: `scripts/create-simple-ip-asset.js`
**Purpose**: Creates a basic IP asset without complex licensing
**Best for**: Beginners, testing, simple use cases

### 2. Full IP Asset Creation
**File**: `scripts/create-ip-assets.js`
**Purpose**: Complete workflow including licensing and token minting
**Best for**: Production use, full feature testing

## 🎯 How to Use

### Option 1: Simple IP Asset Creation

```bash
npx hardhat run scripts/create-simple-ip-asset.js --network hedera_testnet
```

This script will:
1. ✅ Connect to your deployed contracts
2. ✅ Create a simple IP asset
3. ✅ Display the asset ID and details
4. ✅ Provide HashScan links for verification

### Option 2: Full IP Asset Creation

```bash
npx hardhat run scripts/create-ip-assets.js --network hedera_testnet
```

This script will:
1. ✅ Register an IP asset
2. ✅ Attach license terms
3. ✅ Mint license tokens
4. ✅ Create royalty vaults
5. ✅ Complete the full IP asset lifecycle

## 📚 IP Asset Types

Your system supports various types of intellectual property:

- **Digital Art**: Images, graphics, digital designs
- **Books**: Written content, manuscripts, publications
- **Music**: Audio files, compositions, recordings
- **Software**: Code, applications, algorithms
- **Videos**: Film content, tutorials, presentations
- **Patents**: Inventions, processes, technologies

## 🔐 License Management

### License Types
- **Commercial Licenses**: For business use
- **Personal Licenses**: For individual use
- **Educational Licenses**: For learning institutions
- **Custom Licenses**: Tailored to specific needs

### Revenue Sharing
- Set percentage-based revenue sharing
- Automatic distribution to license holders
- Transparent royalty tracking

## 💰 Revenue Features

### IP Royalty Vault
- Collects payments for IP usage
- Distributes revenue to license holders
- Automatic percentage-based splitting
- Transparent transaction history

### Payment Methods
- Direct ETH payments
- Percentage-based revenue sharing
- One-time licensing fees
- Subscription-based access

## 🛠️ Customization

### Modify IP Asset Data
Edit the script variables to customize your IP asset:

```javascript
const ipAssetName = "Your Custom Name";
const ipAssetDescription = "Your custom description";
const ipAssetURI = "ipfs://YourActualIPFSHash";
const ipAssetType = "Your Custom Type";
const ipAssetCategory = "Your Custom Category";
```

### Custom License Terms
Adjust license parameters:

```javascript
const licenseTerms = {
  name: "Your License Name",
  duration: 365 * 24 * 60 * 60, // Duration in seconds
  revenueShare: 20, // Revenue share percentage
  maxLicenses: 50, // Maximum licenses to sell
  price: ethers.parseEther("0.05"), // Price in ETH
  // ... other parameters
};
```

## 🔍 Verification

### HashScan Explorer
View your contracts and transactions:
- **Testnet**: https://hashscan.io/testnet
- **Mainnet**: https://hashscan.io

### Contract Verification
Your contracts are automatically verified on deployment.

## 📊 Monitoring

### Events to Watch
- `IPAssetRegistered`: New IP asset created
- `LicenseTermsAttached`: License terms added
- `LicenseTokenMinted`: License token sold
- `RevenuePaid`: Payment received
- `RevenueClaimed`: Revenue distributed

### Transaction History
All interactions are recorded on the blockchain for transparency.

## 🚨 Troubleshooting

### Common Issues

1. **"Insufficient funds"**
   - Ensure you have enough testnet HBAR
   - Get more from [Hedera Portal](https://portal.hedera.com/)

2. **"Contract not found"**
   - Verify contract addresses are correct
   - Check if contracts are deployed

3. **"Transaction failed"**
   - Check gas limits
   - Verify contract state
   - Review error messages

### Debug Mode
Enable detailed error logging:
```bash
npx hardhat run scripts/create-simple-ip-asset.js --network hedera_testnet --verbose
```

## 🔗 Useful Links

- **Hedera Documentation**: https://docs.hedera.com/
- **HashScan Explorer**: https://hashscan.io/testnet
- **Hedera Portal**: https://portal.hedera.com/
- **Community Discord**: https://discord.gg/hedera

## 📞 Support

If you encounter issues:
1. Check the error messages
2. Verify your environment setup
3. Review contract deployment status
4. Check HashScan for transaction details

---

**Happy IP Asset Management! 🎉**

Your intellectual property is now secured on the blockchain with transparent licensing and revenue sharing capabilities. 
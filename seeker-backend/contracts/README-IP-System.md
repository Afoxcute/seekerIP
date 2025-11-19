# Intellectual Property Asset Management System

A comprehensive smart contract system built on Hedera for managing intellectual property assets, licensing, and revenue distribution through NFTs and automated royalty vaults.

## Overview

This system allows creators to:
- **Register IP assets** as NFTs with encrypted content storage
- **Attach license terms** with customizable pricing and revenue sharing
- **Mint license tokens** for users to access IP assets
- **Receive payments** and automatically distribute royalties
- **Transfer ownership** of IP assets with associated NFTs
- **Manage revenue sharing** between asset owners and licensees

## Architecture

The system consists of three main contracts:

### 1. IPAssetNFT (`IPAssetNFT.sol`)
- ERC721 NFT contract representing IP asset ownership
- Minted automatically when IP assets are registered
- Integrated with the IP Asset Manager for controlled minting/burning

### 2. IPAssetManagerV2 (`IPAssetManagerV2.sol`)
- Core contract managing IP assets, licenses, and revenue
- Handles asset registration, licensing, and royalty distribution
- Integrates with Hedera Token Service for blockchain operations

### 3. IPAssetSystemDeployer (`deploy-ip-system.sol`)
- Deployment script that sets up the entire system
- Links contracts and sets proper ownership relationships

## Key Features

### 🔐 IP Asset Registration
- Register off-chain IP (books, characters, drawings, etc.) as on-chain assets
- Automatic NFT minting representing ownership
- IPFS hash storage for encrypted content
- Metadata URI support for rich asset information

### 📜 License Management
- Attach customizable license terms to IP assets
- Set pricing, duration, and maximum license count
- Encrypted terms storage for detailed licensing agreements
- Revenue sharing percentages for licensees

### 🎫 License Token Minting
- Users can purchase licenses with KES payments
- Automatic license token generation
- Time-based expiration (or perpetual)
- One license per user per asset

### 💰 Revenue & Royalty System
- Accept payments for IP asset usage
- Automatic royalty distribution based on license terms
- Royalty vaults for each IP asset
- Claimable royalties for asset owners and licensees

### 🔄 Asset Transfer
- Transfer IP asset ownership
- Automatic NFT transfer with asset ownership
- Updated royalty vault ownership
- Clean user asset tracking

## Smart Contract Functions

### IP Asset Management

#### `registerIPAsset(name, description, metadataURI, ipfsHash)`
Registers a new IP asset and mints an NFT.
- **Parameters:**
  - `name`: Human-readable name of the IP asset
  - `description`: Detailed description
  - `metadataURI`: URI containing metadata (IPFS hash, etc.)
  - `ipfsHash`: IPFS hash of the encrypted IP content
- **Returns:** Asset ID
- **Events:** `IPAssetRegistered`

#### `transferIPAsset(assetId, newOwner)`
Transfers ownership of an IP asset and its associated NFT.
- **Parameters:**
  - `assetId`: ID of the IP asset to transfer
  - `newOwner`: New owner address
- **Events:** `IPAssetTransferred`

### License Management

#### `attachLicenseTerms(assetId, terms, price, duration, maxLicenses, encryptedTerms, revenueShare)`
Attaches license terms to an IP asset.
- **Parameters:**
  - `assetId`: ID of the IP asset
  - `terms`: Human-readable license terms
  - `price`: License price in KES
  - `duration`: Duration in seconds (0 for perpetual)
  - `maxLicenses`: Maximum number of licenses that can be issued
  - `encryptedTerms`: Encrypted or IPFS hash of detailed terms
  - `revenueShare`: Revenue share percentage for licensees (basis points)
- **Events:** `LicenseTermsAttached`

#### `mintLicenseToken(assetId, licenseId)`
Mints a license token for an IP asset.
- **Parameters:**
  - `assetId`: ID of the IP asset
  - `licenseId`: ID of the license terms
- **Payment:** Must send KES equal to license price
- **Events:** `LicenseTokenMinted`

#### `revokeLicenseToken(tokenId)`
Revokes a license token (only asset owner).
- **Parameters:**
  - `tokenId`: ID of the license token to revoke
- **Events:** `LicenseTokenRevoked`

### Revenue & Royalty Management

#### `payIPAsset(assetId, reason)`
Pays revenue to an IP asset.
- **Parameters:**
  - `assetId`: ID of the IP asset
  - `reason`: Reason for the payment
- **Payment:** Must send KES amount
- **Events:** `RevenueReceived`

#### `claimRoyalties(assetId)`
Claims royalties from the vault.
- **Parameters:**
  - `assetId`: ID of the IP asset
- **Events:** `RoyaltyClaimed`

### Query Functions

#### `getIPAsset(assetId)`
Returns complete IP asset information.

#### `getLicenseTerms(licenseId)`
Returns license terms details.

#### `getLicenseToken(tokenId)`
Returns license token information.

#### `getUserAssets(user)`
Returns array of asset IDs owned by a user.

#### `getUserLicenses(user)`
Returns array of license token IDs owned by a user.

#### `hasValidLicense(assetId, user)`
Checks if a user has a valid license for an asset.

#### `getRoyaltyBalance(assetId, user)`
Returns royalty balance for a user in an asset's vault.

## Usage Examples

### 1. Register an IP Asset

```solidity
// Register a book as an IP asset
uint256 assetId = await ipAssetManager.registerIPAsset(
    "My Creative Book",
    "A revolutionary book about blockchain technology",
    "ipfs://QmExampleMetadataHash",
    "QmExampleIPFSHash"
);
```

### 2. Attach License Terms

```solidity
// Attach commercial license terms
await ipAssetManager.attachLicenseTerms(
    assetId,
    "Commercial use allowed with attribution",
    ethers.parseEther("100"), // 100 KES
    365 * 24 * 60 * 60, // 1 year
    10, // Max 10 licenses
    ethers.keccak256(ethers.toUtf8Bytes("encrypted_terms")),
    2000 // 20% revenue share
);
```

### 3. Mint a License

```solidity
// User purchases a license
await ipAssetManager.mintLicenseToken(
    assetId,
    licenseId,
    { value: ethers.parseEther("100") }
);
```

### 4. Pay Revenue

```solidity
// Pay revenue for book sales
await ipAssetManager.payIPAsset(
    assetId,
    "Book sales revenue",
    { value: ethers.parseEther("1000") }
);
```

### 5. Claim Royalties

```solidity
// Asset owner claims royalties
await ipAssetManager.claimRoyalties(assetId);

// Licensee claims royalties
await ipAssetManager.claimRoyalties(assetId);
```

## Revenue Distribution

The system automatically distributes revenue based on license terms:

1. **Asset Owner**: Receives the remaining percentage after licensee shares
2. **Licensees**: Receive their configured revenue share percentage
3. **Distribution**: Happens automatically when revenue is paid
4. **Claiming**: Users must actively claim their royalties

### Example Revenue Flow

```
Revenue: 1000 KES
Licensee Share: 20% (200 KES)
Asset Owner Share: 80% (800 KES)

Licensee receives: 200 KES
Asset Owner receives: 800 KES
```

## Security Features

- **Access Control**: Only asset owners can modify their assets
- **Reentrancy Protection**: Prevents reentrancy attacks
- **Ownership Verification**: Ensures only authorized users can perform actions
- **Payment Validation**: Verifies sufficient payment for licenses
- **Duplicate Prevention**: Prevents duplicate IPFS hash registration

## Events

The system emits comprehensive events for tracking:

- `IPAssetRegistered`: When a new IP asset is registered
- `LicenseTermsAttached`: When license terms are attached
- `LicenseTokenMinted`: When a license token is minted
- `RevenueReceived`: When revenue is paid to an asset
- `RoyaltyClaimed`: When royalties are claimed
- `LicenseTokenRevoked`: When a license is revoked
- `IPAssetTransferred`: When asset ownership is transferred

## Deployment

### 1. Deploy the System

```solidity
// Deploy the entire system
IPAssetSystemDeployer deployer = new IPAssetSystemDeployer();

// Get deployed addresses
(address nftContract, address managerContract) = deployer.getDeployedAddresses();
```

### 2. Set Ownership

```solidity
// Transfer manager ownership to desired address
deployer.transferManagerOwnership(newOwnerAddress);
```

### 3. Verify Integration

```solidity
// Verify NFT contract is linked to manager
address manager = await ipAssetNFT.ipAssetManager();
require(manager == managerContractAddress, "Integration failed");
```

## Testing

Run the comprehensive test suite:

```bash
npm test
```

The test suite covers:
- Contract deployment
- IP asset registration
- License management
- Revenue distribution
- Asset transfers
- Emergency functions
- Edge cases and security

## Gas Optimization

The contracts are optimized for gas efficiency:
- Efficient storage patterns
- Minimal external calls
- Optimized loops and mappings
- Batch operations where possible

## Hedera Integration

The system leverages Hedera's features:
- **Hedera Token Service**: For token operations
- **Key Management**: Secure key handling
- **Expiry Management**: Automatic token renewal
- **Response Codes**: Standardized error handling

## Future Enhancements

Potential improvements:
- **Batch Operations**: Register multiple assets at once
- **Advanced Licensing**: More complex license structures
- **Marketplace Integration**: Direct asset trading
- **Governance**: DAO-style decision making
- **Cross-chain**: Multi-blockchain support

## License

This project is licensed under the MIT License.

## Support

For questions and support, please refer to the test files and documentation. 
# HTS KYC Implementation for Intellectual Property Assets

This document describes the implementation of Hedera Token Service (HTS) KYC functionality for the Intellectual Property Asset management system.

## Overview

The HTS KYC implementation provides Know Your Customer (KYC) enforcement for Intellectual Property NFTs on the Hedera network. This ensures compliance with regulatory requirements by controlling who can receive and transfer IP Asset NFTs.

## Architecture

### Contracts

1. **IPAssetHTSKYC.sol** - Main HTS KYC-enabled NFT contract
   - Creates HTS NFT collections with KYC enforcement
   - Manages KYC keys (SUPPLY, ADMIN, KYC)
   - Handles minting, burning, and KYC operations
   - Integrates with Hedera Token Service

2. **IPAssetManagerV2.sol** - Updated IP Asset Manager
   - Integrates with IPAssetHTSKYC contract
   - Provides KYC management functions
   - Handles IP asset registration with KYC enforcement

### Database Schema

New tables added for KYC tracking:

- **ip_asset_kyc_status** - Tracks KYC status per account per IP asset
- **hts_kyc_keys** - Stores HTS KYC keys for contract management
- **hts_kyc_events** - Logs all KYC-related events

Updated **ip_assets** table with HTS fields:
- `hts_token_address` - HTS token address for KYC enforcement
- `nft_token_id` - HTS NFT token ID
- `kyc_required` - Whether KYC is required for this asset

## Key Features

### 1. KYC Key Management
- **SUPPLY Key**: Controls minting and burning of NFTs
- **ADMIN Key**: Manages token-level properties
- **KYC Key**: Grants/revokes KYC status for accounts

### 2. KYC Operations
- **Grant KYC**: Allow an account to receive/transfer NFTs
- **Revoke KYC**: Prevent an account from receiving/transferring NFTs
- **Update KYC Key**: Rotate KYC key for security/compliance

### 3. NFT Operations
- **Minting**: Create IP Asset NFTs with KYC enforcement
- **Burning**: Destroy IP Asset NFTs
- **Transfer**: Transfer NFTs between KYC-approved accounts

## Usage

### Deployment

1. Deploy the HTS KYC system:
```bash
npx hardhat run scripts/deployHTSKYCIPAssets.ts --network testnet
```

2. Run database migration:
```bash
npx prisma migrate deploy
```

### Testing

1. Test comprehensive functionality:
```bash
npx hardhat run scripts/testComprehensiveHTSKYC.ts --network testnet
```

2. Test individual operations:
```bash
# Test minting
npx hardhat run scripts/testMintIPAssetKYC.ts --network testnet

# Test burning
npx hardhat run scripts/testBurnIPAssetKYC.ts --network testnet

# Test KYC management
npx hardhat run scripts/testKYCManagement.ts --network testnet
```

### API Integration

Use the HTSKYCService for programmatic access:

```typescript
import { HTSKYCService } from './lib/hts-kyc-service';

const kycService = new HTSKYCService(prisma, {
  ipAssetHTSKYCAddress: '0x...',
  ipAssetManagerAddress: '0x...',
  htsTokenAddress: '0x...',
  provider: provider,
  signer: signer
});

// Grant KYC to an account
await kycService.grantKYC('0x1234...');

// Register IP Asset with KYC
const result = await kycService.registerIPAsset(
  'My IP Asset',
  'Description',
  'ipfs://...',
  'QmHash...'
);

// Check KYC status
const status = await kycService.getKYCStatus('0x1234...');
```

## Workflow

### 1. Initial Setup
1. Deploy IPAssetHTSKYC contract
2. Create HTS NFT collection with KYC keys
3. Deploy IPAssetManagerV2 with HTS contract address
4. Grant KYC to deployer account

### 2. IP Asset Registration
1. User calls `registerIPAsset()` on IPAssetManagerV2
2. Contract mints HTS NFT with KYC enforcement
3. Database updated with HTS information
4. NFT can only be transferred to KYC-approved accounts

### 3. KYC Management
1. Admin grants KYC to accounts via `grantKYC()`
2. Database tracks KYC status per account per asset
3. Revoke KYC via `revokeKYC()` when needed
4. Update KYC keys via `updateKYCKey()` for security

### 4. NFT Operations
1. Mint NFTs only to KYC-approved accounts
2. Transfer NFTs between KYC-approved accounts
3. Burn NFTs (requires approval from owner)
4. All operations logged in database

## Security Considerations

1. **Key Management**: KYC keys should be stored securely and rotated regularly
2. **Access Control**: Only contract owner can manage KYC operations
3. **Event Logging**: All KYC events are logged for audit purposes
4. **Database Integrity**: KYC status is tracked both on-chain and off-chain

## Compliance Features

1. **KYC Enforcement**: NFTs cannot be transferred to non-KYC accounts
2. **Audit Trail**: Complete history of KYC operations
3. **Key Rotation**: Ability to update KYC keys for compliance
4. **Status Tracking**: Real-time KYC status per account per asset

## Error Handling

The system handles various error scenarios:

- **KYC Not Granted**: Transactions fail if recipient lacks KYC
- **Key Rotation**: Contract loses KYC control after key update
- **Association Required**: Accounts must associate with HTS token
- **Gas Limits**: Appropriate gas limits set for all operations

## Monitoring

Monitor the system using:

1. **Event Logs**: Track KYC events via blockchain events
2. **Database Queries**: Query KYC status and history
3. **Contract State**: Monitor contract state and key changes
4. **Transaction History**: Track all KYC-related transactions

## Future Enhancements

1. **Automated KYC**: Integration with external KYC providers
2. **Multi-signature Keys**: Enhanced security for KYC key management
3. **Compliance Reporting**: Automated compliance reporting
4. **Integration APIs**: REST APIs for KYC management

## Troubleshooting

### Common Issues

1. **Association Required**: Ensure accounts are associated with HTS token
2. **KYC Not Granted**: Grant KYC before transferring NFTs
3. **Gas Limits**: Increase gas limits for complex operations
4. **Key Rotation**: Update KYC keys carefully to maintain control

### Debug Commands

```bash
# Check contract state
npx hardhat console --network testnet

# Query database
npx prisma studio

# Monitor events
npx hardhat run scripts/monitorKYCEvents.ts --network testnet
```

## Support

For issues or questions:
1. Check the test scripts for examples
2. Review the contract code for implementation details
3. Consult Hedera documentation for HTS specifics
4. Check database logs for KYC status tracking


# IP Asset Manager Integration

This document describes the integration of the IP Asset Manager smart contracts with the Seeker backend, including the migration from Drizzle SQLite to Prisma PostgreSQL.

## Overview

The IP Asset Manager system allows users to:
- Register intellectual property assets as NFTs
- Create and sell licenses for IP assets
- Manage royalty distribution
- Track revenue and payments
- Handle encrypted license terms

## Architecture

### Smart Contracts
- **IPAssetManagerV2**: `0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a`
- **IPAssetNFT**: `0x227f1cDcBeb442F07e4A2119ab0AD83C21E6fFE5`
- **IPAssetManagerEnhanced**: `0x77A7aB9f54b2132B51acF6f36A624b9dcf264ce3`
- **IPAssetManager**: `0x30BD264110f71916f338B132EdD4d35C38138468`

### Database Schema (Prisma PostgreSQL)

#### Core Models
- `IPAsset`: Intellectual property assets
- `License`: License offerings for IP assets
- `LicenseMint`: License purchases
- `Royalty`: Revenue sharing configuration
- `RoyaltyShare`: Individual royalty holdings
- `RoyaltyClaim`: Royalty claim transactions
- `Payment`: Revenue payments to IP assets
- `IPAssetTransaction`: Transaction history
- `User`: User management and KYC
- `PlatformConfig`: Platform configuration

#### Legacy Models (Kept for Compatibility)
- `Asset`: Basic asset information
- `KYC`: KYC status records

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file with the following variables:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/seeker_db"

# Hedera Network Configuration
NETWORK="testnet"
HEDERA_NETWORK="testnet"
HEDERA_RPC_URL="https://testnet.hashio.io/api"

# Contract Addresses
IP_ASSET_MANAGER_V2_ADDRESS="0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a"
IP_ASSET_NFT_ADDRESS="0x227f1cDcBeb442F07e4A2119ab0AD83C21E6fFE5"
IP_ASSET_MANAGER_ENHANCED_ADDRESS="0x77A7aB9f54b2132B51acF6f36A624b9dcf264ce3"
IP_ASSET_MANAGER_ADDRESS="0x30BD264110f71916f338B132EdD4d35C38138468"

# Platform Configuration
PLATFORM_FEE_PERCENTAGE="250"
PLATFORM_FEE_COLLECTOR="0x9404966338eB27aF420a952574d777598Bbb58c4"

# Environment
NODE_ENV="development"
```

### 2. Database Setup

```bash
# Generate Prisma client
pnpm run db:generate

# Create and run migrations
pnpm run db:migrate

# Push schema to database (alternative to migrate)
pnpm run db:push

# Seed database with sample data
pnpm run db:seed
```

### 3. Start the System

```bash
# Start IP Asset Manager event indexing
pnpm run ip-asset:start

# Or start the entire system
pnpm run start
```

## API Usage

### IP Asset Management

```typescript
import IPAssetManagerService from './lib/ip-asset-manager';

const service = new IPAssetManagerService();

// Register a new IP Asset
const ipAsset = await service.registerIPAsset(
  'My Invention',
  'A revolutionary new technology',
  'ipfs://QmMetadata',
  'QmContentHash',
  1500, // 15% royalty
  '0xUserAddress'
);

// Get IP Asset details
const asset = await service.getIPAsset(ipAssetId);

// Get user's IP Assets
const userAssets = await service.getUserIPAssets('0xUserAddress');
```

### License Management

```typescript
// Create a license
const license = await service.createLicense(
  ipAssetId,
  'Commercial usage rights',
  'encrypted-terms-hash',
  ethers.parseEther('1.0'),
  BigInt(100),
  'commercial'
);

// Record license mint
await service.mintLicense(
  licenseId,
  buyerAddress,
  BigInt(1),
  ethers.parseEther('1.0'),
  transactionHash
);
```

### Revenue Management

```typescript
// Record a payment
await service.recordPayment(
  ipAssetId,
  payerAddress,
  ethers.parseEther('0.1'),
  'Revenue from sales',
  transactionHash
);

// Claim royalties
await service.claimRoyalty(
  royaltyId,
  claimantAddress,
  ethers.parseEther('0.05'),
  transactionHash
);
```

## Event Indexing

The system includes an event indexer that monitors blockchain events and syncs them with the database:

### Supported Events
- `IPAssetRegistered`: New IP assets registered
- `LicenseAttached`: Licenses attached to IP assets
- `LicenseTokenMinted`: License tokens purchased
- `RevenuePaid`: Revenue payments made
- `RoyaltyClaimed`: Royalties claimed
- `IPAssetTransferred`: IP asset ownership transfers

### Running the Indexer

```bash
# Start event indexing
pnpm run ip-asset:index:events

# The indexer will:
# 1. Monitor new blocks
# 2. Process transactions involving IP Asset contracts
# 3. Update database with event data
# 4. Track transaction history
```

## Database Queries

### Analytics Queries

```typescript
// Get IP Asset analytics
const analytics = await service.getIPAssetAnalytics(ipAssetId);

// Get platform configuration
const config = await service.getPlatformConfig();

// Get user KYC status
const user = await service.createUser(address);
await service.updateUserKYC(address, 'approved');
```

### Complex Queries

```typescript
// Get all IP Assets with their licenses and royalties
const assets = await prisma.iPAsset.findMany({
  include: {
    licenses: {
      include: {
        mints: true
      }
    },
    royalties: {
      include: {
        shares: true,
        claims: true
      }
    },
    payments: true,
    transactions: true
  }
});

// Get revenue statistics
const revenueStats = await prisma.payment.groupBy({
  by: ['ipAssetId'],
  _sum: {
    amount: true
  },
  _count: true
});
```

## Migration from Drizzle

### Removed Tables
- `realwordAssetTimeseries`
- `withdrawnLiquidity`
- `providedLiquidity`
- `loanRepayment`
- `liquidations`
- `loans`
- `lendingReserves`
- `prices`
- `transactions`

### Kept Tables
- `assets` (simplified)
- `kyc` (simplified)

### New Tables
- All IP Asset Manager related tables (see schema above)

## Development

### Adding New Features

1. **Database Schema**: Update `prisma/schema.prisma`
2. **Service Layer**: Add methods to `lib/ip-asset-manager.ts`
3. **Event Handling**: Update `events/ip-asset-manager.indexer.ts`
4. **Configuration**: Update `env.config.ts`

### Testing

```bash
# Run IP Asset tests
pnpm run test:ip-assets

# Test database integration
pnpm run test:ip-asset-integration
```

### Database Studio

```bash
# Open Prisma Studio
pnpm run db:studio
```

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure PostgreSQL is running and DATABASE_URL is correct
2. **Contract Events**: Verify contract addresses and RPC URL
3. **Migration Errors**: Run `pnpm run db:push` to sync schema
4. **Event Indexing**: Check logs for transaction processing errors

### Logs

The system provides detailed logging for:
- Database operations
- Contract interactions
- Event processing
- Error handling

## Security Considerations

- All sensitive data is encrypted
- License terms are stored as hashes
- Access control through KYC system
- Platform fees are configurable
- Transaction history is immutable

## Performance

- Prisma provides optimized queries
- Event indexing is asynchronous
- Database indexes on frequently queried fields
- Connection pooling for scalability

## Future Enhancements

- Multi-chain support
- Advanced analytics dashboard
- Automated royalty distribution
- Integration with IPFS
- Mobile app support
- Advanced licensing models 
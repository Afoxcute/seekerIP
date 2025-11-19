# IP Asset Locker System - Seeker Backend Integration

The IP Asset Locker System allows users to lock their IP assets (that are not in arbitration) and receive HBAR equivalent tokens in return. This system integrates with the existing Seeker backend IP asset management and arbitration systems.

## 🏗️ Architecture Overview

The IP Asset Locker System consists of three core smart contracts integrated with the Seeker backend:

### Core Contracts

- **`IPAssetLocker.sol`** - Main contract that handles locking/unlocking IP assets and minting/burning HBAR tokens
- **`HBAREquivalentToken.sol`** - HTS token representing HBAR equivalent for locked IP assets
- **Integration with existing contracts** - `IPAssetManagerV2.sol` and `IntellectualPropertyArbitration.sol`

### Backend Services

- **`ip-asset-locker-service.ts`** - Service layer for contract interactions
- **`ip-asset-locker.ts`** - API routes for frontend integration
- **Integration with existing backend** - Arbitration and IP asset management services

## 🔄 System Flow

### IP Asset Locking Flow
1. User calls API endpoint `/api/ip-asset-locker/lock` with IP asset ID and HBAR amount
2. Backend service verifies IP asset ownership using `IPAssetManagerV2`
3. Backend service checks arbitration status using `IntellectualPropertyArbitration`
4. If eligible, system locks IP asset and mints HBAR equivalent tokens
5. User receives HBAR equivalent tokens representing their locked IP asset

### IP Asset Unlocking Flow
1. User calls API endpoint `/api/ip-asset-locker/unlock` with IP asset ID and HBAR amount
2. Backend service verifies user owns the locked asset and has sufficient HBAR tokens
3. System burns HBAR equivalent tokens and updates locked asset record
4. IP asset is unlocked (or partially unlocked if amount < total locked)

## 📋 Contract Integration

### IPAssetLocker Contract

**Key Functions:**
- `lockIPAsset(uint256 ipAssetId, uint256 hbarAmount)` - Locks IP asset and mints HBAR tokens
- `unlockIPAsset(uint256 ipAssetId, uint256 hbarAmount)` - Unlocks IP asset and burns HBAR tokens
- `isIPAssetLocked(uint256 ipAssetId)` - Checks if IP asset is locked
- `isIPAssetEligibleForLocking(uint256 ipAssetId)` - Checks if IP asset can be locked

**Integration Points:**
- **IPAssetManagerV2**: Verifies ownership and asset status
- **IntellectualPropertyArbitration**: Checks arbitration eligibility and infringement status

### HBAREquivalentToken Contract

**Key Functions:**
- `mint(address to, uint256 amount, uint256 ipAssetId)` - Mints HBAR equivalent tokens
- `burn(address from, uint256 amount, uint256 ipAssetId)` - Burns HBAR equivalent tokens
- `balanceOf(address account)` - Gets token balance for an account

## 🚀 Deployment

### Prerequisites

- Node.js v18+
- Hardhat configured for Hedera
- Deployed IP Asset Manager and Arbitration contracts
- Environment variables set

### Deploy IP Asset Locker System

```bash
# Set environment variables
export IP_ASSET_MANAGER="0x..." # Your IP Asset Manager address
export ARBITRATION_CONTRACT="0x..." # Your Arbitration contract address
export REGISTRY_ADDRESS="0x..." # Your Index Registry address (optional)

# Deploy the system
pnpm run deploy:ip-asset-locker
```

### Test the System

```bash
# Test the IP asset locking functionality
pnpm run test:ip-asset-locker
```

### Environment Variables

Create a `.env` file with:

```env
# IP Asset Locker System
IP_ASSET_LOCKER_ADDRESS=0x...
HBAR_TOKEN_ADDRESS=0x...
REGISTRY_ADDRESS=0x...
IP_ASSET_MANAGER=0x...
ARBITRATION_CONTRACT=0x...
CHAIN_ID=296

# Hedera Configuration
HEDERA_RPC_URL=https://testnet.hashio.io/api
WALLET_PRIVATE_KEY=0x...
```

## 🔧 Backend Integration

### API Endpoints

#### Lock IP Asset
```http
POST /api/ip-asset-locker/lock
Content-Type: application/json

{
  "ipAssetId": 123,
  "hbarAmount": "1000.0",
  "userAddress": "0x..."
}
```

#### Unlock IP Asset
```http
POST /api/ip-asset-locker/unlock
Content-Type: application/json

{
  "ipAssetId": 123,
  "hbarAmount": "500.0",
  "userAddress": "0x..."
}
```

#### Get IP Asset Status
```http
GET /api/ip-asset-locker/status/123
```

#### Get User Locked Assets
```http
GET /api/ip-asset-locker/user/0x...
```

#### Get System Stats
```http
GET /api/ip-asset-locker/stats
```

#### Check Eligibility
```http
GET /api/ip-asset-locker/eligibility/123
```

#### Get HBAR Token Balance
```http
GET /api/ip-asset-locker/balance/0x...
```

### Service Layer

The `IPAssetLockerService` class provides:

- Contract interaction methods
- Error handling and validation
- Viem client integration
- Response formatting

## 📊 Usage Examples

### Lock an IP Asset

```typescript
// Frontend integration
const response = await fetch('/api/ip-asset-locker/lock', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ipAssetId: 123,
    hbarAmount: "1000.0",
    userAddress: userAddress
  })
});

const result = await response.json();
if (result.success) {
  console.log('IP asset locked successfully:', result.transactionHash);
}
```

### Unlock an IP Asset

```typescript
// Frontend integration
const response = await fetch('/api/ip-asset-locker/unlock', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ipAssetId: 123,
    hbarAmount: "500.0",
    userAddress: userAddress
  })
});

const result = await response.json();
if (result.success) {
  console.log('IP asset unlocked successfully:', result.transactionHash);
}
```

### Check Status

```typescript
// Check if IP asset is locked
const response = await fetch('/api/ip-asset-locker/status/123');
const status = await response.json();

console.log('Is locked:', status.data.isLocked);
console.log('Locked amount:', status.data.lockedAmount);
console.log('Is eligible:', status.data.isEligible);
```

## 🔒 Security Features

### Access Control
- Only IP asset owners can lock/unlock their assets
- Only IPAssetLocker can mint/burn HBAR tokens
- Owner-only functions for contract management

### Validation
- Prevents locking of assets in arbitration
- Prevents double-locking of same asset
- Validates ownership before operations
- Checks sufficient token balance before burning

### Integration Security
- Real-time arbitration status checking
- IP asset ownership verification
- Infringement detection validation

## 📈 Monitoring

### Key Metrics
- Total HBAR equivalent minted
- Number of locked IP assets
- Locked assets per user
- Lock/unlock transaction history

### Events
- `IPAssetLocked` - When an IP asset is locked
- `IPAssetUnlocked` - When an IP asset is unlocked
- `HBARTokensMinted` - When HBAR tokens are minted
- `HBARTokensBurned` - When HBAR tokens are burned

## 🔮 Integration with Existing Systems

### IP Asset Management
- Integrates with `IPAssetManagerV2` for ownership verification
- Uses existing IP asset data structures
- Maintains consistency with IP asset lifecycle

### Arbitration System
- Integrates with `IntellectualPropertyArbitration` for status checking
- Prevents locking of assets in dispute
- Respects arbitration eligibility rules

### Frontend Integration
- RESTful API for easy frontend integration
- Consistent response format with existing APIs
- Error handling and validation

## 🐛 Troubleshooting

### Common Issues

**"IP asset not eligible for locking"**
- Check if IP asset is in arbitration
- Verify IP asset exists and is active
- Ensure caller is the owner

**"Insufficient HBAR token balance"**
- Check user's HBAR equivalent token balance
- Ensure user has enough tokens to burn

**"IP asset already locked"**
- Check if IP asset is already locked
- Use partial unlocking if needed

### Debug Commands

```bash
# Check contract status
pnpm run test:ip-asset-locker

# View deployment info
cat deployments/ip-asset-locker-hedera_testnet.json

# Check environment variables
node -e "console.log(process.env.IP_ASSET_LOCKER_ADDRESS)"
```

## 📚 API Reference

### IP Asset Locker Endpoints

| Endpoint | Method | Description | Parameters |
|----------|--------|-------------|------------|
| `/lock` | POST | Lock IP asset and mint HBAR tokens | `ipAssetId`, `hbarAmount`, `userAddress` |
| `/unlock` | POST | Unlock IP asset and burn HBAR tokens | `ipAssetId`, `hbarAmount`, `userAddress` |
| `/status/:ipAssetId` | GET | Get IP asset lock status | `ipAssetId` |
| `/user/:userAddress` | GET | Get user's locked assets | `userAddress` |
| `/stats` | GET | Get system statistics | - |
| `/balance/:userAddress` | GET | Get HBAR token balance | `userAddress` |
| `/eligibility/:ipAssetId` | GET | Check locking eligibility | `ipAssetId` |

### Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "error": "Error message if applicable"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the existing documentation

---

**Note**: This system integrates with your existing Seeker backend IP asset management and arbitration systems. Make sure all contract addresses are correctly set in your environment variables.


# Contract Data Fetching System

This system fetches data from multiple smart contracts on Hedera Testnet and stores it in a PostgreSQL database using Prisma ORM.

## 📋 **Contracts Being Fetched**

### 1. **IP Asset Manager V2** (`0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a`)
**Data Fetched:**
- IP Assets (name, description, metadata URI, owner, royalty percentage)
- Revenue data (total revenue per IP asset)
- License information (license token IDs, royalty token IDs)
- Asset ownership and activity status

**Database Tables:**
- `ip_assets` - Main IP asset data
- `users` - Asset owners
- `licenses` - License information
- `royalties` - Royalty data

### 2. **IP Asset Locker** (`0xec0dBd92a8D1A222d34ecdB088B0022F38aF2883`)
**Data Fetched:**
- Lock status of IP assets
- Locked HBAR amounts per asset
- User's locked assets list

**Database Tables:**
- `ip_asset_locks` - Lock status and amounts
- `ip_asset_unlock_events` - Unlock transaction history

### 3. **HBAR Equivalent Token** (`0x9f4FC76E91e483b02DA42A0a10592e603F670dc9`)
**Data Fetched:**
- Token balances per user
- Total minted tokens
- Token transaction history

**Database Tables:**
- `hbar_token_balances` - User token balances
- `hbar_token_transactions` - Token transaction history

### 4. **Intellectual Property Arbitration** (`0x60f4a0ee098394951bb704709842C92dF25038b2`)
**Data Fetched:**
- Arbitration eligibility status
- Infringement detection status
- Dispute information

**Database Tables:**
- `arbitration_cases` - Arbitration case data
- `arbitration_votes` - Voting records
- `arbitration_evidence` - Evidence submissions

## 🚀 **Usage Commands**

### **Sync All Contract Data**
```bash
# Sync data from all contracts
pnpm run sync:all

# Sync specific contract data
pnpm run sync:ip-assets      # IP Asset Manager V2
pnpm run sync:locks          # IP Asset Locker
pnpm run sync:hbar-tokens    # HBAR Equivalent Token
pnpm run sync:arbitration    # Intellectual Property Arbitration
```

### **Test Data Sync**
```bash
# Test the complete data fetching process
pnpm run test:data-sync
```

### **Database Management**
```bash
# Clear all data
pnpm run db:clear

# Interactive database clearing
pnpm run db:clear-advanced

# View database in Prisma Studio
pnpm run db:studio
```

## 📊 **Data Flow**

1. **IP Asset Manager V2** → Fetches core IP asset data, licenses, and revenue
2. **IP Asset Locker** → Fetches lock status and HBAR amounts
3. **HBAR Equivalent Token** → Fetches token balances and transactions
4. **Intellectual Property Arbitration** → Fetches arbitration status and disputes

## 🔧 **Configuration**

### **Contract Addresses**
Located in `lib/contract-config.ts`:
```typescript
export const CONTRACT_ADDRESSES = {
  IP_ASSET_MANAGER_V2: '0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a',
  IP_ASSET_LOCKER: '0xec0dBd92a8D1A222d34ecdB088B0022F38aF2883',
  HBAR_EQUIVALENT_TOKEN: '0x9f4FC76E91e483b02DA42A0a10592e603F670dc9',
  INTELLECTUAL_PROPERTY_ARBITRATION: '0x60f4a0ee098394951bb704709842C92dF25038b2',
  CHAIN_ID: 296, // Hedera Testnet
  RPC_URL: 'https://testnet.hashio.io/api'
};
```

### **Database Schema**
The Prisma schema includes models for all contract data:
- `IPAsset` - IP asset information
- `IPAssetLock` - Asset locking data
- `HBARTokenBalance` - Token balances
- `ArbitrationCase` - Arbitration data
- And many more...

## 🔄 **Background Jobs**

The system includes background jobs for continuous data synchronization:

```bash
# Start background jobs (currently disabled due to rate limits)
pnpm run server
```

## 📈 **API Endpoints**

Data is exposed through REST API endpoints:

```bash
# Contract data endpoints
GET /api/contract-data/stats
GET /api/contract-data/ip-assets
GET /api/contract-data/locks
GET /api/contract-data/hbar-tokens
GET /api/contract-data/arbitration

# Manual sync triggers
POST /api/contract-data/sync/all
POST /api/contract-data/sync/ip-assets
POST /api/contract-data/sync/locks
POST /api/contract-data/sync/hbar-tokens
POST /api/contract-data/sync/arbitration
```

## ⚠️ **Important Notes**

1. **BigInt Handling**: The system properly handles BigInt values from smart contracts
2. **Foreign Key Constraints**: Data is inserted in the correct order to avoid constraint violations
3. **Error Handling**: Comprehensive error handling with detailed logging
4. **Rate Limiting**: Background jobs are currently disabled due to RPC rate limits
5. **Data Validation**: All data is validated before storage

## 🧪 **Testing**

Run the test script to verify data fetching:

```bash
pnpm run test:data-sync
```

This will:
1. Clear existing data
2. Fetch data from all contracts
3. Display the results
4. Verify data integrity

## 📝 **Troubleshooting**

### **Common Issues:**

1. **RPC Rate Limits**: If you see rate limit errors, wait and try again
2. **BigInt Conversion**: Ensure Prisma schema uses `BigInt` type for large numbers
3. **Foreign Key Errors**: Make sure data is inserted in the correct order
4. **Connection Issues**: Verify database connection and RPC URL

### **Debug Commands:**

```bash
# Check database connection
pnpm run db:studio

# Test individual contract sync
pnpm run sync:ip-assets

# View logs
pnpm run server
```

## 🎯 **Next Steps**

1. **Enable Background Jobs**: Once rate limits are resolved
2. **Add Event Indexing**: Real-time event processing
3. **Implement Caching**: Reduce RPC calls
4. **Add Data Validation**: Enhanced data integrity checks
5. **Performance Optimization**: Batch operations and parallel processing

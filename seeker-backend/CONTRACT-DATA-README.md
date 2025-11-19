# Contract Data Fetching System

This document describes the comprehensive data fetching system for all integrated smart contracts in the seeker-backend directory.

## Overview

The system fetches data from the following smart contracts and stores it in a PostgreSQL database using Prisma:

- **IP Asset Manager V2** - Core IP asset registration and management
- **IP Asset Locker** - Asset locking mechanism with HBAR equivalent tokenization
- **HBAR Equivalent Token** - ERC-20 token representing locked HBAR amounts
- **Intellectual Property Arbitration** - Dispute resolution and infringement detection
- **Tokenized Asset Manager** - Tokenized asset management (when deployed)

## Architecture

### Components

1. **Contract Configuration** (`lib/contract-config.ts`)
   - Contract addresses and ABIs
   - Event signatures for indexing
   - Contract interfaces for data reading

2. **Data Sync Service** (`lib/data-sync-service.ts`)
   - Fetches current state from contracts
   - Syncs data to PostgreSQL database
   - Handles data validation and transformation

3. **Comprehensive Event Indexer** (`events/comprehensive-indexer.ts`)
   - Listens for blockchain events in real-time
   - Queues events for processing
   - Processes events and updates database

4. **Background Job Service** (`lib/background-jobs.ts`)
   - Manages periodic data synchronization
   - Processes queued events
   - Handles service lifecycle

5. **API Endpoints** (`routes/contract-data.ts`)
   - RESTful API for accessing contract data
   - Pagination and filtering support
   - Manual sync triggers

## Database Schema

### Core Models

- **IPAsset** - IP asset information and metadata
- **IPAssetLock** - Asset locking status and HBAR amounts
- **HBARTokenBalance** - HBAR equivalent token balances
- **ArbitrationCase** - Dispute resolution cases
- **TokenizedAsset** - Tokenized asset information
- **ContractState** - Contract indexing state tracking
- **EventQueue** - Event processing queue

## Setup

### 1. Environment Variables

Add the following to your `.env` file:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/seeker_db"

# Hedera Network
HEDERA_RPC_URL="https://testnet.hashio.io/api"
HEDERA_PRIVATE_KEY="your_private_key"

# Contract Addresses (automatically loaded from deployment files)
IP_ASSET_MANAGER_V2="0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a"
IP_ASSET_LOCKER="0xec0dBd92a8D1A222d34ecdB088B0022F38aF2883"
HBAR_EQUIVALENT_TOKEN="0x9f4FC76E91e483b02DA42A0a10592e603F670dc9"
INTELLECTUAL_PROPERTY_ARBITRATION="0x60f4a0ee098394951bb704709842C92dF25038b2"
```

### 2. Database Migration

```bash
# Generate Prisma client
pnpm run db:generate

# Run database migrations
pnpm run db:migrate
```

### 3. Start the Service

```bash
# Start the server with background jobs
pnpm run server

# Or start in development mode
pnpm run dev:server
```

## Usage

### API Endpoints

#### Statistics
```bash
GET /api/contract-data/stats
```

#### IP Assets
```bash
# Get all IP assets
GET /api/contract-data/ip-assets?page=1&limit=20&owner=0x...&active=true

# Get specific IP asset
GET /api/contract-data/ip-assets/:id
```

#### IP Asset Locks
```bash
# Get all locks
GET /api/contract-data/ip-asset-locks?page=1&limit=20&owner=0x...&status=locked
```

#### HBAR Token Data
```bash
# Get token balances
GET /api/contract-data/hbar-tokens/balances?page=1&limit=20&minBalance=1000

# Get token transactions
GET /api/contract-data/hbar-tokens/transactions?page=1&limit=20&owner=0x...&type=mint
```

#### Arbitration Cases
```bash
# Get arbitration cases
GET /api/contract-data/arbitration/cases?page=1&limit=20&status=pending
```

#### Manual Sync
```bash
# Sync all contracts
POST /api/contract-data/sync

# Sync specific contract
POST /api/contract-data/sync
{
  "contract": "IPAssetManagerV2"
}
```

### Command Line Scripts

```bash
# Sync all contract data
pnpm run sync:all

# Sync specific contract
pnpm run sync:ip-assets
pnpm run sync:locks
pnpm run sync:hbar-tokens
pnpm run sync:arbitration

# Start event indexing
pnpm run index:events

# Process queued events
pnpm run process:events

# Database operations
pnpm run db:migrate
pnpm run db:generate
pnpm run db:studio
pnpm run db:reset
```

## Data Flow

### 1. Initial Sync
- Fetches current state from all contracts
- Populates database with existing data
- Establishes baseline for real-time updates

### 2. Real-time Event Processing
- Listens for new blockchain events
- Queues events for processing
- Processes events in batches
- Updates database with new data

### 3. Periodic Sync
- Runs every 5 minutes
- Ensures data consistency
- Handles any missed events
- Cleans up old data

## Monitoring

### Health Checks
- Server health: `GET /health`
- Contract data stats: `GET /api/contract-data/stats`
- Event queue status: `GET /api/contract-data/event-queue`

### Logs
The system provides comprehensive logging for:
- Event processing
- Data synchronization
- Error handling
- Performance metrics

## Error Handling

### Event Processing
- Failed events are retried with exponential backoff
- Maximum retry count prevents infinite loops
- Error messages are logged for debugging

### Data Sync
- Individual contract sync failures don't stop others
- Partial data is preserved on errors
- Manual retry mechanisms available

## Performance Considerations

### Database Optimization
- Indexed fields for fast queries
- Pagination for large datasets
- Connection pooling for concurrent requests

### Event Processing
- Batch processing for efficiency
- Queue-based architecture for reliability
- Configurable processing intervals

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check DATABASE_URL configuration
   - Ensure PostgreSQL is running
   - Verify database permissions

2. **Contract Connection Errors**
   - Check HEDERA_RPC_URL configuration
   - Verify contract addresses
   - Ensure network connectivity

3. **Event Processing Delays**
   - Check event queue status
   - Verify contract state tracking
   - Review error logs

### Debug Commands

```bash
# Check contract states
GET /api/contract-data/contract-states

# Check event queue
GET /api/contract-data/event-queue?processed=false

# Manual cleanup
POST /api/contract-data/cleanup
{
  "daysToKeep": 30
}
```

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] GraphQL API for complex queries
- [ ] Data analytics and reporting
- [ ] Automated alerting for critical events
- [ ] Multi-chain support
- [ ] Data archival strategies

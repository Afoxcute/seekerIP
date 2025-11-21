# Yakoa Infringement Integration

This document describes the integration between the Seeker Backend and the Yakoa Infringement Backend service for IP asset monitoring and infringement detection.

## 🏗️ Architecture Overview

```
┌─────────────────┐    HTTP API    ┌─────────────────┐    Yakoa API    ┌─────────────┐
│   Seeker        │ ──────────────► │   Yakoa         │ ──────────────► │   Yakoa     │
│   Backend       │                │   Backend       │                │   Service   │
│   (Port 3001)   │                │   (Port 5000)   │                │             │
└─────────────────┘                └─────────────────┘                └─────────────┘
         │                                   │
         │                                   │
         ▼                                   ▼
┌─────────────────┐                ┌─────────────────┐
│   PostgreSQL    │                │   Hedera        │
│   Database      │                │   Blockchain    │
└─────────────────┘                └─────────────────┘
```

## 📋 Features

### IP Asset Registration
- Automatically register IP assets with Yakoa for infringement monitoring
- Support for single and bulk registration
- Duplicate detection and conflict handling

### Infringement Monitoring
- Real-time infringement status checking
- Comprehensive infringement reports
- Historical infringement tracking

### API Integration
- RESTful API endpoints for all Yakoa operations
- Error handling and retry mechanisms
- Comprehensive logging and monitoring

## 🚀 Quick Start

### 1. Prerequisites

Ensure both services are running:

```bash
# Terminal 1: Start Yakoa Backend
cd backend
npm install
npm start

# Terminal 2: Start Seeker Backend
cd seeker-backend
pnpm install
pnpm run server
```

### 2. Environment Configuration

Add the following to your `.env` file in `seeker-backend`:

```env
# Yakoa Backend Configuration
YAKOA_BACKEND_URL=https://seekerip-production-f87d.up.railway.app
YAKOA_API_KEY=mdZ6ftFaSJ1c1HjkiPmUCFOADHM4V49ZXzo6mD80

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/seeker_db

# Network Configuration
HEDERA_RPC_URL=https://testnet.hashio.io/api
```

### 3. Test the Integration

```bash
# Test the integration
pnpm run test:yakoa

# Seed database with real data
pnpm run db:fetch-real

# Register all IP assets with Yakoa
curl -X POST http://localhost:3001/api/yakoa/register-all
```

## 📡 API Endpoints

### Seeker Backend API (Port 3001)

#### Register IP Asset
```http
POST /api/yakoa/register/:ipAssetId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "data": { /* Yakoa response */ },
    "message": "IP Asset registered with Yakoa successfully"
  },
  "message": "IP Asset abc123 registered with Yakoa successfully"
}
```

#### Check Infringement Status
```http
GET /api/yakoa/status/:ipAssetId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "status": "clean",
    "infringements": [],
    "lastChecked": "2024-01-01T00:00:00.000Z"
  },
  "message": "Infringement status retrieved for IP Asset abc123"
}
```

#### Register Multiple IP Assets
```http
POST /api/yakoa/register-multiple
Content-Type: application/json

{
  "ipAssetIds": ["abc123", "def456", "ghi789"]
}
```

#### Register All Active IP Assets
```http
POST /api/yakoa/register-all
```

#### Get Infringement Reports
```http
GET /api/yakoa/reports
```

#### Get Available IP Assets
```http
GET /api/yakoa/assets
```

### Yakoa Backend API (Port 5000)

#### Register with Yakoa
```http
POST /api/yakoa/register
Content-Type: application/json

{
  "ipAssetId": "abc123",
  "registrationData": {
    "tokenId": "0x123:456",
    "transactionHash": "0x...",
    "creatorId": "0x...",
    "title": "IP Asset Name",
    "description": "IP Asset Description",
    "mediaUrl": "https://ipfs.io/ipfs/...",
    "ipfsHash": "Qm..."
  }
}
```

#### Check Yakoa Status
```http
GET /api/yakoa/status/:tokenId
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `YAKOA_BACKEND_URL` | URL of the Yakoa backend service | `https://seekerip-production-f87d.up.railway.app` |
| `YAKOA_API_KEY` | API key for Yakoa service | `mdZ6ftFaSJ1c1HjkiPmUCFOADHM4V49ZXzo6mD80` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `HEDERA_RPC_URL` | Hedera RPC endpoint | `https://testnet.hashio.io/api` |

### Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Seeker Backend | 3001 | Main API server with Yakoa integration |
| Yakoa Backend | 5000 | Yakoa infringement service |
| PostgreSQL | 5432 | Database server |

## 🧪 Testing

### Run Integration Tests

```bash
# Test the integration
pnpm run test:yakoa

# Test with real data
pnpm run db:fetch-real
pnpm run test:yakoa
```

### Manual Testing

```bash
# Start both services
cd backend && npm start &
cd seeker-backend && pnpm run server &

# Test API endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/yakoa/assets
curl -X POST http://localhost:3001/api/yakoa/register-all
```

## 📊 Monitoring

### Health Checks

```bash
# Seeker Backend Health
curl http://localhost:3001/health

# Yakoa Backend Health
curl https://seekerip-production-f87d.up.railway.app
```

### Logs

Both services provide comprehensive logging:

- **Seeker Backend**: Console logs with emoji indicato
- **Yakoa Backend**: Detailed API request/response logging

### Error Handling

The integration includes robust error handling:

- Network timeouts and retries
- Duplicate registration detection
- Conflict resolution for existing IP assets
- Graceful degradation when Yakoa service is unavailable

## 🔄 Workflow

### IP Asset Registration Flow

1. **IP Asset Created**: New IP asset is registered on Hedera blockchain
2. **Event Indexing**: Seeker backend indexes the blockchain event
3. **Database Storage**: IP asset data is stored in PostgreSQL
4. **Yakoa Registration**: IP asset is automatically registered with Yakoa
5. **Monitoring**: Yakoa begins monitoring for infringements

### Infringement Detection Flow

1. **Yakoa Monitoring**: Yakoa continuously monitors for infringements
2. **Infringement Detected**: Yakoa identifies potential infringement
3. **Status Update**: Infringement status is updated in Yakoa
4. **Status Check**: Seeker backend can query infringement status
5. **Notification**: IP asset owner can be notified of infringement

## 🛠️ Development

### Adding New Features

1. **Update Integration Service**: Modify `lib/yakoa-integration.ts`
2. **Add API Routes**: Update `routes/yakoa.ts`
3. **Update Tests**: Modify `scripts/test-yakoa-integration.ts`
4. **Update Documentation**: Update this README

### Debugging

```bash
# Enable debug logging
DEBUG=yakoa* pnpm run server

# Test specific functionality
pnpm run test:yakoa

# Check database state
pnpm run db:studio
```

## 📚 Additional Resources

- [Yakoa Documentation](https://docs.yakoa.io/)
- [Hedera Documentation](https://docs.hedera.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This integration is part of the Seeker project and follows the same license terms. 
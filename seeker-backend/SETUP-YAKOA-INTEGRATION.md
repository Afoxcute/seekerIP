# Yakoa Integration Setup Guide

This guide will help you set up the integration between the Seeker Backend and the Yakoa Infringement Backend service.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd seeker-backend
pnpm install
```

### 2. Environment Configuration

Create a `.env` file in the `seeker-backend` directory with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/seeker_db

# Hedera Network Configuration
NETWORK=testnet
HEDERA_NETWORK=testnet
HEDERA_RPC_URL=https://testnet.hashio.io/api

# Contract Addresses
IP_ASSET_MANAGER_V2_ADDRESS=0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a
IP_ASSET_NFT_ADDRESS=0x227f1cDcBeb442F07e4A2119ab0AD83C21E6fFE5
IP_ASSET_MANAGER_ENHANCED_ADDRESS=0x77A7aB9f54b2132B51acF6f36A624b9dcf264ce3
IP_ASSET_MANAGER_ADDRESS=0x30BD264110f71916f338B132EdD4d35C38138468

# Platform Configuration
PLATFORM_FEE_PERCENTAGE=250
PLATFORM_FEE_COLLECTOR=0x9404966338eB27aF420a952574d777598Bbb58c4

# Yakoa Backend Configuration
YAKOA_BACKEND_URL=http://localhost:5000
YAKOA_API_KEY=mdZ6ftFaSJ1c1HjkiPmUCFOADHM4V49ZXzo6mD80
YAKOA_SUBDOMAIN=docs-demo
YAKOA_NETWORK=docs-demo

# Environment
NODE_ENV=development
PORT=3001
```

### 3. Start the Yakoa Backend

In a separate terminal, start the Yakoa backend service:

```bash
cd backend
npm install
npm start
```

The Yakoa backend will run on port 5000.

### 4. Start the Seeker Backend

In another terminal, start the Seeker backend:

```bash
cd seeker-backend
pnpm run server
```

The Seeker backend will run on port 3001.

### 5. Test the Integration

Test the integration using the provided test script:

```bash
cd seeker-backend
pnpm run test:yakoa
```

## 🔧 Configuration Details

### Yakoa Backend Settings

- **URL**: `http://localhost:5000` (default)
- **API Key**: `mdZ6ftFaSJ1c1HjkiPmUCFOADHM4V49ZXzo6mD80`
- **Subdomain**: `docs-demo`
- **Network**: `docs-demo`

### Seeker Backend Settings

- **Port**: `3001` (different from Yakoa backend)
- **Database**: PostgreSQL (configure via DATABASE_URL)
- **Hedera Network**: Testnet (configurable)

## 📡 API Endpoints

### Seeker Backend (Port 3001)

- `GET /health` - Seeker backend health check
- `GET /health/yakoa` - Yakoa backend health check
- `POST /api/yakoa/register/:ipAssetId` - Register IP asset with Yakoa
- `GET /api/yakoa/status/:ipAssetId` - Check infringement status
- `POST /api/yakoa/register-multiple` - Register multiple IP assets
- `POST /api/yakoa/register-all` - Register all active IP assets
- `GET /api/yakoa/reports` - Get infringement reports
- `GET /api/yakoa/assets` - Get available IP assets

### Yakoa Backend (Port 5000)

- `GET /` - Health check
- `POST /api/yakoa/register` - Register IP asset with Yakoa service
- `GET /api/yakoa/status/:id` - Check infringement status
- `GET /api/yakoa/infringements` - Get infringement reports

## 🧪 Testing

### Manual Testing

1. **Health Check**:
   ```bash
   curl http://localhost:3001/health
   curl http://localhost:3001/health/yakoa
   ```

2. **Get Available Assets**:
   ```bash
   curl http://localhost:3001/api/yakoa/assets
   ```

3. **Register All Assets**:
   ```bash
   curl -X POST http://localhost:3001/api/yakoa/register-all
   ```

### Automated Testing

Run the integration test suite:

```bash
pnpm run test:yakoa
```

## 🐛 Troubleshooting

### Common Issues

1. **Yakoa Backend Not Running**
   - Ensure the backend service is started on port 5000
   - Check the health endpoint: `http://localhost:5000/`

2. **Database Connection Issues**
   - Verify DATABASE_URL is correct
   - Ensure PostgreSQL is running
   - Check database permissions

3. **API Key Issues**
   - Verify YAKOA_API_KEY is set correctly
   - Check if the API key has expired

4. **Port Conflicts**
   - Ensure ports 3001 and 5000 are available
   - Check for other services using these ports

### Debug Mode

Enable debug logging:

```bash
DEBUG=yakoa* pnpm run server
```

## 📚 Additional Resources

- [Yakoa Integration Documentation](./YAKOA-INTEGRATION.md)
- [IP Assets Documentation](./README-IP-ASSETS.md)
- [Migration Summary](./MIGRATION-SUMMARY.md)

## 🤝 Support

If you encounter issues:

1. Check the logs for error messages
2. Verify all services are running
3. Test individual endpoints
4. Check environment configuration
5. Review the troubleshooting section above 
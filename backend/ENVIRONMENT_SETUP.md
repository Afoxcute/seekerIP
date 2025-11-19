# Backend Environment Setup

## The Error You're Seeing

The error `BadKeyError: private key cannot be decoded from bytes: invalid private key: expected ui8a of size 32, got object` occurs because the Hedera SDK is trying to parse an empty or invalid private key.

## Quick Fix

Create a `.env` file in the `backend` directory with the following content:

```bash
# Hedera Configuration (leave empty to disable HCS functionality)
HEDERA_OPERATOR_ID=
HEDERA_OPERATOR_KEY=
HEDERA_RPC_URL=https://testnet.hashio.io/api

# Wallet Configuration (required for contract interactions)
WALLET_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# RPC Configuration
RPC_PROVIDER_URL=https://testnet.hashio.io/api

# Pinata IPFS Configuration (optional)
PINATA_JWT=

# Yakoa API Configuration (optional)
YAKOA_API_KEY=
YAKOA_SUBDOMAIN=
YAKOA_NETWORK=hedera_testnet

# NFT Contract Configuration
NFT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Server Configuration
PORT=5000
```

## What I Fixed

1. **Added Error Handling**: The HCS integration now gracefully handles missing environment variables
2. **Made HCS Optional**: The backend will start even without Hedera credentials
3. **Added Validation**: Methods check if HCS is properly initialized before attempting operations

## To Get Your Real Credentials

### Hedera Credentials (for HCS functionality):
1. Go to [Hedera Portal](https://portal.hedera.com/)
2. Create or access your testnet account
3. Get your Account ID (e.g., `0.0.123456`)
4. Get your private key in DER format

### Pinata JWT (for IPFS):
1. Go to [Pinata Developers](https://app.pinata.cloud/developers/api-keys)
2. Create a new API key
3. Copy the JWT token

## Running the Backend

After creating the `.env` file:

```bash
cd backend
yarn install
yarn start
```

The backend should now start without the private key error. HCS functionality will be disabled until you provide valid Hedera credentials.

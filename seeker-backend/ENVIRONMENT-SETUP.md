# Environment Setup Guide

## Quick Start (Minimal Configuration)

Create a `.env` file in the `seeker-backend` directory with the following minimal configuration:

```bash
# ===========================================
# MINIMAL ENVIRONMENT CONFIGURATION
# ===========================================

# ===========================================
# HEDERA CONFIGURATION (REQUIRED)
# ===========================================
# Replace with your actual Hedera account details
HEDERA_OPERATOR_ID=0.0.123456
HEDERA_OPERATOR_KEY=302e020100300506032b657004220420abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
HEDERA_RPC_URL=https://testnet.hashio.io/api

# ===========================================
# PRIVATE KEY (REQUIRED FOR DEPLOYMENT)
# ===========================================
# Your Hedera account private key (without the prefix)
PRIVATE_KEY=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# ===========================================
# CONTRACT ADDRESSES (ALREADY DEPLOYED)
# ===========================================
IP_ASSET_MANAGER_V2_ADDRESS=0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a
IP_ASSET_NFT_ADDRESS=0x227f1cDcBeb442F07e4A2119ab0AD83C21E6fFE5
ARBITRATION_CONTRACT_ADDRESS=0x5C7424821131c2314F9f9494f01DDb14C9904A62

# ===========================================
# YAKOA CONFIGURATION (OPTIONAL)
# ===========================================
YAKOA_BACKEND_URL=https://api.yakoa.com
YAKOA_API_KEY=your_yakoa_api_key_here
YAKOA_SUBDOMAIN=your_subdomain
YAKOA_NETWORK=hedera_testnet

# ===========================================
# SERVER CONFIGURATION
# ===========================================
PORT=3001
NODE_ENV=development
```

## How to Get Your Hedera Credentials

### 1. Create a Hedera Account
1. Go to [Hedera Portal](https://portal.hedera.com/)
2. Create a new account or sign in
3. Switch to **Testnet** (for development)

### 2. Get Your Account ID and Private Key
1. In the Hedera Portal, go to **Account Details**
2. Copy your **Account ID** (format: `0.0.123456`)
3. Go to **Keys** section
4. Copy your **Private Key** (format: `302e020100300506032b657004220420...`)

### 3. Get Test HBAR
1. Go to [Hedera Testnet Faucet](https://portal.hedera.com/faucet)
2. Enter your Account ID
3. Request test HBAR (you'll need at least 1 HBAR for deployment)

## Complete Configuration (Advanced)

For a complete setup with all features, see the `env.example` file in this directory.

## Required vs Optional Variables

### ✅ Required Variables
- `HEDERA_OPERATOR_ID` - Your Hedera account ID
- `HEDERA_OPERATOR_KEY` - Your Hedera private key
- `HEDERA_RPC_URL` - Hedera RPC endpoint
- `PRIVATE_KEY` - Same as HEDERA_OPERATOR_KEY but without prefix
- `IP_ASSET_MANAGER_V2_ADDRESS` - Already deployed
- `IP_ASSET_NFT_ADDRESS` - Already deployed
- `ARBITRATION_CONTRACT_ADDRESS` - Already deployed

### 🔧 Optional Variables
- `YAKOA_*` - For infringement monitoring (optional)
- `HCS_*` - For Hedera Consensus Service integration
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

## Testing Your Configuration

1. **Start the server:**
   ```bash
   pnpm run dev:server
   ```

2. **Check health endpoints:**
   ```bash
   curl http://localhost:3001/health
   curl http://localhost:3001/health/yakoa
   ```

3. **Test arbitration endpoints:**
   ```bash
   curl http://localhost:3001/api/arbitration/stats
   ```

## Troubleshooting

### Common Issues

1. **"Invalid private key"**
   - Make sure your `PRIVATE_KEY` doesn't include the `302e020100300506032b657004220420` prefix
   - The private key should be 64 characters long (hex)

2. **"Insufficient balance"**
   - Get test HBAR from the [Hedera Testnet Faucet](https://portal.hedera.com/faucet)
   - You need at least 1 HBAR for deployment

3. **"Network connection failed"**
   - Check your `HEDERA_RPC_URL` is correct
   - Try using `https://testnet.hashio.io/api`

4. **"Contract not found"**
   - Make sure all contract addresses are correct
   - Check that contracts are deployed on the same network

### Getting Help

- Check the [Hedera Documentation](https://docs.hedera.com/)
- Visit the [Hedera Discord](https://discord.gg/hedera)
- Check the [Arbitration System README](./ARBITRATION-README.md)

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit your `.env` file to version control**
2. **Use different accounts for testnet and mainnet**
3. **Keep your private keys secure**
4. **Use environment-specific configurations**
5. **Rotate keys regularly in production**

## Next Steps

After setting up your environment:

1. **Initialize the arbitration token:**
   ```bash
   # This will be done through the API or contract interaction
   ```

2. **Test the system:**
   ```bash
   pnpm run test:yakoa
   ```

3. **Start the frontend:**
   ```bash
   cd ../app
   pnpm install
   pnpm start
   ```

4. **Monitor the system:**
   - Check the arbitration dashboard
   - Monitor dispute resolution
   - Test IP asset registration




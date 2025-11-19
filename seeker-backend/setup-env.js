/**
 * @fileoverview Environment Setup Script for Arbitration Deployment
 * @description Helps set up required environment variables for deployment
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupEnvironment() {
  console.log('🔧 Setting up environment for Arbitration Contract Deployment\n');
  
  const envPath = path.join(__dirname, '.env');
  let envContent = '';
  
  // Check if .env file exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('📄 Found existing .env file');
  } else {
    console.log('📄 Creating new .env file');
  }
  
  console.log('\n📋 Required Environment Variables:\n');
  
  // Private Key
  const privateKey = await question('🔑 Enter your Hedera private key (0x...): ');
  if (!privateKey.startsWith('0x')) {
    console.log('❌ Private key must start with 0x');
    process.exit(1);
  }
  
  // IP Asset Manager V2 Address
  const ipAssetManagerV2Address = await question('🔗 Enter IP Asset Manager V2 address (or press Enter for default): ');
  const finalIpAssetManagerV2Address = ipAssetManagerV2Address || '0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a';
  
  // Hedera RPC URL
  const hederaRpcUrl = await question('🌐 Enter Hedera RPC URL (or press Enter for default): ');
  const finalHederaRpcUrl = hederaRpcUrl || 'https://testnet.hashio.io/api';
  
  // Hedera API Key (optional)
  const hederaApiKey = await question('🔑 Enter Hedera API Key (optional, for verification): ');
  
  // Build environment content
  const newEnvContent = `
# Hedera Configuration
PRIVATE_KEY=${privateKey}
HEDERA_RPC_URL=${finalHederaRpcUrl}
HEDERA_API_KEY=${hederaApiKey || ''}

# Contract Addresses
IP_ASSET_MANAGER_V2_ADDRESS=${finalIpAssetManagerV2Address}
ARBITRATION_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Backend Configuration
PORT=3001
YAKOA_BACKEND_URL=http://localhost:5000
YAKOA_API_KEY=mdZ6ftFaSJ1c1HjkiPmUCFOADHM4V49ZXzo6mD80

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/seeker_db
`;

  // Write .env file
  fs.writeFileSync(envPath, newEnvContent.trim());
  console.log('\n✅ Environment variables saved to .env file');
  
  console.log('\n📋 Next Steps:');
  console.log('1. Make sure you have HBAR in your account for deployment');
  console.log('2. Run: pnpm run deploy:arbitration');
  console.log('3. Update ARBITRATION_CONTRACT_ADDRESS in .env with the deployed address');
  console.log('4. Start the backend: pnpm run dev:server');
  
  rl.close();
}

setupEnvironment().catch(console.error);



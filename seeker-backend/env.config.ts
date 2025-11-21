import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/seeker_db',
  },

  // Hedera Network Configuration
  network: {
    name: process.env.NETWORK || 'testnet',
    hederaNetwork: process.env.HEDERA_NETWORK || 'testnet',
    rpcUrl: process.env.HEDERA_RPC_URL || 'https://testnet.hashio.io/api',
  },

  // Contract Addresses
  contracts: {
    ipAssetManagerV2: process.env.IP_ASSET_MANAGER_V2_ADDRESS || '0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a',
    ipAssetNFT: process.env.IP_ASSET_NFT_ADDRESS || '0x227f1cDcBeb442F07e4A2119ab0AD83C21E6fFE5',
    ipAssetManagerEnhanced: process.env.IP_ASSET_MANAGER_ENHANCED_ADDRESS || '0x77A7aB9f54b2132B51acF6f36A624b9dcf264ce3',
    ipAssetManager: process.env.IP_ASSET_MANAGER_ADDRESS || '0x30BD264110f71916f338B132EdD4d35C38138468',
      arbitration: process.env.ARBITRATION_CONTRACT_ADDRESS || '0xb7f0631cE0F215aFc732e57BBBF09f1440926a7F',
  },

  // Hedera Configuration
  hedera: {
    operatorId: process.env.HEDERA_OPERATOR_ID || '',
    operatorKey: process.env.HEDERA_OPERATOR_KEY || '',
    rpcUrl: process.env.HEDERA_RPC_URL || 'https://testnet.hashio.io/api',
  },

  // Platform Configuration
  platform: {
    feePercentage: parseInt(process.env.PLATFORM_FEE_PERCENTAGE || '250'),
    feeCollector: process.env.PLATFORM_FEE_COLLECTOR || '0x9404966338eB27aF420a952574d777598Bbb58c4',
  },

  // Yakoa Backend Configuration
  yakoa: {
    backendUrl: process.env.YAKOA_BACKEND_URL || 'http://localhost:5000',
    apiKey: process.env.YAKOA_API_KEY || 'mdZ6ftFaSJ1c1HjkiPmUCFOADHM4V49ZXzo6mD80',
    subdomain: process.env.YAKOA_SUBDOMAIN || 'docs-demo',
    network: process.env.YAKOA_NETWORK || 'docs-demo',
  },

  // Environment
  env: process.env.NODE_ENV || 'development',
};

export default config; 
#!/usr/bin/env node

const { ethers } = require('ethers');

// Contract addresses
const CONTRACT_ADDRESSES = {
  IP_ASSET_MANAGER_V2: '0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a',
  IP_ASSET_LOCKER: '0xec0dBd92a8D1A222d34ecdB088B0022F38aF2883',
  HBAR_EQUIVALENT_TOKEN: '0x9f4FC76E91e483b02DA42A0a10592e603F670dc9',
  INTELLECTUAL_PROPERTY_ARBITRATION: '0x60f4a0ee098394951bb704709842C92dF25038b2',
  RPC_URL: 'https://testnet.hashio.io/api'
};

// Contract ABIs
const IP_ASSET_MANAGER_ABI = [
  'function getIPAsset(uint256) view returns (uint256,address,string,string,string,uint256,bool,address,address,uint256,uint256,uint256,string)',
  'function getUserAssets(address) view returns (uint256[])',
  'function getIPAssetOwner(uint256) view returns (address)',
  'function isIPAssetActive(uint256) view returns (bool)',
];

const IP_ASSET_LOCKER_ABI = [
  'function isIPAssetLocked(uint256) view returns (bool)',
  'function getLockedAmount(uint256) view returns (uint256)',
  'function getUserLockedIPAssets(address) view returns (uint256[])',
  'function getTotalMintedHBAR() view returns (uint256)',
  'function totalLockedAssets() view returns (uint256)',
  'function getIPAssetEligibilityDetails(uint256) view returns (bool,string,bool,bool,bool,bool,bool)',
];

const HBAR_TOKEN_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function totalMinted() view returns (uint256)',
  'function getLocker() view returns (address)',
  'function isInitialized() view returns (bool)',
];

const ARBITRATION_ABI = [
  'function isArbitrationEligible(uint256) view returns (bool,bool)',
  'function getDisputeCount() view returns (uint256)',
];

async function testContractData() {
  console.log('🔍 Testing contract data fetching...\n');

  try {
    // Create provider
    const provider = new ethers.JsonRpcProvider(CONTRACT_ADDRESSES.RPC_URL);
    
    // Test IP Asset Manager V2
    console.log('📝 Testing IP Asset Manager V2...');
    const ipAssetManager = new ethers.Contract(
      CONTRACT_ADDRESSES.IP_ASSET_MANAGER_V2,
      IP_ASSET_MANAGER_ABI,
      provider
    );

    // Test with a known user address
    const testUser = '0x9404966338eB27aF420a952574d777598Bbb58c4';
    try {
      const userAssets = await ipAssetManager.getUserAssets(testUser);
      console.log(`✅ Found ${userAssets.length} assets for user ${testUser}`);
      
      // Test getting asset details for first few assets
      for (let i = 0; i < Math.min(3, userAssets.length); i++) {
        try {
          const assetData = await ipAssetManager.getIPAsset(userAssets[i]);
          console.log(`  Asset ${userAssets[i]}: ${assetData[2]} (${assetData[1]})`);
        } catch (error) {
          console.log(`  Asset ${userAssets[i]}: Error - ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`❌ Error getting user assets: ${error.message}`);
    }

    // Test IP Asset Locker
    console.log('\n🔒 Testing IP Asset Locker...');
    const ipAssetLocker = new ethers.Contract(
      CONTRACT_ADDRESSES.IP_ASSET_LOCKER,
      IP_ASSET_LOCKER_ABI,
      provider
    );

    try {
      const totalMinted = await ipAssetLocker.getTotalMintedHBAR();
      const totalLocked = await ipAssetLocker.totalLockedAssets();
      console.log(`✅ Total minted HBAR: ${ethers.formatEther(totalMinted)} HBAR`);
      console.log(`✅ Total locked assets: ${totalLocked}`);
    } catch (error) {
      console.log(`❌ Error getting locker stats: ${error.message}`);
    }

    // Test HBAR Token
    console.log('\n💰 Testing HBAR Equivalent Token...');
    const hbarToken = new ethers.Contract(
      CONTRACT_ADDRESSES.HBAR_EQUIVALENT_TOKEN,
      HBAR_TOKEN_ABI,
      provider
    );

    try {
      const totalMinted = await hbarToken.totalMinted();
      const isInitialized = await hbarToken.isInitialized();
      const locker = await hbarToken.getLocker();
      console.log(`✅ Total minted: ${ethers.formatEther(totalMinted)} tokens`);
      console.log(`✅ Initialized: ${isInitialized}`);
      console.log(`✅ Locker: ${locker}`);
      
      // Test balance for test user
      const balance = await hbarToken.balanceOf(testUser);
      console.log(`✅ Balance for ${testUser}: ${ethers.formatEther(balance)} tokens`);
    } catch (error) {
      console.log(`❌ Error getting token data: ${error.message}`);
    }

    // Test Arbitration
    console.log('\n⚖️ Testing Intellectual Property Arbitration...');
    const arbitration = new ethers.Contract(
      CONTRACT_ADDRESSES.INTELLECTUAL_PROPERTY_ARBITRATION,
      ARBITRATION_ABI,
      provider
    );

    try {
      const disputeCount = await arbitration.getDisputeCount();
      console.log(`✅ Total disputes: ${disputeCount}`);
    } catch (error) {
      console.log(`❌ Error getting dispute count: ${error.message}`);
    }

    console.log('\n✅ Contract data fetching test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testContractData().catch(console.error);

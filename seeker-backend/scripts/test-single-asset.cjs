const { createThirdwebClient, getContract, readContract, defineChain } = require("thirdweb");
const IPAssetManagerV2ABI = require('../abi/IPAssetManagerV2.json');

// Create Thirdweb client (same as frontend)
const client = createThirdwebClient({
  clientId: "c0016c054a796a6fa54b18dd24ed5f77",
});

// Define Hedera Testnet chain
const hederaTestnet = defineChain({
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 8 },
  rpc: "https://testnet.hashio.io/api",
});

// Contract configuration
const CONTRACT_ADDRESSES = {
  IP_ASSET_MANAGER_V2: '0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a',
};

async function testSingleAsset() {
  console.log('🧪 Testing Single Asset Fetch');
  console.log('============================\n');

  try {
    // Initialize contract
    const contract = getContract({
      address: CONTRACT_ADDRESSES.IP_ASSET_MANAGER_V2,
      chain: hederaTestnet,
      client: client,
      abi: IPAssetManagerV2ABI.abi,
    });

    // Test with asset ID 1
    console.log('🔍 Testing asset ID 1...');
    const asset1 = await readContract({
      contract,
      method: "function getIPAsset(uint256 assetId) view returns (uint256 assetId_, address owner, string name, string description, string metadataURI, uint256 createdAt, bool isActive, address licenseToken, address royaltyVault, uint256 totalRevenue, uint256 totalLicenses, uint256 nftTokenId, string ipfsHash)",
      params: [1n],
    });

    console.log('Asset 1 details:');
    console.log(`  Asset ID: ${asset1.assetId_}`);
    console.log(`  Owner: ${asset1.owner}`);
    console.log(`  Name: ${asset1.name}`);
    console.log(`  Description: ${asset1.description}`);
    console.log(`  Is Active: ${asset1.isActive}`);
    console.log(`  Total Revenue: ${asset1.totalRevenue}`);
    console.log(`  NFT Token ID: ${asset1.nftTokenId}`);
    console.log(`  IPFS Hash: ${asset1.ipfsHash}`);

    // Test with asset ID 2
    console.log('\n🔍 Testing asset ID 2...');
    const asset2 = await readContract({
      contract,
      method: "function getIPAsset(uint256 assetId) view returns (uint256 assetId_, address owner, string name, string description, string metadataURI, uint256 createdAt, bool isActive, address licenseToken, address royaltyVault, uint256 totalRevenue, uint256 totalLicenses, uint256 nftTokenId, string ipfsHash)",
      params: [2n],
    });

    console.log('Asset 2 details:');
    console.log(`  Asset ID: ${asset2.assetId_}`);
    console.log(`  Owner: ${asset2.owner}`);
    console.log(`  Name: ${asset2.name}`);
    console.log(`  Description: ${asset2.description}`);
    console.log(`  Is Active: ${asset2.isActive}`);
    console.log(`  Total Revenue: ${asset2.totalRevenue}`);
    console.log(`  NFT Token ID: ${asset2.nftTokenId}`);
    console.log(`  IPFS Hash: ${asset2.ipfsHash}`);

    console.log('\n✅ Single asset test completed successfully!');

  } catch (error) {
    console.error('❌ Error during single asset test:', error);
    throw error;
  }
}

// Run the test
testSingleAsset()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

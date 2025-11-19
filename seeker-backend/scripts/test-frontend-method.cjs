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

async function testFrontendMethod() {
  console.log('🧪 Testing Frontend Method');
  console.log('==========================\n');

  try {
    // Initialize contract exactly like frontend
    const contract = getContract({
      address: CONTRACT_ADDRESSES.IP_ASSET_MANAGER_V2,
      chain: hederaTestnet,
      client: client,
      abi: IPAssetManagerV2ABI.abi,
    });

    // Test getUserAssets first (we know this works)
    console.log('🔍 Testing getUserAssets...');
    const userAssets = await readContract({
      contract,
      method: "function getUserAssets(address user) view returns (uint256[])",
      params: ["0x9404966338eB27aF420a952574d777598Bbb58c4"],
    });
    console.log(`✅ getUserAssets: ${userAssets.length} assets found`);

    // Test getIPAsset with the first asset ID
    if (userAssets.length > 0) {
      const firstAssetId = userAssets[0];
      console.log(`\n🔍 Testing getIPAsset with asset ID ${firstAssetId}...`);
      
      try {
        const ipAsset = await readContract({
          contract,
          method: "function getIPAsset(uint256 assetId) view returns (uint256 assetId_, address owner, string name, string description, string metadataURI, uint256 createdAt, bool isActive, address licenseToken, address royaltyVault, uint256 totalRevenue, uint256 totalLicenses, uint256 nftTokenId, string ipfsHash)",
          params: [firstAssetId],
        });

        console.log('✅ getIPAsset successful!');
        console.log(`  Asset ID: ${ipAsset.assetId_}`);
        console.log(`  Owner: ${ipAsset.owner}`);
        console.log(`  Name: ${ipAsset.name}`);
        console.log(`  Description: ${ipAsset.description}`);
        console.log(`  Is Active: ${ipAsset.isActive}`);
        console.log(`  Total Revenue: ${ipAsset.totalRevenue}`);
        console.log(`  NFT Token ID: ${ipAsset.nftTokenId}`);
        console.log(`  IPFS Hash: ${ipAsset.ipfsHash}`);

        // Test a few more assets
        for (let i = 1; i < Math.min(5, userAssets.length); i++) {
          const assetId = userAssets[i];
          console.log(`\n🔍 Testing asset ID ${assetId}...`);
          
          try {
            const asset = await readContract({
              contract,
              method: "function getIPAsset(uint256 assetId) view returns (uint256 assetId_, address owner, string name, string description, string metadataURI, uint256 createdAt, bool isActive, address licenseToken, address royaltyVault, uint256 totalRevenue, uint256 totalLicenses, uint256 nftTokenId, string ipfsHash)",
              params: [assetId],
            });

            console.log(`  ✅ Asset ${assetId}: ${asset.name} (Active: ${asset.isActive})`);
          } catch (error) {
            console.log(`  ❌ Asset ${assetId} failed: ${error.message}`);
          }
        }

      } catch (error) {
        console.log(`❌ getIPAsset failed: ${error.message}`);
        console.log(`Error details:`, error);
      }
    }

    console.log('\n✅ Frontend method test completed!');

  } catch (error) {
    console.error('❌ Error during frontend method test:', error);
    throw error;
  }
}

// Run the test
testFrontendMethod()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

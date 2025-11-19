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

async function testMetadataURIs() {
  console.log('🧪 Testing Metadata URIs');
  console.log('========================\n');

  try {
    // Initialize contract
    const contract = getContract({
      address: CONTRACT_ADDRESSES.IP_ASSET_MANAGER_V2,
      chain: hederaTestnet,
      client: client,
      abi: IPAssetManagerV2ABI.abi,
    });

    // Get user assets first
    const userAssets = await readContract({
      contract,
      method: "function getUserAssets(address user) view returns (uint256[])",
      params: ["0x9404966338eB27aF420a952574d777598Bbb58c4"],
    });

    console.log(`Found ${userAssets.length} assets for user`);

    // Test first 5 assets to see their metadata URIs
    for (let i = 0; i < Math.min(5, userAssets.length); i++) {
      const assetId = userAssets[i];
      console.log(`\n🔍 Testing asset ID ${assetId}...`);
      
      try {
        const ipAsset = await readContract({
          contract,
          method: "function getIPAsset(uint256 assetId) view returns (uint256 assetId_, address owner, string name, string description, string metadataURI, uint256 createdAt, bool isActive, address licenseToken, address royaltyVault, uint256 totalRevenue, uint256 totalLicenses, uint256 nftTokenId, string ipfsHash)",
          params: [assetId],
        });

        console.log(`Asset ${assetId} details:`);
        console.log(`  Asset ID: ${ipAsset.assetId_}`);
        console.log(`  Owner: ${ipAsset.owner}`);
        console.log(`  Name: "${ipAsset.name}"`);
        console.log(`  Description: "${ipAsset.description}"`);
        console.log(`  Metadata URI: "${ipAsset.metadataURI}"`);
        console.log(`  IPFS Hash: "${ipAsset.ipfsHash}"`);
        console.log(`  Is Active: ${ipAsset.isActive}`);
        console.log(`  Total Revenue: ${ipAsset.totalRevenue}`);
        console.log(`  NFT Token ID: ${ipAsset.nftTokenId}`);

        // Test metadata parsing if URI exists
        if (ipAsset.metadataURI && ipAsset.metadataURI !== '') {
          console.log(`  📝 Testing metadata parsing for URI: "${ipAsset.metadataURI}"`);
          
          try {
            // Test different metadata parsing approaches
            if (ipAsset.metadataURI.startsWith('{')) {
              console.log(`    ✅ Direct JSON detected`);
              const metadata = JSON.parse(ipAsset.metadataURI);
              console.log(`    Parsed metadata:`, metadata);
            } else if (ipAsset.metadataURI.startsWith('ipfs://')) {
              console.log(`    ✅ IPFS URI detected`);
              const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipAsset.metadataURI.replace('ipfs://', '')}`;
              console.log(`    Gateway URL: ${gatewayUrl}`);
            } else if (ipAsset.metadataURI.startsWith('http')) {
              console.log(`    ✅ HTTP URL detected`);
              console.log(`    URL: ${ipAsset.metadataURI}`);
            } else {
              console.log(`    ⚠️  Unknown URI format: "${ipAsset.metadataURI}"`);
            }
          } catch (error) {
            console.log(`    ❌ Error parsing metadata: ${error.message}`);
          }
        } else {
          console.log(`  ⚠️  No metadata URI found`);
        }

      } catch (error) {
        console.log(`  ❌ Error getting asset ${assetId}: ${error.message}`);
      }
    }

    console.log('\n✅ Metadata URI test completed!');

  } catch (error) {
    console.error('❌ Error during metadata URI test:', error);
    throw error;
  }
}

// Run the test
testMetadataURIs()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

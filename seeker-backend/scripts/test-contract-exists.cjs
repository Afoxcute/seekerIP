const { createThirdwebClient, getContract, readContract, defineChain } = require("thirdweb");

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

async function testContractExists() {
  console.log('🧪 Testing Contract Existence');
  console.log('=============================\n');

  try {
    // Initialize contract with minimal ABI
    const contract = getContract({
      address: CONTRACT_ADDRESSES.IP_ASSET_MANAGER_V2,
      chain: hederaTestnet,
      client: client,
      abi: [
        {
          "inputs": [],
          "name": "totalIPs",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
          "name": "getUserAssets",
          "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
    });

    // Test totalIPs function
    console.log('🔍 Testing totalIPs function...');
    try {
      const totalIPs = await readContract({
        contract,
        method: "function totalIPs() view returns (uint256)",
        params: [],
      });
      console.log(`✅ totalIPs: ${totalIPs}`);
    } catch (error) {
      console.log(`❌ totalIPs failed: ${error.message}`);
    }

    // Test getUserAssets function
    console.log('\n🔍 Testing getUserAssets function...');
    try {
      const userAssets = await readContract({
        contract,
        method: "function getUserAssets(address user) view returns (uint256[])",
        params: ["0x9404966338eB27aF420a952574d777598Bbb58c4"],
      });
      console.log(`✅ getUserAssets: ${userAssets.length} assets found`);
      console.log(`   Asset IDs: ${userAssets.map(id => id.toString()).join(', ')}`);
    } catch (error) {
      console.log(`❌ getUserAssets failed: ${error.message}`);
    }

    console.log('\n✅ Contract existence test completed!');

  } catch (error) {
    console.error('❌ Error during contract existence test:', error);
    throw error;
  }
}

// Run the test
testContractExists()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

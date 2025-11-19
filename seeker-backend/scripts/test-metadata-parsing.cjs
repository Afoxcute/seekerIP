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

// Test metadata parsing functionality
async function testMetadataParsing() {
  console.log('🧪 Testing Metadata Parsing Functionality');
  console.log('==========================================\n');

  // Simulate the metadata parsing logic from the sync service
  async function parseMetadata(metadataUri) {
    try {
      console.log('Parsing metadata from URI:', metadataUri);
      
      // If metadata is a direct JSON string, parse it
      if (metadataUri.startsWith('{')) {
        const metadata = JSON.parse(metadataUri);
        console.log('Parsed direct JSON metadata:', metadata);
        return metadata;
      }
      
      // If it's an IPFS URI, fetch it
      if (metadataUri.startsWith('ipfs://')) {
        const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${metadataUri.replace('ipfs://', '')}`;
        console.log('Fetching metadata from gateway:', gatewayUrl);
        
        const response = await fetch(gatewayUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch metadata: ${response.statusText}`);
        }
        
        const metadata = await response.json();
        console.log('Fetched IPFS metadata:', metadata);
        return metadata;
      }
      
      // If it's already a gateway URL, fetch it
      if (metadataUri.includes('gateway.pinata.cloud')) {
        console.log('Fetching metadata from gateway URL:', metadataUri);
        const response = await fetch(metadataUri);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch metadata: ${response.statusText}`);
        }
        
        const metadata = await response.json();
        console.log('Fetched gateway metadata:', metadata);
        return metadata;
      }
      
      // Try to fetch as a regular URL
      if (metadataUri.startsWith('http')) {
        console.log('Fetching metadata from URL:', metadataUri);
        const response = await fetch(metadataUri);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch metadata: ${response.statusText}`);
        }
        
        const metadata = await response.json();
        console.log('Fetched URL metadata:', metadata);
        return metadata;
      }
      
      // Default fallback
      console.log('Using fallback metadata for URI:', metadataUri);
      return {
        name: "Unknown",
        description: "No description available",
        image: metadataUri // Use the URI as image if it's not JSON
      };
    } catch (error) {
      console.error('Error parsing metadata:', error);
      return {
        name: "Unknown",
        description: "No description available",
        image: metadataUri // Use the URI as image as fallback
      };
    }
  }

  // Test cases
  const testCases = [
    {
      name: "Direct JSON metadata",
      uri: '{"name":"Test Asset","description":"A test IP asset","image":"https://example.com/image.jpg","attributes":[{"trait_type":"Type","value":"Digital Art"}]}'
    },
    {
      name: "IPFS URI",
      uri: "ipfs://QmTestHash123456789"
    },
    {
      name: "Gateway URL",
      uri: "https://gateway.pinata.cloud/ipfs/QmTestHash123456789"
    },
    {
      name: "HTTP URL",
      uri: "https://example.com/metadata.json"
    },
    {
      name: "Empty URI",
      uri: ""
    },
    {
      name: "Invalid JSON",
      uri: '{"name":"Test Asset","description":"A test IP asset"'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: ${testCase.name}`);
    console.log(`URI: "${testCase.uri}"`);
    console.log('─'.repeat(50));
    
    try {
      const result = await parseMetadata(testCase.uri);
      console.log('✅ Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }

  console.log('\n✅ Metadata parsing test completed!');
}

// Run the test
testMetadataParsing()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

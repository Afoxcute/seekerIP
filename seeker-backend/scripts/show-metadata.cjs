const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function showMetadata() {
  console.log('📋 IP Asset Metadata Viewer');
  console.log('===========================\n');

  try {
    // Get all IP assets with metadata
    const ipAssets = await prisma.iPAsset.findMany({
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${ipAssets.length} IP assets:\n`);

    ipAssets.forEach((asset, index) => {
      console.log(`${index + 1}. ${asset.name}`);
      console.log(`   ID: ${asset.id}`);
      console.log(`   Token ID: ${asset.tokenId.toString()}`);
      console.log(`   Owner: ${asset.owner}`);
      console.log(`   Description: ${asset.description}`);
      console.log(`   Metadata URI: "${asset.metadataURI}"`);
      console.log(`   IPFS Hash: "${asset.ipfsHash || 'N/A'}"`);
      console.log(`   Active: ${asset.isActive ? '✅' : '❌'}`);
      console.log(`   Revenue: ${(Number(asset.totalRevenue) / Math.pow(10, 8)).toFixed(4)} HBAR`);
      console.log(`   Created: ${asset.createdAt.toISOString()}`);
      
      // Show metadata if it exists
      if (asset.metadata) {
        console.log(`   📝 Metadata:`);
        console.log(`      ${JSON.stringify(asset.metadata, null, 6)}`);
      } else {
        console.log(`   📝 Metadata: None`);
      }
      
      console.log(''); // Empty line for readability
    });

    // Summary
    const assetsWithMetadata = ipAssets.filter(asset => asset.metadata && Object.keys(asset.metadata).length > 0);
    const assetsWithURIs = ipAssets.filter(asset => asset.metadataURI && asset.metadataURI !== '' && asset.metadataURI !== 'undefined');
    
    console.log('📊 Summary:');
    console.log(`   Total Assets: ${ipAssets.length}`);
    console.log(`   Assets with Metadata: ${assetsWithMetadata.length}`);
    console.log(`   Assets with Metadata URIs: ${assetsWithURIs.length}`);
    console.log(`   Active Assets: ${ipAssets.filter(asset => asset.isActive).length}`);

    console.log('\n✅ Metadata display completed!');

  } catch (error) {
    console.error('❌ Error displaying metadata:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
showMetadata()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testThirdwebSync() {
  console.log('🧪 Testing Thirdweb Data Sync (Same as Frontend)');
  console.log('===============================================\n');

  try {
    // Clear existing data first
    console.log('🧹 Clearing existing data...');
    await prisma.iPAssetLock.deleteMany();
    await prisma.hBARTokenBalance.deleteMany();
    await prisma.arbitrationCase.deleteMany();
    await prisma.iPAsset.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Existing data cleared\n');

    // Test syncing all contracts using Thirdweb
    console.log('🔄 Starting Thirdweb data sync...');
    
    // Import and run the Thirdweb sync service
    const { thirdwebDataSyncService } = await import('../lib/thirdweb-data-sync-service.js');
    await thirdwebDataSyncService.syncAllContracts();
    
    console.log('✅ Thirdweb data sync completed\n');

    // Display results
    console.log('📊 Database Contents After Thirdweb Sync:');
    console.log('=========================================');

    const ipAssets = await prisma.iPAsset.findMany();
    console.log(`\n🎨 IP Assets: ${ipAssets.length}`);
    ipAssets.forEach((asset, index) => {
      console.log(`\n${index + 1}. ${asset.name}`);
      console.log(`   ID: ${asset.id}`);
      console.log(`   Owner: ${asset.owner}`);
      console.log(`   Description: ${asset.description.substring(0, 100)}${asset.description.length > 100 ? '...' : ''}`);
      console.log(`   Revenue: ${(Number(asset.totalRevenue) / Math.pow(10, 8)).toFixed(4)} HBAR`);
      console.log(`   Active: ${asset.isActive ? '✅' : '❌'}`);
      console.log(`   IPFS Hash: ${asset.ipfsHash}`);
    });

    const users = await prisma.user.findMany();
    console.log(`\n👥 Users: ${users.length}`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.address}`);
    });

    const locks = await prisma.iPAssetLock.findMany();
    console.log(`\n🔒 IP Asset Locks: ${locks.length}`);
    locks.forEach((lock, index) => {
      console.log(`\n${index + 1}. Asset ID: ${lock.ipAssetId}`);
      console.log(`   Owner: ${lock.owner}`);
      console.log(`   HBAR Locked: ${(Number(lock.hbarAmount) / Math.pow(10, 8)).toFixed(4)} HBAR`);
      console.log(`   Status: ${lock.status}`);
    });

    const hbarBalances = await prisma.hBARTokenBalance.findMany();
    console.log(`\n💰 HBAR Token Balances: ${hbarBalances.length}`);
    hbarBalances.forEach((balance, index) => {
      console.log(`\n${index + 1}. ${balance.owner}`);
      console.log(`   Balance: ${(Number(balance.balance) / Math.pow(10, 18)).toFixed(4)} tokens`);
      console.log(`   Total Minted: ${(Number(balance.totalMinted) / Math.pow(10, 18)).toFixed(4)} tokens`);
    });

    const arbitrationCases = await prisma.arbitrationCase.findMany();
    console.log(`\n⚖️ Arbitration Cases: ${arbitrationCases.length}`);
    arbitrationCases.forEach((case_, index) => {
      console.log(`\n${index + 1}. Asset ID: ${case_.ipAssetId}`);
      console.log(`   Status: ${case_.status}`);
      console.log(`   Result: ${case_.result || 'Pending'}`);
    });

    // Summary
    console.log('\n📊 Summary:');
    console.log('===========');
    console.log(`IP Assets: ${ipAssets.length}`);
    console.log(`Users: ${users.length}`);
    console.log(`Locked Assets: ${locks.length}`);
    console.log(`Token Holders: ${hbarBalances.length}`);
    console.log(`Arbitration Cases: ${arbitrationCases.length}`);

    const totalRevenue = ipAssets.reduce((sum, asset) => sum + Number(asset.totalRevenue), 0);
    const totalLockedHBAR = locks.reduce((sum, lock) => sum + Number(lock.hbarAmount), 0);
    
    console.log(`Total Revenue: ${(totalRevenue / Math.pow(10, 8)).toFixed(4)} HBAR`);
    console.log(`Total Locked HBAR: ${(totalLockedHBAR / Math.pow(10, 8)).toFixed(4)} HBAR`);

    console.log('\n🎉 Thirdweb data sync test completed successfully!');
    console.log('✅ Data fetched using the same mechanism as the frontend');

  } catch (error) {
    console.error('❌ Error during Thirdweb data sync test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testThirdwebSync()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

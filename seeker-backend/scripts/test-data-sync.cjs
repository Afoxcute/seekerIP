const { PrismaClient } = require('@prisma/client');
const { dataSyncService } = require('../lib/data-sync-service');

const prisma = new PrismaClient();

async function testDataSync() {
  console.log('🧪 Testing Data Sync from All Contracts');
  console.log('=====================================\n');

  try {
    // Clear existing data first
    console.log('🧹 Clearing existing data...');
    await prisma.iPAssetLock.deleteMany();
    await prisma.hBARTokenBalance.deleteMany();
    await prisma.arbitrationCase.deleteMany();
    await prisma.iPAsset.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Existing data cleared\n');

    // Test syncing all contracts
    console.log('🔄 Starting comprehensive data sync...');
    await dataSyncService.syncAllContracts();
    console.log('✅ Data sync completed\n');

    // Display results
    console.log('📊 Database Contents After Sync:');
    console.log('================================');

    const ipAssets = await prisma.iPAsset.findMany();
    console.log(`\n🎨 IP Assets: ${ipAssets.length}`);
    ipAssets.forEach(asset => {
      console.log(`  - ID: ${asset.id}, Name: ${asset.name}, Owner: ${asset.owner}`);
      console.log(`    Revenue: ${asset.totalRevenue.toString()}, Active: ${asset.isActive}`);
    });

    const users = await prisma.user.findMany();
    console.log(`\n👥 Users: ${users.length}`);
    users.forEach(user => {
      console.log(`  - Address: ${user.address}`);
    });

    const locks = await prisma.iPAssetLock.findMany();
    console.log(`\n🔒 IP Asset Locks: ${locks.length}`);
    locks.forEach(lock => {
      console.log(`  - Asset ID: ${lock.ipAssetId}, Owner: ${lock.owner}`);
      console.log(`    HBAR Amount: ${lock.hbarAmount.toString()}, Status: ${lock.status}`);
    });

    const hbarBalances = await prisma.hBARTokenBalance.findMany();
    console.log(`\n💰 HBAR Token Balances: ${hbarBalances.length}`);
    hbarBalances.forEach(balance => {
      console.log(`  - Owner: ${balance.owner}, Balance: ${balance.balance.toString()}`);
      console.log(`    Total Minted: ${balance.totalMinted.toString()}`);
    });

    const arbitrationCases = await prisma.arbitrationCase.findMany();
    console.log(`\n⚖️ Arbitration Cases: ${arbitrationCases.length}`);
    arbitrationCases.forEach(case_ => {
      console.log(`  - Asset ID: ${case_.ipAssetId}, Status: ${case_.status}`);
      console.log(`    Result: ${case_.result || 'N/A'}`);
    });

    // Test specific contract data
    console.log('\n🔍 Testing Specific Contract Data:');
    console.log('==================================');

    // Test IP Asset Manager V2 data
    console.log('\n📝 IP Asset Manager V2 (0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a):');
    console.log(`  - Total IP Assets: ${ipAssets.length}`);
    console.log(`  - Active Assets: ${ipAssets.filter(a => a.isActive).length}`);
    console.log(`  - Total Revenue: ${ipAssets.reduce((sum, a) => sum + Number(a.totalRevenue), 0)}`);

    // Test IP Asset Locker data
    console.log('\n🔒 IP Asset Locker (0xec0dBd92a8D1A222d34ecdB088B0022F38aF2883):');
    console.log(`  - Locked Assets: ${locks.length}`);
    console.log(`  - Total Locked HBAR: ${locks.reduce((sum, l) => sum + Number(l.hbarAmount), 0)}`);

    // Test HBAR Equivalent Token data
    console.log('\n💰 HBAR Equivalent Token (0x9f4FC76E91e483b02DA42A0a10592e603F670dc9):');
    console.log(`  - Token Holders: ${hbarBalances.length}`);
    console.log(`  - Total Minted: ${hbarBalances.length > 0 ? hbarBalances[0].totalMinted.toString() : '0'}`);

    // Test Arbitration data
    console.log('\n⚖️ Intellectual Property Arbitration (0x60f4a0ee098394951bb704709842C92dF25038b2):');
    console.log(`  - Arbitration Cases: ${arbitrationCases.length}`);
    console.log(`  - Active Cases: ${arbitrationCases.filter(c => c.status === 'active').length}`);

    console.log('\n🎉 Data sync test completed successfully!');
    console.log('✅ All contract data has been fetched and stored in the database.');

  } catch (error) {
    console.error('❌ Error during data sync test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDataSync()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

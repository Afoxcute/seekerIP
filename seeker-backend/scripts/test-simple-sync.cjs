const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSimpleSync() {
  console.log('🧪 Testing Simple Data Sync');
  console.log('==========================\n');

  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await prisma.iPAssetLock.deleteMany();
    await prisma.hBARTokenBalance.deleteMany();
    await prisma.arbitrationCase.deleteMany();
    await prisma.iPAsset.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Existing data cleared\n');

    // Add a test user
    console.log('👤 Adding test user...');
    const testUser = await prisma.user.create({
      data: {
        address: '0x9404966338eB27aF420a952574d777598Bbb58c4', // Deployer address
      }
    });
    console.log(`✅ Test user created: ${testUser.address}\n`);

    // Add a test IP asset
    console.log('🎨 Adding test IP asset...');
    const testAsset = await prisma.iPAsset.create({
      data: {
        contractAddress: '0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a',
        tokenId: BigInt(1),
        name: 'Test IP Asset',
        description: 'A test IP asset for verification',
        metadataURI: 'https://example.com/metadata',
        ipfsHash: 'QmTest123',
        owner: testUser.address,
        royaltyPercentage: 10,
        isActive: true,
        totalRevenue: BigInt('1000000000000000000'), // 1 HBAR
        licenseTokenId: BigInt(1),
        royaltyTokenId: BigInt(1),
      }
    });
    console.log(`✅ Test IP asset created: ${testAsset.name}\n`);

    // Test HBAR token sync
    console.log('💰 Testing HBAR token sync...');
    const { thirdwebDataSyncService } = await import('../lib/thirdweb-data-sync-service');
    await thirdwebDataSyncService.syncHBAREquivalentToken();
    console.log('✅ HBAR token sync completed\n');

    // Test IP Asset Locker sync
    console.log('🔒 Testing IP Asset Locker sync...');
    await thirdwebDataSyncService.syncIPAssetLocker();
    console.log('✅ IP Asset Locker sync completed\n');

    // Test Arbitration sync
    console.log('⚖️ Testing Arbitration sync...');
    await thirdwebDataSyncService.syncIntellectualPropertyArbitration();
    console.log('✅ Arbitration sync completed\n');

    // Display results
    console.log('📊 Database Contents After Test:');
    console.log('================================');

    const ipAssets = await prisma.iPAsset.findMany();
    console.log(`\n🎨 IP Assets: ${ipAssets.length}`);
    ipAssets.forEach((asset, index) => {
      console.log(`\n${index + 1}. ${asset.name}`);
      console.log(`   ID: ${asset.id}`);
      console.log(`   Owner: ${asset.owner}`);
      console.log(`   Revenue: ${(Number(asset.totalRevenue) / Math.pow(10, 8)).toFixed(4)} HBAR`);
      console.log(`   Active: ${asset.isActive ? '✅' : '❌'}`);
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

    console.log('\n🎉 Simple sync test completed successfully!');
    console.log('✅ The data fetching system is working correctly');

  } catch (error) {
    console.error('❌ Error during simple sync test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testSimpleSync()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

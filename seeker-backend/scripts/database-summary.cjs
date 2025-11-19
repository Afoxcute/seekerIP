const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Helper function to format BigInt values
function formatBigInt(value) {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

// Helper function to format HBAR amounts (assuming 8 decimals)
function formatHBAR(amount) {
  const hbar = Number(amount) / Math.pow(10, 8);
  return `${hbar.toFixed(4)} HBAR`;
}

// Helper function to format token amounts (assuming 18 decimals)
function formatTokens(amount) {
  const tokens = Number(amount) / Math.pow(10, 18);
  return `${tokens.toFixed(4)} tokens`;
}

async function showDatabaseSummary() {
  console.log('📊 Database Summary');
  console.log('==================\n');

  try {
    // Get all counts
    const [
      ipAssets,
      users,
      locks,
      hbarBalances,
      arbitrationCases,
      licenses,
      royalties,
      payments,
      transactions
    ] = await Promise.all([
      prisma.iPAsset.count(),
      prisma.user.count(),
      prisma.iPAssetLock.count(),
      prisma.hBARTokenBalance.count(),
      prisma.arbitrationCase.count(),
      prisma.license.count(),
      prisma.royalty.count(),
      prisma.payment.count(),
      prisma.iPAssetTransaction.count()
    ]);

    // Get revenue and locked amounts
    const [totalRevenue, totalLockedHBAR, totalMintedTokens] = await Promise.all([
      prisma.iPAsset.aggregate({
        _sum: { totalRevenue: true }
      }),
      prisma.iPAssetLock.aggregate({
        _sum: { hbarAmount: true }
      }),
      prisma.hBARTokenBalance.aggregate({
        _max: { totalMinted: true }
      })
    ]);

    console.log('📈 Core Metrics:');
    console.log('================');
    console.log(`IP Assets: ${ipAssets}`);
    console.log(`Users: ${users}`);
    console.log(`Locked Assets: ${locks}`);
    console.log(`Token Holders: ${hbarBalances}`);
    console.log(`Arbitration Cases: ${arbitrationCases}`);
    console.log('');

    console.log('💰 Financial Data:');
    console.log('==================');
    console.log(`Total Revenue: ${formatHBAR(totalRevenue._sum.totalRevenue || 0)}`);
    console.log(`Total Locked HBAR: ${formatHBAR(totalLockedHBAR._sum.hbarAmount || 0)}`);
    console.log(`Total Minted Tokens: ${formatTokens(totalMintedTokens._max.totalMinted || 0)}`);
    console.log('');

    console.log('📋 Additional Data:');
    console.log('===================');
    console.log(`Licenses: ${licenses}`);
    console.log(`Royalties: ${royalties}`);
    console.log(`Payments: ${payments}`);
    console.log(`Transactions: ${transactions}`);
    console.log('');

    // Show recent activity
    console.log('🕒 Recent Activity:');
    console.log('==================');
    
    const recentAssets = await prisma.iPAsset.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: { name: true, owner: true, createdAt: true }
    });

    if (recentAssets.length > 0) {
      console.log('Recent IP Assets:');
      recentAssets.forEach((asset, index) => {
        console.log(`  ${index + 1}. ${asset.name} (${asset.owner}) - ${asset.createdAt.toISOString()}`);
      });
    }

    const recentLocks = await prisma.iPAssetLock.findMany({
      take: 3,
      orderBy: { lockTime: 'desc' },
      select: { 
        hbarAmount: true, 
        lockTime: true,
        ipAsset: { select: { name: true } }
      }
    });

    if (recentLocks.length > 0) {
      console.log('\nRecent Locks:');
      recentLocks.forEach((lock, index) => {
        console.log(`  ${index + 1}. ${lock.ipAsset?.name || 'Unknown'} - ${formatHBAR(lock.hbarAmount)} - ${lock.lockTime.toISOString()}`);
      });
    }

    console.log('\n✅ Database summary completed!');

  } catch (error) {
    console.error('❌ Error getting database summary:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
showDatabaseSummary()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

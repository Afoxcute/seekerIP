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

async function showDatabaseData() {
  console.log('🗄️  Database Data Viewer');
  console.log('========================\n');

  try {
    // Get all data counts first
    const counts = {
      ipAssets: await prisma.iPAsset.count(),
      users: await prisma.user.count(),
      licenses: await prisma.license.count(),
      royalties: await prisma.royalty.count(),
      payments: await prisma.payment.count(),
      transactions: await prisma.iPAssetTransaction.count(),
      locks: await prisma.iPAssetLock.count(),
      hbarBalances: await prisma.hBARTokenBalance.count(),
      hbarTransactions: await prisma.hBARTokenTransaction.count(),
      arbitrationCases: await prisma.arbitrationCase.count(),
      arbitrationVotes: await prisma.arbitrationVote.count(),
      arbitrationEvidence: await prisma.arbitrationEvidence.count(),
      tokenizedAssets: await prisma.tokenizedAsset.count(),
      tokenizedTransfers: await prisma.tokenizedAssetTransfer.count(),
      eventQueue: await prisma.eventQueue.count(),
      contractStates: await prisma.contractState.count(),
      platformConfig: await prisma.platformConfig.count(),
      assets: await prisma.asset.count(),
      kyc: await prisma.kYC.count()
    };

    console.log('📊 Database Summary:');
    console.log('===================');
    console.log(`IP Assets: ${counts.ipAssets}`);
    console.log(`Users: ${counts.users}`);
    console.log(`Licenses: ${counts.licenses}`);
    console.log(`Royalties: ${counts.royalties}`);
    console.log(`Payments: ${counts.payments}`);
    console.log(`Transactions: ${counts.transactions}`);
    console.log(`IP Asset Locks: ${counts.locks}`);
    console.log(`HBAR Token Balances: ${counts.hbarBalances}`);
    console.log(`HBAR Token Transactions: ${counts.hbarTransactions}`);
    console.log(`Arbitration Cases: ${counts.arbitrationCases}`);
    console.log(`Arbitration Votes: ${counts.arbitrationVotes}`);
    console.log(`Arbitration Evidence: ${counts.arbitrationEvidence}`);
    console.log(`Tokenized Assets: ${counts.tokenizedAssets}`);
    console.log(`Tokenized Transfers: ${counts.tokenizedTransfers}`);
    console.log(`Event Queue: ${counts.eventQueue}`);
    console.log(`Contract States: ${counts.contractStates}`);
    console.log(`Platform Config: ${counts.platformConfig}`);
    console.log(`Legacy Assets: ${counts.assets}`);
    console.log(`KYC Records: ${counts.kyc}`);
    console.log('');

    // Show IP Assets
    if (counts.ipAssets > 0) {
      console.log('🎨 IP Assets:');
      console.log('============');
      const ipAssets = await prisma.iPAsset.findMany({
        take: 10, // Show first 10
        orderBy: { createdAt: 'desc' }
      });
      
      ipAssets.forEach((asset, index) => {
        console.log(`\n${index + 1}. ${asset.name}`);
        console.log(`   ID: ${asset.id}`);
        console.log(`   Owner: ${asset.owner}`);
        console.log(`   Description: ${asset.description.substring(0, 100)}${asset.description.length > 100 ? '...' : ''}`);
        console.log(`   Revenue: ${formatHBAR(asset.totalRevenue)}`);
        console.log(`   Royalty: ${asset.royaltyPercentage}%`);
        console.log(`   Active: ${asset.isActive ? '✅' : '❌'}`);
        console.log(`   Created: ${asset.createdAt.toISOString()}`);
        if (asset.metadataURI) {
          console.log(`   Metadata: ${asset.metadataURI}`);
        }
      });
      
      if (counts.ipAssets > 10) {
        console.log(`\n... and ${counts.ipAssets - 10} more IP assets`);
      }
    }

    // Show Users
    if (counts.users > 0) {
      console.log('\n👥 Users:');
      console.log('=========');
      const users = await prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
      });
      
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.address}`);
        console.log(`   KYC Status: ${user.kycStatus}`);
        console.log(`   Created: ${user.createdAt.toISOString()}`);
      });
      
      if (counts.users > 10) {
        console.log(`\n... and ${counts.users - 10} more users`);
      }
    }

    // Show IP Asset Locks
    if (counts.locks > 0) {
      console.log('\n🔒 IP Asset Locks:');
      console.log('=================');
      const locks = await prisma.iPAssetLock.findMany({
        take: 10,
        orderBy: { lockTime: 'desc' },
        include: { ipAsset: true }
      });
      
      locks.forEach((lock, index) => {
        console.log(`\n${index + 1}. Asset: ${lock.ipAsset?.name || 'Unknown'}`);
        console.log(`   Asset ID: ${lock.ipAssetId}`);
        console.log(`   Owner: ${lock.owner}`);
        console.log(`   HBAR Locked: ${formatHBAR(lock.hbarAmount)}`);
        console.log(`   HBAR Tokens: ${formatTokens(lock.hbarTokenAmount)}`);
        console.log(`   Status: ${lock.status}`);
        console.log(`   Locked: ${lock.lockTime.toISOString()}`);
      });
      
      if (counts.locks > 10) {
        console.log(`\n... and ${counts.locks - 10} more locks`);
      }
    }

    // Show HBAR Token Balances
    if (counts.hbarBalances > 0) {
      console.log('\n💰 HBAR Token Balances:');
      console.log('=======================');
      const balances = await prisma.hBARTokenBalance.findMany({
        take: 10,
        orderBy: { balance: 'desc' }
      });
      
      balances.forEach((balance, index) => {
        console.log(`${index + 1}. ${balance.owner}`);
        console.log(`   Balance: ${formatTokens(balance.balance)}`);
        console.log(`   Total Minted: ${formatTokens(balance.totalMinted)}`);
        console.log(`   Total Burned: ${formatTokens(balance.totalBurned)}`);
        console.log(`   Last Updated: ${balance.lastUpdated.toISOString()}`);
      });
      
      if (counts.hbarBalances > 10) {
        console.log(`\n... and ${counts.hbarBalances - 10} more balances`);
      }
    }

    // Show Arbitration Cases
    if (counts.arbitrationCases > 0) {
      console.log('\n⚖️ Arbitration Cases:');
      console.log('====================');
      const cases = await prisma.arbitrationCase.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { ipAsset: true }
      });
      
      cases.forEach((case_, index) => {
        console.log(`\n${index + 1}. Asset: ${case_.ipAsset?.name || 'Unknown'}`);
        console.log(`   Case ID: ${case_.id}`);
        console.log(`   Dispute ID: ${formatBigInt(case_.disputeId)}`);
        console.log(`   Complainant: ${case_.complainant}`);
        console.log(`   Respondent: ${case_.respondent}`);
        console.log(`   Status: ${case_.status}`);
        console.log(`   Result: ${case_.result || 'Pending'}`);
        console.log(`   Created: ${case_.createdAt.toISOString()}`);
      });
      
      if (counts.arbitrationCases > 10) {
        console.log(`\n... and ${counts.arbitrationCases - 10} more cases`);
      }
    }

    // Show Licenses
    if (counts.licenses > 0) {
      console.log('\n📄 Licenses:');
      console.log('============');
      const licenses = await prisma.license.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { ipAsset: true }
      });
      
      licenses.forEach((license, index) => {
        console.log(`\n${index + 1}. Asset: ${license.ipAsset?.name || 'Unknown'}`);
        console.log(`   License ID: ${license.id}`);
        console.log(`   Terms: ${license.terms.substring(0, 100)}${license.terms.length > 100 ? '...' : ''}`);
        console.log(`   Price: ${formatHBAR(license.price)}`);
        console.log(`   Max Mints: ${formatBigInt(license.maxMints)}`);
        console.log(`   Current Mints: ${formatBigInt(license.currentMints)}`);
        console.log(`   Type: ${license.licenseType}`);
        console.log(`   Active: ${license.isActive ? '✅' : '❌'}`);
      });
      
      if (counts.licenses > 5) {
        console.log(`\n... and ${counts.licenses - 5} more licenses`);
      }
    }

    // Show Royalties
    if (counts.royalties > 0) {
      console.log('\n💎 Royalties:');
      console.log('=============');
      const royalties = await prisma.royalty.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { ipAsset: true }
      });
      
      royalties.forEach((royalty, index) => {
        console.log(`\n${index + 1}. Asset: ${royalty.ipAsset?.name || 'Unknown'}`);
        console.log(`   Royalty ID: ${royalty.id}`);
        console.log(`   Total Revenue: ${formatHBAR(royalty.totalRevenue)}`);
        console.log(`   Total Royalty Tokens: ${formatBigInt(royalty.totalRoyaltyTokens)}`);
        console.log(`   Created: ${royalty.createdAt.toISOString()}`);
      });
      
      if (counts.royalties > 5) {
        console.log(`\n... and ${counts.royalties - 5} more royalties`);
      }
    }

    // Show Contract States
    if (counts.contractStates > 0) {
      console.log('\n🔧 Contract States:');
      console.log('==================');
      const states = await prisma.contractState.findMany();
      
      states.forEach((state, index) => {
        console.log(`${index + 1}. ${state.contractName}`);
        console.log(`   Address: ${state.contractAddress}`);
        console.log(`   Last Block: ${formatBigInt(state.lastProcessedBlock)}`);
        console.log(`   Active: ${state.isActive ? '✅' : '❌'}`);
        console.log(`   Updated: ${state.updatedAt.toISOString()}`);
      });
    }

    // Show Event Queue
    if (counts.eventQueue > 0) {
      console.log('\n📋 Event Queue:');
      console.log('===============');
      const events = await prisma.eventQueue.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
      });
      
      events.forEach((event, index) => {
        console.log(`${index + 1}. ${event.eventName}`);
        console.log(`   Contract: ${event.contractAddress}`);
        console.log(`   Block: ${formatBigInt(event.blockNumber)}`);
        console.log(`   Processed: ${event.processed ? '✅' : '❌'}`);
        console.log(`   Retries: ${event.retryCount}`);
        if (event.errorMessage) {
          console.log(`   Error: ${event.errorMessage}`);
        }
      });
      
      if (counts.eventQueue > 5) {
        console.log(`\n... and ${counts.eventQueue - 5} more events`);
      }
    }

    console.log('\n🎉 Database data display completed!');
    console.log(`\n📊 Total records across all tables: ${Object.values(counts).reduce((sum, count) => sum + count, 0)}`);

  } catch (error) {
    console.error('❌ Error displaying database data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
showDatabaseData()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

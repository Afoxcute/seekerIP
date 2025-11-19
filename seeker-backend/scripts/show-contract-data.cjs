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

async function showContractData() {
  console.log('📋 Contract Data Viewer');
  console.log('======================\n');

  try {
    // Contract addresses
    const contracts = {
      'IP Asset Manager V2': '0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a',
      'IP Asset Locker': '0xec0dBd92a8D1A222d34ecdB088B0022F38aF2883',
      'HBAR Equivalent Token': '0x9f4FC76E91e483b02DA42A0a10592e603F670dc9',
      'Intellectual Property Arbitration': '0x60f4a0ee098394951bb704709842C92dF25038b2'
    };

    console.log('🎯 Contract Addresses:');
    console.log('======================');
    Object.entries(contracts).forEach(([name, address]) => {
      console.log(`${name}: ${address}`);
    });
    console.log('');

    // 1. IP Asset Manager V2 Data
    console.log('🎨 IP Asset Manager V2 Data:');
    console.log('============================');
    
    const ipAssets = await prisma.iPAsset.findMany({
      where: { contractAddress: contracts['IP Asset Manager V2'] },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Total IP Assets: ${ipAssets.length}`);
    console.log(`Active Assets: ${ipAssets.filter(a => a.isActive).length}`);
    
    const totalRevenue = ipAssets.reduce((sum, asset) => sum + Number(asset.totalRevenue), 0);
    console.log(`Total Revenue: ${formatHBAR(totalRevenue)}`);

    if (ipAssets.length > 0) {
      console.log('\n📋 Recent IP Assets:');
      ipAssets.slice(0, 5).forEach((asset, index) => {
        console.log(`\n${index + 1}. ${asset.name}`);
        console.log(`   ID: ${asset.id}`);
        console.log(`   Owner: ${asset.owner}`);
        console.log(`   Revenue: ${formatHBAR(asset.totalRevenue)}`);
        console.log(`   Royalty: ${asset.royaltyPercentage}%`);
        console.log(`   Active: ${asset.isActive ? '✅' : '❌'}`);
        console.log(`   License Token ID: ${formatBigInt(asset.licenseTokenId || 0)}`);
        console.log(`   Royalty Token ID: ${formatBigInt(asset.royaltyTokenId)}`);
      });
    }

    // 2. IP Asset Locker Data
    console.log('\n🔒 IP Asset Locker Data:');
    console.log('========================');
    
    const locks = await prisma.iPAssetLock.findMany({
      include: { ipAsset: true },
      orderBy: { lockTime: 'desc' }
    });

    console.log(`Total Locked Assets: ${locks.length}`);
    
    const totalLockedHBAR = locks.reduce((sum, lock) => sum + Number(lock.hbarAmount), 0);
    console.log(`Total Locked HBAR: ${formatHBAR(totalLockedHBAR)}`);

    if (locks.length > 0) {
      console.log('\n📋 Locked Assets:');
      locks.slice(0, 5).forEach((lock, index) => {
        console.log(`\n${index + 1}. ${lock.ipAsset?.name || 'Unknown Asset'}`);
        console.log(`   Asset ID: ${lock.ipAssetId}`);
        console.log(`   Owner: ${lock.owner}`);
        console.log(`   HBAR Locked: ${formatHBAR(lock.hbarAmount)}`);
        console.log(`   HBAR Tokens: ${formatTokens(lock.hbarTokenAmount)}`);
        console.log(`   Status: ${lock.status}`);
        console.log(`   Locked: ${lock.lockTime.toISOString()}`);
      });
    }

    // 3. HBAR Equivalent Token Data
    console.log('\n💰 HBAR Equivalent Token Data:');
    console.log('==============================');
    
    const hbarBalances = await prisma.hBARTokenBalance.findMany({
      orderBy: { balance: 'desc' }
    });

    console.log(`Total Token Holders: ${hbarBalances.length}`);
    
    const totalMinted = hbarBalances.length > 0 ? hbarBalances[0].totalMinted : BigInt(0);
    console.log(`Total Minted: ${formatTokens(totalMinted)}`);

    if (hbarBalances.length > 0) {
      console.log('\n📋 Token Holders:');
      hbarBalances.slice(0, 5).forEach((balance, index) => {
        console.log(`\n${index + 1}. ${balance.owner}`);
        console.log(`   Balance: ${formatTokens(balance.balance)}`);
        console.log(`   Total Minted: ${formatTokens(balance.totalMinted)}`);
        console.log(`   Total Burned: ${formatTokens(balance.totalBurned)}`);
        console.log(`   Last Updated: ${balance.lastUpdated.toISOString()}`);
      });
    }

    // 4. Intellectual Property Arbitration Data
    console.log('\n⚖️ Intellectual Property Arbitration Data:');
    console.log('==========================================');
    
    const arbitrationCases = await prisma.arbitrationCase.findMany({
      include: { ipAsset: true },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Total Arbitration Cases: ${arbitrationCases.length}`);
    console.log(`Active Cases: ${arbitrationCases.filter(c => c.status === 'active').length}`);
    console.log(`Resolved Cases: ${arbitrationCases.filter(c => c.status === 'resolved').length}`);

    if (arbitrationCases.length > 0) {
      console.log('\n📋 Arbitration Cases:');
      arbitrationCases.slice(0, 5).forEach((case_, index) => {
        console.log(`\n${index + 1}. Asset: ${case_.ipAsset?.name || 'Unknown'}`);
        console.log(`   Case ID: ${case_.id}`);
        console.log(`   Dispute ID: ${formatBigInt(case_.disputeId)}`);
        console.log(`   Complainant: ${case_.complainant}`);
        console.log(`   Respondent: ${case_.respondent}`);
        console.log(`   Status: ${case_.status}`);
        console.log(`   Result: ${case_.result || 'Pending'}`);
        console.log(`   Created: ${case_.createdAt.toISOString()}`);
      });
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log('===========');
    console.log(`IP Assets: ${ipAssets.length}`);
    console.log(`Locked Assets: ${locks.length}`);
    console.log(`Token Holders: ${hbarBalances.length}`);
    console.log(`Arbitration Cases: ${arbitrationCases.length}`);
    console.log(`Total Revenue: ${formatHBAR(totalRevenue)}`);
    console.log(`Total Locked HBAR: ${formatHBAR(totalLockedHBAR)}`);
    console.log(`Total Minted Tokens: ${formatTokens(totalMinted)}`);

    console.log('\n🎉 Contract data display completed!');

  } catch (error) {
    console.error('❌ Error displaying contract data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
showContractData()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

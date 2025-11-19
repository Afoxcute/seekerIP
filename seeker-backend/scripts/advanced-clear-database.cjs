const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function getTableCounts() {
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
    tokenizedAssets: await prisma.tokenizedAsset.count(),
    eventQueue: await prisma.eventQueue.count(),
    contractStates: await prisma.contractState.count(),
    platformConfig: await prisma.platformConfig.count(),
    assets: await prisma.asset.count(),
    kyc: await prisma.kYC.count()
  };
  
  return counts;
}

async function displayTableCounts() {
  console.log('\n📊 Current Database Contents:');
  console.log('============================');
  
  const counts = await getTableCounts();
  
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
  console.log(`Tokenized Assets: ${counts.tokenizedAssets}`);
  console.log(`Event Queue: ${counts.eventQueue}`);
  console.log(`Contract States: ${counts.contractStates}`);
  console.log(`Platform Config: ${counts.platformConfig}`);
  console.log(`Legacy Assets: ${counts.assets}`);
  console.log(`KYC Records: ${counts.kyc}`);
  console.log('============================\n');
}

async function clearAllTables() {
  console.log('🧹 Clearing ALL tables...');
  
  try {
    // Clear dependent tables first
    await prisma.arbitrationEvidence.deleteMany();
    console.log('✅ Cleared arbitration_evidence');
    
    await prisma.arbitrationVote.deleteMany();
    console.log('✅ Cleared arbitration_votes');
    
    await prisma.arbitrationCase.deleteMany();
    console.log('✅ Cleared arbitration_cases');
    
    await prisma.tokenizedAssetTransfer.deleteMany();
    console.log('✅ Cleared tokenized_asset_transfers');
    
    await prisma.tokenizedAsset.deleteMany();
    console.log('✅ Cleared tokenized_assets');
    
    await prisma.eventQueue.deleteMany();
    console.log('✅ Cleared event_queue');
    
    await prisma.contractState.deleteMany();
    console.log('✅ Cleared contract_states');
    
    await prisma.hBARTokenTransaction.deleteMany();
    console.log('✅ Cleared hbar_token_transactions');
    
    await prisma.hBARTokenBalance.deleteMany();
    console.log('✅ Cleared hbar_token_balances');
    
    await prisma.iPAssetUnlockEvent.deleteMany();
    console.log('✅ Cleared ip_asset_unlock_events');
    
    await prisma.iPAssetLock.deleteMany();
    console.log('✅ Cleared ip_asset_locks');
    
    await prisma.iPAssetTransaction.deleteMany();
    console.log('✅ Cleared ip_asset_transactions');
    
    await prisma.payment.deleteMany();
    console.log('✅ Cleared payments');
    
    await prisma.royaltyClaim.deleteMany();
    console.log('✅ Cleared royalty_claims');
    
    await prisma.royaltyShare.deleteMany();
    console.log('✅ Cleared royalty_shares');
    
    await prisma.royalty.deleteMany();
    console.log('✅ Cleared royalties');
    
    await prisma.licenseMint.deleteMany();
    console.log('✅ Cleared license_mints');
    
    await prisma.license.deleteMany();
    console.log('✅ Cleared licenses');
    
    await prisma.iPAsset.deleteMany();
    console.log('✅ Cleared ip_assets');
    
    // Clear independent tables
    await prisma.user.deleteMany();
    console.log('✅ Cleared users');
    
    await prisma.platformConfig.deleteMany();
    console.log('✅ Cleared platform_config');
    
    // Clear legacy tables
    await prisma.kYC.deleteMany();
    console.log('✅ Cleared kyc');
    
    await prisma.asset.deleteMany();
    console.log('✅ Cleared assets');
    
    console.log('🎉 All tables cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing tables:', error);
    throw error;
  }
}

async function clearContractData() {
  console.log('🧹 Clearing contract-related data only...');
  
  try {
    // Clear contract data but keep users and platform config
    await prisma.arbitrationEvidence.deleteMany();
    await prisma.arbitrationVote.deleteMany();
    await prisma.arbitrationCase.deleteMany();
    await prisma.tokenizedAssetTransfer.deleteMany();
    await prisma.tokenizedAsset.deleteMany();
    await prisma.eventQueue.deleteMany();
    await prisma.contractState.deleteMany();
    await prisma.hBARTokenTransaction.deleteMany();
    await prisma.hBARTokenBalance.deleteMany();
    await prisma.iPAssetUnlockEvent.deleteMany();
    await prisma.iPAssetLock.deleteMany();
    await prisma.iPAssetTransaction.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.royaltyClaim.deleteMany();
    await prisma.royaltyShare.deleteMany();
    await prisma.royalty.deleteMany();
    await prisma.licenseMint.deleteMany();
    await prisma.license.deleteMany();
    await prisma.iPAsset.deleteMany();
    
    console.log('✅ Contract data cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing contract data:', error);
    throw error;
  }
}

async function clearLegacyData() {
  console.log('🧹 Clearing legacy data only...');
  
  try {
    await prisma.kYC.deleteMany();
    await prisma.asset.deleteMany();
    
    console.log('✅ Legacy data cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing legacy data:', error);
    throw error;
  }
}

async function main() {
  console.log('🗄️  Database Cleanup Tool');
  console.log('========================\n');
  
  try {
    // Display current table counts
    await displayTableCounts();
    
    // Ask user what they want to do
    console.log('What would you like to do?');
    console.log('1. Clear ALL tables (complete reset)');
    console.log('2. Clear contract data only (keep users and platform config)');
    console.log('3. Clear legacy data only (kyc, assets)');
    console.log('4. Show table counts only');
    console.log('5. Exit');
    
    const choice = await askQuestion('\nEnter your choice (1-5): ');
    
    switch (choice.trim()) {
      case '1':
        const confirmAll = await askQuestion('⚠️  This will delete ALL data. Are you sure? (yes/no): ');
        if (confirmAll.toLowerCase() === 'yes') {
          await clearAllTables();
          await displayTableCounts();
        } else {
          console.log('❌ Operation cancelled');
        }
        break;
        
      case '2':
        const confirmContract = await askQuestion('⚠️  This will delete all contract data. Continue? (yes/no): ');
        if (confirmContract.toLowerCase() === 'yes') {
          await clearContractData();
          await displayTableCounts();
        } else {
          console.log('❌ Operation cancelled');
        }
        break;
        
      case '3':
        const confirmLegacy = await askQuestion('⚠️  This will delete legacy data. Continue? (yes/no): ');
        if (confirmLegacy.toLowerCase() === 'yes') {
          await clearLegacyData();
          await displayTableCounts();
        } else {
          console.log('❌ Operation cancelled');
        }
        break;
        
      case '4':
        await displayTableCounts();
        break;
        
      case '5':
        console.log('👋 Goodbye!');
        break;
        
      default:
        console.log('❌ Invalid choice');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Run the main function
main();

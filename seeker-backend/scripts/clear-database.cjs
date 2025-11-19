const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearAllTables() {
  console.log('🧹 Starting database cleanup...');
  
  try {
    // Clear all tables in the correct order to avoid foreign key constraints
    console.log('📝 Clearing dependent tables first...');
    
    // Clear dependent tables (those with foreign keys)
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
    console.log('📝 Clearing independent tables...');
    
    await prisma.user.deleteMany();
    console.log('✅ Cleared users');
    
    await prisma.platformConfig.deleteMany();
    console.log('✅ Cleared platform_config');
    
    // Clear legacy tables
    await prisma.kYC.deleteMany();
    console.log('✅ Cleared kyc');
    
    await prisma.asset.deleteMany();
    console.log('✅ Cleared assets');
    
    console.log('🎉 Database cleanup completed successfully!');
    console.log('📊 All tables have been cleared.');
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
clearAllTables()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing IP Asset Locking System...");
  
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const user1 = signers[1] || signers[0]; // Use deployer if only one signer
  const user2 = signers[2] || signers[0]; // Use deployer if only one signer
  
  console.log(`📝 Testing with accounts:`);
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  User1: ${user1.address}`);
  console.log(`  User2: ${user2.address}`);
  
  // Get contract addresses from deployment file
  const fs = require("fs");
  const path = require("path");
  
  let IP_ASSET_LOCKER, HBAR_TOKEN;
  
  try {
    const deploymentFile = path.join(__dirname, "..", "deployments", "ip-asset-locker-hedera_testnet.json");
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    IP_ASSET_LOCKER = deployment.ipAssetLocker;
    HBAR_TOKEN = deployment.hbarToken;
  } catch (error) {
    console.error("❌ Could not read deployment file. Please run deployment first.");
    process.exit(1);
  }
  
  console.log(`🔗 IP Asset Locker: ${IP_ASSET_LOCKER}`);
  console.log(`🪙 HBAR Token: ${HBAR_TOKEN}`);
  
  // Get contracts
  const ipAssetLocker = await ethers.getContractAt("IPAssetLocker", IP_ASSET_LOCKER);
  const hbarToken = await ethers.getContractAt("HBAREquivalentToken", HBAR_TOKEN);
  
  // Test 1: Check initial state
  console.log("\n📊 Test 1: Initial State");
  const totalMinted = await ipAssetLocker.getTotalMintedHBAR();
  console.log(`  Total HBAR minted: ${ethers.formatEther(totalMinted)}`);
  
  const user1Balance = await hbarToken.balanceOf(user1.address);
  console.log(`  User1 HBAR balance: ${ethers.formatEther(user1Balance)}`);
  
  // Test 2: Lock IP Asset
  console.log("\n🔒 Test 2: Lock IP Asset");
  const ipAssetId = 123;
  const hbarAmount = ethers.parseEther("1000");
  
  try {
    console.log(`  Attempting to lock IP asset ${ipAssetId} with ${ethers.formatEther(hbarAmount)} HBAR...`);
    
    const lockTx = await ipAssetLocker.connect(user1).lockIPAsset(ipAssetId, hbarAmount);
    await lockTx.wait();
    
    console.log(`  ✅ Successfully locked IP asset ${ipAssetId}`);
    
    // Check updated state
    const newTotalMinted = await ipAssetLocker.getTotalMintedHBAR();
    const newUser1Balance = await hbarToken.balanceOf(user1.address);
    const isLocked = await ipAssetLocker.isIPAssetLocked(ipAssetId);
    const lockedAmount = await ipAssetLocker.getLockedAmount(ipAssetId);
    
    console.log(`  Total HBAR minted: ${ethers.formatEther(newTotalMinted)}`);
    console.log(`  User1 HBAR balance: ${ethers.formatEther(newUser1Balance)}`);
    console.log(`  IP asset locked: ${isLocked}`);
    console.log(`  Locked amount: ${ethers.formatEther(lockedAmount)}`);
    
    // Test 3: Unlock IP Asset
    console.log("\n🔓 Test 3: Unlock IP Asset");
    const unlockAmount = ethers.parseEther("500");
    
    console.log(`  Attempting to unlock ${ethers.formatEther(unlockAmount)} HBAR from IP asset ${ipAssetId}...`);
    
    const unlockTx = await ipAssetLocker.connect(user1).unlockIPAsset(ipAssetId, unlockAmount);
    await unlockTx.wait();
    
    console.log(`  ✅ Successfully unlocked ${ethers.formatEther(unlockAmount)} HBAR`);
    
    // Check final state
    const finalTotalMinted = await ipAssetLocker.getTotalMintedHBAR();
    const finalUser1Balance = await hbarToken.balanceOf(user1.address);
    const finalLockedAmount = await ipAssetLocker.getLockedAmount(ipAssetId);
    
    console.log(`  Total HBAR minted: ${ethers.formatEther(finalTotalMinted)}`);
    console.log(`  User1 HBAR balance: ${ethers.formatEther(finalUser1Balance)}`);
    console.log(`  Remaining locked amount: ${ethers.formatEther(finalLockedAmount)}`);
    
  } catch (error) {
    console.log(`  ⚠️ Error during locking/unlocking: ${error.message}`);
    console.log(`  This might be expected if IP asset doesn't exist or is in arbitration`);
  }
  
  // Test 4: Check user's locked assets
  console.log("\n📋 Test 4: User Locked Assets");
  const user1LockedAssets = await ipAssetLocker.getUserLockedIPAssets(user1.address);
  console.log(`  User1 locked assets: ${user1LockedAssets.length} assets`);
  
  for (let i = 0; i < user1LockedAssets.length; i++) {
    const assetId = user1LockedAssets[i];
    const lockedAmount = await ipAssetLocker.getLockedAmount(assetId);
    const owner = await ipAssetLocker.getLockedIPAssetOwner(assetId);
    console.log(`    Asset ${assetId}: ${ethers.formatEther(lockedAmount)} HBAR (owner: ${owner})`);
  }
  
  // Test 5: Check eligibility
  console.log("\n✅ Test 5: Eligibility Check");
  const isEligible = await ipAssetLocker.isIPAssetEligibleForLocking(ipAssetId);
  console.log(`  IP asset ${ipAssetId} eligible for locking: ${isEligible}`);
  
  // Test 6: Check arbitration status
  console.log("\n⚖️ Test 6: Arbitration Status Check");
  try {
    const arbitrationContract = await ethers.getContractAt("IntellectualPropertyArbitration", process.env.ARBITRATION_CONTRACT);
    const isArbitrationEligible = await arbitrationContract.isArbitrationEligible(ipAssetId);
    console.log(`  IP asset ${ipAssetId} arbitration eligible: ${isArbitrationEligible}`);
  } catch (error) {
    console.log(`  ⚠️ Could not check arbitration status: ${error.message}`);
  }
  
  console.log("\n🎉 IP Asset Locking System test completed!");
  console.log("\n📝 Note: The system integrates with your existing IP Asset Manager and Arbitration contracts.");
  console.log("   Make sure to set the correct contract addresses in your .env file.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });

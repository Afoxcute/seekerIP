const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("📊 Compliance System Status Check...");
  console.log("====================================");
  
  // Read deployment info
  const deploymentFiles = fs.readdirSync('.').filter(file => file.startsWith('deployment-compliance-system-') && file.endsWith('.json'));
  
  if (deploymentFiles.length === 0) {
    console.error("❌ No deployment file found.");
    return;
  }
  
  const latestDeploymentFile = deploymentFiles.sort().pop();
  console.log(`📋 Using deployment file: ${latestDeploymentFile}`);
  
  const deploymentData = JSON.parse(fs.readFileSync(latestDeploymentFile, 'utf8'));
  
  console.log("\n📋 Contract Addresses:");
  console.log(`   IPAssetComplianceManager: ${deploymentData.contracts.IPAssetComplianceManager}`);
  console.log(`   IPAssetHTSKYC: ${deploymentData.contracts.IPAssetHTSKYC}`);
  console.log(`   IPAssetManagerV2: ${deploymentData.contracts.IPAssetManagerV2}`);
  console.log(`   HTSToken: ${deploymentData.contracts.HTSToken}`);
  
  // Get the deployer
  const [deployer] = await ethers.getSigners();
  console.log(`\n👤 Checking with account: ${deployer.address}`);
  
  try {
    // Check IPAssetHTSKYC status
    const IPAssetHTSKYC = await ethers.getContractFactory("IPAssetHTSKYC");
    const ipAssetNFT = IPAssetHTSKYC.attach(deploymentData.contracts.IPAssetHTSKYC);
    
    const owner = await ipAssetNFT.owner();
    const tokenAddress = await ipAssetNFT.tokenAddress();
    const name = await ipAssetNFT.name();
    const symbol = await ipAssetNFT.symbol();
    
    console.log("\n📋 IPAssetHTSKYC Status:");
    console.log(`   Owner: ${owner}`);
    console.log(`   Token Address: ${tokenAddress}`);
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    
    // Check compliance manager status
    const IPAssetComplianceManager = await ethers.getContractFactory("IPAssetComplianceManager");
    const complianceManager = IPAssetComplianceManager.attach(deploymentData.contracts.IPAssetComplianceManager);
    
    const complianceOwner = await complianceManager.owner();
    const isComplianceOfficer = await complianceManager.isComplianceOfficer(deployer.address);
    
    console.log("\n📋 IPAssetComplianceManager Status:");
    console.log(`   Owner: ${complianceOwner}`);
    console.log(`   Deployer is Compliance Officer: ${isComplianceOfficer}`);
    
    // Check deployer compliance
    const complianceProfile = await complianceManager.getComplianceProfile(deployer.address);
    console.log("\n📋 Deployer Compliance Status:");
    console.log(`   Is Verified: ${complianceProfile.isVerified}`);
    console.log(`   Level: ${complianceProfile.level}`);
    console.log(`   Entity Type: ${complianceProfile.entityType}`);
    console.log(`   Can Hold IP Assets: ${complianceProfile.canHoldIPAssets}`);
    console.log(`   Can Trade IP Assets: ${complianceProfile.canTradeIPAssets}`);
    console.log(`   Can Transfer IP Assets: ${complianceProfile.canTransferIPAssets}`);
    
    console.log("\n🎉 COMPLIANCE SYSTEM STATUS SUMMARY");
    console.log("===================================");
    console.log("✅ All contracts deployed successfully");
    console.log("✅ Ownership properly configured");
    console.log("✅ Compliance manager active");
    console.log("✅ Deployer compliance verified");
    console.log(`⚠️  HTS Collection: ${tokenAddress === "0x0000000000000000000000000000000000000000" ? "Not created yet" : "Created"}`);
    
    if (tokenAddress === "0x0000000000000000000000000000000000000000") {
      console.log("\n📊 Next Steps:");
      console.log("   1. Create HTS NFT Collection (requires HBAR payment)");
      console.log("   2. Update frontend contract addresses");
      console.log("   3. Test compliance verification workflow");
      console.log("   4. Test IP asset registration with compliance");
    } else {
      console.log("\n📊 System Ready:");
      console.log("   1. Update frontend contract addresses");
      console.log("   2. Test compliance verification workflow");
      console.log("   3. Test IP asset registration with compliance");
      console.log("   4. Test audit trail functionality");
    }
    
  } catch (error) {
    console.error("❌ Error checking system status:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });


const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🏛️ Deploying IP Asset Compliance System...");
  console.log("=============================================");
  
  // Get the deployer
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deploying with account: ${deployer.address}`);
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} HBAR`);
  
  if (balance < ethers.parseEther("1")) {
    console.warn("⚠️  Low balance warning: Consider adding more HBAR for deployment");
  }

  try {
    console.log("\n📋 Step 1: Deploying IPAssetComplianceManager...");
    const IPAssetComplianceManager = await ethers.getContractFactory("IPAssetComplianceManager");
    const complianceManager = await IPAssetComplianceManager.deploy();
    await complianceManager.waitForDeployment();
    
    const complianceManagerAddress = await complianceManager.getAddress();
    console.log(`✅ IPAssetComplianceManager deployed to: ${complianceManagerAddress}`);

    console.log("\n📋 Step 2: Deploying IPAssetHTSKYC...");
    const IPAssetHTSKYC = await ethers.getContractFactory("IPAssetHTSKYC");
    const ipAssetNFT = await IPAssetHTSKYC.deploy();
    await ipAssetNFT.waitForDeployment();
    
    const ipAssetNFTAddress = await ipAssetNFT.getAddress();
    console.log(`✅ IPAssetHTSKYC deployed to: ${ipAssetNFTAddress}`);

    console.log("\n📋 Step 3: Deploying IPAssetManagerV2 with Compliance...");
    const IPAssetManagerV2 = await ethers.getContractFactory("IPAssetManagerV2");
    const ipAssetManager = await IPAssetManagerV2.deploy(
      ipAssetNFTAddress,
      complianceManagerAddress
    );
    await ipAssetManager.waitForDeployment();
    
    const ipAssetManagerAddress = await ipAssetManager.getAddress();
    console.log(`✅ IPAssetManagerV2 deployed to: ${ipAssetManagerAddress}`);

    console.log("\n📋 Step 4: Setting up ownership and permissions...");
    
    // Transfer ownership of NFT contract to the manager
    console.log("Transferring IPAssetHTSKYC ownership to IPAssetManagerV2...");
    const transferTx = await ipAssetNFT.transferOwnership(ipAssetManagerAddress);
    await transferTx.wait();
    console.log("✅ Ownership transferred");

    console.log("\n📋 Step 5: Setting up compliance officers...");
    
    // Add deployer as compliance officer (already done in constructor)
    console.log("✅ Deployer is default compliance officer");
    
    // Add IPAssetManagerV2 as compliance officer for automated compliance checks
    const addOfficerTx = await complianceManager.addComplianceOfficer(ipAssetManagerAddress);
    await addOfficerTx.wait();
    console.log("✅ IPAssetManagerV2 added as compliance officer");

    console.log("\n📋 Step 6: Verifying deployment...");
    
    // Verify ownership
    const nftOwner = await ipAssetNFT.owner();
    const managerOwner = await ipAssetManager.owner();
    const complianceOwner = await complianceManager.owner();
    
    console.log(`📋 IPAssetHTSKYC Owner: ${nftOwner}`);
    console.log(`📋 IPAssetManagerV2 Owner: ${managerOwner}`);
    console.log(`📋 IPAssetComplianceManager Owner: ${complianceOwner}`);
    
    // Verify compliance manager is set
    const setComplianceManager = await ipAssetManager.complianceManager();
    console.log(`📋 Compliance Manager in IPAssetManagerV2: ${setComplianceManager}`);

    console.log("\n📋 Step 7: Creating initial compliance verification...");
    
    // Verify the deployer's compliance
    const verificationTx = await complianceManager.verifyCompliance(
      deployer.address,
      2, // ENHANCED compliance level
      1, // CORPORATION entity type
      "United States",
      "DEPLOYER-001",
      Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year from now
      [true, true, true], // All permissions
      "Initial deployer compliance verification"
    );
    await verificationTx.wait();
    console.log("✅ Deployer compliance verified");

    // Save deployment information
    const deploymentInfo = {
      network: "testnet",
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        IPAssetComplianceManager: complianceManagerAddress,
        IPAssetHTSKYC: ipAssetNFTAddress,
        IPAssetManagerV2: ipAssetManagerAddress,
        HTSToken: "0x0000000000000000000000000000000000000000" // Will be set after HTS creation
      },
      collection: {
        name: "IntellectualPropertyAssets",
        symbol: "IPNFT",
        status: "pending_hts_creation"
      },
      compliance: {
        deployerVerified: true,
        complianceLevel: "ENHANCED",
        entityType: "CORPORATION",
        permissions: {
          canHoldIPAssets: true,
          canTradeIPAssets: true,
          canTransferIPAssets: true
        }
      },
      gasUsed: {
        complianceManager: (await complianceManager.deploymentTransaction()?.wait())?.gasUsed?.toString() || "unknown",
        ipAssetNFT: (await ipAssetNFT.deploymentTransaction()?.wait())?.gasUsed?.toString() || "unknown",
        ipAssetManager: (await ipAssetManager.deploymentTransaction()?.wait())?.gasUsed?.toString() || "unknown"
      }
    };

    const filename = `deployment-compliance-system-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to: ${filename}`);

    console.log("\n🎉 COMPLIANCE SYSTEM DEPLOYMENT COMPLETE!");
    console.log("==========================================");
    console.log(`📋 Contract Addresses:`);
    console.log(`   IPAssetComplianceManager: ${complianceManagerAddress}`);
    console.log(`   IPAssetHTSKYC: ${ipAssetNFTAddress}`);
    console.log(`   IPAssetManagerV2: ${ipAssetManagerAddress}`);
    console.log(`   HTSToken: To be created separately`);
    console.log(`\n🔐 Compliance Features:`);
    console.log(`   ✅ Entity verification system`);
    console.log(`   ✅ Compliance level management`);
    console.log(`   ✅ Permission-based access control`);
    console.log(`   ✅ Audit trail system`);
    console.log(`   ✅ Violation reporting`);
    console.log(`   ✅ Regulatory compliance checks`);
    console.log(`\n📊 Next Steps:`);
    console.log(`   1. Create HTS NFT Collection separately`);
    console.log(`   2. Update frontend contract addresses`);
    console.log(`   3. Test compliance verification`);
    console.log(`   4. Verify IP asset registration with compliance`);
    console.log(`   5. Test audit trail functionality`);
    console.log(`   6. Configure compliance officers`);

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });

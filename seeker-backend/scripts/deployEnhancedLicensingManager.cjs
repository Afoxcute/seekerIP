const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting Enhanced Licensing Manager deployment...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Get the compliance manager address (already deployed)
  const complianceManagerAddress = "0x60A1d2CEf7fcdcf97d897ffd7c7908539978880c";
  console.log("Using compliance manager at:", complianceManagerAddress);

  // Deploy EnhancedLicensingManager
  console.log("📄 Deploying EnhancedLicensingManager...");
  const EnhancedLicensingManager = await ethers.getContractFactory("EnhancedLicensingManager");
  const enhancedLicensingManager = await EnhancedLicensingManager.deploy(complianceManagerAddress);
  await enhancedLicensingManager.waitForDeployment();

  const enhancedLicensingManagerAddress = await enhancedLicensingManager.getAddress();
  console.log("✅ EnhancedLicensingManager deployed to:", enhancedLicensingManagerAddress);

  // Verify deployment
  console.log("🔍 Verifying deployment...");
  const owner = await enhancedLicensingManager.owner();
  console.log("Owner:", owner);
  console.log("Compliance Manager:", await enhancedLicensingManager.complianceManager());

  // Initialize supported jurisdictions
  console.log("🌍 Initializing supported jurisdictions...");
  const jurisdictions = ["US", "EU", "UK", "CA", "AU", "JP", "CN", "IN", "BR", "MX", "KE", "NG", "ZA", "GLOBAL"];
  
  for (const jurisdiction of jurisdictions) {
    try {
      const tx = await enhancedLicensingManager.addSupportedJurisdiction(jurisdiction);
      await tx.wait();
      console.log(`✅ Added jurisdiction: ${jurisdiction}`);
    } catch (error) {
      console.log(`⚠️ Failed to add jurisdiction ${jurisdiction}:`, error.message);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    network: "hedera_testnet",
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      EnhancedLicensingManager: {
        address: enhancedLicensingManagerAddress,
        owner: owner,
        complianceManager: complianceManagerAddress,
        supportedJurisdictions: jurisdictions
      }
    },
    gasUsed: {
      deployment: "TBD" // Hardhat doesn't provide gas used in the same way
    }
  };

  // Convert BigInt values to strings for JSON serialization
  const serializableDeploymentInfo = JSON.parse(JSON.stringify(deploymentInfo, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));

  const fs = require('fs');
  const deploymentFile = `deployment-enhanced-licensing-${Date.now()}.json`;
  fs.writeFileSync(deploymentFile, JSON.stringify(serializableDeploymentInfo, null, 2));
  console.log(`📄 Deployment info saved to: ${deploymentFile}`);

  console.log("\n🎉 Enhanced Licensing Manager deployment complete!");
  console.log("📋 Summary:");
  console.log(`   EnhancedLicensingManager: ${enhancedLicensingManagerAddress}`);
  console.log(`   Compliance Manager: ${complianceManagerAddress}`);
  console.log(`   Supported Jurisdictions: ${jurisdictions.length}`);
  console.log(`   Owner: ${owner}`);

  console.log("\n🔧 Next Steps:");
  console.log("1. Update frontend contract addresses");
  console.log("2. Test license creation and management");
  console.log("3. Verify geographic restrictions work");
  console.log("4. Test exclusive vs non-exclusive licensing");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });


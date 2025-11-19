const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying IP Asset Management System...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());

  try {
    // Deploy IPAssetNFT first
    console.log("\n📦 Deploying IPAssetNFT...");
    const IPAssetNFT = await ethers.getContractFactory("IPAssetNFT");
    const ipAssetNFT = await IPAssetNFT.deploy(ethers.constants.AddressZero); // Temporary address
    await ipAssetNFT.deployed();
    console.log("✅ IPAssetNFT deployed to:", ipAssetNFT.address);

    // Deploy IPAssetManagerV2
    console.log("\n🏗️ Deploying IPAssetManagerV2...");
    const IPAssetManagerV2 = await ethers.getContractFactory("IPAssetManagerV2");
    const ipAssetManager = await IPAssetManagerV2.deploy(ipAssetNFT.address);
    await ipAssetManager.deployed();
    console.log("✅ IPAssetManagerV2 deployed to:", ipAssetManager.address);

    // Set up the system
    console.log("\n🔗 Setting up system integration...");
    
    // Transfer NFT contract ownership to the manager
    const transferOwnershipTx = await ipAssetNFT.transferOwnership(ipAssetManager.address);
    await transferOwnershipTx.wait();
    console.log("✅ NFT contract ownership transferred to manager");

    // Verify the setup
    console.log("\n🔍 Verifying system setup...");
    const nftManager = await ipAssetNFT.ipAssetManager();
    const managerOwner = await ipAssetManager.owner();
    
    console.log("📋 System verification:");
    console.log("  - NFT Manager Address:", nftManager);
    console.log("  - Manager Owner:", managerOwner);
    console.log("  - Expected Manager Address:", ipAssetManager.address);
    console.log("  - Expected Owner:", deployer.address);

    if (nftManager === ipAssetManager.address && managerOwner === deployer.address) {
      console.log("✅ System setup verified successfully!");
    } else {
      console.log("❌ System setup verification failed!");
    }

    // Save deployment info
    const deploymentInfo = {
      network: "hardhat", // Default network
      deployer: deployer.address,
      contracts: {
        IPAssetNFT: ipAssetNFT.address,
        IPAssetManagerV2: ipAssetManager.address,
      },
      timestamp: new Date().toISOString(),
      blockNumber: await ethers.provider.getBlockNumber(),
    };

    console.log("\n📊 Deployed contract addresses:");
    console.log("  - IPAssetNFT:", ipAssetNFT.address);
    console.log("  - IPAssetManagerV2:", ipAssetManager.address);

    console.log("\n💾 Deployment completed successfully!");
    console.log("📄 Deployment info:", JSON.stringify(deploymentInfo, null, 2));

    // Test basic functionality
    console.log("\n🧪 Testing basic functionality...");
    
    // Test NFT contract
    const nftName = await ipAssetNFT.name();
    const nftSymbol = await ipAssetNFT.symbol();
    console.log("  - NFT Name:", nftName);
    console.log("  - NFT Symbol:", nftSymbol);

    // Test Manager contract
    const managerOwnerTest = await ipAssetManager.owner();
    console.log("  - Manager Owner:", managerOwnerTest);

    console.log("✅ Basic functionality test passed!");

    return {
      ipAssetNFT,
      ipAssetManager,
      deploymentInfo,
    };

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

// Handle errors
main()
  .then(() => {
    console.log("\n🎉 Deployment script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Deployment script failed:", error);
    process.exit(1);
  }); 
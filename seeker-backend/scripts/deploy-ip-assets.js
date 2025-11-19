const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting IP Asset Contracts deployment on Hedera Testnet...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());

  // Deploy IPAssetNFT first
  console.log("\n📦 Deploying IPAssetNFT...");
  const IPAssetNFT = await ethers.getContractFactory("IPAssetNFT");
  const ipAssetNFT = await IPAssetNFT.deploy(ethers.constants.AddressZero); // Temporary address, will be updated
  await ipAssetNFT.deployed();
  console.log("✅ IPAssetNFT deployed to:", ipAssetNFT.address);

  // Deploy IPAssetManagerV2
  console.log("\n📦 Deploying IPAssetManagerV2...");
  const IPAssetManagerV2 = await ethers.getContractFactory("IPAssetManagerV2");
  const ipAssetManager = await IPAssetManagerV2.deploy(ipAssetNFT.address);
  await ipAssetManager.deployed();
  console.log("✅ IPAssetManagerV2 deployed to:", ipAssetManager.address);

  // Update the NFT contract to point to the manager
  console.log("\n🔗 Linking NFT contract to manager...");
  const updateTx = await ipAssetNFT.transferOwnership(ipAssetManager.address);
  await updateTx.wait();
  console.log("✅ NFT contract ownership transferred to manager");

  // Verify the deployment
  console.log("\n🔍 Verifying deployment...");
  const nftManager = await ipAssetNFT.ipAssetManager();
  const managerOwner = await ipAssetManager.owner();
  
  console.log("NFT Manager Address:", nftManager);
  console.log("Manager Owner:", managerOwner);
  console.log("Expected Manager Address:", ipAssetManager.address);
  
  if (nftManager === ipAssetManager.address) {
    console.log("✅ Contracts successfully linked!");
  } else {
    console.log("❌ Contract linking failed!");
  }

  // Print deployment summary
  console.log("\n🎉 Deployment Summary:");
  console.log("================================");
  console.log("Network: Hedera Testnet");
  console.log("Deployer:", deployer.address);
  console.log("IPAssetNFT:", ipAssetNFT.address);
  console.log("IPAssetManagerV2:", ipAssetManager.address);
  console.log("================================");

  // Save deployment addresses to a file
  const deploymentInfo = {
    network: "hedera_testnet",
    deployer: deployer.address,
    contracts: {
      IPAssetNFT: ipAssetNFT.address,
      IPAssetManagerV2: ipAssetManager.address
    },
    deploymentTime: new Date().toISOString(),
    chainId: 296
  };

  const fs = require("fs");
  fs.writeFileSync(
    "deployment-hedera-testnet.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n💾 Deployment info saved to: deployment-hedera-testnet.json");

  // Verify contracts on Hedera testnet (if API key is available)
  if (process.env.HEDERA_API_KEY) {
    console.log("\n🔍 Verifying contracts on Hedera testnet...");
    try {
      console.log("Verifying IPAssetNFT...");
      await hre.run("verify:verify", {
        address: ipAssetNFT.address,
        constructorArguments: [ethers.constants.AddressZero],
      });
      console.log("✅ IPAssetNFT verified!");

      console.log("Verifying IPAssetManagerV2...");
      await hre.run("verify:verify", {
        address: ipAssetManager.address,
        constructorArguments: [ipAssetNFT.address],
      });
      console.log("✅ IPAssetManagerV2 verified!");
    } catch (error) {
      console.log("⚠️ Contract verification failed:", error.message);
    }
  } else {
    console.log("\n⚠️ HEDERA_API_KEY not found. Skipping contract verification.");
    console.log("To verify contracts, set HEDERA_API_KEY in your .env file");
  }

  console.log("\n🎯 Deployment completed successfully!");
  console.log("You can now interact with your IP Asset contracts on Hedera Testnet.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 
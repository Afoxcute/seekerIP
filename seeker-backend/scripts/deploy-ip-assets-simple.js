import pkg from "hardhat";
const { ethers } = pkg;
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  console.log("🚀 Starting IP Asset deployment on Hedera Testnet...");

  // Check if private key is set
  if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY environment variable is not set. Please check your .env file.");
  }

  // Get the deployer account
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, ethers.provider);
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy IPAssetNFT first
  console.log("\n🔨 Deploying IPAssetNFT...");
  const IPAssetNFT = await ethers.getContractFactory("IPAssetNFT");
  const ipAssetNFT = await IPAssetNFT.connect(deployer).deploy();
  await ipAssetNFT.waitForDeployment();
  const ipAssetNFTAddress = await ipAssetNFT.getAddress();
  console.log("✅ IPAssetNFT deployed to:", ipAssetNFTAddress);

  // Deploy IPAssetManagerV2
  console.log("\n🔨 Deploying IPAssetManagerV2...");
  const IPAssetManagerV2 = await ethers.getContractFactory("IPAssetManagerV2");
  const ipAssetManagerV2 = await IPAssetManagerV2.connect(deployer).deploy(ipAssetNFTAddress);
  await ipAssetManagerV2.waitForDeployment();
  const ipAssetManagerV2Address = await ipAssetManagerV2.getAddress();
  console.log("✅ IPAssetManagerV2 deployed to:", ipAssetManagerV2Address);

  // Set the IP Asset Manager in the NFT contract
  console.log("\n🔗 Setting IP Asset Manager in NFT contract...");
  const setManagerTx = await ipAssetNFT.connect(deployer).setIPAssetManager(ipAssetManagerV2Address);
  await setManagerTx.wait();
  console.log("✅ IP Asset Manager set successfully");

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Contract Addresses:");
  console.log("   IPAssetNFT:", ipAssetNFTAddress);
  console.log("   IPAssetManagerV2:", ipAssetManagerV2Address);

  console.log("\n🔍 Next steps:");
  console.log("   1. Verify contracts on Hedera Explorer");
  console.log("   2. Test the IP Asset system");
  console.log("   3. Register your first IP Asset");

  // Save deployment info to a file
  const deploymentInfo = {
    network: "hedera_testnet",
    deployer: deployer.address,
    contracts: {
      IPAssetNFT: ipAssetNFTAddress,
      IPAssetManagerV2: ipAssetManagerV2Address
    },
    deploymentTime: new Date().toISOString(),
    chainId: 296
  };

  console.log("\n💾 Deployment info saved to: deployment-hedera-testnet.json");
  console.log("📄 You can use these addresses to interact with your contracts!");
}

// Handle errors
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
}); 
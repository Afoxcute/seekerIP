const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting IP Asset Locker System Deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying contracts with account: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} HBAR`);
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log(`🔗 Network: ${network.name} (Chain ID: ${chainId})`);
  
  // Contract addresses (these would be set based on your deployed contracts)
  const IP_ASSET_MANAGER = process.env.IP_ASSET_MANAGER || "0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a";
  const ARBITRATION_CONTRACT = process.env.ARBITRATION_CONTRACT || "0x60f4a0ee098394951bb704709842C92dF25038b2";
  
  console.log(`📦 Using IP Asset Manager: ${IP_ASSET_MANAGER}`);
  console.log(`⚖️ Using Arbitration Contract: ${ARBITRATION_CONTRACT}`);
  
  // Deploy HBAR Equivalent Token
  console.log("📦 Deploying HBAR Equivalent Token...");
  const HBAREquivalentToken = await ethers.getContractFactory("HBAREquivalentToken");
  const hbarToken = await HBAREquivalentToken.deploy(deployer.address);
  await hbarToken.waitForDeployment();
  const hbarTokenAddress = await hbarToken.getAddress();
  console.log(`✅ HBAR Equivalent Token deployed to: ${hbarTokenAddress}`);
  
  // Deploy IP Asset Locker
  console.log("📦 Deploying IP Asset Locker...");
  const IPAssetLocker = await ethers.getContractFactory("IPAssetLocker");
  const ipAssetLocker = await IPAssetLocker.deploy(
    IP_ASSET_MANAGER,
    ARBITRATION_CONTRACT,
    deployer.address
  );
  await ipAssetLocker.waitForDeployment();
  const ipAssetLockerAddress = await ipAssetLocker.getAddress();
  console.log(`✅ IP Asset Locker deployed to: ${ipAssetLockerAddress}`);
  
  // Initialize HBAR Token with IP Asset Locker
  console.log("🔧 Initializing HBAR Token...");
  const initTx = await hbarToken.initialize(ipAssetLockerAddress);
  await initTx.wait();
  console.log("✅ HBAR Token initialized");
  
  // Initialize IP Asset Locker with HBAR Token
  console.log("🔧 Initializing IP Asset Locker...");
  const initLockerTx = await ipAssetLocker.initialize(hbarTokenAddress);
  await initLockerTx.wait();
  console.log("✅ IP Asset Locker initialized");
  
  // Get registry address (assuming it's already deployed)
  const registryAddress = process.env.REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000";
  console.log(`📋 Using Registry: ${registryAddress}`);
  
  // Set IP Asset Locker in Registry
  if (registryAddress !== "0x0000000000000000000000000000000000000000") {
    console.log("🔧 Setting IP Asset Locker in Registry...");
    const registry = await ethers.getContractAt("IndexRegistry", registryAddress);
    const setLockerTx = await registry.setIPAssetLocker(ipAssetLockerAddress);
    await setLockerTx.wait();
    console.log("✅ IP Asset Locker set in Registry");
  }
  
  // Prepare deployment info
  const deployment = {
    ipAssetLocker: ipAssetLockerAddress,
    hbarToken: hbarTokenAddress,
    registry: registryAddress,
    ipAssetManager: IP_ASSET_MANAGER,
    arbitrationContract: ARBITRATION_CONTRACT,
    chainId: chainId,
    timestamp: Date.now()
  };
  
  // Save deployment info
  const deploymentDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentDir, `ip-asset-locker-${network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
  console.log(`💾 Deployment info saved to: ${deploymentFile}`);
  
  // Create environment template
  const envTemplate = `# IP Asset Locker System Environment Variables
IP_ASSET_LOCKER_ADDRESS=${ipAssetLockerAddress}
HBAR_TOKEN_ADDRESS=${hbarTokenAddress}
REGISTRY_ADDRESS=${registryAddress}
IP_ASSET_MANAGER=${IP_ASSET_MANAGER}
ARBITRATION_CONTRACT=${ARBITRATION_CONTRACT}
CHAIN_ID=${chainId}
`;
  
  const envFile = path.join(__dirname, "..", ".env.ip-asset-locker");
  fs.writeFileSync(envFile, envTemplate);
  console.log(`📝 Environment template saved to: ${envFile}`);
  
  console.log("\n🎉 IP Asset Locker System deployed successfully!");
  console.log("\n📋 Next Steps:");
  console.log("1. Set IP_ASSET_MANAGER and ARBITRATION_CONTRACT addresses in your .env file");
  console.log("2. Test the system with sample IP asset locking");
  console.log("3. Monitor locked assets using the API endpoints");
  console.log("4. Integrate with your frontend application");
  
  console.log(`\n🔗 Contract Explorer: https://testnet.hashscan.io/address/${ipAssetLockerAddress}`);
  console.log(`📖 Documentation: IP Asset Locker System README`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

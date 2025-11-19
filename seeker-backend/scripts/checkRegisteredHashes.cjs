const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Checking registered IPFS hashes...");
  
  // Read deployed addresses
  const deploymentFile = "deployment-hts-kyc-ip-assets.json";
  let deployedAddresses;
  
  try {
    const deploymentData = fs.readFileSync(deploymentFile, "utf8");
    deployedAddresses = JSON.parse(deploymentData);
  } catch (error) {
    console.error("❌ Error reading deployment file:", error.message);
    return;
  }

  const ipAssetManagerAddress = deployedAddresses.contracts.IPAssetManagerV2;
  if (!ipAssetManagerAddress) {
    console.error("❌ IPAssetManagerV2 address not found in deployment file");
    return;
  }

  console.log(`📋 IPAssetManagerV2 Address: ${ipAssetManagerAddress}`);

  // Get the contract
  const IPAssetManagerV2 = await ethers.getContractFactory("IPAssetManagerV2");
  const ipAssetManager = IPAssetManagerV2.attach(ipAssetManagerAddress);

  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Checking as: ${deployer.address}`);

  try {
    // Check if the specific hash is registered
    const testHash = "ipfs://QmcHKiCJENkZQxFzctXJYxTjgUgGKMJ2UoPmVjSTiwprUz";
    const isRegistered = await ipAssetManager.registeredIPFSHashes(testHash);
    console.log(`\n🔍 Hash: ${testHash}`);
    console.log(`📊 Registered: ${isRegistered}`);

    // Try to get some asset information
    console.log("\n📋 Checking existing IP assets...");
    
    // We'll try to check a few asset IDs
    for (let i = 1; i <= 5; i++) {
      try {
        const asset = await ipAssetManager.ipAssets(i);
        if (asset.assetId.toString() !== "0") {
          console.log(`\n📄 Asset ID ${i}:`);
          console.log(`   Name: ${asset.name}`);
          console.log(`   Owner: ${asset.owner}`);
          console.log(`   IPFS Hash: ${asset.ipfsHash}`);
          console.log(`   NFT Token ID: ${asset.nftTokenId}`);
          console.log(`   Created: ${new Date(Number(asset.createdAt) * 1000).toISOString()}`);
        }
      } catch (error) {
        // Asset doesn't exist, continue
      }
    }

    console.log("\n✅ Check complete!");
    
  } catch (error) {
    console.error("❌ Error checking registered hashes:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });

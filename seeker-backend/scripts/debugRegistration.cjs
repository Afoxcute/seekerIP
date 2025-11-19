const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Using signer:", signer.address);

  // Load deployment info
  const deploymentPath = path.join(__dirname, '..', 'deployment-hts-kyc-ip-assets.json');
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("Deployment file not found. Please run deployHTSKYCIPAssets.cjs first.");
    process.exit(1);
  }
  
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const { IPAssetHTSKYC, IPAssetManagerV2, HTSToken } = deploymentInfo.contracts;

  console.log("=== DEBUGGING IP ASSET REGISTRATION ===");
  console.log("IPAssetHTSKYC contract:", IPAssetHTSKYC);
  console.log("IPAssetManagerV2 contract:", IPAssetManagerV2);
  console.log("HTS Token address:", HTSToken);

  const ipAssetNFT = await ethers.getContractAt("IPAssetHTSKYC", IPAssetHTSKYC, signer);
  const ipAssetManager = await ethers.getContractAt("IPAssetManagerV2", IPAssetManagerV2, signer);

  // Step 1: Check ownership
  console.log("\n1. Checking ownership...");
  try {
    const owner = await ipAssetNFT.owner();
    console.log("IPAssetHTSKYC owner:", owner);
    console.log("IPAssetManagerV2 address:", IPAssetManagerV2);
    console.log("Ownership correct:", owner.toLowerCase() === IPAssetManagerV2.toLowerCase());
  } catch (e) {
    console.error("❌ Ownership check failed:", e?.message || e);
  }

  // Step 2: Check if HTS token is created
  console.log("\n2. Checking HTS token creation...");
  try {
    const tokenAddress = await ipAssetNFT.tokenAddress();
    console.log("HTS Token address:", tokenAddress);
    console.log("Token created:", tokenAddress !== "0x0000000000000000000000000000000000000000");
  } catch (e) {
    console.error("❌ Token address check failed:", e?.message || e);
  }

  // Step 3: Try calling mintIPAssetNFT directly
  console.log("\n3. Testing direct mintIPAssetNFT call...");
  try {
    // First, we need to call from the IPAssetManagerV2 contract
    // Let's try a different approach - call through the manager
    const testTx = await ipAssetManager.registerIPAsset(
      "Debug Test Asset",
      "Debug test description",
      "ipfs://test", // Short metadata
      "QmDebugTest123",
      { gasLimit: 1_000_000 } // Increased gas limit
    );
    await testTx.wait();
    console.log("✅ Direct registration successful");
    console.log("Registration tx hash:", testTx.hash);
  } catch (e) {
    console.error("❌ Direct registration failed:", e?.message || e);
    
    // Let's try to get more details about the error
    if (e.data) {
      console.log("Error data:", e.data);
    }
    if (e.reason) {
      console.log("Error reason:", e.reason);
    }
  }

  // Step 4: Check if there are any existing IP assets
  console.log("\n4. Checking existing IP assets...");
  try {
    // This might not work if the contract doesn't have this method
    console.log("Checking if IP assets exist...");
  } catch (e) {
    console.log("Could not check existing IP assets:", e?.message || e);
  }

  console.log("\n=== DEBUG COMPLETED ===");
}

main().catch(console.error);


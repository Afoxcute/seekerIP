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

  console.log("=== DEBUGGING KYC MANAGEMENT ISSUE ===");
  console.log("IPAssetHTSKYC contract:", IPAssetHTSKYC);
  console.log("IPAssetManagerV2 contract:", IPAssetManagerV2);

  const ipAssetNFT = await ethers.getContractAt("IPAssetHTSKYC", IPAssetHTSKYC, signer);
  const ipAssetManager = await ethers.getContractAt("IPAssetManagerV2", IPAssetManagerV2, signer);

  // Step 1: Check ownership of both contracts
  console.log("\n1. Checking contract ownership...");
  try {
    const ipAssetNFTOwner = await ipAssetNFT.owner();
    const ipAssetManagerOwner = await ipAssetManager.owner();
    
    console.log("IPAssetHTSKYC owner:", ipAssetNFTOwner);
    console.log("IPAssetManagerV2 owner:", ipAssetManagerOwner);
    console.log("Signer address:", signer.address);
    
    console.log("IPAssetHTSKYC ownership correct:", ipAssetNFTOwner.toLowerCase() === IPAssetManagerV2.toLowerCase());
    console.log("IPAssetManagerV2 ownership correct:", ipAssetManagerOwner.toLowerCase() === signer.address.toLowerCase());
  } catch (e) {
    console.error("❌ Ownership check failed:", e?.message || e);
  }

  // Step 2: Try calling KYC functions directly on IPAssetHTSKYC
  console.log("\n2. Testing direct KYC calls on IPAssetHTSKYC...");
  try {
    const testAccount = "0x1234567890123456789012345678901234567890";
    
    // Grant KYC directly on IPAssetHTSKYC (should work since IPAssetManagerV2 is owner)
    const grantTx = await ipAssetNFT.grantKYC(testAccount, {
      gasLimit: 75_000
    });
    await grantTx.wait();
    console.log("✅ Direct KYC grant successful");
    console.log("Grant KYC tx hash:", grantTx.hash);
    
  } catch (e) {
    console.error("❌ Direct KYC grant failed:", e?.message || e);
  }

  // Step 3: Try calling KYC functions through IPAssetManagerV2
  console.log("\n3. Testing KYC calls through IPAssetManagerV2...");
  try {
    const testAccount = "0x1234567890123456789012345678901234567890";
    
    // This should work since signer is owner of IPAssetManagerV2
    const grantTx = await ipAssetManager.grantKYCForIPAssets(testAccount, {
      gasLimit: 75_000
    });
    await grantTx.wait();
    console.log("✅ KYC grant via manager successful");
    console.log("Grant KYC tx hash:", grantTx.hash);
    
  } catch (e) {
    console.error("❌ KYC grant via manager failed:", e?.message || e);
  }

  // Step 4: Test other KYC management functions
  console.log("\n4. Testing other KYC management functions...");
  try {
    // Test getting token address
    const tokenAddress = await ipAssetManager.getIPAssetNFTTokenAddress();
    console.log("✅ Token address retrieved:", tokenAddress);
    
    // Test KYC status check
    const hasKYC = await ipAssetManager.hasKYCForIPAssets(signer.address);
    console.log("✅ KYC status check:", hasKYC);
    
  } catch (e) {
    console.error("❌ Other KYC functions failed:", e?.message || e);
  }

  console.log("\n=== KYC DEBUG COMPLETED ===");
}

main().catch(console.error);


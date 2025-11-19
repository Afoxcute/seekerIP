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

  console.log("=== TESTING KYC WITH PROPER ACCOUNT ASSOCIATION ===");
  console.log("IPAssetHTSKYC contract:", IPAssetHTSKYC);
  console.log("IPAssetManagerV2 contract:", IPAssetManagerV2);
  console.log("HTS Token address:", HTSToken);

  const ipAssetNFT = await ethers.getContractAt("IPAssetHTSKYC", IPAssetHTSKYC, signer);
  const ipAssetManager = await ethers.getContractAt("IPAssetManagerV2", IPAssetManagerV2, signer);

  // Step 1: Test KYC grant to the signer (who is already associated)
  console.log("\n1. Testing KYC grant to signer (already associated)...");
  try {
    // Grant KYC to signer via manager
    const grantTx = await ipAssetManager.grantKYCForIPAssets(signer.address, {
      gasLimit: 75_000
    });
    await grantTx.wait();
    console.log("✅ KYC grant to signer successful");
    console.log("Grant KYC tx hash:", grantTx.hash);
    
  } catch (e) {
    console.error("❌ KYC grant to signer failed:", e?.message || e);
  }

  // Step 2: Test KYC grant to a new account (need to associate first)
  console.log("\n2. Testing KYC grant to new account...");
  try {
    // Create a new account for testing
    const testWallet = ethers.Wallet.createRandom();
    const testAccount = testWallet.address;
    console.log("Test account:", testAccount);
    
    // First associate the test account with the HTS token
    const tokenAssociateAbi = ["function associate()"];
    const token = new ethers.Contract(HTSToken, tokenAssociateAbi, testWallet.connect(signer.provider));
    
    console.log("Associating test account with HTS token...");
    const assocTx = await token.associate({ gasLimit: 800_000 });
    await assocTx.wait();
    console.log("✅ Test account associated");
    
    // Now grant KYC to the test account
    const grantTx = await ipAssetManager.grantKYCForIPAssets(testAccount, {
      gasLimit: 75_000
    });
    await grantTx.wait();
    console.log("✅ KYC grant to test account successful");
    console.log("Grant KYC tx hash:", grantTx.hash);
    
  } catch (e) {
    console.error("❌ KYC grant to test account failed:", e?.message || e);
  }

  // Step 3: Test KYC revocation
  console.log("\n3. Testing KYC revocation...");
  try {
    // Revoke KYC from signer
    const revokeTx = await ipAssetManager.revokeKYCForIPAssets(signer.address, {
      gasLimit: 75_000
    });
    await revokeTx.wait();
    console.log("✅ KYC revocation successful");
    console.log("Revoke KYC tx hash:", revokeTx.hash);
    
    // Grant KYC back
    const grantBackTx = await ipAssetManager.grantKYCForIPAssets(signer.address, {
      gasLimit: 75_000
    });
    await grantBackTx.wait();
    console.log("✅ KYC re-granted successfully");
    
  } catch (e) {
    console.error("❌ KYC revocation failed:", e?.message || e);
  }

  // Step 4: Test KYC key update
  console.log("\n4. Testing KYC key update...");
  try {
    // Generate a dummy key for testing
    const dummyKey = ethers.hexlify(ethers.randomBytes(33)); // 33 bytes for compressed SECP256K1
    console.log("Generated dummy key:", dummyKey);
    
    const updateTx = await ipAssetManager.updateKYCKeyForIPAssets(dummyKey, {
      gasLimit: 100_000
    });
    await updateTx.wait();
    console.log("✅ KYC key update successful");
    console.log("Update KYC key tx hash:", updateTx.hash);
    console.log("⚠️  Note: Contract no longer has KYC key control after this update");
    
  } catch (e) {
    console.error("❌ KYC key update failed:", e?.message || e);
  }

  console.log("\n=== KYC TESTING COMPLETED ===");
  console.log("KYC management functions have been tested");
}

main().catch(console.error);


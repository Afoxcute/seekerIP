import { network } from "hardhat";

const { ethers } = await network.connect({ network: "testnet" });

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Using signer:", signer.address);

  // Load deployment info
  const fs = require('fs');
  const path = require('path');
  const deploymentPath = path.join(__dirname, '..', 'deployment-hts-kyc-ip-assets.json');
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("Deployment file not found. Please run deployHTSKYCIPAssets.ts first.");
    process.exit(1);
  }
  
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const { IPAssetHTSKYC, IPAssetManagerV2, HTSToken } = deploymentInfo.contracts;

  console.log("IPAssetHTSKYC contract:", IPAssetHTSKYC);
  console.log("IPAssetManagerV2 contract:", IPAssetManagerV2);
  console.log("HTS Token address:", HTSToken);

  const ipAssetNFT = await ethers.getContractAt("IPAssetHTSKYC", IPAssetHTSKYC, signer);
  const ipAssetManager = await ethers.getContractAt("IPAssetManagerV2", IPAssetManagerV2, signer);

  // Test account for KYC operations
  const testAccount = "0x1234567890123456789012345678901234567890"; // Replace with actual test account
  
  console.log("\n=== KYC MANAGEMENT TEST ===");
  
  // 1) Grant KYC to test account
  console.log(`\n1. Granting KYC to ${testAccount}...`);
  try {
    const grantTx = await ipAssetNFT.grantKYC(testAccount, {
      gasLimit: 75_000
    });
    await grantTx.wait();
    console.log("Grant KYC tx hash:", grantTx.hash);
    console.log("✅ KYC granted successfully");
  } catch (e: any) {
    console.error("❌ Grant KYC failed:", e?.message || e);
  }

  // 2) Revoke KYC from test account
  console.log(`\n2. Revoking KYC from ${testAccount}...`);
  try {
    const revokeTx = await ipAssetNFT.revokeKYC(testAccount, {
      gasLimit: 75_000
    });
    await revokeTx.wait();
    console.log("Revoke KYC tx hash:", revokeTx.hash);
    console.log("✅ KYC revoked successfully");
  } catch (e: any) {
    console.error("❌ Revoke KYC failed:", e?.message || e);
  }

  // 3) Grant KYC again (for testing)
  console.log(`\n3. Granting KYC to ${testAccount} again...`);
  try {
    const grantTx2 = await ipAssetNFT.grantKYC(testAccount, {
      gasLimit: 75_000
    });
    await grantTx2.wait();
    console.log("Grant KYC tx hash:", grantTx2.hash);
    console.log("✅ KYC granted again successfully");
  } catch (e: any) {
    console.error("❌ Grant KYC failed:", e?.message || e);
  }

  // 4) Test KYC management through IPAssetManagerV2
  console.log(`\n4. Testing KYC management through IPAssetManagerV2...`);
  try {
    const grantTx3 = await ipAssetManager.grantKYCForIPAssets(testAccount, {
      gasLimit: 75_000
    });
    await grantTx3.wait();
    console.log("Grant KYC via Manager tx hash:", grantTx3.hash);
    console.log("✅ KYC granted via Manager successfully");
  } catch (e: any) {
    console.error("❌ Grant KYC via Manager failed:", e?.message || e);
  }

  // 5) Get HTS token address
  console.log(`\n5. Getting HTS token address...`);
  try {
    const tokenAddress = await ipAssetManager.getIPAssetNFTTokenAddress();
    console.log("HTS Token address from Manager:", tokenAddress);
    console.log("✅ Token address retrieved successfully");
  } catch (e: any) {
    console.error("❌ Get token address failed:", e?.message || e);
  }

  // 6) Test KYC key update (this would require a new key)
  console.log(`\n6. Testing KYC key update...`);
  try {
    // Generate a dummy key for testing (in practice, this would be a real SECP256K1 key)
    const dummyKey = ethers.hexlify(ethers.randomBytes(33)); // 33 bytes for compressed SECP256K1
    const updateTx = await ipAssetNFT.updateKYCKey(dummyKey, {
      gasLimit: 100_000
    });
    await updateTx.wait();
    console.log("Update KYC key tx hash:", updateTx.hash);
    console.log("✅ KYC key updated successfully");
    console.log("⚠️  Note: Contract no longer has KYC key control after this update");
  } catch (e: any) {
    console.error("❌ Update KYC key failed:", e?.message || e);
  }

  console.log("\n=== KYC MANAGEMENT TEST COMPLETED ===");
  console.log("All KYC operations have been tested");
  console.log("Note: After KYC key update, the contract loses KYC control");
  console.log("KYC operations would need to be performed with the new key");
}

main().catch(console.error);


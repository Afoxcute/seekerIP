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

  console.log("=== TRANSFERRING OWNERSHIP ===");
  console.log("IPAssetHTSKYC contract:", IPAssetHTSKYC);
  console.log("IPAssetManagerV2 contract:", IPAssetManagerV2);

  const ipAssetNFT = await ethers.getContractAt("IPAssetHTSKYC", IPAssetHTSKYC, signer);

  // Step 1: Transfer ownership of IPAssetHTSKYC to IPAssetManagerV2
  console.log("\n1. Transferring ownership of IPAssetHTSKYC to IPAssetManagerV2...");
  try {
    const transferTx = await ipAssetNFT.transferOwnership(IPAssetManagerV2, {
      gasLimit: 100_000
    });
    await transferTx.wait();
    console.log("✅ Ownership transferred successfully");
    console.log("Transfer ownership tx hash:", transferTx.hash);
  } catch (e) {
    console.error("❌ Transfer ownership failed:", e?.message || e);
  }

  // Step 2: Test IP Asset registration again
  console.log("\n2. Testing IP Asset registration...");
  const ipAssetManager = await ethers.getContractAt("IPAssetManagerV2", IPAssetManagerV2, signer);
  
  try {
    const registerTx = await ipAssetManager.registerIPAsset(
      "Test IP Asset",
      "A test intellectual property asset for KYC testing",
      "ipfs://bafkreibr7cyxmy4iyckmlyzige4ywccyygomwrcn4ldcldacw3nxe3ikgq",
      "QmTestHash123456789",
      { gasLimit: 500_000 }
    );
    await registerTx.wait();
    console.log("✅ IP Asset registration successful");
    console.log("Registration tx hash:", registerTx.hash);
    
    // Get the token ID
    const tokenId = await ipAssetNFT.getTokenId(1);
    console.log("Minted NFT token ID:", tokenId.toString());
    
  } catch (e) {
    console.error("❌ IP Asset registration failed:", e?.message || e);
  }

  // Step 3: Check NFT balance
  console.log("\n3. Checking NFT balance...");
  const erc721 = new ethers.Contract(
    HTSToken,
    ["function balanceOf(address owner) view returns (uint256)"],
    signer
  );
  
  try {
    const balance = await erc721.balanceOf(signer.address);
    console.log("Signer's NFT balance:", balance.toString());
  } catch (e) {
    console.error("❌ Balance check failed:", e?.message || e);
  }

  console.log("\n=== OWNERSHIP TRANSFER COMPLETED ===");
  console.log("The system should now be fully functional!");
}

main().catch(console.error);


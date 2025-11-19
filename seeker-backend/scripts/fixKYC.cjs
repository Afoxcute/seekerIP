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

  console.log("=== FIXING KYC ISSUE ===");
  console.log("IPAssetHTSKYC contract:", IPAssetHTSKYC);
  console.log("HTS Token address:", HTSToken);

  const ipAssetNFT = await ethers.getContractAt("IPAssetHTSKYC", IPAssetHTSKYC, signer);

  // Step 1: Associate the signer with the HTS token
  console.log("\n1. Associating signer with HTS token...");
  const tokenAssociateAbi = ["function associate()"];
  const token = new ethers.Contract(HTSToken, tokenAssociateAbi, signer);
  
  try {
    const assocTx = await token.associate({ gasLimit: 800_000 });
    await assocTx.wait();
    console.log("✅ Token association successful");
    console.log("Association tx hash:", assocTx.hash);
  } catch (e) {
    console.log("⚠️  Token association failed (may already be associated):", e?.message || e);
  }

  // Step 2: Grant KYC to the signer
  console.log("\n2. Granting KYC to signer...");
  try {
    const grantKYCTx = await ipAssetNFT.grantKYC(signer.address, {
      gasLimit: 75_000
    });
    await grantKYCTx.wait();
    console.log("✅ KYC granted successfully");
    console.log("Grant KYC tx hash:", grantKYCTx.hash);
  } catch (e) {
    console.error("❌ Grant KYC failed:", e?.message || e);
  }

  // Step 3: Test registering an IP Asset
  console.log("\n3. Testing IP Asset registration...");
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

  // Step 4: Check NFT balance
  console.log("\n4. Checking NFT balance...");
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

  console.log("\n=== KYC FIX COMPLETED ===");
  console.log("The system should now be fully functional!");
}

main().catch(console.error);


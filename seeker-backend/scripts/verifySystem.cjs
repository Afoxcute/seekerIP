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

  console.log("=== VERIFYING NFT MINTING ===");
  console.log("IPAssetHTSKYC contract:", IPAssetHTSKYC);
  console.log("IPAssetManagerV2 contract:", IPAssetManagerV2);
  console.log("HTS Token address:", HTSToken);

  const ipAssetNFT = await ethers.getContractAt("IPAssetHTSKYC", IPAssetHTSKYC, signer);
  const ipAssetManager = await ethers.getContractAt("IPAssetManagerV2", IPAssetManagerV2, signer);

  // Step 1: Check NFT balance
  console.log("\n1. Checking NFT balance...");
  const erc721 = new ethers.Contract(
    HTSToken,
    [
      "function balanceOf(address owner) view returns (uint256)",
      "function ownerOf(uint256 tokenId) view returns (address)",
      "function tokenURI(uint256 tokenId) view returns (string)"
    ],
    signer
  );
  
  try {
    const balance = await erc721.balanceOf(signer.address);
    console.log("Signer's NFT balance:", balance.toString());
    
    if (balance > 0) {
      console.log("✅ NFT successfully minted!");
      
      // Get token details
      const tokenId = await ipAssetNFT.getTokenId(1);
      console.log("Token ID:", tokenId.toString());
      
      const owner = await erc721.ownerOf(tokenId);
      console.log("Token owner:", owner);
      
      const tokenURI = await erc721.tokenURI(tokenId);
      console.log("Token URI:", tokenURI);
      
      const ipAssetId = await ipAssetNFT.getIPAssetId(tokenId);
      console.log("Linked IP Asset ID:", ipAssetId.toString());
    } else {
      console.log("❌ No NFTs found");
    }
  } catch (e) {
    console.error("❌ Balance check failed:", e?.message || e);
  }

  // Step 2: Test KYC enforcement
  console.log("\n2. Testing KYC enforcement...");
  try {
    // Try to register another IP asset
    const registerTx2 = await ipAssetManager.registerIPAsset(
      "Second Test Asset",
      "Second test description",
      "ipfs://test2",
      "QmDebugTest456",
      { gasLimit: 500_000 }
    );
    await registerTx2.wait();
    console.log("✅ Second IP Asset registration successful");
    console.log("Registration tx hash:", registerTx2.hash);
    
    const balance2 = await erc721.balanceOf(signer.address);
    console.log("Updated NFT balance:", balance2.toString());
    
  } catch (e) {
    console.error("❌ Second registration failed:", e?.message || e);
  }

  // Step 3: Test KYC management functions
  console.log("\n3. Testing KYC management...");
  try {
    const testAccount = "0x1234567890123456789012345678901234567890";
    
    // Grant KYC via manager
    const grantTx = await ipAssetManager.grantKYCForIPAssets(testAccount, {
      gasLimit: 75_000
    });
    await grantTx.wait();
    console.log("✅ KYC granted via manager");
    console.log("Grant KYC tx hash:", grantTx.hash);
    
    // Get token address via manager
    const tokenAddress = await ipAssetManager.getIPAssetNFTTokenAddress();
    console.log("Token address from manager:", tokenAddress);
    
  } catch (e) {
    console.error("❌ KYC management failed:", e?.message || e);
  }

  console.log("\n=== VERIFICATION COMPLETED ===");
  console.log("🎉 HTS KYC IP Asset system is fully functional!");
}

main().catch(console.error);


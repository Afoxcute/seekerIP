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

  console.log("🔥 === TESTING NFT BURNING ===");
  console.log("IPAssetHTSKYC contract:", IPAssetHTSKYC);
  console.log("HTS Token address:", HTSToken);

  const ipAssetNFT = await ethers.getContractAt("IPAssetHTSKYC", IPAssetHTSKYC, signer);

  // Step 1: Check current NFT balance
  console.log("\n1. Checking current NFT balance...");
  const erc721 = new ethers.Contract(
    HTSToken,
    [
      "function balanceOf(address owner) view returns (uint256)",
      "function ownerOf(uint256 tokenId) view returns (address)",
      "function approve(address to, uint256 tokenId) external",
      "function getApproved(uint256 tokenId) view returns (address)"
    ],
    signer
  );
  
  try {
    const balance = await erc721.balanceOf(signer.address);
    console.log("Current NFT balance:", balance.toString());
    
    if (balance > 0) {
      // Get the first token ID
      const tokenId = await ipAssetNFT.getTokenId(1);
      console.log("Token ID to burn:", tokenId.toString());
      
      // Check current approval
      const currentApproved = await erc721.getApproved(tokenId);
      console.log("Current approved address:", currentApproved);
      
      // Approve the contract for burning if not already approved
      if (currentApproved.toLowerCase() !== IPAssetHTSKYC.toLowerCase()) {
        console.log("Approving contract for burning...");
        const approveTx = await erc721.approve(IPAssetHTSKYC, tokenId);
        await approveTx.wait();
        console.log("✅ Contract approved for burning");
      } else {
        console.log("✅ Contract already approved");
      }
      
      // Burn the NFT
      console.log("Burning NFT...");
      const burnTx = await ipAssetNFT.burnIPAssetNFT(tokenId, { gasLimit: 200_000 });
      await burnTx.wait();
      console.log("✅ NFT burned successfully");
      console.log("Burn tx hash:", burnTx.hash);
      
      // Check balance after burn
      const balanceAfter = await erc721.balanceOf(signer.address);
      console.log("Balance after burn:", balanceAfter.toString());
      
    } else {
      console.log("No NFTs to burn");
    }
  } catch (e) {
    console.error("❌ NFT burning failed:", e?.message || e);
  }

  console.log("\n🔥 === NFT BURNING TEST COMPLETED ===");
}

main().catch(console.error);



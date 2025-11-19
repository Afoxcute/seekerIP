import { network } from "hardhat";
import type { ContractTransactionResponse } from "ethers";

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

  // Get the token ID to burn (assuming we have token ID 1)
  const tokenId = BigInt("1");
  console.log("Attempting to burn token ID:", tokenId.toString());

  // Check if token exists and get owner
  const erc721 = new ethers.Contract(
    HTSToken,
    [
      "function ownerOf(uint256 tokenId) external view returns (address)",
      "function getApproved(uint256 tokenId) external view returns (address)",
      "function balanceOf(address owner) external view returns (uint256)"
    ],
    signer
  );

  try {
    const ownerOfToken: string = await erc721.ownerOf(tokenId);
    console.log("Current owner of token:", ownerOfToken);

    // Check if already approved for this tokenId; if not, approve IPAssetHTSKYC contract
    const currentApproved: string = await erc721.getApproved(tokenId);
    if (currentApproved.toLowerCase() !== IPAssetHTSKYC.toLowerCase()) {
      console.log(
        `Approving IPAssetHTSKYC contract ${IPAssetHTSKYC} for tokenId ${tokenId.toString()}...`
      );
      const approveTx = (await erc721.approve(
        IPAssetHTSKYC,
        tokenId
      )) as unknown as ContractTransactionResponse;
      await approveTx.wait();
      console.log("Approval tx hash:", approveTx.hash);
    } else {
      console.log("IPAssetHTSKYC contract is already approved for this tokenId.");
    }

    // Burn via IPAssetHTSKYC
    console.log(`Burning tokenId ${tokenId.toString()}...`);
    const burnTx = (await ipAssetNFT.burnIPAssetNFT(tokenId, {
      gasLimit: 200_000
    })) as unknown as ContractTransactionResponse;
    await burnTx.wait();
    console.log("Burn tx hash:", burnTx.hash);

    // Show signer's balance after burn
    const balanceAfter = (await erc721.balanceOf(signer.address)) as bigint;
    console.log("Balance after burn:", balanceAfter.toString(), "NFTs");

    console.log("\n=== BURNING TEST COMPLETED ===");
    console.log("Successfully burned IP Asset NFT");
    console.log("Token ID:", tokenId.toString());

  } catch (e: any) {
    console.error("Error during burn operation:", e?.message || e);
    console.log("This might be because:");
    console.log("1. The token doesn't exist");
    console.log("2. You don't own the token");
    console.log("3. The token hasn't been minted yet");
    console.log("Please run testMintIPAssetKYC.ts first to mint a token.");
  }
}

main().catch(console.error);


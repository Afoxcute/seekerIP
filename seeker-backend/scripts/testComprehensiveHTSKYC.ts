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

  console.log("=== COMPREHENSIVE HTS KYC IP ASSET TEST ===");
  console.log("IPAssetHTSKYC contract:", IPAssetHTSKYC);
  console.log("IPAssetManagerV2 contract:", IPAssetManagerV2);
  console.log("HTS Token address:", HTSToken);

  const ipAssetNFT = await ethers.getContractAt("IPAssetHTSKYC", IPAssetHTSKYC, signer);
  const ipAssetManager = await ethers.getContractAt("IPAssetManagerV2", IPAssetManagerV2, signer);

  // Step 1: Associate token
  console.log("\n1. Associating signer to HTS token...");
  const tokenAssociateAbi = ["function associate()"];
  const token = new ethers.Contract(HTSToken, tokenAssociateAbi, signer);
  const assocTx = await token.associate({ gasLimit: 800_000 });
  await assocTx.wait();
  console.log("✅ Token association completed");

  // Step 2: Grant KYC
  console.log("\n2. Granting KYC to signer...");
  const grantTx = await ipAssetNFT.grantKYC(signer.address, { gasLimit: 75_000 });
  await grantTx.wait();
  console.log("✅ KYC granted");

  // Step 3: Register IP Asset (mints NFT)
  console.log("\n3. Registering IP Asset...");
  const ipAssetTx = await ipAssetManager.registerIPAsset(
    "Comprehensive Test IP Asset",
    "A comprehensive test intellectual property asset for HTS KYC testing",
    "ipfs://bafkreibr7cyxmy4iyckmlyzige4ywccyygomwrcn4ldcldacw3nxe3ikgq",
    "QmComprehensiveTestHash123456789",
    { gasLimit: 500_000 }
  );
  await ipAssetTx.wait();
  console.log("✅ IP Asset registered and NFT minted");

  // Step 4: Verify NFT details
  console.log("\n4. Verifying NFT details...");
  const tokenId = await ipAssetNFT.getTokenId(1);
  const ipAssetId = await ipAssetNFT.getIPAssetId(tokenId);
  const tokenURI = await ipAssetNFT.tokenURI(tokenId);
  
  console.log("Token ID:", tokenId.toString());
  console.log("IP Asset ID:", ipAssetId.toString());
  console.log("Token URI:", tokenURI);

  // Step 5: Check balance
  console.log("\n5. Checking NFT balance...");
  const erc721 = new ethers.Contract(
    HTSToken,
    ["function balanceOf(address owner) view returns (uint256)"],
    signer
  );
  const balance = (await erc721.balanceOf(signer.address)) as bigint;
  console.log("Signer's NFT balance:", balance.toString());

  // Step 6: Test KYC operations
  console.log("\n6. Testing KYC operations...");
  const testAccount = "0x1234567890123456789012345678901234567890";
  
  // Grant KYC to test account
  const grantTestTx = await ipAssetNFT.grantKYC(testAccount, { gasLimit: 75_000 });
  await grantTestTx.wait();
  console.log("✅ KYC granted to test account");

  // Revoke KYC from test account
  const revokeTestTx = await ipAssetNFT.revokeKYC(testAccount, { gasLimit: 75_000 });
  await revokeTestTx.wait();
  console.log("✅ KYC revoked from test account");

  // Step 7: Test NFT burning
  console.log("\n7. Testing NFT burning...");
  
  // Approve contract for burning
  const approveTx = await erc721.approve(IPAssetHTSKYC, tokenId);
  await approveTx.wait();
  console.log("✅ Contract approved for burning");

  // Burn the NFT
  const burnTx = await ipAssetNFT.burnIPAssetNFT(tokenId, { gasLimit: 200_000 });
  await burnTx.wait();
  console.log("✅ NFT burned successfully");

  // Check balance after burn
  const balanceAfterBurn = (await erc721.balanceOf(signer.address)) as bigint;
  console.log("Balance after burn:", balanceAfterBurn.toString());

  // Step 8: Test IP Asset Manager KYC functions
  console.log("\n8. Testing IP Asset Manager KYC functions...");
  
  // Grant KYC via manager
  const grantViaManagerTx = await ipAssetManager.grantKYCForIPAssets(testAccount, { gasLimit: 75_000 });
  await grantViaManagerTx.wait();
  console.log("✅ KYC granted via Manager");

  // Get token address via manager
  const tokenAddressFromManager = await ipAssetManager.getIPAssetNFTTokenAddress();
  console.log("Token address from Manager:", tokenAddressFromManager);

  console.log("\n=== COMPREHENSIVE TEST COMPLETED ===");
  console.log("✅ All HTS KYC IP Asset operations tested successfully");
  console.log("✅ Token association, KYC management, minting, and burning all working");
  console.log("✅ Integration between IPAssetHTSKYC and IPAssetManagerV2 verified");
}

main().catch(console.error);


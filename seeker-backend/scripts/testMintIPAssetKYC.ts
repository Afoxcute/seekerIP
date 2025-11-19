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

  // 1) Associate the signer via token.associate() (EOA -> token contract)
  const tokenAssociateAbi = ["function associate()"];
  const token = new ethers.Contract(HTSToken, tokenAssociateAbi, signer);
  console.log("Associating signer to token via token.associate() ...");
  const assocTx = await token.associate({ gasLimit: 800_000 });
  await assocTx.wait();
  console.log("Associate tx hash:", assocTx.hash);

  // 2) Grant KYC to the signer via IPAssetHTSKYC contract
  try {
    console.log(`Granting KYC to ${signer.address} ...`);
    const grantTx = await ipAssetNFT.grantKYC(signer.address, {
      gasLimit: 75_000
    });
    await grantTx.wait();
    console.log("Grant KYC tx hash:", grantTx.hash);
  } catch (e: any) {
    console.warn("Grant KYC failed (may already be granted):", e?.message || e);
  }

  // 3) Register an IP Asset (this will mint an NFT)
  console.log("Registering IP Asset...");
  const ipAssetTx = await ipAssetManager.registerIPAsset(
    "Test IP Asset",
    "A test intellectual property asset for KYC testing",
    "ipfs://bafkreibr7cyxmy4iyckmlyzige4ywccyygomwrcn4ldcldacw3nxe3ikgq",
    "QmTestHash123456789",
    { gasLimit: 500_000 }
  );
  await ipAssetTx.wait();
  console.log("IP Asset registration tx hash:", ipAssetTx.hash);

  // 4) Get the minted NFT token ID
  const tokenId = await ipAssetNFT.getTokenId(1); // Assuming asset ID 1
  console.log("Minted NFT token ID:", tokenId.toString());

  // 5) Check signer's NFT balance
  const erc721 = new ethers.Contract(
    HTSToken,
    ["function balanceOf(address owner) view returns (uint256)"],
    signer
  );
  const balance = (await erc721.balanceOf(signer.address)) as bigint;
  console.log("Signer's NFT balance:", balance.toString());

  // 6) Display NFT details
  const tokenURI = await ipAssetNFT.tokenURI(tokenId);
  const ipAssetId = await ipAssetNFT.getIPAssetId(tokenId);
  console.log("Token URI:", tokenURI);
  console.log("Linked IP Asset ID:", ipAssetId.toString());

  console.log("\n=== MINTING TEST COMPLETED ===");
  console.log("Successfully minted IP Asset NFT with KYC enforcement");
  console.log("Token ID:", tokenId.toString());
  console.log("IP Asset ID:", ipAssetId.toString());
}

main().catch(console.error);


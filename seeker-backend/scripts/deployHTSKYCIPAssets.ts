import { network } from "hardhat";

const { ethers } = await network.connect({ network: "testnet" });

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying HTS KYC IP Asset system with the account:", deployer.address);

  // 1) Deploy the IPAssetHTSKYC contract
  console.log("Deploying IPAssetHTSKYC contract...");
  const IPAssetHTSKYC = await ethers.getContractFactory(
    "IPAssetHTSKYC",
    deployer
  );
  const ipAssetNFT = await IPAssetHTSKYC.deploy();
  await ipAssetNFT.waitForDeployment();
  const ipAssetNFTAddress = await ipAssetNFT.getAddress();
  console.log("IPAssetHTSKYC contract deployed at:", ipAssetNFTAddress);

  // 2) Create the HTS NFT collection by calling createIPAssetNFTCollection()
  const NAME = "IntellectualPropertyAssets";
  const SYMBOL = "IPNFT";
  const HBAR_TO_SEND = "15"; // HBAR to send with createIPAssetNFTCollection()
  console.log(
    `Calling createIPAssetNFTCollection() with ${HBAR_TO_SEND} HBAR to create the HTS collection...`
  );
  const tx = await ipAssetNFT.createIPAssetNFTCollection(NAME, SYMBOL, {
    gasLimit: 350_000,
    value: ethers.parseEther(HBAR_TO_SEND)
  });
  await tx.wait();
  console.log("createIPAssetNFTCollection() tx hash:", tx.hash);

  // 3) Read the created HTS token address
  const tokenAddress = await ipAssetNFT.tokenAddress();
  console.log(
    "Underlying HTS IP Asset NFT Collection (ERC721 facade) address:",
    tokenAddress
  );

  // 4) Deploy the IPAssetManagerV2 contract
  console.log("Deploying IPAssetManagerV2 contract...");
  const IPAssetManagerV2 = await ethers.getContractFactory(
    "IPAssetManagerV2",
    deployer
  );
  const ipAssetManager = await IPAssetManagerV2.deploy(ipAssetNFTAddress);
  await ipAssetManager.waitForDeployment();
  const ipAssetManagerAddress = await ipAssetManager.getAddress();
  console.log("IPAssetManagerV2 contract deployed at:", ipAssetManagerAddress);

  // 5) Grant KYC to the deployer so they can receive NFTs
  console.log("Granting KYC to deployer...");
  try {
    const grantKYCTx = await ipAssetNFT.grantKYC(deployer.address, {
      gasLimit: 75_000
    });
    await grantKYCTx.wait();
    console.log("Grant KYC tx hash:", grantKYCTx.hash);
  } catch (e: any) {
    console.warn("Grant KYC failed:", e?.message || e);
  }

  // 6) Display deployment summary
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("Deployer address:", deployer.address);
  console.log("IPAssetHTSKYC contract:", ipAssetNFTAddress);
  console.log("IPAssetManagerV2 contract:", ipAssetManagerAddress);
  console.log("HTS Token address:", tokenAddress);
  console.log("Collection name:", NAME);
  console.log("Collection symbol:", SYMBOL);
  
  // 7) Save deployment addresses to a file for later use
  const deploymentInfo = {
    network: "testnet",
    deployer: deployer.address,
    contracts: {
      IPAssetHTSKYC: ipAssetNFTAddress,
      IPAssetManagerV2: ipAssetManagerAddress,
      HTSToken: tokenAddress
    },
    collection: {
      name: NAME,
      symbol: SYMBOL
    },
    timestamp: new Date().toISOString()
  };

  const fs = require('fs');
  const path = require('path');
  const deploymentPath = path.join(__dirname, '..', 'deployment-hts-kyc-ip-assets.json');
  
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to: ${deploymentPath}`);
  
  console.log("\n=== NEXT STEPS ===");
  console.log("1. Use the IPAssetManagerV2 contract to register IP assets");
  console.log("2. Grant KYC to users before they can receive IP Asset NFTs");
  console.log("3. Use the minting and burning functions as needed");
  console.log("4. Update KYC keys as required for compliance");
}

main().catch(console.error);


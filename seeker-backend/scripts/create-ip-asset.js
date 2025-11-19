import pkg from "hardhat";
const { ethers } = pkg;
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  console.log("🚀 Starting IP Asset Creation Demo...");

  // Check if private key is set
  if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY environment variable is not set. Please check your .env file.");
  }

  // Get the deployer account
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, ethers.provider);
  console.log("📝 Using account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Contract addresses from your deployment
  const IPAssetNFTAddress = "0x227f1cDcBeb442F07e4A2119ab0AD83C21E6fFE5";
  const IPAssetManagerV2Address = "0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a";

  console.log("\n📋 Using deployed contracts:");
  console.log("   IPAssetNFT:", IPAssetNFTAddress);
  console.log("   IPAssetManagerV2:", IPAssetManagerV2Address);

  // Get contract instances
  const ipAssetNFT = await ethers.getContractAt("IPAssetNFT", IPAssetNFTAddress);
  const ipAssetManager = await ethers.getContractAt("IPAssetManagerV2", IPAssetManagerV2Address);

  try {
    // Step 1: Register an IP Asset
    console.log("\n🔨 Step 1: Registering IP Asset...");
    
    // Example IP asset data - only 4 parameters as per contract
    const ipAssetName = "My Amazing Book";
    const ipAssetDescription = "A revolutionary book about blockchain technology";
    const ipAssetURI = "ipfs://QmExampleHash123"; // This would be your actual IPFS hash
    const ipfsHash = "QmExampleHash123"; // IPFS hash for encrypted content
    
    console.log("   📚 IP Asset Name:", ipAssetName);
    console.log("   📝 Description:", ipAssetDescription);
    console.log("   🔗 URI:", ipAssetURI);
    console.log("   🔐 IPFS Hash:", ipfsHash);

    // Register the IP asset with correct 4 parameters
    const registerTx = await ipAssetManager.connect(deployer).registerIPAsset(
      ipAssetName,
      ipAssetDescription,
      ipAssetURI,
      ipfsHash
    );
    
    console.log("   ⏳ Waiting for transaction confirmation...");
    const registerReceipt = await registerTx.wait();
    console.log("   ✅ IP Asset registered successfully!");
    console.log("   📄 Transaction hash:", registerReceipt.hash);

    // Get the IP asset ID from the event
    const ipAssetRegisteredEvent = registerReceipt.logs.find(
      log => log.eventName === "IPAssetRegistered"
    );
    
    if (ipAssetRegisteredEvent) {
      const ipAssetId = ipAssetRegisteredEvent.args.assetId;
      console.log("   🆔 IP Asset ID:", ipAssetId.toString());

      // Step 2: Attach License Terms
      console.log("\n🔐 Step 2: Attaching License Terms...");
      
      const licenseTerms = {
        terms: "Commercial use allowed. 15% revenue share required.",
        price: ethers.parseEther("0.1"), // 0.1 ETH
        duration: 365 * 24 * 60 * 60, // 1 year in seconds
        maxLicenses: 100,
        encryptedTerms: ethers.keccak256(ethers.toUtf8Bytes("encrypted_license_terms_hash_here")), // bytes32 hash
        revenueShare: 1500 // 15% in basis points (1500/10000 = 15%)
      };

      console.log("   📜 License Terms:", licenseTerms.terms);
      console.log("   💰 Revenue Share:", (licenseTerms.revenueShare / 100) + "%");
      console.log("   ⏰ Duration:", licenseTerms.duration / (24 * 60 * 60), "days");
      console.log("   💸 Price:", ethers.formatEther(licenseTerms.price), "ETH");

      const attachLicenseTx = await ipAssetManager.connect(deployer).attachLicenseTerms(
        ipAssetId,
        licenseTerms.terms,
        licenseTerms.price,
        licenseTerms.duration,
        licenseTerms.maxLicenses,
        licenseTerms.encryptedTerms,
        licenseTerms.revenueShare
      );

      console.log("   ⏳ Waiting for license attachment...");
      await attachLicenseTx.wait();
      console.log("   ✅ License Terms attached successfully!");

      // Step 3: Check the NFT
      console.log("\n🖼️  Step 3: Checking IP Asset NFT...");
      
      // Get the token ID for this IP asset
      const tokenId = await ipAssetNFT.getTokenId(ipAssetId);
      console.log("   🆔 NFT Token ID:", tokenId.toString());
      
      // Get the token URI
      const tokenURI = await ipAssetNFT.tokenURI(tokenId);
      console.log("   🔗 Token URI:", tokenURI);
      
      // Get the owner
      const nftOwner = await ipAssetNFT.ownerOf(tokenId);
      console.log("   👤 NFT Owner:", nftOwner);

      // Step 4: Display Summary
      console.log("\n🎉 IP Asset Creation Complete!");
      console.log("==================================");
      console.log("📚 IP Asset:", ipAssetName);
      console.log("🆔 IP Asset ID:", ipAssetId.toString());
      console.log("🎫 License Terms: Commercial License");
      console.log("💰 Revenue Share:", (licenseTerms.revenueShare / 100) + "%");
      console.log("🖼️  NFT Token ID:", tokenId.toString());
      console.log("👤 Owner:", nftOwner);
      console.log("==================================");

      console.log("\n🔍 Next Steps:");
      console.log("   1. View your IP Asset on HashScan");
      console.log("   2. Test revenue sharing functionality");
      console.log("   3. Create additional IP assets");
      console.log("   4. Test license token minting");

    } else {
      console.log("   ❌ Could not find IPAssetRegistered event");
    }

  } catch (error) {
    console.error("❌ Error creating IP asset:", error);
    
    // Provide helpful error information
    if (error.message.includes("insufficient funds")) {
      console.log("💡 Tip: Make sure you have enough ETH for gas fees and license purchase");
    } else if (error.message.includes("execution reverted")) {
      console.log("💡 Tip: Check if the contracts are properly deployed and linked");
    }
    
    throw error;
  }
}

// Handle errors
main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exitCode = 1;
}); 
import pkg from "hardhat";
const { ethers } = pkg;
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  console.log("🔍 IP Asset Viewer - Hedera Testnet");

  // Check if private key is set
  if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY environment variable is not set. Please check your .env file.");
  }

  // Get the deployer account
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, ethers.provider);
  console.log("📝 Using account:", deployer.address);

  // Contract addresses from your deployment
  const IPAssetManagerV2Address = "0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a";
  const IPAssetNFTAddress = "0x227f1cDcBeb442F07e4A2119ab0AD83C21E6fFE5";

  console.log("📋 Using contracts:");
  console.log("   IPAssetManagerV2:", IPAssetManagerV2Address);
  console.log("   IPAssetNFT:", IPAssetNFTAddress);

  // Get contract instances
  const ipAssetManager = await ethers.getContractAt("IPAssetManagerV2", IPAssetManagerV2Address);
  const ipAssetNFT = await ethers.getContractAt("IPAssetNFT", IPAssetNFTAddress);

  try {
    // Get user's assets
    const userAssets = await ipAssetManager.getUserAssets(deployer.address);
    console.log("\n📊 Your IP Assets:", userAssets.length);

    if (userAssets.length === 0) {
      console.log("❌ No IP assets found. Create one first using create-simple-ip-asset.js");
      return;
    }

    // Display all user's IP assets
    for (let i = 0; i < userAssets.length; i++) {
      const assetId = userAssets[i];
      console.log(`\n🔍 IP Asset #${assetId}:`);
      console.log("=" .repeat(50));

      try {
        // Get IP asset details using the public function
        const ipAsset = await ipAssetManager.getIPAsset(assetId);
        
        console.log("📚 Name:", ipAsset.name);
        console.log("📝 Description:", ipAsset.description);
        console.log("🔗 Metadata URI:", ipAsset.metadataURI);
        console.log("🔐 IPFS Hash:", ipAsset.ipfsHash);
        console.log("👤 Owner:", ipAsset.owner);
        console.log("📅 Created At:", new Date(Number(ipAsset.createdAt) * 1000).toLocaleString());
        console.log("✅ Active:", ipAsset.isActive ? "Yes" : "No");
        console.log("🎫 License Token:", ipAsset.licenseToken);
        console.log("💰 Royalty Vault:", ipAsset.royaltyVault);
        console.log("💵 Total Revenue:", ethers.formatEther(ipAsset.totalRevenue), "ETH");
        console.log("📜 Total Licenses:", ipAsset.totalLicenses.toString());
        console.log("🖼️  NFT Token ID:", ipAsset.nftTokenId.toString());

        // Get NFT details if it exists
        if (ipAsset.nftTokenId.toString() !== "0") {
          try {
            const tokenURI = await ipAssetNFT.tokenURI(ipAsset.nftTokenId);
            const nftOwner = await ipAssetNFT.ownerOf(ipAsset.nftTokenId);
            console.log("🔗 NFT Token URI:", tokenURI);
            console.log("👤 NFT Owner:", nftOwner);
          } catch (nftError) {
            console.log("❌ Error reading NFT details:", nftError.message);
          }
        }

        // Check if license terms exist
        if (ipAsset.licenseToken !== ethers.ZeroAddress) {
          console.log("\n🔐 License Information:");
          console.log("   📜 License Terms attached: Yes");
          // You can add more license details here if needed
        } else {
          console.log("\n🔐 License Information:");
          console.log("   📜 License Terms attached: No");
        }

        // Get royalty vault information
        if (ipAsset.royaltyVault !== ethers.ZeroAddress) {
          console.log("\n💰 Royalty Vault Information:");
          console.log("   🏦 Vault Address:", ipAsset.royaltyVault);
          console.log("   💵 Total Royalty Tokens:", ipAsset.totalRevenue.toString());
        }

      } catch (assetError) {
        console.log(`❌ Error reading asset #${assetId}:`, assetError.message);
      }
    }

    // Display HashScan links
    console.log("\n🔍 View on HashScan:");
    console.log("   📄 Contract:", `https://hashscan.io/testnet/contract/${IPAssetManagerV2Address}`);
    console.log("   🖼️  NFT Contract:", `https://hashscan.io/testnet/contract/${IPAssetNFTAddress}`);
    
    // Show recent transactions
    console.log("\n📋 Recent Transactions:");
    console.log("   🚀 Deploy IPAssetManagerV2:", "0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a");
    console.log("   🚀 Deploy IPAssetNFT:", "0x227f1cDcBeb442F07e4A2119ab0AD83C21E6fFE5");
    
    if (userAssets.length > 0) {
      console.log("   📝 Register IP Asset #1: Check your transaction history");
    }

  } catch (error) {
    console.error("❌ Error viewing IP assets:", error);
    throw error;
  }
}

// Handle errors
main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exitCode = 1;
}); 
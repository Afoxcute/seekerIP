const { ethers } = require("hardhat");

async function testDeployment() {
  console.log("🧪 Testing IP Asset System Deployment...");

  try {
    // Get the deployer account
    const [deployer, user1, user2] = await ethers.getSigners();
    console.log("📝 Testing with accounts:");
    console.log("  - Deployer:", deployer.address);
    console.log("  - User 1:", user1.address);
    console.log("  - User 2:", user2.address);

    // Deploy the system
    console.log("\n🚀 Deploying system...");
    
    // Deploy IPAssetNFT first
    const IPAssetNFT = await ethers.getContractFactory("IPAssetNFT");
    const ipAssetNFT = await IPAssetNFT.deploy(ethers.constants.AddressZero);
    await ipAssetNFT.deployed();
    console.log("✅ IPAssetNFT deployed to:", ipAssetNFT.address);

    // Deploy IPAssetManagerV2
    const IPAssetManagerV2 = await ethers.getContractFactory("IPAssetManagerV2");
    const ipAssetManager = await IPAssetManagerV2.deploy(ipAssetNFT.address);
    await ipAssetManager.deployed();
    console.log("✅ IPAssetManagerV2 deployed to:", ipAssetManager.address);

    // Set up the system
    const transferOwnershipTx = await ipAssetNFT.transferOwnership(ipAssetManager.address);
    await transferOwnershipTx.wait();
    console.log("✅ NFT contract ownership transferred to manager");

    // Test 1: Basic Contract Properties
    console.log("\n📋 Test 1: Basic Contract Properties");
    const nftName = await ipAssetNFT.name();
    const nftSymbol = await ipAssetNFT.symbol();
    const managerOwner = await ipAssetManager.owner();
    const nftManager = await ipAssetNFT.ipAssetManager();
    
    console.log("  - NFT Name:", nftName);
    console.log("  - NFT Symbol:", nftSymbol);
    console.log("  - Manager Owner:", managerOwner);
    console.log("  - NFT Manager:", nftManager);
    
    if (nftName === "IP Asset NFT" && nftSymbol === "IPNFT" && 
        managerOwner === deployer.address && nftManager === ipAssetManager.address) {
      console.log("✅ Test 1 passed!");
    } else {
      console.log("❌ Test 1 failed!");
    }

    // Test 2: IP Asset Registration
    console.log("\n📝 Test 2: IP Asset Registration");
    const assetName = "Test Book";
    const assetDescription = "A test book for deployment verification";
    const metadataURI = "ipfs://QmTestMetadataHash";
    const ipfsHash = "QmTestIPFSHash";
    
    const registerTx = await ipAssetManager.connect(user1).registerIPAsset(
      assetName,
      assetDescription,
      metadataURI,
      ipfsHash
    );
    const registerReceipt = await registerTx.wait();
    console.log("✅ IP Asset registered successfully");
    
    // Get the asset ID from the event
    const event = registerReceipt.logs.find(log => 
      log.fragment && log.fragment.name === "IPAssetRegistered"
    );
    const assetId = event ? event.args.assetId : 1;
    console.log("  - Asset ID:", assetId.toString());

    // Test 3: Asset Details Retrieval
    console.log("\n🔍 Test 3: Asset Details Retrieval");
    const asset = await ipAssetManager.getIPAsset(assetId);
    console.log("  - Asset Name:", asset.name);
    console.log("  - Asset Owner:", asset.owner);
    console.log("  - NFT Token ID:", asset.nftTokenId.toString());
    console.log("  - IPFS Hash:", asset.ipfsHash);
    
    if (asset.name === assetName && asset.owner === user1.address && 
        asset.nftTokenId > 0 && asset.ipfsHash === ipfsHash) {
      console.log("✅ Test 3 passed!");
    } else {
      console.log("❌ Test 3 failed!");
    }

    // Test 4: License Terms Attachment
    console.log("\n📜 Test 4: License Terms Attachment");
    const licenseTerms = "Commercial use allowed with attribution";
    const licensePrice = ethers.utils.parseEther("100"); // 100 wei
    const licenseDuration = 365 * 24 * 60 * 60; // 1 year
    const maxLicenses = 10;
    const encryptedTerms = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("encrypted_terms"));
    const revenueShare = 2000; // 20%
    
    const attachLicenseTx = await ipAssetManager.connect(user1).attachLicenseTerms(
      assetId,
      licenseTerms,
      licensePrice,
      licenseDuration,
      maxLicenses,
      encryptedTerms,
      revenueShare
    );
    await attachLicenseTx.wait();
    console.log("✅ License terms attached successfully");

    // Test 5: License Token Minting
    console.log("\n🎫 Test 5: License Token Minting");
    const mintLicenseTx = await ipAssetManager.connect(user2).mintLicenseToken(
      assetId,
      1, // First license ID
      { value: licensePrice }
    );
    await mintLicenseTx.wait();
    console.log("✅ License token minted successfully");

    // Test 6: Revenue Payment
    console.log("\n💰 Test 6: Revenue Payment");
    const revenueAmount = ethers.utils.parseEther("1000"); // 1000 wei
    const paymentReason = "Book sales revenue";
    
    const payRevenueTx = await ipAssetManager.connect(deployer).payIPAsset(
      assetId,
      paymentReason,
      { value: revenueAmount }
    );
    await payRevenueTx.wait();
    console.log("✅ Revenue payment successful");

    // Test 7: Royalty Distribution
    console.log("\n🏦 Test 7: Royalty Distribution");
    const ownerRoyalty = await ipAssetManager.getRoyaltyBalance(assetId, user1.address);
    const licenseeRoyalty = await ipAssetManager.getRoyaltyBalance(assetId, user2.address);
    
    console.log("  - Owner Royalty:", ethers.utils.formatEther(ownerRoyalty), "ETH");
    console.log("  - Licensee Royalty:", ethers.utils.formatEther(licenseeRoyalty), "ETH");
    
    if (ownerRoyalty.gt(0) && licenseeRoyalty.gt(0)) {
      console.log("✅ Test 7 passed!");
    } else {
      console.log("❌ Test 7 failed!");
    }

    // Test 8: Royalty Claiming
    console.log("\n💸 Test 8: Royalty Claiming");
    const initialOwnerBalance = await user1.getBalance();
    const initialLicenseeBalance = await user2.getBalance();
    
    await ipAssetManager.connect(user1).claimRoyalties(assetId);
    await ipAssetManager.connect(user2).claimRoyalties(assetId);
    
    const finalOwnerBalance = await user1.getBalance();
    const finalLicenseeBalance = await user2.getBalance();
    
    console.log("  - Owner balance change:", ethers.utils.formatEther(finalOwnerBalance.sub(initialOwnerBalance)), "ETH");
    console.log("  - Licensee balance change:", ethers.utils.formatEther(finalLicenseeBalance.sub(initialLicenseeBalance)), "ETH");
    
    if (finalOwnerBalance.gt(initialOwnerBalance) && finalLicenseeBalance.gt(initialLicenseeBalance)) {
      console.log("✅ Test 8 passed!");
    } else {
      console.log("❌ Test 8 failed!");
    }

    // Test 9: Asset Transfer
    console.log("\n🔄 Test 9: Asset Transfer");
    const transferTx = await ipAssetManager.connect(user1).transferIPAsset(
      assetId,
      user2.address
    );
    await transferTx.wait();
    console.log("✅ Asset transferred successfully");
    
    const newAsset = await ipAssetManager.getIPAsset(assetId);
    if (newAsset.owner === user2.address) {
      console.log("✅ Test 9 passed!");
    } else {
      console.log("❌ Test 9 failed!");
    }

    console.log("\n🎉 All tests completed successfully!");
    console.log("\n📊 Final System Status:");
    console.log("  - IPAssetNFT:", ipAssetNFT.address);
    console.log("  - IPAssetManagerV2:", ipAssetManager.address);
    console.log("  - Total Assets:", (await ipAssetManager.getUserAssets(user2.address)).length);
    console.log("  - Total Licenses:", (await ipAssetManager.getUserLicenses(user2.address)).length);

    return {
      ipAssetNFT,
      ipAssetManager,
      assetId,
    };

  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

// Run the test
testDeployment()
  .then(() => {
    console.log("\n🎊 Deployment test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Deployment test failed:", error);
    process.exit(1);
  }); 
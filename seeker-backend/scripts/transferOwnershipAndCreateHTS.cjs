const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔄 Transferring Ownership and Creating HTS Collection...");
  console.log("======================================================");
  
  // Read the most recent deployment info
  const deploymentFiles = fs.readdirSync('.').filter(file => file.startsWith('deployment-compliance-system-') && file.endsWith('.json'));
  
  if (deploymentFiles.length === 0) {
    console.error("❌ No deployment file found. Please run the compliance system deployment first.");
    return;
  }
  
  const latestDeploymentFile = deploymentFiles.sort().pop();
  console.log(`📋 Using deployment file: ${latestDeploymentFile}`);
  
  const deploymentData = JSON.parse(fs.readFileSync(latestDeploymentFile, 'utf8'));
  
  const ipAssetNFTAddress = deploymentData.contracts.IPAssetHTSKYC;
  const newManagerAddress = deploymentData.contracts.IPAssetManagerV2;
  const oldManagerAddress = deploymentData.redeployment?.oldAddress;
  
  console.log(`📋 IPAssetHTSKYC Address: ${ipAssetNFTAddress}`);
  console.log(`📋 New IPAssetManagerV2 Address: ${newManagerAddress}`);
  console.log(`📋 Old IPAssetManagerV2 Address: ${oldManagerAddress}`);
  
  // Get the deployer
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Using account: ${deployer.address}`);
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} HBAR`);
  
  try {
    console.log("\n📋 Step 1: Checking current ownership...");
    
    // Get the IPAssetHTSKYC contract
    const IPAssetHTSKYC = await ethers.getContractFactory("IPAssetHTSKYC");
    const ipAssetNFT = IPAssetHTSKYC.attach(ipAssetNFTAddress);
    
    const currentOwner = await ipAssetNFT.owner();
    console.log(`📋 Current Owner: ${currentOwner}`);
    console.log(`📋 Expected Owner: ${newManagerAddress}`);
    
    if (currentOwner === newManagerAddress) {
      console.log("✅ Ownership is already correct!");
    } else {
      console.log("\n📋 Step 2: Transferring ownership...");
      
      // Transfer ownership from old manager to new manager
      const transferTx = await ipAssetNFT.transferOwnership(newManagerAddress);
      console.log("⏳ Waiting for ownership transfer...");
      await transferTx.wait();
      console.log(`✅ Ownership transferred! Transaction: ${transferTx.hash}`);
    }
    
    console.log("\n📋 Step 3: Creating HTS NFT Collection...");
    console.log("Sending 2 HBAR for HTS creation...");
    
    // Get the new IPAssetManagerV2 contract
    const IPAssetManagerV2 = await ethers.getContractFactory("IPAssetManagerV2");
    const ipAssetManager = IPAssetManagerV2.attach(newManagerAddress);
    
    const createCollectionTx = await ipAssetManager.createHTSCollection(
      "IntellectualPropertyAssets",
      "IPNFT",
      { value: ethers.parseEther("2") } // Send 2 HBAR for HTS creation
    );
    
    console.log("⏳ Waiting for transaction confirmation...");
    const receipt = await createCollectionTx.wait();
    console.log(`✅ HTS NFT Collection created! Transaction: ${receipt.transactionHash}`);
    
    // Get the HTS token address
    const htsTokenAddress = await ipAssetManager.getHTSTokenAddress();
    console.log(`📋 HTS Token Address: ${htsTokenAddress}`);
    
    // Update deployment info
    deploymentData.contracts.HTSToken = htsTokenAddress;
    deploymentData.collection.status = "created";
    deploymentData.collection.creationTx = receipt.transactionHash;
    deploymentData.collection.creationTimestamp = new Date().toISOString();
    
    // Save updated deployment info
    fs.writeFileSync(latestDeploymentFile, JSON.stringify(deploymentData, null, 2));
    console.log(`\n💾 Updated deployment info saved to: ${latestDeploymentFile}`);
    
    console.log("\n🎉 HTS NFT COLLECTION CREATION COMPLETE!");
    console.log("========================================");
    console.log(`📋 Collection Details:`);
    console.log(`   Name: IntellectualPropertyAssets`);
    console.log(`   Symbol: IPNFT`);
    console.log(`   Token Address: ${htsTokenAddress}`);
    console.log(`   Transaction: ${receipt.transactionHash}`);
    console.log(`\n🔐 Compliance Integration:`);
    console.log(`   ✅ HTS collection created with KYC support`);
    console.log(`   ✅ Ready for compliance-protected IP asset registration`);
    console.log(`   ✅ Audit trail system active`);
    console.log(`\n📊 Next Steps:`);
    console.log(`   1. Update frontend contract addresses`);
    console.log(`   2. Test IP asset registration with compliance`);
    console.log(`   3. Test compliance verification workflow`);
    console.log(`   4. Test audit trail functionality`);
    
  } catch (error) {
    console.error("❌ Operation failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });

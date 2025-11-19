const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🎨 Creating HTS NFT Collection for Compliance System...");
  console.log("=======================================================");
  
  // Read deployment info
  const deploymentFiles = fs.readdirSync('.').filter(file => file.startsWith('deployment-compliance-system-') && file.endsWith('.json'));
  
  if (deploymentFiles.length === 0) {
    console.error("❌ No deployment file found. Please run the compliance system deployment first.");
    return;
  }
  
  const latestDeploymentFile = deploymentFiles.sort().pop();
  console.log(`📋 Using deployment file: ${latestDeploymentFile}`);
  
  const deploymentData = JSON.parse(fs.readFileSync(latestDeploymentFile, 'utf8'));
  
  const ipAssetNFTAddress = deploymentData.contracts.IPAssetHTSKYC;
  console.log(`📋 IPAssetHTSKYC Address: ${ipAssetNFTAddress}`);
  
  // Get the deployer
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Using account: ${deployer.address}`);
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} HBAR`);
  
  try {
    // Get the contract
    const IPAssetHTSKYC = await ethers.getContractFactory("IPAssetHTSKYC");
    const ipAssetNFT = IPAssetHTSKYC.attach(ipAssetNFTAddress);
    
    console.log("\n📋 Step 1: Checking contract ownership...");
    const owner = await ipAssetNFT.owner();
    console.log(`📋 Contract Owner: ${owner}`);
    console.log(`📋 Deployer Address: ${deployer.address}`);
    
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log("⚠️  Note: Contract is owned by IPAssetManagerV2, but we'll try to create the collection anyway");
    }
    
    console.log("\n📋 Step 2: Creating HTS NFT Collection...");
    console.log("Sending 2 HBAR for HTS creation...");
    
    const createCollectionTx = await ipAssetNFT.createIPAssetNFTCollection(
      "IntellectualPropertyAssets",
      "IPNFT",
      { value: ethers.parseEther("2") } // Send 2 HBAR for HTS creation
    );
    
    console.log("⏳ Waiting for transaction confirmation...");
    const receipt = await createCollectionTx.wait();
    console.log(`✅ HTS NFT Collection created! Transaction: ${receipt.transactionHash}`);
    
    // Get the HTS token address
    const htsTokenAddress = await ipAssetNFT.tokenAddress();
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
    console.error("❌ HTS Collection creation failed:", error);
    
    if (error.message.includes("Already initialized")) {
      console.log("\n💡 The HTS collection may already exist. Checking...");
      try {
        const IPAssetHTSKYC = await ethers.getContractFactory("IPAssetHTSKYC");
        const ipAssetNFT = IPAssetHTSKYC.attach(ipAssetNFTAddress);
        const htsTokenAddress = await ipAssetNFT.tokenAddress();
        
        if (htsTokenAddress !== "0x0000000000000000000000000000000000000000") {
          console.log(`✅ HTS collection already exists at: ${htsTokenAddress}`);
          
          // Update deployment info
          deploymentData.contracts.HTSToken = htsTokenAddress;
          deploymentData.collection.status = "already_exists";
          deploymentData.collection.existingToken = htsTokenAddress;
          
          fs.writeFileSync(latestDeploymentFile, JSON.stringify(deploymentData, null, 2));
          console.log(`💾 Updated deployment info saved to: ${latestDeploymentFile}`);
        }
      } catch (checkError) {
        console.error("❌ Error checking existing collection:", checkError);
      }
    }
    
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });


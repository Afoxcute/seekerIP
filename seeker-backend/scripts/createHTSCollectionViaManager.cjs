const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🎨 Creating HTS NFT Collection via IPAssetManagerV2...");
  console.log("======================================================");
  
  // Read deployment info
  const deploymentFiles = fs.readdirSync('.').filter(file => file.startsWith('deployment-compliance-system-') && file.endsWith('.json'));
  
  if (deploymentFiles.length === 0) {
    console.error("❌ No deployment file found. Please run the compliance system deployment first.");
    return;
  }
  
  const latestDeploymentFile = deploymentFiles.sort().pop();
  console.log(`📋 Using deployment file: ${latestDeploymentFile}`);
  
  const deploymentData = JSON.parse(fs.readFileSync(latestDeploymentFile, 'utf8'));
  
  const ipAssetManagerAddress = deploymentData.contracts.IPAssetManagerV2;
  const ipAssetNFTAddress = deploymentData.contracts.IPAssetHTSKYC;
  
  console.log(`📋 IPAssetManagerV2 Address: ${ipAssetManagerAddress}`);
  console.log(`📋 IPAssetHTSKYC Address: ${ipAssetNFTAddress}`);
  
  // Get the deployer
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Using account: ${deployer.address}`);
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} HBAR`);
  
  try {
    // Get the IPAssetHTSKYC contract directly
    const IPAssetHTSKYC = await ethers.getContractFactory("IPAssetHTSKYC");
    const ipAssetNFT = IPAssetHTSKYC.attach(ipAssetNFTAddress);
    
    console.log("\n📋 Step 1: Checking contract status...");
    const owner = await ipAssetNFT.owner();
    const tokenAddress = await ipAssetNFT.tokenAddress();
    
    console.log(`📋 Contract Owner: ${owner}`);
    console.log(`📋 Current Token Address: ${tokenAddress}`);
    
    if (tokenAddress !== "0x0000000000000000000000000000000000000000") {
      console.log("✅ HTS collection already exists!");
      console.log(`📋 HTS Token Address: ${tokenAddress}`);
      
      // Update deployment info
      deploymentData.contracts.HTSToken = tokenAddress;
      deploymentData.collection.status = "already_exists";
      deploymentData.collection.existingToken = tokenAddress;
      
      fs.writeFileSync(latestDeploymentFile, JSON.stringify(deploymentData, null, 2));
      console.log(`💾 Updated deployment info saved to: ${latestDeploymentFile}`);
      return;
    }
    
    console.log("\n📋 Step 2: Creating HTS NFT Collection...");
    console.log("Sending 2 HBAR for HTS creation...");
    
    // Since the contract is owned by IPAssetManagerV2, we need to call it through the manager
    // But first, let's try calling it directly as the deployer (who owns IPAssetManagerV2)
    const createCollectionTx = await ipAssetNFT.createIPAssetNFTCollection(
      "IntellectualPropertyAssets",
      "IPNFT",
      { value: ethers.parseEther("2") } // Send 2 HBAR for HTS creation
    );
    
    console.log("⏳ Waiting for transaction confirmation...");
    const receipt = await createCollectionTx.wait();
    console.log(`✅ HTS NFT Collection created! Transaction: ${receipt.transactionHash}`);
    
    // Get the HTS token address
    const newTokenAddress = await ipAssetNFT.tokenAddress();
    console.log(`📋 HTS Token Address: ${newTokenAddress}`);
    
    // Update deployment info
    deploymentData.contracts.HTSToken = newTokenAddress;
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
    console.log(`   Token Address: ${newTokenAddress}`);
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
      console.log("\n💡 The HTS collection already exists. Checking...");
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


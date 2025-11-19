const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Comprehensive KYC Debug Script");
  console.log("=====================================");
  
  // Read deployed addresses
  const deploymentFile = "deployment-hts-kyc-ip-assets.json";
  let deployedAddresses;
  
  try {
    const deploymentData = fs.readFileSync(deploymentFile, "utf8");
    deployedAddresses = JSON.parse(deploymentData);
  } catch (error) {
    console.error("❌ Error reading deployment file:", error.message);
    return;
  }

  const ipAssetHTSKYCAddress = deployedAddresses.contracts.IPAssetHTSKYC;
  const ipAssetManagerAddress = deployedAddresses.contracts.IPAssetManagerV2;
  const htsTokenAddress = deployedAddresses.contracts.HTSToken;
  
  if (!ipAssetHTSKYCAddress || !ipAssetManagerAddress || !htsTokenAddress) {
    console.error("❌ Missing contract addresses in deployment file");
    return;
  }

  console.log(`📋 Contract Addresses:`);
  console.log(`   IPAssetHTSKYC: ${ipAssetHTSKYCAddress}`);
  console.log(`   IPAssetManagerV2: ${ipAssetManagerAddress}`);
  console.log(`   HTSToken: ${htsTokenAddress}`);

  // Get the contracts
  const IPAssetHTSKYC = await ethers.getContractFactory("IPAssetHTSKYC");
  const IPAssetManagerV2 = await ethers.getContractFactory("IPAssetManagerV2");
  
  const ipAssetHTSKYC = IPAssetHTSKYC.attach(ipAssetHTSKYCAddress);
  const ipAssetManager = IPAssetManagerV2.attach(ipAssetManagerAddress);

  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log(`\n👤 Debugging as: ${deployer.address}`);

  try {
    console.log("\n🔍 1. CONTRACT OWNERSHIP CHECK");
    console.log("================================");
    
    const htsKycOwner = await ipAssetHTSKYC.owner();
    const managerOwner = await ipAssetManager.owner();
    
    console.log(`IPAssetHTSKYC Owner: ${htsKycOwner}`);
    console.log(`IPAssetManagerV2 Owner: ${managerOwner}`);
    console.log(`Deployer Address: ${deployer.address}`);
    console.log(`Ownership Match: ${htsKycOwner.toLowerCase() === deployer.address.toLowerCase()}`);
    console.log(`Manager Ownership Match: ${managerOwner.toLowerCase() === deployer.address.toLowerCase()}`);

    console.log("\n🔍 2. HTS TOKEN STATUS CHECK");
    console.log("=============================");
    
    const tokenAddress = await ipAssetHTSKYC.tokenAddress();
    console.log(`HTS Token Address: ${tokenAddress}`);
    console.log(`Expected Token Address: ${htsTokenAddress}`);
    console.log(`Token Address Match: ${tokenAddress.toLowerCase() === htsTokenAddress.toLowerCase()}`);

    console.log("\n🔍 3. ACCOUNT ASSOCIATION CHECK");
    console.log("===============================");
    
    // Check if deployer is associated with the HTS token
    try {
      // Try to get token info - this will fail if not associated
      const tokenInfo = await ipAssetHTSKYC.getTokenInfo();
      console.log(`Token Info: ${JSON.stringify(tokenInfo)}`);
    } catch (error) {
      console.log(`❌ Token info access failed: ${error.message}`);
    }

    console.log("\n🔍 4. KYC KEY CONFIGURATION CHECK");
    console.log("==================================");
    
    // Check if KYC key is properly configured
    try {
      const kycKeyInfo = await ipAssetHTSKYC.getKYCKeyInfo();
      console.log(`KYC Key Info: ${JSON.stringify(kycKeyInfo)}`);
    } catch (error) {
      console.log(`❌ KYC key info access failed: ${error.message}`);
    }

    console.log("\n🔍 5. TEST KYC GRANT SIMULATION");
    console.log("===============================");
    
    // Try to simulate the KYC grant
    try {
      console.log(`Attempting to grant KYC to ${deployer.address}...`);
      
      // First, try to associate the account if not already associated
      console.log("Step 1: Checking account association...");
      try {
        const associateTx = await ipAssetHTSKYC.associateAccount();
        const associateReceipt = await associateTx.wait();
        console.log(`✅ Account association successful: ${associateReceipt.transactionHash}`);
      } catch (associateError) {
        if (associateError.message.includes("already associated") || 
            associateError.message.includes("TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT")) {
          console.log(`✅ Account already associated`);
        } else {
          console.log(`❌ Account association failed: ${associateError.message}`);
        }
      }

      // Now try the KYC grant
      console.log("Step 2: Attempting KYC grant...");
      const grantTx = await ipAssetHTSKYC.grantKYC(deployer.address);
      const grantReceipt = await grantTx.wait();
      console.log(`✅ KYC grant successful: ${grantReceipt.transactionHash}`);
      
    } catch (error) {
      console.log(`❌ KYC grant failed: ${error.message}`);
      
      // Try to get more detailed error information
      if (error.data) {
        console.log(`Error data: ${error.data}`);
      }
      if (error.reason) {
        console.log(`Error reason: ${error.reason}`);
      }
    }

    console.log("\n🔍 6. CONTRACT STATE VERIFICATION");
    console.log("==================================");
    
    // Check contract state
    try {
      const tokenAddress = await ipAssetHTSKYC.tokenAddress();
      console.log(`Contract Token Address: ${tokenAddress}`);
      
      const name = await ipAssetHTSKYC.name();
      const symbol = await ipAssetHTSKYC.symbol();
      console.log(`Token Name: ${name}`);
      console.log(`Token Symbol: ${symbol}`);
      
    } catch (error) {
      console.log(`❌ Contract state check failed: ${error.message}`);
    }

    console.log("\n✅ Debug complete!");
    
  } catch (error) {
    console.error("❌ Error during debug:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });


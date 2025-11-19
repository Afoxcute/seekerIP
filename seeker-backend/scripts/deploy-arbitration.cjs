/**
 * @fileoverview Deploy Intellectual Property Arbitration Contract
 * @description Deploys the arbitration contract to Hedera Testnet
 */

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🚀 Starting Intellectual Property Arbitration Contract Deployment...\n');

  // Check if private key is configured
  if (!process.env.PRIVATE_KEY) {
    console.error('❌ Error: PRIVATE_KEY environment variable is not set');
    console.log('Please set your Hedera private key in the .env file:');
    console.log('PRIVATE_KEY=your_private_key_here');
    process.exit(1);
  }

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log('📝 Deploying contracts with account:', deployer.address);
  
  try {
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log('💰 Account balance:', ethers.formatEther(balance), 'HBAR');
    
    if (balance < ethers.parseEther('1')) {
      console.warn('⚠️  Warning: Account balance is low. You may need more HBAR for deployment.');
    }
  } catch (error) {
    console.error('❌ Error getting account balance:', error.message);
    console.log('Make sure your PRIVATE_KEY is correct and you have HBAR in your account.');
    process.exit(1);
  }

  // Get the IP Asset Manager V2 address from environment or use default
  const ipAssetManagerV2Address = process.env.IP_ASSET_MANAGER_V2_ADDRESS || '0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a';
  console.log('🔗 Using IP Asset Manager V2 address:', ipAssetManagerV2Address);

  // Deploy the Intellectual Property Arbitration contract
  console.log('📦 Deploying IntellectualPropertyArbitration contract...');
  const IntellectualPropertyArbitration = await ethers.getContractFactory('IntellectualPropertyArbitration');
  
  const arbitrationContract = await IntellectualPropertyArbitration.deploy(ipAssetManagerV2Address);
  await arbitrationContract.waitForDeployment();

  const contractAddress = await arbitrationContract.getAddress();
  console.log('✅ IntellectualPropertyArbitration deployed to:', contractAddress);
  
  const deploymentTx = arbitrationContract.deploymentTransaction();
  console.log('🔗 Transaction hash:', deploymentTx.hash);

  // Wait for a few confirmations
  console.log('⏳ Waiting for confirmations...');
  await deploymentTx.wait(3);

  // Get contract info
  const disputeBond = await arbitrationContract.DISPUTE_BOND();
  const votingPeriod = await arbitrationContract.VOTING_PERIOD();
  const challengePeriod = await arbitrationContract.CHALLENGE_PERIOD();
  const minStakeToVote = await arbitrationContract.MIN_STAKE_TO_VOTE();
  const arbitratorFee = await arbitrationContract.ARBITRATOR_FEE();
  const arbitrationToken = await arbitrationContract.arbitrationToken();

  console.log('\n📊 Contract Configuration:');
  console.log('  Dispute Bond:', ethers.formatEther(disputeBond), 'HBAR');
  console.log('  Voting Period:', votingPeriod.toString(), 'seconds');
  console.log('  Challenge Period:', challengePeriod.toString(), 'seconds');
  console.log('  Min Stake to Vote:', ethers.formatEther(minStakeToVote), 'HBAR');
  console.log('  Arbitrator Fee:', ethers.formatEther(arbitratorFee), 'HBAR');
  console.log('  Arbitration Token:', arbitrationToken);

  // Create deployment info
  const deploymentInfo = {
    network: 'hedera-testnet',
    chainId: 296,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      IntellectualPropertyArbitration: {
        address: contractAddress,
        transactionHash: deploymentTx.hash,
        blockNumber: deploymentTx.blockNumber,
        gasUsed: deploymentTx.gasLimit?.toString(),
        constructorArgs: {
          ipAssetManagerV2: ipAssetManagerV2Address
        },
        configuration: {
          disputeBond: disputeBond.toString(),
          votingPeriod: votingPeriod.toString(),
          challengePeriod: challengePeriod.toString(),
          minStakeToVote: minStakeToVote.toString(),
          arbitratorFee: arbitratorFee.toString(),
          arbitrationToken: arbitrationToken
        }
      }
    },
    explorerUrl: `https://testnet.hashscan.io/address/${contractAddress}`,
    verification: {
      contractName: 'IntellectualPropertyArbitration',
      sourceCode: 'See contracts/IntellectualPropertyArbitration.sol',
      constructorArguments: [ipAssetManagerV2Address]
    }
  };

  // Save deployment info
  const deploymentPath = path.join(__dirname, '..', 'deployment-arbitration.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log('\n💾 Deployment info saved to:', deploymentPath);

  // Update environment file template
  const envTemplate = `
# Intellectual Property Arbitration Contract
ARBITRATION_CONTRACT_ADDRESS=${contractAddress}

# Hedera Configuration (required for HCS integration)
HEDERA_OPERATOR_ID=your_operator_id_here
HEDERA_OPERATOR_KEY=your_operator_key_here
HEDERA_RPC_URL=https://testnet.hashio.io/api
`;

  const envPath = path.join(__dirname, '..', '.env.arbitration');
  fs.writeFileSync(envPath, envTemplate);
  console.log('📝 Environment template saved to:', envPath);

  // Create README for arbitration system
  const readmeContent = `# Intellectual Property Arbitration System

## Contract Information

- **Contract Address**: \`${contractAddress}\`
- **Network**: Hedera Testnet (Chain ID: 296)
- **Explorer**: https://testnet.hashscan.io/address/${contractAddress}
- **Deployment Transaction**: ${deploymentTx.hash}

## Configuration

- **Dispute Bond**: ${ethers.formatEther(disputeBond)} HBAR
- **Voting Period**: ${votingPeriod.toString()} seconds (${Math.floor(Number(votingPeriod) / 86400)} days)
- **Challenge Period**: ${challengePeriod.toString()} seconds (${Math.floor(Number(challengePeriod) / 86400)} days)
- **Min Stake to Vote**: ${ethers.formatEther(minStakeToVote)} HBAR
- **Arbitrator Fee**: ${ethers.formatEther(arbitratorFee)} HBAR
- **Arbitration Token**: ${arbitrationToken}

## Features

### UMA-like Dispute Resolution
- **Optimistic Oracle Pattern**: Stake-based voting system
- **Hedera Consensus Service (HCS)**: Immutable dispute records
- **Arbitrator Escalation**: Human arbitrators for complex cases
- **Reputation System**: Arbitrator reputation tracking

### Dispute Lifecycle
1. **Asset Registration**: Register IP assets for arbitration
2. **Dispute Creation**: Challenge IP ownership with evidence
3. **Voting Period**: Community votes with staked tokens
4. **Resolution**: Automatic resolution or arbitrator escalation
5. **Ownership Transfer**: Automatic IP ownership transfer if challenger wins

### HCS Integration
- **Immutable Records**: All disputes recorded on HCS
- **Message Verification**: Cryptographic proof of dispute history
- **Topic Management**: Separate HCS topics per IP asset
- **Sequence Tracking**: Ordered dispute and vote records

## API Endpoints

The arbitration system provides REST API endpoints:

### Asset Management
- \`POST /api/arbitration/register-asset\` - Register IP asset
- \`GET /api/arbitration/asset/:assetId\` - Get asset data

### Dispute Management
- \`POST /api/arbitration/raise-dispute\` - Raise dispute
- \`GET /api/arbitration/dispute/:disputeId\` - Get dispute data
- \`POST /api/arbitration/cast-vote\` - Cast vote
- \`POST /api/arbitration/resolve-dispute\` - Resolve dispute
- \`POST /api/arbitration/escalate-dispute\` - Escalate to arbitrator
- \`POST /api/arbitration/arbitrator-resolve\` - Arbitrator resolution
- \`POST /api/arbitration/cancel-dispute\` - Cancel dispute

### Statistics & History
- \`GET /api/arbitration/stats\` - Get dispute statistics
- \`GET /api/arbitration/history/:assetId\` - Get dispute history
- \`GET /api/arbitration/arbitrator/:address\` - Get arbitrator data
- \`GET /api/arbitration/verify/:topicId/:sequenceNumber\` - Verify HCS message

## Usage Examples

### Register IP Asset
\`\`\`bash
curl -X POST http://localhost:3001/api/arbitration/register-asset \\
  -H "Content-Type: application/json" \\
  -d '{
    "metadataURI": "ipfs://QmYourMetadataHash",
    "assetName": "My IP Asset"
  }'
\`\`\`

### Raise Dispute
\`\`\`bash
curl -X POST http://localhost:3001/api/arbitration/raise-dispute \\
  -H "Content-Type: application/json" \\
  -d '{
    "ipAssetId": "1",
    "evidence": "ipfs://QmYourEvidenceHash",
    "bondAmount": "1000"
  }'
\`\`\`

### Cast Vote
\`\`\`bash
curl -X POST http://localhost:3001/api/arbitration/cast-vote \\
  -H "Content-Type: application/json" \\
  -d '{
    "disputeId": "1",
    "voteFor": true,
    "stakeAmount": "100"
  }'
\`\`\`

## Security Features

- **Bond Requirements**: Disputes require significant bond amounts
- **Stake-weighted Voting**: Higher stakes have more influence
- **Time Limits**: Voting and challenge periods prevent indefinite disputes
- **Arbitrator Oversight**: Human arbitrators for complex cases
- **HCS Immutability**: All records cryptographically verified

## Next Steps

1. **Set Environment Variables**: Configure Hedera operator credentials
2. **Add Arbitrators**: Register trusted arbitrators
3. **Test Integration**: Test with IP asset manager
4. **Monitor Disputes**: Use API endpoints to track disputes
5. **Scale System**: Add more arbitrators as needed

## Support

For questions or issues with the arbitration system, please refer to the API documentation or contact the development team.
`;

  const readmePath = path.join(__dirname, '..', 'ARBITRATION-README.md');
  fs.writeFileSync(readmePath, readmeContent);
  console.log('📚 Documentation saved to:', readmePath);

  console.log('\n🎉 Intellectual Property Arbitration System deployed successfully!');
  console.log('\n📋 Next Steps:');
  console.log('1. Set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY in your .env file');
  console.log('2. Add trusted arbitrators using the addArbitrator function');
  console.log('3. Test the system with sample disputes');
  console.log('4. Monitor disputes using the API endpoints');
  console.log('\n🔗 Contract Explorer:', `https://testnet.hashscan.io/address/${contractAddress}`);
  console.log('📖 Documentation:', readmePath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });

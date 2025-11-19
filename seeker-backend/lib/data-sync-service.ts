import { ethers } from 'ethers';
import { prisma } from './prisma';
import { CONTRACT_CONFIGS, CONTRACT_ADDRESSES } from './contract-config';

export class DataSyncService {
  private provider: ethers.JsonRpcProvider;
  private contracts: Map<string, ethers.Contract> = new Map();

  constructor(rpcUrl: string = process.env.HEDERA_RPC_URL || 'https://testnet.hashio.io/api') {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.initializeContracts();
  }

  private initializeContracts() {
    for (const config of CONTRACT_CONFIGS) {
      const contract = new ethers.Contract(
        config.address,
        config.interface,
        this.provider
      );
      this.contracts.set(config.name, contract);
    }
  }

  // Sync all contract data
  async syncAllContracts() {
    console.log('🔄 Starting comprehensive contract data sync...');
    
    try {
      await Promise.all([
        this.syncIPAssetManagerV2(),
        this.syncIPAssetLocker(),
        this.syncHBAREquivalentToken(),
        this.syncIntellectualPropertyArbitration(),
        this.syncTokenizedAssetManager(),
      ]);
      
      console.log('✅ All contract data synchronized successfully');
    } catch (error) {
      console.error('❌ Error during contract data sync:', error);
      throw error;
    }
  }

  // Sync IP Asset Manager V2 data
  async syncIPAssetManagerV2() {
    console.log('📝 Syncing IP Asset Manager V2 data...');
    
    try {
      const contract = this.contracts.get('IPAssetManagerV2');
      if (!contract) throw new Error('IPAssetManagerV2 contract not found');

      // Get all users from database first
      const users = await prisma.user.findMany();
      const allAssetIds = new Set<number>();

      // Get assets for each user
      for (const user of users) {
        try {
          const userAssets = await contract.getUserAssets(user.address);
          userAssets.forEach((id: bigint) => allAssetIds.add(Number(id)));
        } catch (error) {
          console.error(`Error getting assets for user ${user.address}:`, error);
        }
      }

      console.log(`Found ${allAssetIds.size} IP assets to sync`);

      for (const assetId of allAssetIds) {
        try {
          const assetData = await contract.getIPAsset(assetId);
          const [
            id,
            owner,
            name,
            description,
            metadataURI,
            royaltyPercentage,
            isActive,
            licenseTokenAddress,
            royaltyTokenAddress,
            totalRevenue,
            licenseTokenId,
            royaltyTokenId,
            ipfsHash
          ] = assetData;

          await prisma.iPAsset.upsert({
            where: {
              contractAddress_tokenId: {
                contractAddress: CONTRACT_ADDRESSES.IP_ASSET_MANAGER_V2,
                tokenId: BigInt(id.toString())
              }
            },
            update: {
              name: name.toString(),
              description: description.toString(),
              metadataURI: metadataURI.toString(),
              ipfsHash: ipfsHash.toString() || null,
              owner: owner.toString(),
              royaltyPercentage: Number(royaltyPercentage),
              isActive: isActive,
              totalRevenue: BigInt(totalRevenue.toString()),
              licenseTokenId: BigInt(licenseTokenId.toString()),
              royaltyTokenId: BigInt(royaltyTokenId.toString()),
              lastModified: new Date(),
            },
            create: {
              contractAddress: CONTRACT_ADDRESSES.IP_ASSET_MANAGER_V2,
              tokenId: BigInt(id.toString()),
              name: name.toString(),
              description: description.toString(),
              metadataURI: metadataURI.toString(),
              ipfsHash: ipfsHash.toString() || null,
              owner: owner.toString(),
              royaltyPercentage: Number(royaltyPercentage),
              isActive: isActive,
              totalRevenue: BigInt(totalRevenue.toString()),
              licenseTokenId: BigInt(licenseTokenId.toString()),
              royaltyTokenId: BigInt(royaltyTokenId.toString()),
            }
          });

          // Update or create user
          await prisma.user.upsert({
            where: { address: owner.toString() },
            update: { updatedAt: new Date() },
            create: { address: owner.toString() }
          });

        } catch (error) {
          console.error(`Error syncing IP Asset ${assetId}:`, error);
        }
      }

      console.log('✅ IP Asset Manager V2 data synced');
    } catch (error) {
      console.error('❌ Error syncing IP Asset Manager V2:', error);
    }
  }

  // Sync IP Asset Locker data
  async syncIPAssetLocker() {
    console.log('🔒 Syncing IP Asset Locker data...');
    
    try {
      const contract = this.contracts.get('IPAssetLocker');
      if (!contract) throw new Error('IPAssetLocker contract not found');

      // Get all IP assets to check for locks
      const ipAssets = await prisma.iPAsset.findMany({
        where: { isActive: true }
      });

      for (const asset of ipAssets) {
        try {
          const isLocked = await contract.isIPAssetLocked(asset.tokenId);
          
          if (isLocked) {
            const lockedAmount = await contract.getLockedAmount(asset.tokenId);
            console.log(`Asset ${asset.id} is locked with amount: ${lockedAmount.toString()}`);
            
            // Store lock data in database
            await prisma.iPAssetLock.upsert({
              where: { ipAssetId: asset.id },
              update: {
                hbarAmount: BigInt(lockedAmount.toString()),
                status: 'locked',
                updatedAt: new Date()
              },
              create: {
                ipAssetId: asset.id,
                owner: asset.owner,
                hbarAmount: BigInt(lockedAmount.toString()),
                status: 'locked',
                hbarTokenAmount: BigInt(0) // Will be updated when we sync HBAR tokens
              }
            });
          } else {
            // Remove lock if it exists but asset is no longer locked
            await prisma.iPAssetLock.deleteMany({
              where: { ipAssetId: asset.id }
            });
          }
        } catch (error) {
          console.error(`Error checking lock status for asset ${asset.id}:`, error);
        }
      }

      // Also fetch user's locked assets directly from the contract
      const users = await prisma.user.findMany();
      for (const user of users) {
        try {
          const userLockedAssets = await contract.getUserLockedIPAssets(user.address);
          console.log(`User ${user.address} has ${userLockedAssets.length} locked assets`);
          
          // Update lock records with user's locked assets
          for (const assetId of userLockedAssets) {
            const asset = await prisma.iPAsset.findFirst({
              where: { tokenId: BigInt(assetId.toString()) }
            });
            
            if (asset) {
              const lockedAmount = await contract.getLockedAmount(assetId);
              await prisma.iPAssetLock.upsert({
                where: { ipAssetId: asset.id },
                update: {
                  hbarAmount: BigInt(lockedAmount.toString()),
                  status: 'locked',
                  updatedAt: new Date()
                },
                create: {
                  ipAssetId: asset.id,
                  owner: user.address,
                  hbarAmount: BigInt(lockedAmount.toString()),
                  status: 'locked',
                  hbarTokenAmount: BigInt(0)
                }
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching locked assets for user ${user.address}:`, error);
        }
      }

      console.log('✅ IP Asset Locker data synced');
    } catch (error) {
      console.error('❌ Error syncing IP Asset Locker:', error);
    }
  }

  // Sync HBAR Equivalent Token data
  async syncHBAREquivalentToken() {
    console.log('💰 Syncing HBAR Equivalent Token data...');
    
    try {
      const contract = this.contracts.get('HBAREquivalentToken');
      if (!contract) throw new Error('HBAREquivalentToken contract not found');

      const totalMinted = await contract.totalMinted();
      console.log(`Total minted: ${totalMinted.toString()}`);

      // Get all users who might have HBAR tokens
      const users = await prisma.user.findMany();

      for (const user of users) {
        try {
          const balance = await contract.balanceOf(user.address);
          
          if (Number(balance) > 0) {
            console.log(`User ${user.address} has balance: ${balance.toString()}`);
            
            // Store HBAR token balance
            await prisma.hBARTokenBalance.upsert({
              where: { owner: user.address },
              update: {
                balance: BigInt(balance.toString()),
                totalMinted: BigInt(totalMinted.toString()),
                lastUpdated: new Date()
              },
              create: {
                owner: user.address,
                balance: BigInt(balance.toString()),
                totalMinted: BigInt(totalMinted.toString()),
                totalBurned: BigInt(0)
              }
            });
          }
        } catch (error) {
          console.error(`Error syncing HBAR balance for user ${user.address}:`, error);
        }
      }

      console.log('✅ HBAR Equivalent Token data synced');
    } catch (error) {
      console.error('❌ Error syncing HBAR Equivalent Token:', error);
    }
  }

  // Sync Intellectual Property Arbitration data
  async syncIntellectualPropertyArbitration() {
    console.log('⚖️ Syncing Intellectual Property Arbitration data...');
    
    try {
      const contract = this.contracts.get('IntellectualPropertyArbitration');
      if (!contract) throw new Error('IntellectualPropertyArbitration contract not found');

      // Get all IP assets to check arbitration status
      const ipAssets = await prisma.iPAsset.findMany({
        where: { isActive: true }
      });

      for (const asset of ipAssets) {
        try {
          const [isEligible, hasInfringement] = await contract.isArbitrationEligible(asset.tokenId);
          
          console.log(`Asset ${asset.id}: Eligible: ${isEligible}, Infringement: ${hasInfringement}`);
          
          // Store arbitration status in database
          // We'll create a simple arbitration status record for each asset
          if (isEligible || hasInfringement) {
            // Check if arbitration case already exists for this asset
            const existingCase = await prisma.arbitrationCase.findFirst({
              where: { ipAssetId: asset.id }
            });
            
            if (!existingCase) {
              // Create a new arbitration case record
              await prisma.arbitrationCase.create({
                data: {
                  ipAssetId: asset.id,
                  disputeId: BigInt(0), // Placeholder, will be updated when actual dispute is created
                  complainant: asset.owner, // Placeholder
                  respondent: asset.owner, // Placeholder
                  disputeBond: BigInt(0),
                  votingPeriod: BigInt(0),
                  challengePeriod: BigInt(0),
                  minStakeToVote: BigInt(0),
                  arbitratorFee: BigInt(0),
                  arbitrationToken: '0x0000000000000000000000000000000000000000',
                  status: hasInfringement ? 'active' : 'pending',
                  result: hasInfringement ? 'infringement_detected' : null
                }
              });
            }
          }
        } catch (error) {
          console.error(`Error checking arbitration status for asset ${asset.id}:`, error);
        }
      }

      console.log('✅ Intellectual Property Arbitration data synced');
    } catch (error) {
      console.error('❌ Error syncing Intellectual Property Arbitration:', error);
    }
  }

  // Sync Tokenized Asset Manager data
  async syncTokenizedAssetManager() {
    console.log('🎫 Syncing Tokenized Asset Manager data...');
    
    try {
      const contract = this.contracts.get('TokenizedAssetManager');
      if (!contract) throw new Error('TokenizedAssetManager contract not found');

      // Check if contract is deployed (not zero address)
      if (CONTRACT_ADDRESSES.TOKENIZED_ASSET_MANAGER === '0x0000000000000000000000000000000000000000') {
        console.log('⚠️ Tokenized Asset Manager not deployed, skipping sync');
        return;
      }

      // Implementation would go here once contract is deployed
      console.log('✅ Tokenized Asset Manager data synced (no data to sync)');
    } catch (error) {
      console.error('❌ Error syncing Tokenized Asset Manager:', error);
    }
  }

  // Get contract statistics
  async getContractStatistics() {
    try {
      const stats = {
        ipAssets: await prisma.iPAsset.count(),
        activeIPAssets: await prisma.iPAsset.count({ where: { isActive: true } }),
        lockedAssets: await prisma.iPAssetLock.count(),
        hbarTokenHolders: await prisma.hBARTokenBalance.count(),
        arbitrationCases: await prisma.arbitrationCase.count(),
        tokenizedAssets: await prisma.tokenizedAsset.count(),
        totalUsers: await prisma.user.count(),
      };

      return stats;
    } catch (error) {
      console.error('Error getting contract statistics:', error);
      throw error;
    }
  }

  // Clean up old data
  async cleanupOldData(daysToKeep: number = 30) {
    console.log(`🧹 Cleaning up data older than ${daysToKeep} days...`);
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Clean up old transactions
      await prisma.iPAssetTransaction.deleteMany({
        where: {
          timestamp: { lt: cutoffDate }
        }
      });

      // Clean up old HBAR token transactions
      await prisma.hBARTokenTransaction.deleteMany({
        where: {
          timestamp: { lt: cutoffDate }
        }
      });

      // Clean up old tokenized asset transfers
      await prisma.tokenizedAssetTransfer.deleteMany({
        where: {
          timestamp: { lt: cutoffDate }
        }
      });

      console.log('✅ Old data cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up old data:', error);
    }
  }
}

// Export singleton instance
export const dataSyncService = new DataSyncService();

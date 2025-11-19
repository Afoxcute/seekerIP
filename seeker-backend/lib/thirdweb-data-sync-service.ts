import { createThirdwebClient, getContract, readContract, defineChain } from "thirdweb";
import { prisma } from './prisma';
import IPAssetManagerV2ABI from '../abi/IPAssetManagerV2.json';
import IPAssetLockerABI from '../abi/IPAssetLocker.json';
import HBAREquivalentTokenABI from '../abi/HBAREquivalentToken.json';
import IntellectualPropertyArbitrationABI from '../abi/IntellectualPropertyArbitration.json';

// Hedera Testnet configuration (same as frontend)
export const hederaTestnet = {
  id: 296,
  name: 'Hedera Testnet',
  nativeCurrency: {
    name: 'HBAR',
    symbol: 'HBAR',
    decimals: 18,
  },
  rpc: 'https://testnet.hashio.io/api',
  blockExplorers: [{
    name: 'Hedera Testnet Explorer',
    url: 'https://testnet.hashio.io',
  }],
};

// Contract addresses (same as frontend)
export const CONTRACT_ADDRESSES = {
  IP_ASSET_MANAGER_V2: '0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a',
  IP_ASSET_LOCKER: '0xec0dBd92a8D1A222d34ecdB088B0022F38aF2883',
  HBAR_EQUIVALENT_TOKEN: '0x9f4FC76E91e483b02DA42A0a10592e603F670dc9',
  INTELLECTUAL_PROPERTY_ARBITRATION: '0x60f4a0ee098394951bb704709842C92dF25038b2',
};

export class ThirdwebDataSyncService {
  private client: any;
  private contracts: Map<string, any> = new Map();

  constructor() {
    // Initialize Thirdweb client (same as frontend)
    this.client = createThirdwebClient({
      clientId: "c0016c054a796a6fa54b18dd24ed5f77", // Same as frontend
    });

    this.initializeContracts();
  }

  // Parse metadata from URI (same logic as frontend)
  private async parseMetadata(metadataUri: string): Promise<any> {
    try {
      console.log('Parsing metadata from URI:', metadataUri);
      
      // If metadata is a direct JSON string, parse it
      if (metadataUri.startsWith('{')) {
        const metadata = JSON.parse(metadataUri);
        console.log('Parsed direct JSON metadata:', metadata);
        return metadata;
      }
      
      // If it's an IPFS URI, fetch it
      if (metadataUri.startsWith('ipfs://')) {
        const gatewayUrl = this.getIPFSGatewayURL(metadataUri);
        console.log('Fetching metadata from gateway:', gatewayUrl);
        
        const response = await fetch(gatewayUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch metadata: ${response.statusText}`);
        }
        
        const metadata = await response.json();
        console.log('Fetched IPFS metadata:', metadata);
        return metadata;
      }
      
      // If it's already a gateway URL, fetch it
      if (metadataUri.includes('gateway.pinata.cloud')) {
        console.log('Fetching metadata from gateway URL:', metadataUri);
        const response = await fetch(metadataUri);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch metadata: ${response.statusText}`);
        }
        
        const metadata = await response.json();
        console.log('Fetched gateway metadata:', metadata);
        return metadata;
      }
      
      // Try to fetch as a regular URL
      if (metadataUri.startsWith('http')) {
        console.log('Fetching metadata from URL:', metadataUri);
        const response = await fetch(metadataUri);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch metadata: ${response.statusText}`);
        }
        
        const metadata = await response.json();
        console.log('Fetched URL metadata:', metadata);
        return metadata;
      }
      
      // Default fallback
      console.log('Using fallback metadata for URI:', metadataUri);
      return {
        name: "Unknown",
        description: "No description available",
        image: metadataUri // Use the URI as image if it's not JSON
      };
    } catch (error) {
      console.error('Error parsing metadata:', error);
      return {
        name: "Unknown",
        description: "No description available",
        image: metadataUri // Use the URI as image as fallback
      };
    }
  }

  // Convert IPFS URI to gateway URL (same logic as frontend)
  private getIPFSGatewayURL(ipfsUri: string): string {
    const hash = ipfsUri.replace('ipfs://', '');
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }

  private initializeContracts() {
    // Initialize IP Asset Manager V2 contract
    this.contracts.set('IPAssetManagerV2', getContract({
      address: CONTRACT_ADDRESSES.IP_ASSET_MANAGER_V2,
      chain: defineChain(hederaTestnet.id),
      client: this.client,
      abi: IPAssetManagerV2ABI.abi,
    }));

    // Initialize IP Asset Locker contract
    this.contracts.set('IPAssetLocker', getContract({
      address: CONTRACT_ADDRESSES.IP_ASSET_LOCKER,
      chain: defineChain(hederaTestnet.id),
      client: this.client,
      abi: IPAssetLockerABI.abi,
    }));

    // Initialize HBAR Equivalent Token contract
    this.contracts.set('HBAREquivalentToken', getContract({
      address: CONTRACT_ADDRESSES.HBAR_EQUIVALENT_TOKEN,
      chain: defineChain(hederaTestnet.id),
      client: this.client,
      abi: HBAREquivalentTokenABI.abi,
    }));

    // Initialize Intellectual Property Arbitration contract
    this.contracts.set('IntellectualPropertyArbitration', getContract({
      address: CONTRACT_ADDRESSES.INTELLECTUAL_PROPERTY_ARBITRATION,
      chain: defineChain(hederaTestnet.id),
      client: this.client,
      abi: IntellectualPropertyArbitrationABI.abi,
    }));
  }

  // Sync all contract data using the same mechanism as frontend
  async syncAllContracts() {
    console.log('🔄 Starting Thirdweb data sync...');
    
    try {
      await Promise.all([
        this.syncIPAssetManagerV2(),
        this.syncIPAssetLocker(),
        this.syncHBAREquivalentToken(),
        this.syncIntellectualPropertyArbitration(),
      ]);
      
      console.log('✅ All contract data synchronized successfully');
    } catch (error) {
      console.error('❌ Error during contract data sync:', error);
      throw error;
    }
  }

  // Sync IP Asset Manager V2 data (same as frontend)
  async syncIPAssetManagerV2() {
    console.log('📝 Syncing IP Asset Manager V2 data...');
    
    try {
      const contract = this.contracts.get('IPAssetManagerV2');
      if (!contract) throw new Error('IPAssetManagerV2 contract not found');

      // Get total IPs (same as frontend)
      let totalIPs = 0n;
      try {
        totalIPs = await readContract({
          contract,
          method: "function totalIPs() view returns (uint256)",
          params: [],
        });
      } catch (error) {
        console.log("totalIPs function not available, using fallback method");
        // Fallback: try to get assets by iterating
        totalIPs = 100n; // Use a reasonable fallback
      }

      console.log(`Total IPs found: ${totalIPs}`);

      // Get all users first
      const users = await prisma.user.findMany();
      const allAssets = new Map();

      // Get IP assets for each user using getUserAssets (same as frontend)
      for (const user of users) {
        try {
          const userAssetIds = await readContract({
            contract,
            method: "function getUserAssets(address user) view returns (uint256[])",
            params: [user.address],
          });

          console.log(`User ${user.address} has ${userAssetIds.length} assets:`, userAssetIds.map(id => id.toString()));

          // Get details for each asset
          for (const assetId of userAssetIds) {
            try {
              const ipAsset = await readContract({
                contract,
                method: "function getIPAsset(uint256 assetId) view returns (uint256 assetId_, address owner, string name, string description, string metadataURI, uint256 createdAt, bool isActive, address licenseToken, address royaltyVault, uint256 totalRevenue, uint256 totalLicenses, uint256 nftTokenId, string ipfsHash)",
                params: [assetId],
              });

              // Store asset even if some values are undefined (they might be uninitialized)
              if (ipAsset) {
                // Fetch additional metadata from metadataURI if available
                let parsedMetadata = null;
                if (ipAsset.metadataURI && ipAsset.metadataURI !== '') {
                  try {
                    parsedMetadata = await this.parseMetadata(ipAsset.metadataURI);
                    console.log(`Parsed metadata for asset ${assetId}:`, parsedMetadata);
                  } catch (error) {
                    console.log(`Failed to parse metadata for asset ${assetId}:`, error.message);
                  }
                }

                allAssets.set(Number(assetId), {
                  tokenId: ipAsset.assetId_ || assetId,
                  owner: ipAsset.owner || user.address,
                  name: parsedMetadata?.name || ipAsset.name || `IP Asset ${assetId}`,
                  description: parsedMetadata?.description || ipAsset.description || `IP Asset with ID ${assetId}`,
                  metadataURI: ipAsset.metadataURI || '',
                  metadata: parsedMetadata || {},
                  createdAt: ipAsset.createdAt || BigInt(0),
                  isActive: ipAsset.isActive || false,
                  licenseToken: ipAsset.licenseToken || '0x0000000000000000000000000000000000000000',
                  royaltyVault: ipAsset.royaltyVault || '0x0000000000000000000000000000000000000000',
                  totalRevenue: ipAsset.totalRevenue || BigInt(0),
                  totalLicenses: ipAsset.totalLicenses || BigInt(0),
                  nftTokenId: ipAsset.nftTokenId || BigInt(0),
                  ipfsHash: ipAsset.ipfsHash || '',
                });
                console.log(`Found asset ${assetId}: ${parsedMetadata?.name || ipAsset.name || `Asset ${assetId}`} (${ipAsset.owner || user.address}) - Active: ${ipAsset.isActive || false}`);
              }
            } catch (error) {
              console.log(`Error getting asset ${assetId}: ${error.message}`);
            }
          }
        } catch (error) {
          console.log(`Error getting assets for user ${user.address}: ${error.message}`);
        }
      }

      console.log(`Found ${allAssets.size} active IP assets`);

      // Store in database
      for (const [assetId, asset] of allAssets) {
        try {
          await prisma.iPAsset.upsert({
            where: {
              contractAddress_tokenId: {
                contractAddress: CONTRACT_ADDRESSES.IP_ASSET_MANAGER_V2,
                tokenId: BigInt(assetId)
              }
            },
            update: {
              name: asset.name || `IP Asset ${assetId}`,
              description: asset.description || `IP Asset with hash: ${asset.ipfsHash}`,
              metadataURI: asset.metadataURI || '',
              metadata: asset.metadata || null,
              ipfsHash: asset.ipfsHash,
              owner: asset.owner,
              royaltyPercentage: 0, // Default since contract doesn't provide it
              isActive: asset.isActive,
              totalRevenue: BigInt(asset.totalRevenue.toString()),
              licenseTokenId: BigInt(asset.nftTokenId.toString()),
              royaltyTokenId: BigInt(asset.nftTokenId.toString()),
              lastModified: new Date(),
            },
            create: {
              contractAddress: CONTRACT_ADDRESSES.IP_ASSET_MANAGER_V2,
              tokenId: BigInt(assetId),
              name: asset.name || `IP Asset ${assetId}`,
              description: asset.description || `IP Asset with hash: ${asset.ipfsHash}`,
              metadataURI: asset.metadataURI || '',
              metadata: asset.metadata || null,
              ipfsHash: asset.ipfsHash,
              owner: asset.owner,
              royaltyPercentage: 0,
              isActive: asset.isActive,
              totalRevenue: BigInt(asset.totalRevenue.toString()),
              licenseTokenId: BigInt(asset.nftTokenId.toString()),
              royaltyTokenId: BigInt(asset.nftTokenId.toString()),
            }
          });

          // Update or create user
          await prisma.user.upsert({
            where: { address: asset.owner },
            update: { updatedAt: new Date() },
            create: { address: asset.owner }
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
          const isLocked = await readContract({
            contract,
            method: "function isIPAssetLocked(uint256 ipAssetId) view returns (bool)",
            params: [asset.tokenId],
          });
          
          if (isLocked) {
            const lockedAmount = await readContract({
              contract,
              method: "function getLockedAmount(uint256 ipAssetId) view returns (uint256)",
              params: [asset.tokenId],
            });
            
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
                hbarTokenAmount: BigInt(0)
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

      const totalMinted = await readContract({
        contract,
        method: "function totalMinted() view returns (uint256)",
        params: [],
      });

      console.log(`Total minted: ${totalMinted.toString()}`);

      // Get all users who might have HBAR tokens
      const users = await prisma.user.findMany();

      for (const user of users) {
        try {
          const balance = await readContract({
            contract,
            method: "function balanceOf(address owner) view returns (uint256)",
            params: [user.address],
          });
          
          // Convert to proper BigInt values
          const balanceValue = typeof balance === 'bigint' ? balance : BigInt(balance.toString());
          
          if (Number(balanceValue) > 0) {
            console.log(`User ${user.address} has balance: ${balanceValue.toString()}`);
            
            // Store HBAR token balance using raw SQL to handle large values
            await prisma.$executeRaw`
              INSERT INTO hbar_token_balances (id, owner, balance, "totalMinted", "totalBurned", "lastUpdated")
              VALUES (gen_random_uuid(), ${user.address}, ${balanceValue.toString()}, ${totalMinted.toString()}, '0', NOW())
              ON CONFLICT (owner) 
              DO UPDATE SET 
                balance = ${balanceValue.toString()},
                "totalMinted" = ${totalMinted.toString()},
                "lastUpdated" = NOW()
            `;
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
          const [isEligible, hasInfringement] = await readContract({
            contract,
            method: "function isArbitrationEligible(uint256 ipAssetId) view returns (bool, bool)",
            params: [asset.tokenId],
          });
          
          console.log(`Asset ${asset.id}: Eligible: ${isEligible}, Infringement: ${hasInfringement}`);
          
          // Store arbitration status in database
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
                  disputeId: BigInt(0), // Placeholder
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
}

// Export singleton instance
export const thirdwebDataSyncService = new ThirdwebDataSyncService();

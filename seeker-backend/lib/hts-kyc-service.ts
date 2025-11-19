import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

export interface HTSKYCServiceConfig {
  ipAssetHTSKYCAddress: string;
  ipAssetManagerAddress: string;
  htsTokenAddress: string;
  provider: ethers.Provider;
  signer: ethers.Signer;
}

export interface KYCStatus {
  account: string;
  status: 'pending' | 'granted' | 'revoked';
  grantedAt?: Date;
  revokedAt?: Date;
  transactionHash?: string;
}

export interface HTSKYCKey {
  contractAddress: string;
  keyType: 'SUPPLY' | 'ADMIN' | 'KYC';
  keyValue: string;
  isActive: boolean;
}

export class HTSKYCService {
  private prisma: PrismaClient;
  private config: HTSKYCServiceConfig;
  private ipAssetNFT: ethers.Contract;
  private ipAssetManager: ethers.Contract;

  constructor(prisma: PrismaClient, config: HTSKYCServiceConfig) {
    this.prisma = prisma;
    this.config = config;
    
    // Initialize contracts
    const ipAssetNFTABI = [
      'function grantKYC(address account) external',
      'function revokeKYC(address account) external',
      'function updateKYCKey(bytes memory newKYCKey) external',
      'function tokenAddress() external view returns (address)',
      'function getIPAssetId(uint256 tokenId) external view returns (uint256)',
      'function getTokenId(uint256 ipAssetId) external view returns (uint256)',
      'function hasNFT(uint256 ipAssetId) external view returns (bool)',
      'function tokenURI(uint256 tokenId) external view returns (string)',
      'event KYCGranted(address indexed account)',
      'event KYCRevoked(address indexed account)',
      'event KYCKeyUpdated(bytes newKey)',
      'event IPAssetNFTMinted(address indexed to, uint256 indexed tokenId, uint256 indexed ipAssetId, int64 newTotalSupply)',
      'event IPAssetNFTBurned(uint256 indexed tokenId, uint256 indexed ipAssetId, int64 newTotalSupply)'
    ];

    const ipAssetManagerABI = [
      'function grantKYCForIPAssets(address account) external',
      'function revokeKYCForIPAssets(address account) external',
      'function updateKYCKeyForIPAssets(bytes memory newKYCKey) external',
      'function getIPAssetNFTTokenAddress() external view returns (address)',
      'function hasKYCForIPAssets(address account) external view returns (bool)',
      'function registerIPAsset(string memory name, string memory description, string memory metadataURI, string memory ipfsHash) external returns (uint256)'
    ];

    this.ipAssetNFT = new ethers.Contract(
      config.ipAssetHTSKYCAddress,
      ipAssetNFTABI,
      config.signer
    );

    this.ipAssetManager = new ethers.Contract(
      config.ipAssetManagerAddress,
      ipAssetManagerABI,
      config.signer
    );
  }

  /**
   * Grant KYC to an account for IP Asset NFTs
   */
  async grantKYC(account: string): Promise<string> {
    try {
      const tx = await this.ipAssetNFT.grantKYC(account, {
        gasLimit: 75_000
      });
      await tx.wait();

      // Update database
      await this.updateKYCStatus(account, 'granted', tx.hash);

      return tx.hash;
    } catch (error) {
      console.error('Error granting KYC:', error);
      throw error;
    }
  }

  /**
   * Revoke KYC from an account for IP Asset NFTs
   */
  async revokeKYC(account: string): Promise<string> {
    try {
      const tx = await this.ipAssetNFT.revokeKYC(account, {
        gasLimit: 75_000
      });
      await tx.wait();

      // Update database
      await this.updateKYCStatus(account, 'revoked', tx.hash);

      return tx.hash;
    } catch (error) {
      console.error('Error revoking KYC:', error);
      throw error;
    }
  }

  /**
   * Update KYC key for IP Asset NFTs
   */
  async updateKYCKey(newKYCKey: string): Promise<string> {
    try {
      const tx = await this.ipAssetNFT.updateKYCKey(newKYCKey, {
        gasLimit: 100_000
      });
      await tx.wait();

      // Update database
      await this.updateKYCKeyInDB(newKYCKey);

      return tx.hash;
    } catch (error) {
      console.error('Error updating KYC key:', error);
      throw error;
    }
  }

  /**
   * Register a new IP Asset with KYC enforcement
   */
  async registerIPAsset(
    name: string,
    description: string,
    metadataURI: string,
    ipfsHash: string
  ): Promise<{ assetId: string; tokenId: string; txHash: string }> {
    try {
      const tx = await this.ipAssetManager.registerIPAsset(
        name,
        description,
        metadataURI,
        ipfsHash,
        { gasLimit: 500_000 }
      );
      await tx.wait();

      // Get the asset ID from the transaction logs
      const receipt = await tx.wait();
      const logs = receipt.logs;
      
      // Find the IPAssetRegistered event
      let assetId: string | null = null;
      let tokenId: string | null = null;
      
      for (const log of logs) {
        try {
          const parsed = this.ipAssetNFT.interface.parseLog(log);
          if (parsed && parsed.name === 'IPAssetNFTMinted') {
            tokenId = parsed.args.tokenId.toString();
            assetId = parsed.args.ipAssetId.toString();
            break;
          }
        } catch (e) {
          // Not our event, continue
        }
      }

      if (!assetId || !tokenId) {
        throw new Error('Could not extract asset ID or token ID from transaction');
      }

      // Update database with HTS information
      await this.updateIPAssetWithHTSInfo(assetId, tokenId);

      return { assetId, tokenId, txHash: tx.hash };
    } catch (error) {
      console.error('Error registering IP Asset:', error);
      throw error;
    }
  }

  /**
   * Get KYC status for an account
   */
  async getKYCStatus(account: string): Promise<KYCStatus[]> {
    const statuses = await this.prisma.iPAssetKYCStatus.findMany({
      where: { account },
      orderBy: { updatedAt: 'desc' }
    });

    return statuses.map(status => ({
      account: status.account,
      status: status.status as 'pending' | 'granted' | 'revoked',
      grantedAt: status.grantedAt,
      revokedAt: status.revokedAt,
      transactionHash: status.transactionHash || undefined
    }));
  }

  /**
   * Get KYC status for a specific IP Asset
   */
  async getKYCStatusForAsset(ipAssetId: string, account: string): Promise<KYCStatus | null> {
    const status = await this.prisma.iPAssetKYCStatus.findUnique({
      where: {
        ipAssetId_account: {
          ipAssetId,
          account
        }
      }
    });

    if (!status) return null;

    return {
      account: status.account,
      status: status.status as 'pending' | 'granted' | 'revoked',
      grantedAt: status.grantedAt,
      revokedAt: status.revokedAt,
      transactionHash: status.transactionHash || undefined
    };
  }

  /**
   * Get all KYC keys for the contract
   */
  async getKYCKeys(): Promise<HTSKYCKey[]> {
    const keys = await this.prisma.hTSKYCKey.findMany({
      where: { contractAddress: this.config.ipAssetHTSKYCAddress }
    });

    return keys.map(key => ({
      contractAddress: key.contractAddress,
      keyType: key.keyType as 'SUPPLY' | 'ADMIN' | 'KYC',
      keyValue: key.keyValue,
      isActive: key.isActive
    }));
  }

  /**
   * Get KYC events
   */
  async getKYCEvents(limit: number = 100): Promise<any[]> {
    return await this.prisma.hTSKYCEvent.findMany({
      where: { contractAddress: this.config.ipAssetHTSKYCAddress },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }

  /**
   * Private helper to update KYC status in database
   */
  private async updateKYCStatus(
    account: string,
    status: 'granted' | 'revoked',
    transactionHash: string
  ): Promise<void> {
    const now = new Date();
    
    // Update or create KYC status for all IP assets
    const ipAssets = await this.prisma.iPAsset.findMany({
      where: { kycRequired: true }
    });

    for (const asset of ipAssets) {
      await this.prisma.iPAssetKYCStatus.upsert({
        where: {
          ipAssetId_account: {
            ipAssetId: asset.id,
            account
          }
        },
        update: {
          status,
          grantedAt: status === 'granted' ? now : undefined,
          revokedAt: status === 'revoked' ? now : undefined,
          transactionHash,
          updatedAt: now
        },
        create: {
          ipAssetId: asset.id,
          account,
          status,
          grantedAt: status === 'granted' ? now : undefined,
          revokedAt: status === 'revoked' ? now : undefined,
          transactionHash
        }
      });
    }
  }

  /**
   * Private helper to update KYC key in database
   */
  private async updateKYCKeyInDB(keyValue: string): Promise<void> {
    await this.prisma.hTSKYCKey.upsert({
      where: {
        contractAddress_keyType: {
          contractAddress: this.config.ipAssetHTSKYCAddress,
          keyType: 'KYC'
        }
      },
      update: {
        keyValue,
        updatedAt: new Date()
      },
      create: {
        contractAddress: this.config.ipAssetHTSKYCAddress,
        keyType: 'KYC',
        keyValue,
        isActive: true
      }
    });
  }

  /**
   * Private helper to update IP Asset with HTS information
   */
  private async updateIPAssetWithHTSInfo(assetId: string, tokenId: string): Promise<void> {
    await this.prisma.iPAsset.update({
      where: { id: assetId },
      data: {
        htsTokenAddress: this.config.htsTokenAddress,
        nftTokenId: BigInt(tokenId),
        kycRequired: true
      }
    });
  }

  /**
   * Process KYC events from blockchain
   */
  async processKYCEvents(fromBlock: number, toBlock: number): Promise<void> {
    try {
      const filter = {
        address: this.config.ipAssetHTSKYCAddress,
        fromBlock,
        toBlock,
        topics: [
          [
            this.ipAssetNFT.interface.getEvent('KYCGranted').topicHash,
            this.ipAssetNFT.interface.getEvent('KYCRevoked').topicHash,
            this.ipAssetNFT.interface.getEvent('KYCKeyUpdated').topicHash
          ]
        ]
      };

      const logs = await this.config.provider.getLogs(filter);

      for (const log of logs) {
        try {
          const parsed = this.ipAssetNFT.interface.parseLog(log);
          if (!parsed) continue;

          const eventData = {
            contractAddress: this.config.ipAssetHTSKYCAddress,
            eventType: parsed.name,
            account: parsed.args.account || null,
            keyValue: parsed.args.newKey || null,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            logIndex: log.logIndex,
            timestamp: new Date()
          };

          await this.prisma.hTSKYCEvent.upsert({
            where: {
              transactionHash_logIndex: {
                transactionHash: log.transactionHash,
                logIndex: log.logIndex
              }
            },
            update: eventData,
            create: eventData
          });

          // Update KYC status if it's a grant/revoke event
          if (parsed.name === 'KYCGranted' && parsed.args.account) {
            await this.updateKYCStatus(parsed.args.account, 'granted', log.transactionHash);
          } else if (parsed.name === 'KYCRevoked' && parsed.args.account) {
            await this.updateKYCStatus(parsed.args.account, 'revoked', log.transactionHash);
          }
        } catch (error) {
          console.error('Error processing KYC event:', error);
        }
      }
    } catch (error) {
      console.error('Error processing KYC events:', error);
      throw error;
    }
  }
}


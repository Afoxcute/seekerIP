import { ethers } from 'ethers';
import { prisma } from './prisma';
import config from '../env.config';

// Contract addresses from deployment
const IP_ASSET_MANAGER_ENHANCED_ADDRESS = config.contracts.ipAssetManagerEnhanced;
const IP_ASSET_MANAGER_ADDRESS = config.contracts.ipAssetManager;

// Contract ABIs (simplified for key functions)
const IP_ASSET_MANAGER_ABI = [
  'function registerIPAsset(string name, string description, string metadataURI, uint256 royaltyPercentage) external returns (uint256)',
  'function attachLicense(uint256 ipAssetId, string terms, uint256 price, uint256 maxMints, string encryptedTerms) external',
  'function mintLicenseToken(uint256 ipAssetId, uint256 amount) external payable',
  'function payRevenue(uint256 ipAssetId) external payable',
  'function claimRoyalties(uint256 ipAssetId) external',
  'function transferIPAsset(uint256 ipAssetId, address newOwner) external',
  'function getIPAsset(uint256 ipAssetId) external view returns (string name, string description, string metadataURI, address owner, uint256 royaltyPercentage, bool isActive, uint256 totalRevenue)',
  'function getLicense(uint256 licenseId) external view returns (uint256 ipAssetId, string terms, uint256 price, uint256 maxMints, uint256 currentMints, bool isActive)',
  'function getRoyaltyInfo(uint256 ipAssetId) external view returns (uint256 totalRevenue, uint256 totalRoyaltyTokens, uint256 userShares)',
  'event IPAssetRegistered(uint256 indexed ipAssetId, string name, address indexed owner)',
  'event LicenseAttached(uint256 indexed ipAssetId, uint256 indexed licenseId, string encryptedTerms)',
  'event LicenseTokenMinted(uint256 indexed licenseId, address indexed to, uint256 amount)',
  'event RevenuePaid(uint256 indexed ipAssetId, address indexed payer, uint256 amount)',
  'event RoyaltyClaimed(uint256 indexed ipAssetId, address indexed claimant, uint256 amount)',
  'event IPAssetTransferred(uint256 indexed ipAssetId, address indexed from, address indexed to)'
];

const IP_ASSET_MANAGER_ENHANCED_ABI = [
  ...IP_ASSET_MANAGER_ABI,
  'function registerIPAsset(string name, string description, string metadataURI, string ipfsHash, uint256 royaltyPercentage) external returns (uint256)',
  'function attachLicense(uint256 ipAssetId, string terms, string encryptedTerms, uint256 price, uint256 maxMints, uint256 validFrom, uint256 validUntil, string licenseType) external',
  'function mintLicenseToken(uint256 ipAssetId, uint256 amount, bytes signature, uint256 deadline) external payable',
  'function payRevenue(uint256 ipAssetId, string description) external payable',
  'function claimRoyalties(uint256 ipAssetId) external',
  'function getUserIPAssets(address user) external view returns (uint256[])',
  'function getPaymentHistory(uint256 ipAssetId) external view returns (tuple(uint256 ipAssetId, address payer, uint256 amount, string description, uint256 timestamp, bool isProcessed)[])',
  'function platformFeePercentage() external view returns (uint256)',
  'function platformFeeCollector() external view returns (address)',
  'event IPAssetRegistered(uint256 indexed ipAssetId, string name, address indexed owner, string ipfsHash)',
  'event LicenseAttached(uint256 indexed ipAssetId, uint256 indexed licenseId, string licenseType)',
  'event LicenseTokenMinted(uint256 indexed licenseId, address indexed to, uint256 amount, uint256 price)',
  'event RevenuePaid(uint256 indexed ipAssetId, address indexed payer, uint256 amount, string description)',
  'event RoyaltyClaimed(uint256 indexed ipAssetId, address indexed claimant, uint256 amount)',
  'event IPAssetTransferred(uint256 indexed ipAssetId, address indexed from, address indexed to)',
  'event LicenseUpdated(uint256 indexed licenseId, string newTerms, uint256 newPrice)',
  'event PlatformFeeUpdated(uint256 oldFee, uint256 newFee)'
];

export class IPAssetManagerService {
  private provider: ethers.JsonRpcProvider;
  private enhancedContract: ethers.Contract;
  private basicContract: ethers.Contract;

  constructor(rpcUrl: string = config.network.rpcUrl) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.enhancedContract = new ethers.Contract(
      IP_ASSET_MANAGER_ENHANCED_ADDRESS,
      IP_ASSET_MANAGER_ENHANCED_ABI,
      this.provider
    );
    this.basicContract = new ethers.Contract(
      IP_ASSET_MANAGER_ADDRESS,
      IP_ASSET_MANAGER_ABI,
      this.provider
    );
  }

  // IP Asset Management
  async registerIPAsset(
    name: string,
    description: string,
    metadataURI: string,
    ipfsHash: string,
    royaltyPercentage: number,
    ownerAddress: string
  ) {
    try {
      // Create IP Asset in database
      const ipAsset = await prisma.iPAsset.create({
        data: {
          contractAddress: IP_ASSET_MANAGER_ENHANCED_ADDRESS,
          tokenId: BigInt(0), // Will be updated after contract call
          name,
          description,
          metadataURI,
          ipfsHash,
          owner: ownerAddress,
          royaltyPercentage,
          royaltyTokenId: BigInt(0), // Will be updated after contract call
        }
      });

      return ipAsset;
    } catch (error) {
      console.error('Error registering IP Asset:', error);
      throw error;
    }
  }

  async getIPAsset(ipAssetId: string) {
    try {
      const ipAsset = await prisma.iPAsset.findUnique({
        where: { id: ipAssetId },
        include: {
          licenses: true,
          royalties: {
            include: {
              shares: true,
              claims: true
            }
          },
          payments: true,
          transactions: true
        }
      });

      return ipAsset;
    } catch (error) {
      console.error('Error getting IP Asset:', error);
      throw error;
    }
  }

  async getUserIPAssets(userAddress: string) {
    try {
      const ipAssets = await prisma.iPAsset.findMany({
        where: { owner: userAddress },
        include: {
          licenses: true,
          royalties: true,
          payments: true
        }
      });

      return ipAssets;
    } catch (error) {
      console.error('Error getting user IP Assets:', error);
      throw error;
    }
  }

  // License Management
  async createLicense(
    ipAssetId: string,
    terms: string,
    encryptedTerms: string,
    price: bigint,
    maxMints: bigint,
    licenseType: string = 'standard'
  ) {
    try {
      const license = await prisma.license.create({
        data: {
          contractAddress: IP_ASSET_MANAGER_ENHANCED_ADDRESS,
          tokenId: BigInt(0), // Will be updated after contract call
          ipAssetId,
          terms,
          encryptedTerms,
          price,
          maxMints,
          licenseType,
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
        }
      });

      return license;
    } catch (error) {
      console.error('Error creating license:', error);
      throw error;
    }
  }

  async mintLicense(licenseId: string, buyerAddress: string, amount: bigint, price: bigint, transactionHash: string) {
    try {
      const mint = await prisma.licenseMint.create({
        data: {
          licenseId,
          buyer: buyerAddress,
          amount,
          price,
          transactionHash
        }
      });

      // Update license current mints
      await prisma.license.update({
        where: { id: licenseId },
        data: {
          currentMints: {
            increment: amount
          }
        }
      });

      return mint;
    } catch (error) {
      console.error('Error minting license:', error);
      throw error;
    }
  }

  // Revenue Management
  async recordPayment(
    ipAssetId: string,
    payerAddress: string,
    amount: bigint,
    description: string,
    transactionHash: string
  ) {
    try {
      const payment = await prisma.payment.create({
        data: {
          ipAssetId,
          payer: payerAddress,
          amount,
          description,
          transactionHash
        }
      });

      // Update IP Asset total revenue
      await prisma.iPAsset.update({
        where: { id: ipAssetId },
        data: {
          totalRevenue: {
            increment: amount
          }
        }
      });

      return payment;
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  async claimRoyalty(royaltyId: string, claimantAddress: string, amount: bigint, transactionHash: string) {
    try {
      const claim = await prisma.royaltyClaim.create({
        data: {
          royaltyId,
          claimant: claimantAddress,
          amount,
          transactionHash
        }
      });

      return claim;
    } catch (error) {
      console.error('Error claiming royalty:', error);
      throw error;
    }
  }

  // Transaction Tracking
  async recordTransaction(
    ipAssetId: string,
    transactionHash: string,
    from: string,
    to: string | null,
    type: string,
    amount: bigint | null,
    metadata: any = null
  ) {
    try {
      const transaction = await prisma.iPAssetTransaction.create({
        data: {
          ipAssetId,
          transactionHash,
          from,
          to,
          type,
          amount,
          metadata
        }
      });

      return transaction;
    } catch (error) {
      console.error('Error recording transaction:', error);
      throw error;
    }
  }

  // Platform Configuration
  async getPlatformConfig() {
    try {
      let platformConfig = await prisma.platformConfig.findFirst();
      
      if (!platformConfig) {
        platformConfig = await prisma.platformConfig.create({
          data: {
            platformFeePercentage: config.platform.feePercentage,
            platformFeeCollector: config.platform.feeCollector
          }
        });
      }

      return platformConfig;
    } catch (error) {
      console.error('Error getting platform config:', error);
      throw error;
    }
  }

  // User Management
  async createUser(address: string) {
    try {
      const user = await prisma.user.upsert({
        where: { address },
        update: {},
        create: {
          address,
          kycStatus: 'pending'
        }
      });

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUserKYC(address: string, status: string) {
    try {
      const user = await prisma.user.update({
        where: { address },
        data: { kycStatus: status }
      });

      return user;
    } catch (error) {
      console.error('Error updating user KYC:', error);
      throw error;
    }
  }

  // Analytics and Reporting
  async getIPAssetAnalytics(ipAssetId: string) {
    try {
      const ipAsset = await prisma.iPAsset.findUnique({
        where: { id: ipAssetId },
        include: {
          licenses: {
            include: {
              mints: true
            }
          },
          royalties: {
            include: {
              shares: true,
              claims: true
            }
          },
          payments: true,
          transactions: true
        }
      });

      if (!ipAsset) {
        throw new Error('IP Asset not found');
      }

      // Calculate analytics
      const totalLicenseSales = ipAsset.licenses.reduce((total, license) => {
        return total + license.mints.reduce((sum, mint) => sum + Number(mint.amount), 0);
      }, 0);

      const totalRevenue = Number(ipAsset.totalRevenue);
      const totalRoyaltyClaims = ipAsset.royalties.reduce((total, royalty) => {
        return total + royalty.claims.reduce((sum, claim) => sum + Number(claim.amount), 0);
      }, 0);

      return {
        ipAsset,
        analytics: {
          totalLicenseSales,
          totalRevenue,
          totalRoyaltyClaims,
          activeLicenses: ipAsset.licenses.filter(l => l.isActive).length,
          totalTransactions: ipAsset.transactions.length
        }
      };
    } catch (error) {
      console.error('Error getting IP Asset analytics:', error);
      throw error;
    }
  }
}

export default IPAssetManagerService; 
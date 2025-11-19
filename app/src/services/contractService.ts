import { ThirdwebClient, getContract, prepareContractCall, readContract, sendTransaction, waitForReceipt } from "thirdweb";
import { parseEther } from "viem";
import CONTRACT_ADDRESS_JSON from "../deployed_addresses.json";
import IPAssetManagerV2ABI from "../abi/IPAssetManagerV2.json";

// Use the correct IPAssetManagerV2 ABI
const IP_ASSET_MANAGER_V2_ABI = IPAssetManagerV2ABI.abi as any;

// Hedera Testnet configuration
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
    url: 'https://testnet.hashscan.io',
  }],
};

// Contract addresses
export const CONTRACT_ADDRESSES = {
  IP_ASSET_MANAGER_V2: CONTRACT_ADDRESS_JSON["IPAssetManagerV2"] as `0x${string}`,
  IP_ASSET_NFT: CONTRACT_ADDRESS_JSON["IPAssetNFT"] as `0x${string}`,
};

/**
 * Contract Service for SeekerIP interactions
 */
export class ContractService {
  private client: ThirdwebClient;
  private contract: any;

  constructor(client: ThirdwebClient) {
    this.client = client;
    this.contract = getContract({
      address: CONTRACT_ADDRESSES.IP_ASSET_MANAGER_V2,
      chain: hederaTestnet,
      client: this.client,
      abi: IP_ASSET_MANAGER_V2_ABI,
    });
  }

  /**
   * Register new IP asset
   */
  async registerIP(
    account: any,
    ipHash: string,
    metadata: string,
    tokenUriString: string = ""
  ) {
    const preparedCall = prepareContractCall({
      contract: this.contract,
      method: "function registerIP(string ipHash, string metadata, string tokenUriString)",
      params: [ipHash, metadata, tokenUriString],
    });

    const transaction = await sendTransaction({
      transaction: preparedCall,
      account: account,
    });

    const receipt = await waitForReceipt({
      client: this.client,
      chain: hederaTestnet,
      transactionHash: transaction.transactionHash,
    });

    return {
      transaction,
      receipt,
      transactionHash: transaction.transactionHash,
    };
  }

  /**
   * Mint license for IP asset
   */
  async mintLicense(
    account: any,
    ipTokenId: bigint,
    commercialUse: boolean,
    derivativeWorks: boolean,
    exclusive: boolean,
    revenueShare: bigint,
    duration: bigint,
    terms: string
  ) {
    const preparedCall = prepareContractCall({
      contract: this.contract,
      method: "function mintLicense(uint256 ipTokenId, bool commercialUse, bool derivativeWorks, bool exclusive, uint256 revenueShare, uint256 duration, string terms)",
      params: [ipTokenId, commercialUse, derivativeWorks, exclusive, revenueShare, duration, terms],
    });

    const transaction = await sendTransaction({
      transaction: preparedCall,
      account: account,
    });

    const receipt = await waitForReceipt({
      client: this.client,
      chain: hederaTestnet,
      transactionHash: transaction.transactionHash,
    });

    return {
      transaction,
      receipt,
      transactionHash: transaction.transactionHash,
    };
  }

  /**
   * Pay revenue to IP asset
   */
  async payRevenue(account: any, ipTokenId: bigint, description: string, paymentAmount: string) {
    const preparedCall = prepareContractCall({
      contract: this.contract,
      method: "function payIPAsset(uint256 assetId, string reason)",
      params: [ipTokenId, description],
      value: parseEther(paymentAmount), // Amount in weibars (18 decimals) for JSON-RPC compatibility
    });

    const transaction = await sendTransaction({
      transaction: preparedCall,
      account: account,
    });

    const receipt = await waitForReceipt({
      client: this.client,
      chain: hederaTestnet,
      transactionHash: transaction.transactionHash,
    });

    return {
      transaction,
      receipt,
      transactionHash: transaction.transactionHash,
    };
  }

  /**
   * Claim royalties for IP asset
   */
  async claimRoyalties(account: any, ipTokenId: bigint) {
    const preparedCall = prepareContractCall({
      contract: this.contract,
      method: "function claimRoyalties(uint256 ipTokenId)",
      params: [ipTokenId],
    });

    const transaction = await sendTransaction({
      transaction: preparedCall,
      account: account,
    });

    const receipt = await waitForReceipt({
      client: this.client,
      chain: hederaTestnet,
      transactionHash: transaction.transactionHash,
    });

    return {
      transaction,
      receipt,
      transactionHash: transaction.transactionHash,
    };
  }

  /**
   * Get IP asset details
   */
  async getIPAsset(tokenId: bigint) {
    return await readContract({
      contract: this.contract,
      method: "function getIPAsset(uint256 tokenId) view returns ((uint256 tokenId, address owner, string ipHash, string metadata, bool isActive, bool isDisputed, uint256 registrationDate, uint256 totalRevenue, uint256 royaltyTokens, address tokenBoundAccount))",
      params: [tokenId],
    });
  }

  /**
   * Get license details
   */
  async getLicense(licenseId: bigint) {
    return await readContract({
      contract: this.contract,
      method: "function getLicense(uint256 licenseId) view returns ((uint256 licenseId, uint256 ipTokenId, address licensee, bool commercialUse, bool derivativeWorks, bool exclusive, uint256 revenueShare, uint256 duration, uint256 issueDate, bool isActive, string terms))",
      params: [licenseId],
    });
  }

  /**
   * Get total number of IPs
   */
  async getTotalIPs() {
    return await readContract({
      contract: this.contract,
      method: "function totalIPs() view returns (uint256)",
      params: [],
    });
  }

  /**
   * Get total number of licenses
   */
  async getTotalLicenses() {
    return await readContract({
      contract: this.contract,
      method: "function totalLicenses() view returns (uint256)",
      params: [],
    });
  }

  /**
   * Get IPs owned by address
   */
  async getOwnerIPs(ownerAddress: string) {
    return await readContract({
      contract: this.contract,
      method: "function getUserAssets(address user) view returns (uint256[])",
      params: [ownerAddress],
    });
  }

  /**
   * Get licenses for IP token
   */
  async getIPLicenses(ipTokenId: bigint) {
    return await readContract({
      contract: this.contract,
      method: "function getIPLicenses(uint256 ipTokenId) view returns (uint256[])",
      params: [ipTokenId],
    });
  }

  /**
   * Get user's licenses
   */
  async getUserLicenses(userAddress: string) {
    return await readContract({
      contract: this.contract,
      method: "function getUserLicenses(address user) view returns (uint256[])",
      params: [userAddress],
    });
  }

  /**
   * Get next token ID (for backward compatibility)
   */
  async getNextTokenId() {
    try {
      return await this.getTotalIPs();
    } catch (error) {
      console.warn("Error getting total IPs, returning 0:", error);
      return 0n;
    }
  }

  /**
   * Get next license ID (for backward compatibility)
   */
  async getNextLicenseId() {
    try {
      return await this.getTotalLicenses();
    } catch (error) {
      console.warn("Error getting total licenses, returning 0:", error);
      return 0n;
    }
  }

  /**
   * Get IP assets owned by address
   */
  async getOwnedAssets(ownerAddress: string, maxTokens: number = 100) {
    try {
      const ownerIPs = await this.getOwnerIPs(ownerAddress);
      const assets = [];

      for (let i = 0; i < ownerIPs.length && i < maxTokens; i++) {
        try {
          const asset = await this.getIPAsset(ownerIPs[i]);
          if (asset) {
            assets.push({
              tokenId: asset.tokenId,
              owner: asset.owner,
              ipHash: asset.ipHash,
              metadata: asset.metadata,
              isActive: asset.isActive,
              isDisputed: asset.isDisputed,
              registrationDate: asset.registrationDate,
              totalRevenue: asset.totalRevenue,
              royaltyTokens: asset.royaltyTokens,
              tokenBoundAccount: asset.tokenBoundAccount,
              isEncrypted: false, // Default value since the contract doesn't track this
            });
          }
        } catch (error) {
          console.warn(`Error fetching IP asset ${ownerIPs[i]}:`, error);
        }
      }

      return assets;
    } catch (error) {
      console.error("Error fetching owned assets:", error);
      // Return empty array if the contract call fails
      return [];
    }
  }

  /**
   * Get license data by token ID
   */
  async getLicensesByToken(tokenId: bigint, maxLicenses: number = 50) {
    try {
      const ipLicenses = await this.getIPLicenses(tokenId);
      const licenses = [];

      for (let i = 0; i < ipLicenses.length && i < maxLicenses; i++) {
        try {
          const license = await this.getLicense(ipLicenses[i]);
          if (license) {
            licenses.push({
              licenseId: license.licenseId,
              tokenId: license.ipTokenId, // Map ipTokenId to tokenId for frontend compatibility
              licensee: license.licensee,
              royaltyPercentage: license.revenueShare, // Map revenueShare to royaltyPercentage
              duration: license.duration,
              startDate: license.issueDate, // Map issueDate to startDate
              isActive: license.isActive,
              commercialUse: license.commercialUse,
              terms: license.terms,
            });
          }
        } catch (error) {
          console.warn(`Error fetching license ${ipLicenses[i]}:`, error);
        }
      }

      return licenses;
    } catch (error) {
      console.error("Error fetching licenses by token:", error);
      // Return empty array if the contract call fails
      return [];
    }
  }
}

// Export a factory function to create the service
export function createContractService(client: ThirdwebClient): ContractService {
  return new ContractService(client);
}
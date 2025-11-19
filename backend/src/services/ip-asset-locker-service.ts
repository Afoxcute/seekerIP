const { ethers } = require("ethers");
const { getContract } = require("viem");
const { createPublicClient, createWalletClient, http, parseEther, formatEther } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { defineChain } = require("viem");

// Define Hedera Testnet chain with correct Chain ID
const hederaTestnet = defineChain({
  id: 296, // 0x128 in hex - Hedera Testnet Chain ID
  name: 'Hedera Testnet',
  network: 'hedera-testnet',
  nativeCurrency: {
    decimals: 8,
    name: 'HBAR',
    symbol: 'HBAR',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.hashio.io/api'],
    },
    public: {
      http: ['https://testnet.hashio.io/api'],
    },
  },
  blockExplorers: {
    default: { name: 'HashScan', url: 'https://hashscan.io/testnet' },
  },
});

// Contract ABIs (these would be generated from your contracts)
const IP_ASSET_LOCKER_ABI = [
  {
    "inputs": [
      {"internalType": "uint256", "name": "ipAssetId", "type": "uint256"},
      {"internalType": "uint256", "name": "hbarAmount", "type": "uint256"}
    ],
    "name": "lockIPAsset",
    "outputs": [{"internalType": "bool", "name": "success", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "ipAssetId", "type": "uint256"},
      {"internalType": "uint256", "name": "hbarAmount", "type": "uint256"}
    ],
    "name": "unlockIPAsset",
    "outputs": [{"internalType": "bool", "name": "success", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "ipAssetId", "type": "uint256"}],
    "name": "isIPAssetLocked",
    "outputs": [{"internalType": "bool", "name": "locked", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "ipAssetId", "type": "uint256"}],
    "name": "getLockedAmount",
    "outputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "ipAssetId", "type": "uint256"}],
    "name": "isIPAssetEligibleForLocking",
    "outputs": [{"internalType": "bool", "name": "eligible", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "ipAssetId", "type": "uint256"}],
    "name": "getIPAssetEligibilityDetails",
    "outputs": [
      {"internalType": "bool", "name": "eligible", "type": "bool"},
      {"internalType": "string", "name": "reason", "type": "string"},
      {"internalType": "bool", "name": "assetExists", "type": "bool"},
      {"internalType": "bool", "name": "isActive", "type": "bool"},
      {"internalType": "bool", "name": "arbitrationEligible", "type": "bool"},
      {"internalType": "bool", "name": "infringementDetected", "type": "bool"},
      {"internalType": "bool", "name": "alreadyLocked", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserLockedIPAssets",
    "outputs": [{"internalType": "uint256[]", "name": "ipAssetIds", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalMintedHBAR",
    "outputs": [{"internalType": "uint256", "name": "total", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalLockedAssets",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const HBAR_TOKEN_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "balance", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalMinted",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

export class IPAssetLockerService {
  private publicClient: any;
  private walletClient: any;
  private ipAssetLockerContract: any;
  private hbarTokenContract: any;

  constructor() {
    // Initialize Viem clients with correct Hedera Testnet Chain ID (296)
    this.publicClient = createPublicClient({
      chain: hederaTestnet,
      transport: http(process.env.HEDERA_RPC_URL || "https://testnet.hashio.io/api")
    });

    const account = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY as `0x${string}`);
    this.walletClient = createWalletClient({
      account,
      chain: hederaTestnet,
      transport: http(process.env.HEDERA_RPC_URL || "https://testnet.hashio.io/api")
    });

    // Initialize contracts with Hedera Testnet addresses
    // Using the latest deployed IP Asset Locker with fixed arbitration integration
    this.ipAssetLockerContract = getContract({
      address: "0xec0dBd92a8D1A222d34ecdB088B0022F38aF2883" as `0x${string}`,
      abi: IP_ASSET_LOCKER_ABI,
      client: this.publicClient
    });

    this.hbarTokenContract = getContract({
      address: "0x9f4FC76E91e483b02DA42A0a10592e603F670dc9" as `0x${string}`,
      abi: HBAR_TOKEN_ABI,
      client: this.publicClient
    });
  }

  /**
   * Locks an IP asset and mints HBAR equivalent tokens
   */
  async lockIPAsset(ipAssetId: number, hbarAmount: string, userAddress: string): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      const amount = parseEther(hbarAmount);
      
      const hash = await this.walletClient.writeContract({
        address: "0xec0dBd92a8D1A222d34ecdB088B0022F38aF2883" as `0x${string}`,
        abi: IP_ASSET_LOCKER_ABI,
        functionName: "lockIPAsset",
        args: [BigInt(ipAssetId), amount],
        account: this.walletClient.account,
        chain: hederaTestnet // Explicitly specify the chain
      });

      return { success: true, transactionHash: hash };
    } catch (error: any) {
      console.error("Error locking IP asset:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unlocks an IP asset and burns HBAR equivalent tokens
   */
  async unlockIPAsset(ipAssetId: number, hbarAmount: string, userAddress: string): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      const amount = parseEther(hbarAmount);
      
      const hash = await this.walletClient.writeContract({
        address: "0xec0dBd92a8D1A222d34ecdB088B0022F38aF2883" as `0x${string}`,
        abi: IP_ASSET_LOCKER_ABI,
        functionName: "unlockIPAsset",
        args: [BigInt(ipAssetId), amount],
        account: this.walletClient.account,
        chain: hederaTestnet // Explicitly specify the chain
      });

      return { success: true, transactionHash: hash };
    } catch (error: any) {
      console.error("Error unlocking IP asset:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Checks if an IP asset is locked
   */
  async isIPAssetLocked(ipAssetId: number): Promise<boolean> {
    try {
      const result = await this.ipAssetLockerContract.read.isIPAssetLocked([BigInt(ipAssetId)]);
      return result as boolean;
    } catch (error) {
      console.error("Error checking IP asset lock status:", error);
      return false;
    }
  }

  /**
   * Gets the locked amount for an IP asset
   */
  async getLockedAmount(ipAssetId: number): Promise<string> {
    try {
      const result = await this.ipAssetLockerContract.read.getLockedAmount([BigInt(ipAssetId)]);
      // Convert from wei (18 decimals) to HBAR - the contract stores in wei format
      return formatEther(result as bigint);
    } catch (error) {
      console.error("Error getting locked amount:", error);
      return "0";
    }
  }

  /**
   * Checks if an IP asset is eligible for locking
   */
  async isIPAssetEligibleForLocking(ipAssetId: number): Promise<boolean> {
    try {
      const result = await this.ipAssetLockerContract.read.isIPAssetEligibleForLocking([BigInt(ipAssetId)]);
      return result as boolean;
    } catch (error) {
      console.error("Error checking IP asset eligibility:", error);
      return false;
    }
  }

  /**
   * Gets detailed eligibility information for an IP asset
   */
  async getIPAssetEligibilityDetails(ipAssetId: number): Promise<{
    eligible: boolean;
    reason: string;
    assetExists: boolean;
    isActive: boolean;
    arbitrationEligible: boolean;
    infringementDetected: boolean;
    alreadyLocked: boolean;
  }> {
    try {
      const result = await this.ipAssetLockerContract.read.getIPAssetEligibilityDetails([BigInt(ipAssetId)]);
      const [eligible, reason, assetExists, isActive, arbitrationEligible, infringementDetected, alreadyLocked] = result as [boolean, string, boolean, boolean, boolean, boolean, boolean];
      
      return {
        eligible,
        reason,
        assetExists,
        isActive,
        arbitrationEligible,
        infringementDetected,
        alreadyLocked
      };
    } catch (error) {
      console.error("Error getting IP asset eligibility details:", error);
      return {
        eligible: false,
        reason: "Failed to check eligibility details",
        assetExists: false,
        isActive: false,
        arbitrationEligible: false,
        infringementDetected: false,
        alreadyLocked: false
      };
    }
  }

  /**
   * Gets all locked IP assets for a user
   */
  async getUserLockedIPAssets(userAddress: string): Promise<number[]> {
    try {
      const result = await this.ipAssetLockerContract.read.getUserLockedIPAssets([userAddress as `0x${string}`]);
      return (result as bigint[]).map(id => Number(id));
    } catch (error) {
      console.error("Error getting user locked assets:", error);
      return [];
    }
  }

  /**
   * Gets the total HBAR equivalent minted
   */
  async getTotalMintedHBAR(): Promise<string> {
    try {
      const result = await this.ipAssetLockerContract.read.getTotalMintedHBAR();
      return formatEther(result as bigint);
    } catch (error) {
      console.error("Error getting total minted HBAR:", error);
      return "0";
    }
  }

  /**
   * Gets the total number of locked IP assets
   */
  async getTotalLockedAssets(): Promise<number> {
    try {
      const result = await this.ipAssetLockerContract.read.totalLockedAssets();
      return Number(result as bigint);
    } catch (error) {
      console.error("Error getting total locked assets:", error);
      return 0;
    }
  }

  /**
   * Gets the HBAR token balance for a user
   */
  async getHBARTokenBalance(userAddress: string): Promise<string> {
    try {
      const result = await this.hbarTokenContract.read.balanceOf([userAddress as `0x${string}`]);
      return formatEther(result as bigint);
    } catch (error) {
      console.error("Error getting HBAR token balance:", error);
      return "0";
    }
  }

  /**
   * Gets the total HBAR tokens minted
   */
  async getTotalHBARTokensMinted(): Promise<string> {
    try {
      const result = await this.hbarTokenContract.read.totalMinted();
      return formatEther(result as bigint);
    } catch (error) {
      console.error("Error getting total HBAR tokens minted:", error);
      return "0";
    }
  }

  /**
   * Gets comprehensive stats for the IP asset locker system
   */
  async getStats(): Promise<{
    totalMintedHBAR: string;
    totalHBARTokensMinted: string;
    totalLockedAssets: number;
  }> {
    try {
      const [totalMintedHBAR, totalHBARTokensMinted, totalLockedAssets] = await Promise.all([
        this.getTotalMintedHBAR(),
        this.getTotalHBARTokensMinted(),
        this.getTotalLockedAssets()
      ]);

      return {
        totalMintedHBAR,
        totalHBARTokensMinted,
        totalLockedAssets
      };
    } catch (error) {
      console.error("Error getting stats:", error);
      return {
        totalMintedHBAR: "0",
        totalHBARTokensMinted: "0",
        totalLockedAssets: 0
      };
    }
  }
}

// Export singleton instance
const ipAssetLockerService = new IPAssetLockerService();
module.exports = { ipAssetLockerService };

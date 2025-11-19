import { ThirdwebClient, getContract, prepareContractCall, readContract, sendTransaction, waitForReceipt } from "thirdweb";
import { defineChain } from "thirdweb";
import { hederaTestnet } from "viem/chains";
import IPAssetHTSKYCABI from "../abi/IPAssetHTSKYC.json";
import IPAssetManagerV2ABI from "../abi/IPAssetManagerV2.json";
import IPAssetComplianceManagerABI from "../abi/IPAssetComplianceManager.json";

// Use the correct ABIs
const IP_ASSET_HTS_KYC_ABI = IPAssetHTSKYCABI.abi as any;
const IP_ASSET_MANAGER_V2_ABI = IPAssetManagerV2ABI.abi as any;
const IP_ASSET_COMPLIANCE_MANAGER_ABI = IPAssetComplianceManagerABI.abi as any;

// Contract addresses from deployment
const CONTRACT_ADDRESSES = {
  IP_ASSET_HTS_KYC: "0x7C0EA017bA3FB05B2428b804E049Bf5BA166b6E3" as `0x${string}`,
  IP_ASSET_MANAGER_V2: "0x5f3801efa089F9ee664c2Ade045735646A2eAA64" as `0x${string}`,
  IP_ASSET_COMPLIANCE_MANAGER: "0x60A1d2CEf7fcdcf97d897ffd7c7908539978880c" as `0x${string}`,
  HTS_TOKEN: "0x0000000000000000000000000000000000000000" as `0x${string}`,
};

/**
 * KYC Service for managing HTS KYC operations
 */
export class KYCService {
  private client: ThirdwebClient;
  private htsKycContract: any;
  public ipAssetManagerContract: any;
  private complianceManagerContract: any;

  constructor(client: ThirdwebClient) {
    this.client = client;
    
    // Initialize HTS KYC contract
    this.htsKycContract = getContract({
      address: CONTRACT_ADDRESSES.IP_ASSET_HTS_KYC,
      chain: defineChain(hederaTestnet.id),
      client: this.client,
      abi: IP_ASSET_HTS_KYC_ABI,
    });

    // Initialize IP Asset Manager contract
    this.ipAssetManagerContract = getContract({
      address: CONTRACT_ADDRESSES.IP_ASSET_MANAGER_V2,
      chain: defineChain(hederaTestnet.id),
      client: this.client,
      abi: IP_ASSET_MANAGER_V2_ABI,
    });

    // Initialize Compliance Manager contract
    this.complianceManagerContract = getContract({
      address: CONTRACT_ADDRESSES.IP_ASSET_COMPLIANCE_MANAGER,
      chain: defineChain(hederaTestnet.id),
      client: this.client,
      abi: IP_ASSET_COMPLIANCE_MANAGER_ABI,
    });
  }

  /**
   * Associate an account with the HTS token
   * This is required before KYC can be granted
   */
  async associateAccount(account: any) {
    try {
      const tokenAddress = await this.getIPAssetNFTTokenAddress();
      if (!tokenAddress) {
        throw new Error("Could not get HTS token address");
      }

      console.log(`Attempting to associate account ${account.address} with HTS token ${tokenAddress}`);

      // Create a contract instance for the HTS token
      const tokenContract = getContract({
        address: tokenAddress as `0x${string}`,
        chain: defineChain(hederaTestnet.id),
        client: this.client,
        abi: [
          {
            "inputs": [],
            "name": "associate",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ],
      });

      const preparedCall = prepareContractCall({
        contract: tokenContract,
        method: "associate",
        params: [],
      });

      const transaction = await sendTransaction({
        transaction: preparedCall,
        account: account,
      });

      const receipt = await waitForReceipt({
        client: this.client,
        chain: defineChain(hederaTestnet.id),
        transactionHash: transaction.transactionHash,
      });

      console.log('Account association successful:', receipt.transactionHash);
      return {
        success: true,
        transaction,
        receipt,
        transactionHash: transaction.transactionHash,
      };
    } catch (error) {
      console.error("Error associating account:", error);
      
      // Check if the error is because the account is already associated
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        if (error.message.includes("already associated") || 
            error.message.includes("TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT")) {
          errorMessage = "Account is already associated with the HTS token";
          return {
            success: true, // This is actually a success case
            error: errorMessage,
          };
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if an account is associated with the HTS token
   * This is a placeholder implementation - in production, you'd query the HTS token directly
   */
  async isAccountAssociated(accountAddress?: string) {
    try {
      // This is a placeholder - in a real implementation, you'd check the HTS token association
      // For now, we'll assume accounts are associated if they can interact with the contract
      console.log(`Checking association for account: ${accountAddress || 'current account'}`);
      return true; // Placeholder - always return true for now
    } catch (error) {
      console.error("Error checking account association:", error);
      return false;
    }
  }

  /**
   * Debug KYC grant process - provides detailed information for troubleshooting
   */
  async debugKYCGrant(account: any, targetAccount: string) {
    try {
      console.log('=== KYC GRANT DEBUG ===');
      console.log('Calling Account:', account.address);
      console.log('Target Account:', targetAccount);
      
      // Get HTS token info
      const tokenInfo = await this.getHTSTokenInfo();
      console.log('HTS Token Info:', tokenInfo);
      
      // Check calling account association
      const callingAccountAssociated = await this.isAccountAssociated(account.address);
      console.log('Calling Account Associated:', callingAccountAssociated);
      
      // Check target account association (placeholder)
      const targetAccountAssociated = await this.isAccountAssociated(targetAccount);
      console.log('Target Account Associated:', targetAccountAssociated);
      
      // Check ownership
      const isOwner = await this.isOwner(account);
      console.log('Is Owner:', isOwner);
      
      return {
        callingAccount: account.address,
        targetAccount,
        tokenInfo,
        callingAccountAssociated,
        targetAccountAssociated,
        isOwner
      };
    } catch (error) {
      console.error('Debug KYC grant error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if an entity can hold IP assets based on compliance
   */
  async canEntityHoldIPAssets(entityAddress: string): Promise<boolean> {
    try {
      const result = await readContract({
        contract: this.complianceManagerContract,
        method: "function canEntityHoldIPAssets(address entity) view returns (bool)",
        params: [entityAddress],
      });
      return result as boolean;
    } catch (error) {
      console.error("Error checking entity hold permission:", error);
      return false;
    }
  }

  /**
   * Check if an entity can trade IP assets based on compliance
   */
  async canEntityTradeIPAssets(entityAddress: string): Promise<boolean> {
    try {
      const result = await readContract({
        contract: this.complianceManagerContract,
        method: "function canEntityTradeIPAssets(address entity) view returns (bool)",
        params: [entityAddress],
      });
      return result as boolean;
    } catch (error) {
      console.error("Error checking entity trade permission:", error);
      return false;
    }
  }

  /**
   * Check if an entity can transfer IP assets based on compliance
   */
  async canEntityTransferIPAssets(entityAddress: string): Promise<boolean> {
    try {
      const result = await readContract({
        contract: this.complianceManagerContract,
        method: "function canEntityTransferIPAssets(address entity) view returns (bool)",
        params: [entityAddress],
      });
      return result as boolean;
    } catch (error) {
      console.error("Error checking entity transfer permission:", error);
      return false;
    }
  }

  /**
   * Get compliance profile for an entity
   */
  async getComplianceProfile(entityAddress: string) {
    try {
      // Use individual permission checks instead of complex tuple
      const [canHold, canTrade, canTransfer] = await Promise.all([
        this.canEntityHoldIPAssets(entityAddress),
        this.canEntityTradeIPAssets(entityAddress),
        this.canEntityTransferIPAssets(entityAddress)
      ]);

      // Return a simplified profile based on permissions
      return {
        isVerified: canHold || canTrade || canTransfer, // If any permission is true, entity is verified
        canHoldIPAssets: canHold,
        canTradeIPAssets: canTrade,
        canTransferIPAssets: canTransfer,
        level: 1, // Default level - would need additional contract calls to get actual level
        entityType: 0, // Default type - would need additional contract calls to get actual type
        jurisdiction: '', // Would need additional contract calls to get actual jurisdiction
        registrationNumber: '', // Would need additional contract calls to get actual registration
        expiryDate: 0, // Would need additional contract calls to get actual expiry
        complianceNotes: '' // Would need additional contract calls to get actual notes
      };
    } catch (error) {
      console.error("Error getting compliance profile:", error);
      return null;
    }
  }

  /**
   * Enhanced KYC grant with compliance validation
   * Only grants KYC to entities that meet compliance requirements
   */
  async grantKYCWithCompliance(account: any, targetAccount: string, complianceLevel?: number) {
    try {
      console.log(`Attempting to grant KYC with compliance validation to ${targetAccount}`);
      
      // First check if the entity can hold IP assets
      const canHold = await this.canEntityHoldIPAssets(targetAccount);
      if (!canHold) {
        return {
          success: false,
          error: `Entity ${targetAccount} does not meet compliance requirements to hold IP assets. Please verify compliance first.`,
        };
      }

      // Check compliance profile
      const complianceProfile = await this.getComplianceProfile(targetAccount);
      if (!complianceProfile || !(complianceProfile as any).isVerified) {
        return {
          success: false,
          error: `Entity ${targetAccount} is not compliance verified. Please complete compliance verification first.`,
        };
      }

      // Check if compliance has expired
      if ((complianceProfile as any).expiryDate > 0 && (complianceProfile as any).expiryDate < Math.floor(Date.now() / 1000)) {
        return {
          success: false,
          error: `Entity ${targetAccount} compliance has expired. Please renew compliance verification.`,
        };
      }

      // If compliance level is specified, check if it meets requirements
      if (complianceLevel !== undefined && (complianceProfile as any).level < complianceLevel) {
        return {
          success: false,
          error: `Entity ${targetAccount} compliance level (${(complianceProfile as any).level}) is insufficient. Required level: ${complianceLevel}`,
        };
      }

      // Proceed with KYC grant
      return await this.grantKYC(account, targetAccount);
    } catch (error) {
      console.error("Error granting KYC with compliance:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Revoke KYC and update compliance status
   * Used when entities breach agreements or licenses
   */
  async revokeKYCWithCompliance(account: any, targetAccount: string, reason?: string) {
    try {
      console.log(`Attempting to revoke KYC with compliance update for ${targetAccount}`);
      
      // First revoke KYC
      const revokeResult = await this.revokeKYC(account, targetAccount);
      
      if (revokeResult.success && reason) {
        // Report compliance violation if reason is provided
        try {
          await this.reportComplianceViolation(account, targetAccount, reason);
        } catch (violationError) {
          console.warn("Failed to report compliance violation:", violationError);
          // Don't fail the entire operation if violation reporting fails
        }
      }

      return revokeResult;
    } catch (error) {
      console.error("Error revoking KYC with compliance:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Report compliance violation
   */
  async reportComplianceViolation(account: any, entityAddress: string, violation: string) {
    try {
      const preparedCall = prepareContractCall({
        contract: this.complianceManagerContract,
        method: "function reportViolation(address entity, string memory violation)",
        params: [entityAddress, violation],
      });

      const transaction = await sendTransaction({
        transaction: preparedCall,
        account: account,
      });

      const receipt = await waitForReceipt({
        client: this.client,
        chain: defineChain(hederaTestnet.id),
        transactionHash: transaction.transactionHash,
      });

      return {
        success: true,
        transaction,
        receipt,
        transactionHash: transaction.transactionHash,
      };
    } catch (error) {
      console.error("Error reporting compliance violation:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Grant KYC to an account for IP Asset NFTs
   * Includes automatic account association check and handling
   */
  async grantKYC(account: any, targetAccount: string) {
    try {
      console.log(`Attempting to grant KYC to ${targetAccount}`);
      console.log(`Calling account: ${account.address}`);
      
      // First, ensure the calling account is associated
      console.log('Ensuring calling account is associated...');
      try {
        const associateResult = await this.associateAccount(account);
        if (associateResult.success) {
          console.log('Calling account association successful');
        } else {
          console.warn('Calling account association failed or already associated:', associateResult.error);
        }
      } catch (associateError) {
        console.warn('Calling account association check failed:', associateError);
        // Continue anyway - the account might already be associated
      }

      // Note: The target account will need to associate themselves with the token
      // We can't associate another account - each account must associate itself
      console.log(`Note: Target account ${targetAccount} must associate themselves with the HTS token before KYC can be granted`);

      console.log('Attempting KYC grant through IPAssetManagerV2...');
      const preparedCall = prepareContractCall({
        contract: this.ipAssetManagerContract,
        method: "function grantKYCForIPAssets(address account)",
        params: [targetAccount],
      });

      const transaction = await sendTransaction({
        transaction: preparedCall,
        account: account,
      });

      const receipt = await waitForReceipt({
        client: this.client,
        chain: defineChain(hederaTestnet.id),
        transactionHash: transaction.transactionHash,
      });

      console.log('KYC grant successful:', receipt.transactionHash);
      return {
        success: true,
        transaction,
        receipt,
        transactionHash: transaction.transactionHash,
      };
    } catch (error) {
      console.error("Error granting KYC:", error);
      
      // Provide more specific error messages
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        if (error.message.includes("HTS: grant KYC failed")) {
          errorMessage = `KYC grant failed. The target account ${targetAccount} must first associate themselves with the HTS token. Please ask them to use the "Associate Account" button in the KYC Management section.`;
        } else if (error.message.includes("Account not associated")) {
          errorMessage = "Account not associated with HTS token. Please associate the account first.";
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Revoke KYC from an account for IP Asset NFTs
   */
  async revokeKYC(account: any, targetAccount: string) {
    try {
      const preparedCall = prepareContractCall({
        contract: this.ipAssetManagerContract,
        method: "function revokeKYCForIPAssets(address account)",
        params: [targetAccount],
      });

      const transaction = await sendTransaction({
        transaction: preparedCall,
        account: account,
      });

      const receipt = await waitForReceipt({
        client: this.client,
        chain: defineChain(hederaTestnet.id),
        transactionHash: transaction.transactionHash,
      });

      return {
        success: true,
        transaction,
        receipt,
        transactionHash: transaction.transactionHash,
      };
    } catch (error) {
      console.error("Error revoking KYC:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Update the KYC key for IP Asset NFTs
   */
  async updateKYCKey(account: any, newKYCKey: string) {
    try {
      // Convert hex string to bytes
      const keyBytes = newKYCKey.startsWith('0x') ? newKYCKey.slice(2) : newKYCKey;
      const keyBytesArray = `0x${keyBytes}` as `0x${string}`;

      const preparedCall = prepareContractCall({
        contract: this.ipAssetManagerContract,
        method: "function updateKYCKeyForIPAssets(bytes newKYCKey)",
        params: [keyBytesArray],
      });

      const transaction = await sendTransaction({
        transaction: preparedCall,
        account: account,
      });

      const receipt = await waitForReceipt({
        client: this.client,
        chain: defineChain(hederaTestnet.id),
        transactionHash: transaction.transactionHash,
      });

      return {
        success: true,
        transaction,
        receipt,
        transactionHash: transaction.transactionHash,
      };
    } catch (error) {
      console.error("Error updating KYC key:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get the underlying HTS token address for IP Asset NFTs
   */
  async getIPAssetNFTTokenAddress() {
    try {
      return await readContract({
        contract: this.htsKycContract,
        method: "function tokenAddress() view returns (address)",
        params: [],
      });
    } catch (error) {
      console.error("Error getting HTS token address:", error);
      return null;
    }
  }

  /**
   * Check if an account has KYC for IP Asset NFTs
   * Note: This is a placeholder implementation
   */
  async hasKYCForIPAssets(account: string) {
    try {
      return await readContract({
        contract: this.ipAssetManagerContract,
        method: "function hasKYCForIPAssets(address) view returns (bool)",
        params: [account],
      });
    } catch (error) {
      console.error("Error checking KYC status:", error);
      return false;
    }
  }

  /**
   * Get HTS token information
   */
  async getHTSTokenInfo() {
    try {
      const tokenAddress = await this.getIPAssetNFTTokenAddress();
      return {
        tokenAddress,
        contractAddress: CONTRACT_ADDRESSES.IP_ASSET_HTS_KYC,
        managerAddress: CONTRACT_ADDRESSES.IP_ASSET_MANAGER_V2,
      };
    } catch (error) {
      console.error("Error getting HTS token info:", error);
      return null;
    }
  }

  /**
   * Get contract addresses
   */
  getContractAddresses() {
    return CONTRACT_ADDRESSES;
  }

  /**
   * Check if the current account is the owner of the IP Asset Manager
   * Note: The IPAssetHTSKYC contract ownership was transferred to IPAssetManagerV2
   */
  async isOwner(account: any) {
    try {
      // Check if the account is the owner of IPAssetManagerV2 (which owns IPAssetHTSKYC)
      const owner = await readContract({
        contract: this.ipAssetManagerContract,
        method: "function owner() view returns (address)",
        params: [],
      });
      return owner.toLowerCase() === account.address.toLowerCase();
    } catch (error) {
      console.error("Error checking ownership:", error);
      return false;
    }
  }
}

// Export a factory function to create the service
export function createKYCService(client: ThirdwebClient): KYCService {
  return new KYCService(client);
}

// Export contract addresses for use in other components
export { CONTRACT_ADDRESSES };

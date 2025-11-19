import { ThirdwebClient, getContract, readContract } from "thirdweb";
import { defineChain } from "thirdweb";
import { hederaTestnet } from "viem/chains";
// Remove unused import
// import IPAssetManagerV2ABI from "../abi/IPAssetManagerV2.json";
import IPAssetComplianceManagerABI from "../abi/IPAssetComplianceManager.json";

// Use the correct ABIs
// Remove unused import
// const IP_ASSET_MANAGER_V2_ABI = IPAssetManagerV2ABI.abi as any;
const IP_ASSET_COMPLIANCE_MANAGER_ABI = IPAssetComplianceManagerABI.abi as any;

// Contract addresses from deployment
const CONTRACT_ADDRESSES = {
  IP_ASSET_MANAGER_V2: "0x5f3801efa089F9ee664c2Ade045735646A2eAA64" as `0x${string}`,
  IP_ASSET_COMPLIANCE_MANAGER: "0x60A1d2CEf7fcdcf97d897ffd7c7908539978880c" as `0x${string}`,
};

/**
 * Access Control Service for IP Assets
 * Provides comprehensive access control and unauthorized distribution prevention
 */
export class IPAssetAccessControlService {
  private client: ThirdwebClient;
  // Remove unused contract
  // private ipAssetManagerContract: any;
  private complianceManagerContract: any;

  constructor(client: ThirdwebClient) {
    this.client = client;
    
    // Remove unused IP Asset Manager contract initialization
    // this.ipAssetManagerContract = getContract({
    //   address: CONTRACT_ADDRESSES.IP_ASSET_MANAGER_V2,
    //   chain: defineChain(hederaTestnet.id),
    //   client: this.client,
    //   abi: IP_ASSET_MANAGER_V2_ABI,
    // });

    // Initialize Compliance Manager contract
    this.complianceManagerContract = getContract({
      address: CONTRACT_ADDRESSES.IP_ASSET_COMPLIANCE_MANAGER,
      chain: defineChain(hederaTestnet.id),
      client: this.client,
      abi: IP_ASSET_COMPLIANCE_MANAGER_ABI,
    });
  }

  /**
   * Check if an entity can register IP assets
   */
  async canRegisterIPAssets(entityAddress: string): Promise<boolean> {
    try {
      const result = await readContract({
        contract: this.complianceManagerContract,
        method: "function canEntityHoldIPAssets(address entity) view returns (bool)",
        params: [entityAddress],
      });
      return result as boolean;
    } catch (error) {
      console.error("Error checking registration permission:", error);
      return false;
    }
  }

  /**
   * Check if an entity can transfer IP assets
   */
  async canTransferIPAssets(entityAddress: string): Promise<boolean> {
    try {
      const result = await readContract({
        contract: this.complianceManagerContract,
        method: "function canEntityTransferIPAssets(address entity) view returns (bool)",
        params: [entityAddress],
      });
      return result as boolean;
    } catch (error) {
      console.error("Error checking transfer permission:", error);
      return false;
    }
  }

  /**
   * Check if an entity can trade IP assets (license)
   */
  async canTradeIPAssets(entityAddress: string): Promise<boolean> {
    try {
      const result = await readContract({
        contract: this.complianceManagerContract,
        method: "function canEntityTradeIPAssets(address entity) view returns (bool)",
        params: [entityAddress],
      });
      return result as boolean;
    } catch (error) {
      console.error("Error checking trade permission:", error);
      return false;
    }
  }

  /**
   * Get comprehensive access control status for an entity
   */
  async getAccessControlStatus(entityAddress: string) {
    try {
      const [canRegister, canTransfer, canTrade, complianceProfile] = await Promise.all([
        this.canRegisterIPAssets(entityAddress),
        this.canTransferIPAssets(entityAddress),
        this.canTradeIPAssets(entityAddress),
        this.getComplianceProfile()
      ]);

      return {
        canRegister,
        canTransfer,
        canTrade,
        complianceProfile,
        isFullyCompliant: canRegister && canTransfer && canTrade,
        hasComplianceProfile: complianceProfile && (complianceProfile as any)?.isVerified
      };
    } catch (error) {
      console.error("Error getting access control status:", error);
      return {
        canRegister: false,
        canTransfer: false,
        canTrade: false,
        complianceProfile: null,
        isFullyCompliant: false,
        hasComplianceProfile: false
      };
    }
  }

  /**
   * Get compliance profile for an entity
   */
  async getComplianceProfile(/* entityAddress: string */) {
    try {
      // TODO: Fix readContract method signature issue
      // const result = await readContract({
      //   contract: this.complianceManagerContract,
      //   method: "getComplianceProfile",
      //   params: [entityAddress],
      // });
      // return result;
      return null; // Temporary placeholder
    } catch (error) {
      console.error("Error getting compliance profile:", error);
      return null;
    }
  }

  /**
   * Validate entity before IP asset operation
   * Prevents unauthorized distribution by checking compliance
   */
  async validateEntityForOperation(
    entityAddress: string, 
    operation: 'register' | 'transfer' | 'trade'
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const accessStatus = await this.getAccessControlStatus(entityAddress);
      
      if (!accessStatus.hasComplianceProfile) {
        return {
          valid: false,
          reason: `Entity ${entityAddress} is not compliance verified. Complete compliance verification first.`
        };
      }

      if (!accessStatus.complianceProfile || !(accessStatus.complianceProfile as any)?.isVerified) {
        return {
          valid: false,
          reason: `Entity ${entityAddress} compliance verification is not active.`
        };
      }

      // Check if compliance has expired
      if (accessStatus.complianceProfile && (accessStatus.complianceProfile as any)?.expiryDate > 0 &&
          (accessStatus.complianceProfile as any)?.expiryDate < Math.floor(Date.now() / 1000)) {
        return {
          valid: false,
          reason: `Entity ${entityAddress} compliance has expired. Renew compliance verification.`
        };
      }

      // Check specific operation permissions
      switch (operation) {
        case 'register':
          if (!accessStatus.canRegister) {
            return {
              valid: false,
              reason: `Entity ${entityAddress} is not authorized to register IP assets.`
            };
          }
          break;
        case 'transfer':
          if (!accessStatus.canTransfer) {
            return {
              valid: false,
              reason: `Entity ${entityAddress} is not authorized to transfer IP assets.`
            };
          }
          break;
        case 'trade':
          if (!accessStatus.canTrade) {
            return {
              valid: false,
              reason: `Entity ${entityAddress} is not authorized to trade IP assets.`
            };
          }
          break;
      }

      return { valid: true };
    } catch (error) {
      console.error("Error validating entity for operation:", error);
      return {
        valid: false,
        reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if an IP asset can be transferred to a specific recipient
   * Prevents unauthorized distribution by validating recipient compliance
   */
  async canTransferToRecipient(
    /* assetId: number, */ // Unused parameter
    recipientAddress: string
  ): Promise<{ canTransfer: boolean; reason?: string }> {
    try {
      // Check if recipient can hold IP assets
      const canHold = await this.canRegisterIPAssets(recipientAddress);
      if (!canHold) {
        return {
          canTransfer: false,
          reason: `Recipient ${recipientAddress} is not authorized to hold IP assets. Complete compliance verification first.`
        };
      }

      // Get recipient compliance profile
      const complianceProfile = await this.getComplianceProfile();
      if (!complianceProfile || !(complianceProfile as any)?.isVerified) {
        return {
          canTransfer: false,
          reason: `Recipient ${recipientAddress} is not compliance verified.`
        };
      }

      // Check if compliance has expired
      if (complianceProfile && (complianceProfile as any)?.expiryDate > 0 &&
          (complianceProfile as any)?.expiryDate < Math.floor(Date.now() / 1000)) {
        return {
          canTransfer: false,
          reason: `Recipient ${recipientAddress} compliance has expired. Renew compliance verification.`
        };
      }

      return { canTransfer: true };
    } catch (error) {
      console.error("Error checking transfer to recipient:", error);
      return {
        canTransfer: false,
        reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if an entity can license an IP asset
   * Prevents unauthorized licensing by validating licensee compliance
   */
  async canLicenseAsset(
    /* assetId: number, */ // Unused parameter
    licenseeAddress: string
  ): Promise<{ canLicense: boolean; reason?: string }> {
    try {
      // Check if licensee can trade IP assets
      const canTrade = await this.canTradeIPAssets(licenseeAddress);
      if (!canTrade) {
        return {
          canLicense: false,
          reason: `Licensee ${licenseeAddress} is not authorized to trade IP assets. Complete compliance verification first.`
        };
      }

      // Get licensee compliance profile
      const complianceProfile = await this.getComplianceProfile();
      if (!complianceProfile || !(complianceProfile as any)?.isVerified) {
        return {
          canLicense: false,
          reason: `Licensee ${licenseeAddress} is not compliance verified.`
        };
      }

      // Check if compliance has expired
      if (complianceProfile && (complianceProfile as any)?.expiryDate > 0 &&
          (complianceProfile as any)?.expiryDate < Math.floor(Date.now() / 1000)) {
        return {
          canLicense: false,
          reason: `Licensee ${licenseeAddress} compliance has expired. Renew compliance verification.`
        };
      }

      return { canLicense: true };
    } catch (error) {
      console.error("Error checking license permission:", error);
      return {
        canLicense: false,
        reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get access control summary for display
   */
  async getAccessControlSummary(entityAddress: string) {
    try {
      const accessStatus = await this.getAccessControlStatus(entityAddress);
      
      return {
        entity: entityAddress,
        permissions: {
          canRegister: accessStatus.canRegister,
          canTransfer: accessStatus.canTransfer,
          canTrade: accessStatus.canTrade
        },
        compliance: {
          isVerified: accessStatus.hasComplianceProfile,
          level: (accessStatus.complianceProfile as any)?.level || 0,
          entityType: (accessStatus.complianceProfile as any)?.entityType || 0,
          jurisdiction: (accessStatus.complianceProfile as any)?.jurisdiction || '',
          expiryDate: (accessStatus.complianceProfile as any)?.expiryDate || 0,
          isExpired: (accessStatus.complianceProfile as any)?.expiryDate > 0 && 
                    (accessStatus.complianceProfile as any)?.expiryDate < Math.floor(Date.now() / 1000)
        },
        status: accessStatus.isFullyCompliant ? 'FULLY_COMPLIANT' : 
                accessStatus.hasComplianceProfile ? 'PARTIALLY_COMPLIANT' : 'NOT_COMPLIANT'
      };
    } catch (error) {
      console.error("Error getting access control summary:", error);
      return {
        entity: entityAddress,
        permissions: {
          canRegister: false,
          canTransfer: false,
          canTrade: false
        },
        compliance: {
          isVerified: false,
          level: 0,
          entityType: 0,
          jurisdiction: '',
          expiryDate: 0,
          isExpired: false
        },
        status: 'ERROR'
      };
    }
  }
}

/**
 * Create an instance of the IP Asset Access Control Service
 */
export function createIPAssetAccessControlService(client: ThirdwebClient): IPAssetAccessControlService {
  return new IPAssetAccessControlService(client);
}

export { CONTRACT_ADDRESSES };

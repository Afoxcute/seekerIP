import { ThirdwebClient, getContract, prepareContractCall, readContract, sendTransaction, waitForReceipt } from "thirdweb";
import { defineChain } from "thirdweb";
import { hederaTestnet } from "viem/chains";
import EnhancedLicensingManagerABI from "../abi/EnhancedLicensingManager.json";
// Remove unused import
// import IPAssetComplianceManagerABI from "../abi/IPAssetComplianceManager.json";

// Use the correct ABIs
const ENHANCED_LICENSING_MANAGER_ABI = EnhancedLicensingManagerABI.abi as any;
// Remove unused ABI import
// const IP_ASSET_COMPLIANCE_MANAGER_ABI = IPAssetComplianceManagerABI.abi as any;

// Contract addresses (will be updated after deployment)
const CONTRACT_ADDRESSES = {
  ENHANCED_LICENSING_MANAGER: "0x84441AC3855C5a301044C1825375D5813adffA96" as `0x${string}`,
  IP_ASSET_COMPLIANCE_MANAGER: "0x60A1d2CEf7fcdcf97d897ffd7c7908539978880c" as `0x${string}`,
};

// Enums matching the smart contract
export enum LicenseType {
  EXCLUSIVE = 0,
  NON_EXCLUSIVE = 1,
  SOLE = 2
}

export enum GeographicRestriction {
  NONE = 0,
  COUNTRY = 1,
  REGION = 2,
  GLOBAL = 3
}

// Types
export interface EnhancedLicenseTerms {
  licenseId: string;
  assetId: string;
  terms: string;
  price: string;
  duration: string;
  maxLicenses: string;
  issuedLicenses: string;
  isActive: boolean;
  revenueShare: string;
  licenseType: LicenseType;
  geographicRestriction: GeographicRestriction;
  requiredComplianceLevel: number;
  requiresKYC: boolean;
}

export interface LicenseHolder {
  holder: string;
  assetId: string;
  licenseId: string;
  issuedAt: string;
  expiresAt: string;
  isValid: boolean;
  revenueShare: string;
  jurisdiction: string;
  complianceLevel: number;
  hasKYC: boolean;
}

export interface CreateLicenseTermsRequest {
  assetId: string;
  terms: string;
  price: string;
  duration: string;
  maxLicenses: string;
  encryptedTerms: string;
  revenueShare: string;
  licenseType: LicenseType;
  geographicRestriction: GeographicRestriction;
  allowedJurisdictions: string[];
  restrictedJurisdictions: string[];
  requiredComplianceLevel: number;
  requiresKYC: boolean;
}

export interface GrantLicenseRequest {
  assetId: string;
  licenseId: string;
  licensee: string;
  jurisdiction: string;
}

/**
 * Enhanced Licensing Management Service
 * Provides comprehensive licensing management with geographic restrictions and exclusive/non-exclusive licensing
 */
export class EnhancedLicensingService {
  private client: ThirdwebClient;
  private enhancedLicensingContract: any;
  // Remove unused contract
  // private complianceManagerContract: any;

  constructor(client: ThirdwebClient) {
    this.client = client;
    
    // Initialize Enhanced Licensing Manager contract
    this.enhancedLicensingContract = getContract({
      address: CONTRACT_ADDRESSES.ENHANCED_LICENSING_MANAGER,
      chain: defineChain(hederaTestnet.id),
      client: this.client,
      abi: ENHANCED_LICENSING_MANAGER_ABI,
    });

    // Remove unused Compliance Manager contract initialization
    // this.complianceManagerContract = getContract({
    //   address: CONTRACT_ADDRESSES.IP_ASSET_COMPLIANCE_MANAGER,
    //   chain: defineChain(hederaTestnet.id),
    //   client: this.client,
    //   abi: IP_ASSET_COMPLIANCE_MANAGER_ABI,
    // });
  }

  /**
   * Create enhanced license terms with geographic and exclusivity controls
   */
  async createEnhancedLicenseTerms(
    account: any,
    request: CreateLicenseTermsRequest
  ) {
    try {
      const preparedCall = prepareContractCall({
        contract: this.enhancedLicensingContract,
        method: "function createEnhancedLicenseTerms(uint256 assetId, string terms, uint256 price, uint256 duration, uint256 maxLicenses, bytes32 encryptedTerms, uint256 revenueShare, uint8 licenseType, uint8 geographicRestriction, string[] allowedJurisdictions, string[] restrictedJurisdictions, uint256 requiredComplianceLevel, bool requiresKYC)",
        params: [
          BigInt(request.assetId),
          request.terms,
          BigInt(request.price),
          BigInt(request.duration),
          BigInt(request.maxLicenses),
          request.encryptedTerms as `0x${string}`, // Convert to bytes32
          BigInt(request.revenueShare), // Convert to uint256
          request.licenseType,
          request.geographicRestriction,
          request.allowedJurisdictions,
          request.restrictedJurisdictions,
          BigInt(request.requiredComplianceLevel), // Convert to uint256
          request.requiresKYC
        ],
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
      console.error("Error creating enhanced license terms:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Grant a license with comprehensive validation
   */
  async grantLicense(
    account: any,
    request: GrantLicenseRequest
  ) {
    try {
      const preparedCall = prepareContractCall({
        contract: this.enhancedLicensingContract,
        method: "function grantLicense(uint256 assetId, uint256 licenseId, address licensee, string jurisdiction)",
        params: [
          BigInt(request.assetId),
          BigInt(request.licenseId),
          request.licensee,
          request.jurisdiction
        ],
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
      console.error("Error granting license:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Revoke a license
   */
  async revokeLicense(
    account: any,
    licenseTokenId: string,
    reason: string
  ) {
    try {
      const preparedCall = prepareContractCall({
        contract: this.enhancedLicensingContract,
        method: "function revokeLicense(uint256 licenseTokenId, string reason)",
        params: [BigInt(licenseTokenId), reason],
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
      console.error("Error revoking license:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get license terms
   */
  async getLicenseTerms(licenseId: string): Promise<EnhancedLicenseTerms | null> {
    try {
      const result = await readContract({
        contract: this.enhancedLicensingContract,
        method: "function getLicenseTerms(uint256 licenseId) view returns (uint256 assetId, string memory terms, uint256 price, uint256 duration, uint256 maxLicenses, uint256 issuedLicenses, bool isActive, uint256 revenueShare, uint8 licenseType, uint8 geographicRestriction, uint256 requiredComplianceLevel, bool requiresKYC)",
        params: [BigInt(licenseId)],
      });

      return {
        licenseId,
        assetId: (result as any)[0].toString(),
        terms: (result as any)[1],
        price: (result as any)[2].toString(),
        duration: (result as any)[3].toString(),
        maxLicenses: (result as any)[4].toString(),
        issuedLicenses: (result as any)[5].toString(),
        isActive: (result as any)[6],
        revenueShare: (result as any)[7].toString(),
        licenseType: (result as any)[8] as LicenseType,
        geographicRestriction: (result as any)[9] as GeographicRestriction,
        requiredComplianceLevel: Number((result as any)[10]),
        requiresKYC: (result as any)[11]
      };
    } catch (error) {
      console.error("Error getting license terms:", error);
      return null;
    }
  }

  /**
   * Get license holder information
   */
  async getLicenseHolder(licenseTokenId: string): Promise<LicenseHolder | null> {
    try {
      const result = await readContract({
        contract: this.enhancedLicensingContract,
        method: "function getLicenseHolder(uint256 licenseTokenId) view returns (address holder, uint256 assetId, uint256 licenseId, uint256 issuedAt, uint256 expiresAt, bool isValid, uint256 revenueShare, string memory jurisdiction, uint256 complianceLevel, bool hasKYC)",
        params: [BigInt(licenseTokenId)],
      });

      return {
        holder: (result as any)[0],
        assetId: (result as any)[1].toString(),
        licenseId: (result as any)[2].toString(),
        issuedAt: (result as any)[3].toString(),
        expiresAt: (result as any)[4].toString(),
        isValid: (result as any)[5],
        revenueShare: (result as any)[6].toString(),
        jurisdiction: (result as any)[7],
        complianceLevel: Number((result as any)[8]),
        hasKYC: (result as any)[9]
      };
    } catch (error) {
      console.error("Error getting license holder:", error);
      return null;
    }
  }

  /**
   * Get licenses held by an address
   */
  async getLicensesByHolder(holder: string): Promise<string[]> {
    try {
      const result = await readContract({
        contract: this.enhancedLicensingContract,
        method: "function getLicensesByHolder(address holder) view returns (uint256[] memory)",
        params: [holder],
      });
      return (result as any).map((id: any) => id.toString());
    } catch (error) {
      console.error("Error getting licenses by holder:", error);
      return [];
    }
  }

  /**
   * Get licenses for an asset
   */
  async getLicensesByAsset(assetId: string): Promise<string[]> {
    try {
      const result = await readContract({
        contract: this.enhancedLicensingContract,
        method: "function getLicensesByAsset(uint256 assetId) view returns (uint256[] memory)",
        params: [BigInt(assetId)],
      });
      return (result as any).map((id: any) => id.toString());
    } catch (error) {
      console.error("Error getting licenses by asset:", error);
      return [];
    }
  }

  /**
   * Check if an address has a valid license for an asset
   */
  async hasValidLicense(assetId: string, holder: string): Promise<boolean> {
    try {
      const result = await readContract({
        contract: this.enhancedLicensingContract,
        method: "function hasValidLicense(uint256 assetId, address holder) view returns (bool)",
        params: [BigInt(assetId), holder],
      });
      return result as boolean;
    } catch (error) {
      console.error("Error checking valid license:", error);
      return false;
    }
  }

  /**
   * Validate license grant requirements
   */
  async validateLicenseGrant(
    /* assetId: string, */ // Unused parameter
    licenseId: string,
    /* licensee: string, */ // Unused parameter
    jurisdiction: string
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Get license terms
      const licenseTerms = await this.getLicenseTerms(licenseId);
      if (!licenseTerms) {
        return { valid: false, reason: "License terms not found" };
      }

      if (!licenseTerms.isActive) {
        return { valid: false, reason: "License is not active" };
      }

      if (Number(licenseTerms.issuedLicenses) >= Number(licenseTerms.maxLicenses)) {
        return { valid: false, reason: "Maximum licenses reached" };
      }

      // Check compliance requirements
      const complianceProfile = await this.getComplianceProfile();
      if (!complianceProfile || !(complianceProfile as any)?.isVerified) {
        return { valid: false, reason: "Licensee not compliance verified" };
      }

      if ((complianceProfile as any)?.expiryDate > 0 && (complianceProfile as any)?.expiryDate < Math.floor(Date.now() / 1000)) {
        return { valid: false, reason: "Licensee compliance expired" };
      }

      if ((complianceProfile as any)?.level < licenseTerms.requiredComplianceLevel) {
        return { valid: false, reason: `Insufficient compliance level. Required: ${licenseTerms.requiredComplianceLevel}, Actual: ${(complianceProfile as any)?.level}` };
      }

      // Check KYC requirements
      if (licenseTerms.requiresKYC && !(complianceProfile as any)?.canTradeIPAssets) {
        return { valid: false, reason: "Licensee KYC required" };
      }

      // Check geographic restrictions
      if (!this.isJurisdictionAllowed(licenseTerms)) {
        return { valid: false, reason: `Jurisdiction ${jurisdiction} not allowed for this license` };
      }

      if (this.isJurisdictionRestricted()) {
        return { valid: false, reason: `Jurisdiction ${jurisdiction} is restricted for this license` };
      }

      return { valid: true };
    } catch (error) {
      console.error("Error validating license grant:", error);
      return {
        valid: false,
        reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if jurisdiction is allowed
   */
  private isJurisdictionAllowed(licenseTerms: EnhancedLicenseTerms, /* jurisdiction: string */): boolean {
    if (licenseTerms.geographicRestriction === GeographicRestriction.NONE) {
      return true;
    }

    // This would need to be implemented based on the license terms structure
    // For now, return true as a placeholder
    return true;
  }

  /**
   * Check if jurisdiction is restricted
   */
  private isJurisdictionRestricted(/* licenseTerms: EnhancedLicenseTerms, jurisdiction: string */): boolean {
    // This would need to be implemented based on the license terms structure
    // For now, return false as a placeholder
    return false;
  }

  /**
   * Get compliance profile for an entity
   */
  private async getComplianceProfile(/* entityAddress: string */) {
    try {
      // TODO: Fix readContract method signature issue
      // const result = await readContract({
      //   contract: this.complianceManagerContract,
      //   method: "getComplianceProfile",
      //   params: [entityAddress],
      // });
      // return result as any;
      return null; // Temporary placeholder
    } catch (error) {
      console.error("Error getting compliance profile:", error);
      return null;
    }
  }

  /**
   * Get supported jurisdictions
   */
  getSupportedJurisdictions(): string[] {
    return [
      "US", "EU", "UK", "CA", "AU", "JP", "CN", "IN", "BR", "MX", 
      "KE", "NG", "ZA", "GLOBAL"
    ];
  }

  /**
   * Get license type display name
   */
  getLicenseTypeDisplayName(licenseType: LicenseType): string {
    switch (licenseType) {
      case LicenseType.EXCLUSIVE:
        return "Exclusive";
      case LicenseType.NON_EXCLUSIVE:
        return "Non-Exclusive";
      case LicenseType.SOLE:
        return "Sole";
      default:
        return "Unknown";
    }
  }

  /**
   * Get geographic restriction display name
   */
  getGeographicRestrictionDisplayName(restriction: GeographicRestriction): string {
    switch (restriction) {
      case GeographicRestriction.NONE:
        return "No Restrictions";
      case GeographicRestriction.COUNTRY:
        return "Country Level";
      case GeographicRestriction.REGION:
        return "Regional";
      case GeographicRestriction.GLOBAL:
        return "Global";
      default:
        return "Unknown";
    }
  }
}

/**
 * Create an instance of the Enhanced Licensing Service
 */
export function createEnhancedLicensingService(client: ThirdwebClient): EnhancedLicensingService {
  return new EnhancedLicensingService(client);
}

export { CONTRACT_ADDRESSES };

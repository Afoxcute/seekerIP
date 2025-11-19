import { ThirdwebClient, getContract, prepareContractCall, readContract, sendTransaction, waitForReceipt } from "thirdweb";
import { defineChain } from "thirdweb/chains";
// Remove unused imports
// import IPAssetComplianceManagerABI from "../abi/IPAssetComplianceManager.json";
// import IPAssetManagerV2ABI from "../abi/IPAssetManagerV2.json";

// Hedera Testnet configuration
const hederaTestnet = defineChain({
  id: 296,
  name: "Hedera Testnet",
  rpc: "https://testnet.hashio.io/api",
  nativeCurrency: {
    name: "HBAR",
    symbol: "HBAR",
    decimals: 8,
  },
});

// Contract ABIs
// Remove unused ABI imports
// const IP_ASSET_COMPLIANCE_MANAGER_ABI = IPAssetComplianceManagerABI.abi as any;
// const IP_ASSET_MANAGER_V2_ABI = IPAssetManagerV2ABI.abi as any;

// Contract addresses
const CONTRACT_ADDRESSES = {
  IPAssetComplianceManager: "0x60A1d2CEf7fcdcf97d897ffd7c7908539978880c",
  IPAssetManagerV2: "0x5f3801efa089F9ee664c2Ade045735646A2eAA64",
};

// Compliance levels enum
export enum ComplianceLevel {
  NONE = 0,
  BASIC = 1,
  ENHANCED = 2,
  INSTITUTIONAL = 3
}

// Entity types enum
export enum EntityType {
  INDIVIDUAL = 0,
  CORPORATION = 1,
  PARTNERSHIP = 2,
  LLC = 3,
  TRUST = 4,
  GOVERNMENT = 5,
  NON_PROFIT = 6
}

// Compliance profile interface
export interface ComplianceProfile {
  isVerified: boolean;
  level: ComplianceLevel;
  entityType: EntityType;
  jurisdiction: string;
  registrationNumber: string;
  verificationDate: number;
  expiryDate: number;
  canHoldIPAssets: boolean;
  canTradeIPAssets: boolean;
  canTransferIPAssets: boolean;
  complianceNotes: string;
  verifier: string;
}

// Audit entry interface
export interface AuditEntry {
  timestamp: number;
  entity: string;
  action: string;
  assetId: number;
  details: string;
  complianceHash: string;
  operator: string;
}

// Compliance verification request interface
export interface ComplianceVerificationRequest {
  entity: string;
  level: ComplianceLevel;
  entityType: EntityType;
  jurisdiction: string;
  registrationNumber: string;
  expiryDate: number;
  permissions: {
    canHoldIPAssets: boolean;
    canTradeIPAssets: boolean;
    canTransferIPAssets: boolean;
  };
  notes: string;
}

export class ComplianceService {
  private client: ThirdwebClient;
  private complianceContract: any;
  // Remove unused contract
  // private ipAssetManagerContract: any;

  constructor(client: ThirdwebClient) {
    this.client = client;
    
    // Initialize compliance contract
    this.complianceContract = getContract({
      address: CONTRACT_ADDRESSES.IPAssetComplianceManager as `0x${string}`,
      chain: hederaTestnet,
      client: this.client,
      abi: [
        // Compliance verification
        {
          "inputs": [
            {"name": "entity", "type": "address"},
            {"name": "level", "type": "uint8"},
            {"name": "entityType", "type": "uint8"},
            {"name": "jurisdiction", "type": "string"},
            {"name": "registrationNumber", "type": "string"},
            {"name": "expiryDate", "type": "uint256"},
            {"name": "permissions", "type": "bool[3]"},
            {"name": "notes", "type": "string"}
          ],
          "name": "verifyCompliance",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        // Get compliance profile
        {
          "inputs": [{"name": "entity", "type": "address"}],
          "name": "getComplianceProfile",
          "outputs": [
            {"name": "isVerified", "type": "bool"},
            {"name": "level", "type": "uint8"},
            {"name": "entityType", "type": "uint8"},
            {"name": "jurisdiction", "type": "string"},
            {"name": "registrationNumber", "type": "string"},
            {"name": "verificationDate", "type": "uint256"},
            {"name": "expiryDate", "type": "uint256"},
            {"name": "canHoldIPAssets", "type": "bool"},
            {"name": "canTradeIPAssets", "type": "bool"},
            {"name": "canTransferIPAssets", "type": "bool"},
            {"name": "complianceNotes", "type": "string"},
            {"name": "verifier", "type": "address"}
          ],
          "stateMutability": "view",
          "type": "function"
        },
        // Check permissions
        {
          "inputs": [{"name": "entity", "type": "address"}],
          "name": "canEntityHoldIPAssets",
          "outputs": [{"name": "canHold", "type": "bool"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [{"name": "entity", "type": "address"}],
          "name": "canEntityTradeIPAssets",
          "outputs": [{"name": "canTrade", "type": "bool"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [{"name": "entity", "type": "address"}],
          "name": "canEntityTransferIPAssets",
          "outputs": [{"name": "canTransfer", "type": "bool"}],
          "stateMutability": "view",
          "type": "function"
        },
        // Audit trail
        {
          "inputs": [{"name": "entity", "type": "address"}],
          "name": "getEntityAuditTrail",
          "outputs": [{"name": "entries", "type": "uint256[]"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [{"name": "entryId", "type": "uint256"}],
          "name": "getAuditEntry",
          "outputs": [
            {"name": "timestamp", "type": "uint256"},
            {"name": "entity", "type": "address"},
            {"name": "action", "type": "string"},
            {"name": "assetId", "type": "uint256"},
            {"name": "details", "type": "string"},
            {"name": "complianceHash", "type": "bytes32"},
            {"name": "operator", "type": "address"}
          ],
          "stateMutability": "view",
          "type": "function"
        },
        // Compliance management
        {
          "inputs": [
            {"name": "entity", "type": "address"},
            {"name": "permissions", "type": "bool[3]"},
            {"name": "notes", "type": "string"}
          ],
          "name": "updateComplianceProfile",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {"name": "entity", "type": "address"},
            {"name": "reason", "type": "string"}
          ],
          "name": "revokeCompliance",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {"name": "entity", "type": "address"},
            {"name": "violation", "type": "string"},
            {"name": "assetId", "type": "uint256"}
          ],
          "name": "reportComplianceViolation",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ],
    });

    // Remove unused IP Asset Manager contract initialization
    // this.ipAssetManagerContract = getContract({
    //   address: CONTRACT_ADDRESSES.IPAssetManagerV2 as `0x${string}`,
    //   chain: hederaTestnet,
    //   client: this.client,
    //   abi: [
    //     {
    //       "inputs": [{"name": "entity", "type": "address"}],
    //       "name": "canEntityHoldIPAssets",
    //       "outputs": [{"name": "canHold", "type": "bool"}],
    //       "stateMutability": "view",
    //       "type": "function"
    //     }
    //   ],
    // });
  }

  /**
   * Verify compliance for an entity
   */
  async verifyCompliance(account: any, request: ComplianceVerificationRequest) {
    try {
      console.log('Verifying compliance for entity:', request.entity);
      
      const permissions: [boolean, boolean, boolean] = [
        request.permissions.canHoldIPAssets,
        request.permissions.canTradeIPAssets,
        request.permissions.canTransferIPAssets
      ];

      const preparedCall = prepareContractCall({
        contract: this.complianceContract,
        method: "function verifyCompliance(address entity, uint8 level, uint8 entityType, string jurisdiction, string registrationNumber, uint256 expiryDate, bool[3] permissions, string notes)",
        params: [
          request.entity,
          request.level,
          request.entityType,
          request.jurisdiction,
          request.registrationNumber,
          BigInt(request.expiryDate),
          permissions,
          request.notes
        ],
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

      console.log('Compliance verification successful:', receipt.transactionHash);
      return {
        success: true,
        transaction,
        receipt,
        transactionHash: transaction.transactionHash,
      };
    } catch (error) {
      console.error("Error verifying compliance:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get compliance profile for an entity
   */
  async getComplianceProfile(entity: string): Promise<ComplianceProfile | null> {
    try {
      const profile = await readContract({
        contract: this.complianceContract,
        method: "function getComplianceProfile(address entity) view returns (bool isVerified, uint8 level, uint8 entityType, string jurisdiction, string registrationNumber, uint256 verificationDate, uint256 expiryDate, bool canHoldIPAssets, bool canTradeIPAssets, bool canTransferIPAssets, string complianceNotes, address verifier)",
        params: [entity],
      });

      return {
        isVerified: profile[0],
        level: profile[1] as ComplianceLevel,
        entityType: profile[2] as EntityType,
        jurisdiction: profile[3],
        registrationNumber: profile[4],
        verificationDate: Number(profile[5]),
        expiryDate: Number(profile[6]),
        canHoldIPAssets: profile[7],
        canTradeIPAssets: profile[8],
        canTransferIPAssets: profile[9],
        complianceNotes: profile[10],
        verifier: profile[11],
      };
    } catch (error) {
      console.error("Error getting compliance profile:", error);
      return null;
    }
  }

  /**
   * Check if entity can hold IP assets
   */
  async canEntityHoldIPAssets(entity: string): Promise<boolean> {
    try {
      const canHold = await readContract({
        contract: this.complianceContract,
        method: "function canEntityHoldIPAssets(address entity) view returns (bool canHold)",
        params: [entity],
      });
      return canHold;
    } catch (error) {
      console.error("Error checking hold permission:", error);
      return false;
    }
  }

  /**
   * Check if entity can trade IP assets
   */
  async canEntityTradeIPAssets(entity: string): Promise<boolean> {
    try {
      const canTrade = await readContract({
        contract: this.complianceContract,
        method: "function canEntityTradeIPAssets(address entity) view returns (bool canTrade)",
        params: [entity],
      });
      return canTrade;
    } catch (error) {
      console.error("Error checking trade permission:", error);
      return false;
    }
  }

  /**
   * Check if entity can transfer IP assets
   */
  async canEntityTransferIPAssets(entity: string): Promise<boolean> {
    try {
      const canTransfer = await readContract({
        contract: this.complianceContract,
        method: "function canEntityTransferIPAssets(address entity) view returns (bool canTransfer)",
        params: [entity],
      });
      return canTransfer;
    } catch (error) {
      console.error("Error checking transfer permission:", error);
      return false;
    }
  }

  /**
   * Update compliance profile
   */
  async updateComplianceProfile(
    account: any,
    entity: string,
    permissions: {
      canHoldIPAssets: boolean;
      canTradeIPAssets: boolean;
      canTransferIPAssets: boolean;
    },
    notes: string
  ) {
    try {
      const permissionArray: [boolean, boolean, boolean] = [
        permissions.canHoldIPAssets,
        permissions.canTradeIPAssets,
        permissions.canTransferIPAssets
      ];

      const preparedCall = prepareContractCall({
        contract: this.complianceContract,
        method: "function updateComplianceProfile(address entity, bool[3] permissions, string notes)",
        params: [entity, permissionArray, notes],
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
        success: true,
        transaction,
        receipt,
        transactionHash: transaction.transactionHash,
      };
    } catch (error) {
      console.error("Error updating compliance profile:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Revoke compliance for an entity
   */
  async revokeCompliance(account: any, entity: string, reason: string) {
    try {
      const preparedCall = prepareContractCall({
        contract: this.complianceContract,
        method: "function revokeCompliance(address entity, string reason)",
        params: [entity, reason],
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
        success: true,
        transaction,
        receipt,
        transactionHash: transaction.transactionHash,
      };
    } catch (error) {
      console.error("Error revoking compliance:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Report compliance violation
   */
  async reportComplianceViolation(
    account: any,
    entity: string,
    violation: string,
    assetId: number = 0
  ) {
    try {
      const preparedCall = prepareContractCall({
        contract: this.complianceContract,
        method: "function reportComplianceViolation(address entity, string violation, uint256 assetId)",
        params: [entity, violation, BigInt(assetId)],
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
   * Get audit trail for an entity
   */
  async getEntityAuditTrail(entity: string): Promise<AuditEntry[]> {
    try {
      const entryIds = await readContract({
        contract: this.complianceContract,
        method: "function getEntityAuditTrail(address entity) view returns (uint256[] entries)",
        params: [entity],
      });

      const auditEntries: AuditEntry[] = [];
      
      for (const entryId of entryIds) {
        const entry = await readContract({
          contract: this.complianceContract,
          method: "function getAuditEntry(uint256 entryId) view returns (uint256 timestamp, address entity, string action, uint256 assetId, string details, bytes32 complianceHash, address operator)",
          params: [entryId],
        });

        auditEntries.push({
          timestamp: Number(entry[0]),
          entity: entry[1],
          action: entry[2],
          assetId: Number(entry[3]),
          details: entry[4],
          complianceHash: entry[5],
          operator: entry[6],
        });
      }

      return auditEntries.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error("Error getting audit trail:", error);
      return [];
    }
  }

  /**
   * Get compliance level string
   */
  getComplianceLevelString(level: ComplianceLevel): string {
    switch (level) {
      case ComplianceLevel.NONE: return "None";
      case ComplianceLevel.BASIC: return "Basic";
      case ComplianceLevel.ENHANCED: return "Enhanced";
      case ComplianceLevel.INSTITUTIONAL: return "Institutional";
      default: return "Unknown";
    }
  }

  /**
   * Get entity type string
   */
  getEntityTypeString(entityType: EntityType): string {
    switch (entityType) {
      case EntityType.INDIVIDUAL: return "Individual";
      case EntityType.CORPORATION: return "Corporation";
      case EntityType.PARTNERSHIP: return "Partnership";
      case EntityType.LLC: return "LLC";
      case EntityType.TRUST: return "Trust";
      case EntityType.GOVERNMENT: return "Government";
      case EntityType.NON_PROFIT: return "Non-Profit";
      default: return "Unknown";
    }
  }

  /**
   * Check if compliance is expired
   */
  isComplianceExpired(profile: ComplianceProfile): boolean {
    return profile.expiryDate <= Math.floor(Date.now() / 1000);
  }

  /**
   * Get compliance status summary
   */
  getComplianceStatus(profile: ComplianceProfile): {
    status: 'verified' | 'expired' | 'not_verified';
    message: string;
    color: 'green' | 'yellow' | 'red';
  } {
    if (!profile.isVerified) {
      return {
        status: 'not_verified',
        message: 'Not compliance verified',
        color: 'red'
      };
    }

    if (this.isComplianceExpired(profile)) {
      return {
        status: 'expired',
        message: 'Compliance expired',
        color: 'yellow'
      };
    }

    return {
      status: 'verified',
      message: 'Compliance verified',
      color: 'green'
    };
  }
}


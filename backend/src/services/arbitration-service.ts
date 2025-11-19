/**
 * @fileoverview Arbitration Service for IP Dispute Resolution
 * @description Handles arbitration logic, dispute management, and integration with smart contracts
 */

import { parseEther, formatEther, getContract } from "viem";
import { publicClient, walletClient } from "../utils/config";
import { ARBITRATION_CONTRACT_ADDRESS, IP_ASSET_MANAGER_V2_ADDRESS } from "../config/contracts";
import { hcsIntegration } from "./hcs-integration";

export interface DisputeData {
  disputeId: string;
  ipAssetId: string;
  challenger: string;
  currentOwner: string;
  evidence: string;
  bond: string;
  challengeTime: number;
  votingEndTime: number;
  status: 'PENDING' | 'VOTING' | 'RESOLVED' | 'ESCALATED' | 'CANCELLED';
  totalVotesFor: number;
  totalVotesAgainst: number;
  totalStakeFor: string;
  totalStakeAgainst: string;
  hcsSequenceNumber?: string;
}

export interface VoteData {
  voter: string;
  voteFor: boolean;
  stakeAmount: string;
  timestamp: number;
}

export interface ArbitratorData {
  address: string;
  isActive: boolean;
  totalCases: number;
  successfulCases: number;
  reputation: number;
  lastActive: number;
}

export interface IPAssetData {
  assetId: string;
  owner: string;
  metadataURI: string;
  registrationTime: number;
  isActive: boolean;
  disputeCount: number;
  hcsTopicId: string;
}

export class ArbitrationService {
  private arbitrationContract: any;
  private ipAssetManagerContract: any;

  constructor() {
    this.initializeContracts();
  }

  private async initializeContracts() {
    try {
      // Initialize arbitration contract with wallet client for write operations
      this.arbitrationContract = getContract({
        address: ARBITRATION_CONTRACT_ADDRESS,
        abi: (await import("../abi/IntellectualPropertyArbitration.json")).default.abi,
        client: walletClient
      });

      // Initialize IP Asset Manager contract with wallet client for write operations
      this.ipAssetManagerContract = getContract({
        address: IP_ASSET_MANAGER_V2_ADDRESS,
        abi: (await import("../abi/IPAssetManagerV2.json")).default.abi,
        client: walletClient
      });

      console.log("✅ Arbitration contracts initialized");
    } catch (error) {
      console.error("❌ Error initializing arbitration contracts:", error);
      throw error;
    }
  }

  /**
   * Register an IP asset for arbitration
   * @param metadataURI IPFS metadata URI
   * @param assetName Asset name
   * @returns Promise<{assetId: string, hcsTopicId: string}>
   */
  async registerIPAsset(metadataURI: string, assetName: string): Promise<{assetId: string, hcsTopicId: string}> {
    try {
      // Create HCS topic first
      const topic = await hcsIntegration.createArbitrationTopic(assetName, assetName);
      
      // Register asset in arbitration contract
      const result = await this.arbitrationContract.write.registerIPAsset(
        [metadataURI],
        { account: walletClient.account }
      );
      
      // Submit to HCS
      await hcsIntegration.submitIPAssetRegistration(
        result.assetId.toString(),
        result.owner,
        metadataURI,
        topic.topicId
      );

      return {
        assetId: result.assetId.toString(),
        hcsTopicId: topic.topicId
      };
    } catch (error) {
      console.error("❌ Error registering IP asset:", error);
      throw error;
    }
  }

  /**
   * Raise a dispute against an IP asset
   * @param ipAssetId IP asset ID
   * @param evidence Evidence IPFS hash
   * @param bondAmount Bond amount in HBAR
   * @returns Promise<{disputeId: string, hcsSequenceNumber: string}>
   */
  async raiseDispute(
    ipAssetId: string, 
    evidence: string, 
    bondAmount: string
  ): Promise<{disputeId: string, hcsSequenceNumber: string}> {
    try {
      // Try to get asset data from arbitration contract (may not exist for main contract assets)
      let assetData: IPAssetData | null = null;
      try {
        assetData = await this.getIPAsset(ipAssetId);
      } catch (error) {
        console.log("ℹ️ IP asset not found in arbitration contract, assuming it's from main contract");
        assetData = null;
      }
      
      // Raise dispute in contract
      const txHash = await this.arbitrationContract.write.raiseDispute(
        [ipAssetId, evidence],
        { 
          value: parseEther(bondAmount),
          account: walletClient.account
        }
      );

      // For now, use a simple approach - generate disputeId based on timestamp
      const disputeId = Date.now().toString();
      const eventHcsSequenceNumber = `0x${Date.now().toString(16)}`;

      // Submit to HCS - create topic if needed for main contract assets
      let hcsSequenceNumber = "0x0";
      let topicId = "";
      
      if (assetData && assetData.hcsTopicId && assetData.hcsTopicId.trim() !== "") {
        // Asset from arbitration contract already has HCS topic
        topicId = assetData.hcsTopicId;
      } else {
        // Asset from main contract or no HCS topic - create one
        console.log("ℹ️ No HCS topic found, creating new topic for IP asset", ipAssetId);
        try {
          // Get asset details from main contract to create meaningful topic
          const mainContractAsset = await this.ipAssetManagerContract.read.getIPAsset([ipAssetId]);
          const assetName = mainContractAsset[2] || `Asset_${ipAssetId}`; // name is at index 2
          
          const hcsTopic = await hcsIntegration.createArbitrationTopic(ipAssetId, assetName);
          topicId = hcsTopic.topicId;
          console.log("✅ Created HCS topic:", topicId, "for IP asset:", ipAssetId);
        } catch (topicError) {
          console.warn("⚠️ Failed to create HCS topic:", topicError);
          console.log("ℹ️ Continuing without HCS topic");
        }
      }
      
      // Submit to HCS if we have a topic
      if (topicId && topicId.trim() !== "") {
        try {
          const sequenceNum = await hcsIntegration.submitDisputeCreation(
            disputeId,
        ipAssetId,
            walletClient.account?.address || "",
        evidence,
            topicId
          );
          hcsSequenceNumber = `0x${sequenceNum.toString(16)}`;
          console.log("✅ Submitted dispute to HCS with sequence:", hcsSequenceNumber);
        } catch (hcsError) {
          console.warn("⚠️ Failed to submit to HCS, continuing without HCS record:", hcsError);
          hcsSequenceNumber = "0x0";
        }
      } else {
        console.log("ℹ️ No HCS topic available, skipping HCS submission");
      }

      return {
        disputeId: disputeId,
        hcsSequenceNumber: eventHcsSequenceNumber
      };
    } catch (error) {
      console.error("❌ Error raising dispute:", error);
      throw error;
    }
  }

  /**
   * Cast a vote on a dispute
   * @param disputeId Dispute ID
   * @param voteFor Whether voting for challenger
   * @param stakeAmount Stake amount in HBAR
   * @returns Promise<{hcsSequenceNumber: string}>
   */
  async castVote(
    disputeId: string, 
    voteFor: boolean, 
    stakeAmount: string
  ): Promise<{hcsSequenceNumber: string}> {
    try {
      // Get dispute data to find HCS topic
      const disputeData = await this.getDispute(disputeId);
      const assetData = await this.getIPAsset(disputeData.ipAssetId);

      // Cast vote in contract
      const result = await this.arbitrationContract.write.castVote(
        [disputeId, voteFor],
        { 
          value: parseEther(stakeAmount),
          account: walletClient.account
        }
      );

      // Submit to HCS
      const hcsSequenceNumber = await hcsIntegration.submitVote(
        disputeId,
        result.voter,
        voteFor,
        stakeAmount,
        assetData.hcsTopicId
      );

      return {
        hcsSequenceNumber: hcsSequenceNumber.toString()
      };
    } catch (error) {
      console.error("❌ Error casting vote:", error);
      throw error;
    }
  }

  /**
   * Resolve a dispute based on voting results
   * @param disputeId Dispute ID
   * @returns Promise<{challengerWon: boolean, hcsSequenceNumber: string}>
   */
  async resolveDispute(disputeId: string): Promise<{challengerWon: boolean, hcsSequenceNumber: string}> {
    try {
      // Get dispute data
      const disputeData = await this.getDispute(disputeId);
      const assetData = await this.getIPAsset(disputeData.ipAssetId);

      // Resolve dispute in contract
      const result = await this.arbitrationContract.write.resolveDispute(
        [disputeId],
        { account: walletClient.account }
      );

      // If challenger won, transfer IP ownership
      if (result.challengerWon) {
        await this.transferIPOwnership(disputeData.ipAssetId, disputeData.challenger);
      }

      // Submit to HCS
      const hcsSequenceNumber = await hcsIntegration.submitDisputeResolution(
        disputeId,
        result.challengerWon,
        result.challengerWon ? disputeData.challenger : null,
        assetData.hcsTopicId
      );

      return {
        challengerWon: result.challengerWon,
        hcsSequenceNumber: hcsSequenceNumber.toString()
      };
    } catch (error) {
      console.error("❌ Error resolving dispute:", error);
      throw error;
    }
  }

  /**
   * Escalate dispute to human arbitrator
   * @param disputeId Dispute ID
   * @param arbitratorAddress Arbitrator address
   * @returns Promise<{hcsSequenceNumber: string}>
   */
  async escalateDispute(
    disputeId: string, 
    arbitratorAddress: string
  ): Promise<{hcsSequenceNumber: string}> {
    try {
      // Get dispute data
      const disputeData = await this.getDispute(disputeId);
      const assetData = await this.getIPAsset(disputeData.ipAssetId);

      // Escalate in contract
      const result = await this.arbitrationContract.write.escalateDispute(
        [disputeId],
        { account: walletClient.account }
      );

      // Submit to HCS
      const hcsSequenceNumber = await hcsIntegration.submitArbitratorEscalation(
        disputeId,
        arbitratorAddress,
        assetData.hcsTopicId
      );

      return {
        hcsSequenceNumber: hcsSequenceNumber.toString()
      };
    } catch (error) {
      console.error("❌ Error escalating dispute:", error);
      throw error;
    }
  }

  /**
   * Arbitrator resolves dispute manually
   * @param disputeId Dispute ID
   * @param challengerWon Whether challenger should win
   * @returns Promise<{hcsSequenceNumber: string}>
   */
  async arbitratorResolve(
    disputeId: string, 
    challengerWon: boolean
  ): Promise<{hcsSequenceNumber: string}> {
    try {
      // Get dispute data
      const disputeData = await this.getDispute(disputeId);
      const assetData = await this.getIPAsset(disputeData.ipAssetId);

      // Resolve in contract
      const result = await this.arbitrationContract.write.arbitratorResolve(
        [disputeId, challengerWon],
        { account: walletClient.account }
      );

      // If challenger won, transfer IP ownership
      if (challengerWon) {
        await this.transferIPOwnership(disputeData.ipAssetId, disputeData.challenger);
      }

      // Submit to HCS
      const hcsSequenceNumber = await hcsIntegration.submitDisputeResolution(
        disputeId,
        challengerWon,
        challengerWon ? disputeData.challenger : null,
        assetData.hcsTopicId
      );

      return {
        hcsSequenceNumber: hcsSequenceNumber.toString()
      };
    } catch (error) {
      console.error("❌ Error in arbitrator resolution:", error);
      throw error;
    }
  }

  /**
   * Cancel a dispute
   * @param disputeId Dispute ID
   * @returns Promise<{hcsSequenceNumber: string}>
   */
  async cancelDispute(disputeId: string): Promise<{hcsSequenceNumber: string}> {
    try {
      // Get dispute data
      const disputeData = await this.getDispute(disputeId);
      const assetData = await this.getIPAsset(disputeData.ipAssetId);

      // Cancel in contract
      const result = await this.arbitrationContract.write.cancelDispute(
        [disputeId],
        { account: walletClient.account }
      );

      // Submit to HCS
      const hcsSequenceNumber = await hcsIntegration.submitMessage(
        assetData.hcsTopicId,
        {
          messageType: "DISPUTE_CANCELLED",
          entityId: disputeId,
          actor: disputeData.challenger,
          data: JSON.stringify({
            cancellationTime: Date.now(),
            status: "CANCELLED"
          }),
          timestamp: Date.now()
        }
      );

      return {
        hcsSequenceNumber: hcsSequenceNumber.toString()
      };
    } catch (error) {
      console.error("❌ Error cancelling dispute:", error);
      throw error;
    }
  }

  /**
   * Get IP asset data
   * @param assetId Asset ID
   * @returns Promise<IPAssetData>
   */
  async getIPAsset(assetId: string): Promise<IPAssetData> {
    try {
      const result = await this.arbitrationContract.read.getIPAsset([assetId]);
      return {
        assetId,
        owner: result.owner,
        metadataURI: result.metadataURI,
        registrationTime: Number(result.registrationTime),
        isActive: result.isActive,
        disputeCount: Number(result.disputeCount),
        hcsTopicId: result.hcsTopicId
      };
    } catch (error) {
      console.error("❌ Error getting IP asset:", error);
      throw error;
    }
  }

  /**
   * Get dispute data
   * @param disputeId Dispute ID
   * @returns Promise<DisputeData>
   */
  async getDispute(disputeId: string): Promise<DisputeData> {
    try {
      const result = await this.arbitrationContract.read.getDispute([disputeId]);
      return {
        disputeId,
        ipAssetId: result.ipAssetId.toString(),
        challenger: result.challenger,
        currentOwner: result.currentOwner,
        evidence: result.evidence,
        bond: result.bond.toString(),
        challengeTime: Number(result.challengeTime),
        votingEndTime: Number(result.votingEndTime),
        status: this.mapDisputeStatus(result.status),
        totalVotesFor: Number(result.totalVotesFor),
        totalVotesAgainst: Number(result.totalVotesAgainst),
        totalStakeFor: result.totalStakeFor.toString(),
        totalStakeAgainst: result.totalStakeAgainst.toString(),
        hcsSequenceNumber: result.hcsSequenceNumber
      };
    } catch (error) {
      console.error("❌ Error getting dispute:", error);
      throw error;
    }
  }

  /**
   * Get vote data for a specific voter
   * @param disputeId Dispute ID
   * @param voter Voter address
   * @returns Promise<VoteData>
   */
  async getVote(disputeId: string, voter: string): Promise<VoteData> {
    try {
      const result = await this.arbitrationContract.read.getVote([disputeId, voter]);
      return {
        voter,
        voteFor: result.voteFor,
        stakeAmount: result.stakeAmount.toString(),
        timestamp: Number(result.timestamp)
      };
    } catch (error) {
      console.error("❌ Error getting vote:", error);
      throw error;
    }
  }

  /**
   * Get arbitrator data
   * @param arbitratorAddress Arbitrator address
   * @returns Promise<ArbitratorData>
   */
  async getArbitrator(arbitratorAddress: string): Promise<ArbitratorData> {
    try {
      const result = await this.arbitrationContract.read.getArbitrator([arbitratorAddress]);
      return {
        address: arbitratorAddress,
        isActive: result.isActive,
        totalCases: Number(result.totalCases),
        successfulCases: Number(result.successfulCases),
        reputation: Number(result.reputation),
        lastActive: Number(result.lastActive)
      };
    } catch (error) {
      console.error("❌ Error getting arbitrator:", error);
      throw error;
    }
  }

  /**
   * Get dispute statistics
   * @returns Promise<{total: number, resolved: number, pending: number, voting: number, escalated: number}>
   */
  async getDisputeStats(): Promise<{total: number, resolved: number, pending: number, voting: number, escalated: number}> {
    try {
      const result = await this.arbitrationContract.read.getDisputeStats();
      return {
        total: Number(result.total),
        resolved: Number(result.resolved),
        pending: Number(result.pending),
        voting: Number(result.voting),
        escalated: Number(result.escalated)
      };
    } catch (error) {
      console.error("❌ Error getting dispute stats:", error);
      throw error;
    }
  }

  /**
   * Transfer IP ownership in the main IP asset manager
   * @param assetId Asset ID
   * @param newOwner New owner address
   */
  private async transferIPOwnership(assetId: string, newOwner: string): Promise<void> {
    try {
      await this.ipAssetManagerContract.write.transferIPAsset(
        [assetId, newOwner],
        { account: walletClient.account }
      );
      console.log(`✅ Transferred IP asset ${assetId} to ${newOwner}`);
    } catch (error) {
      console.error("❌ Error transferring IP ownership:", error);
      throw error;
    }
  }

  /**
   * Map dispute status from contract to string
   * @param status Contract status
   * @returns Mapped status string
   */
  private mapDisputeStatus(status: number): 'PENDING' | 'VOTING' | 'RESOLVED' | 'ESCALATED' | 'CANCELLED' {
    switch (status) {
      case 0: return 'PENDING';
      case 1: return 'VOTING';
      case 2: return 'RESOLVED';
      case 3: return 'ESCALATED';
      case 4: return 'CANCELLED';
      default: return 'PENDING';
    }
  }

  /**
   * Get dispute history from HCS
   * @param assetId Asset ID
   * @returns Promise<HCSMessage[]>
   */
  async getDisputeHistory(assetId: string): Promise<any[]> {
    try {
      const assetData = await this.getIPAsset(assetId);
      return await hcsIntegration.getDisputeHistory(assetId, assetData.hcsTopicId);
    } catch (error) {
      console.error("❌ Error getting dispute history:", error);
      return [];
    }
  }

  /**
   * Verify message authenticity using HCS
   * @param topicId HCS topic ID
   * @param sequenceNumber Sequence number
   * @returns Promise<boolean>
   */
  async verifyMessage(topicId: string, sequenceNumber: number): Promise<boolean> {
    try {
      return await hcsIntegration.verifyMessage(topicId, sequenceNumber);
    } catch (error) {
      console.error("❌ Error verifying message:", error);
      return false;
    }
  }

  /**
   * Initialize arbitration token (only owner)
   * @returns Promise<{tokenAddress: string}>
   */
  async initializeArbitrationToken(): Promise<{tokenAddress: string}> {
    try {
      const result = await this.arbitrationContract.write.initializeArbitrationToken(
        [],
        { account: walletClient.account }
      );
      return {
        tokenAddress: result.tokenAddress
      };
    } catch (error) {
      console.error("❌ Error initializing arbitration token:", error);
      throw error;
    }
  }

  /**
   * Check if arbitration token is initialized
   * @returns Promise<boolean>
   */
  async isTokenInitialized(): Promise<boolean> {
    try {
      const result = await this.arbitrationContract.read.isTokenInitialized();
      return result;
    } catch (error) {
      console.error("❌ Error checking token initialization:", error);
      throw error;
    }
  }

  /**
   * Stake tokens for governance participation
   * @param amount Amount to stake
   * @returns Promise<{transactionHash: string}>
   */
  async stakeTokens(amount: bigint): Promise<{transactionHash: string}> {
    try {
      const result = await this.arbitrationContract.write.stakeTokens(
        [amount],
        { account: walletClient.account }
      );
      return {
        transactionHash: result.transactionHash
      };
    } catch (error) {
      console.error("❌ Error staking tokens:", error);
      throw error;
    }
  }

  /**
   * Unstake tokens
   * @param amount Amount to unstake
   * @returns Promise<{transactionHash: string}>
   */
  async unstakeTokens(amount: bigint): Promise<{transactionHash: string}> {
    try {
      const result = await this.arbitrationContract.write.unstakeTokens(
        [amount],
        { account: walletClient.account }
      );
      return {
        transactionHash: result.transactionHash
      };
    } catch (error) {
      console.error("❌ Error unstaking tokens:", error);
      throw error;
    }
  }

  /**
   * Get user's token balance
   * @param user User address
   * @returns Promise<bigint>
   */
  async getTokenBalance(user: string): Promise<bigint> {
    try {
      const result = await this.arbitrationContract.read.getTokenBalance([user]);
      return BigInt(result);
    } catch (error) {
      console.error("❌ Error getting token balance:", error);
      throw error;
    }
  }

  /**
   * Get user's staked tokens
   * @param user User address
   * @returns Promise<bigint>
   */
  async getStakedTokens(user: string): Promise<bigint> {
    try {
      const result = await this.arbitrationContract.read.getStakedTokens([user]);
      return BigInt(result);
    } catch (error) {
      console.error("❌ Error getting staked tokens:", error);
      throw error;
    }
  }

  /**
   * Get user's voting power
   * @param user User address
   * @returns Promise<bigint>
   */
  async getVotingPower(user: string): Promise<bigint> {
    try {
      const result = await this.arbitrationContract.read.getVotingPower([user]);
      return BigInt(result);
    } catch (error) {
      console.error("❌ Error getting voting power:", error);
      throw error;
    }
  }

  /**
   * Create HCS topic for an IP asset from main contract
   */
  async createHCSTopicForAsset(ipAssetId: string): Promise<{topicId: string, name: string}> {
    try {
      console.log("🔄 Creating HCS topic for IP asset:", ipAssetId);
      
      // Get asset details from main contract
      const mainContractAsset = await this.ipAssetManagerContract.read.getIPAsset([ipAssetId]);
      const assetName = mainContractAsset[2] || `Asset_${ipAssetId}`; // name is at index 2
      
      const hcsTopic = await hcsIntegration.createArbitrationTopic(ipAssetId, assetName);
      console.log("✅ Created HCS topic:", hcsTopic.topicId, "for IP asset:", ipAssetId);
      
      return {
        topicId: hcsTopic.topicId,
        name: assetName
      };
    } catch (error) {
      console.error("❌ Error creating HCS topic for asset:", error);
      throw error;
    }
  }

  /**
   * Calculate pending rewards for user
   * @param user User address
   * @returns Promise<bigint>
   */
  async calculatePendingRewards(user: string): Promise<bigint> {
    try {
      const result = await this.arbitrationContract.read.calculatePendingRewards([user]);
      return BigInt(result);
    } catch (error) {
      console.error("❌ Error calculating pending rewards:", error);
      throw error;
    }
  }

  /**
   * Claim accumulated rewards
   * @returns Promise<{transactionHash: string}>
   */
  async claimRewards(): Promise<{transactionHash: string}> {
    try {
      const result = await this.arbitrationContract.write.claimRewards(
        [],
        { account: walletClient.account }
      );
      return {
        transactionHash: result.transactionHash
      };
    } catch (error) {
      console.error("❌ Error claiming rewards:", error);
      throw error;
    }
  }

  /**
   * Check and process infringements
   * @returns Promise<{processedCount: number}>
   */
  async checkAndProcessInfringements(): Promise<{processedCount: number}> {
    try {
      // This would integrate with Yakoa service
      // For now, return a placeholder
      return {
        processedCount: 0
      };
    } catch (error) {
      console.error("❌ Error checking infringements:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const arbitrationService = new ArbitrationService();

/**
 * @fileoverview Arbitration Service for IP Dispute Resolution
 * @description Handles arbitration logic, dispute management, and integration with smart contracts
 */

import { createPublicClient, createWalletClient, http, formatEther, parseEther, getContract, defineChain } from "viem";
import { hederaTestnet } from "viem/chains";
import { config } from "../env.config";
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
  infringementDetected: boolean;
  infringementDetectionTime: number;
  infringementEvidence: string;
  arbitrationEligible: boolean;
}

export class ArbitrationService {
  private arbitrationContract: any;
  private ipAssetManagerContract: any;

  constructor() {
    this.initializeContracts();
  }

  private async initializeContracts() {
    try {
      // Initialize arbitration contract
      const arbitrationABI = await import("../abi/IntellectualPropertyArbitration.json");
      this.arbitrationContract = getContract({
        address: config.contracts.arbitration as `0x${string}`,
        abi: arbitrationABI.default.abi || arbitrationABI.abi,
        client: createPublicClient({
          chain: defineChain({
            id: 296, // Hedera Testnet
            name: "Hedera Testnet",
            network: "hedera-testnet",
            nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 8 },
            rpcUrls: {
              default: { http: [config.hedera.rpcUrl] },
              public: { http: [config.hedera.rpcUrl] }
            }
          }),
          transport: http(config.hedera.rpcUrl)
        })
      });

      // Initialize IP Asset Manager contract
      // Using a minimal ABI for now since the full ABI file doesn't exist
      const ipAssetManagerABI = [
        {
          "inputs": [{"name": "assetId", "type": "uint256"}],
          "name": "getIPAsset",
          "outputs": [
            {"name": "assetId", "type": "uint256"},
            {"name": "owner", "type": "address"},
            {"name": "name", "type": "string"},
            {"name": "description", "type": "string"},
            {"name": "metadataURI", "type": "string"},
            {"name": "createdAt", "type": "uint256"},
            {"name": "isActive", "type": "bool"},
            {"name": "licenseToken", "type": "address"},
            {"name": "royaltyVault", "type": "address"},
            {"name": "totalRevenue", "type": "uint256"},
            {"name": "totalLicenses", "type": "uint256"},
            {"name": "nftTokenId", "type": "uint256"},
            {"name": "ipfsHash", "type": "string"}
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ];
      this.ipAssetManagerContract = getContract({
        address: config.contracts.ipAssetManagerV2 as `0x${string}`,
        abi: ipAssetManagerABI,
        client: createPublicClient({
          chain: defineChain({
            id: 296,
            name: "Hedera Testnet",
            network: "hedera-testnet",
            nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 8 },
            rpcUrls: {
              default: { http: [config.hedera.rpcUrl] },
              public: { http: [config.hedera.rpcUrl] }
            }
          }),
          transport: http(config.hedera.rpcUrl)
        })
      });

      console.log("✅ Arbitration contracts initialized");
    } catch (error) {
      console.error("❌ Error initializing arbitration contracts:", error);
      throw error;
    }
  }

  /**
   * Mark infringement detected for an IP asset and make it eligible for arbitration
   * @param ipAssetId IP asset ID
   * @param infringementEvidence IPFS hash of infringement evidence
   * @returns Promise<{hcsSequenceNumber: string}>
   */
  async markInfringementDetected(ipAssetId: bigint, infringementEvidence: string): Promise<{hcsSequenceNumber: string}> {
    try {
      console.log(`🚨 Marking infringement detected for IP Asset ${ipAssetId}...`);

      // Call the smart contract function
      const result = await this.arbitrationContract.write.markInfringementDetected([
        ipAssetId,
        infringementEvidence
      ]);

      console.log(`✅ Infringement marked for IP Asset ${ipAssetId}`);

      return {
        hcsSequenceNumber: result.hcsSequenceNumber
      };
    } catch (error) {
      console.error(`❌ Error marking infringement detected for IP Asset ${ipAssetId}:`, error);
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
      const result = await this.arbitrationContract.write.registerIPAsset([metadataURI]);
      
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
      // Get asset data to find HCS topic
      const assetData = await this.getIPAsset(ipAssetId);
      
      // Raise dispute in contract
      const result = await this.arbitrationContract.write.raiseDispute(
        [ipAssetId, evidence],
        { value: viem.parseEther(bondAmount) }
      );

      // Submit to HCS
      const hcsSequenceNumber = await hcsIntegration.submitDisputeCreation(
        result.disputeId.toString(),
        ipAssetId,
        result.challenger,
        evidence,
        assetData.hcsTopicId
      );

      return {
        disputeId: result.disputeId.toString(),
        hcsSequenceNumber: hcsSequenceNumber.toString()
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
        { value: viem.parseEther(stakeAmount) }
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
      const result = await this.arbitrationContract.write.resolveDispute([disputeId]);

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
      const result = await this.arbitrationContract.write.escalateDispute([disputeId]);

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
        [disputeId, challengerWon]
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
      const result = await this.arbitrationContract.write.cancelDispute([disputeId]);

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
   * Initialize arbitration token (call after deployment)
   * @returns Promise<{success: boolean, tokenAddress?: string}>
   */
  async initializeArbitrationToken(): Promise<{success: boolean, tokenAddress?: string}> {
    try {
      console.log('🪙 Initializing arbitration token...');
      
      const result = await this.arbitrationContract.write.initializeArbitrationToken();
      
      console.log('✅ Arbitration token initialized');
      
      return {
        success: true,
        tokenAddress: result
      };
    } catch (error) {
      console.error('❌ Error initializing arbitration token:', error);
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
      console.error('❌ Error checking token initialization:', error);
      throw error;
    }
  }

  /**
   * Stake tokens for governance participation
   * @param amount Amount of tokens to stake
   * @returns Promise<{success: boolean, transactionHash?: string}>
   */
  async stakeTokens(amount: bigint): Promise<{success: boolean, transactionHash?: string}> {
    try {
      console.log(`🪙 Staking ${amount} tokens...`);
      
      const result = await this.arbitrationContract.write.stakeTokens([amount]);
      
      console.log('✅ Tokens staked successfully');
      
      return {
        success: true,
        transactionHash: result
      };
    } catch (error) {
      console.error('❌ Error staking tokens:', error);
      throw error;
    }
  }

  /**
   * Unstake tokens
   * @param amount Amount of tokens to unstake
   * @returns Promise<{success: boolean, transactionHash?: string}>
   */
  async unstakeTokens(amount: bigint): Promise<{success: boolean, transactionHash?: string}> {
    try {
      console.log(`🪙 Unstaking ${amount} tokens...`);
      
      const result = await this.arbitrationContract.write.unstakeTokens([amount]);
      
      console.log('✅ Tokens unstaked successfully');
      
      return {
        success: true,
        transactionHash: result
      };
    } catch (error) {
      console.error('❌ Error unstaking tokens:', error);
      throw error;
    }
  }

  /**
   * Mint tokens to a recipient (only owner)
   * @param recipient Address to receive tokens
   * @param amount Amount of tokens to mint
   * @returns Promise<{success: boolean, transactionHash?: string}>
   */
  async mintTokens(recipient: string, amount: bigint): Promise<{success: boolean, transactionHash?: string}> {
    try {
      console.log(`🪙 Minting ${amount} tokens to ${recipient}...`);
      
      const result = await this.arbitrationContract.write.mintTokens([recipient, amount]);
      
      console.log('✅ Tokens minted successfully');
      
      return {
        success: true,
        transactionHash: result
      };
    } catch (error) {
      console.error('❌ Error minting tokens:', error);
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
      console.error('❌ Error getting token balance:', error);
      throw error;
    }
  }

  /**
   * Get user's staked token amount
   * @param user User address
   * @returns Promise<bigint>
   */
  async getStakedTokens(user: string): Promise<bigint> {
    try {
      const result = await this.arbitrationContract.read.getStakedTokens([user]);
      return BigInt(result);
    } catch (error) {
      console.error('❌ Error getting staked tokens:', error);
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
      console.error('❌ Error getting voting power:', error);
      throw error;
    }
  }

  /**
   * Get total staked tokens
   * @returns Promise<bigint>
   */
  async getTotalStakedTokens(): Promise<bigint> {
    try {
      const result = await this.arbitrationContract.read.getTotalStakedTokens();
      return BigInt(result);
    } catch (error) {
      console.error('❌ Error getting total staked tokens:', error);
      throw error;
    }
  }

  /**
   * Get total voting power
   * @returns Promise<bigint>
   */
  async getTotalVotingPower(): Promise<bigint> {
    try {
      const result = await this.arbitrationContract.read.getTotalVotingPower();
      return BigInt(result);
    } catch (error) {
      console.error('❌ Error getting total voting power:', error);
      throw error;
    }
  }

  /**
   * Calculate pending rewards for a user
   * @param user User address
   * @returns Promise<bigint>
   */
  async calculatePendingRewards(user: string): Promise<bigint> {
    try {
      const result = await this.arbitrationContract.read.calculatePendingRewards([user]);
      return BigInt(result);
    } catch (error) {
      console.error('❌ Error calculating pending rewards:', error);
      throw error;
    }
  }

  /**
   * Claim accumulated rewards
   * @returns Promise<{success: boolean, transactionHash?: string}>
   */
  async claimRewards(): Promise<{success: boolean, transactionHash?: string}> {
    try {
      console.log('🪙 Claiming rewards...');
      
      const result = await this.arbitrationContract.write.claimRewards();
      
      console.log('✅ Rewards claimed successfully');
      
      return {
        success: true,
        transactionHash: result
      };
    } catch (error) {
      console.error('❌ Error claiming rewards:', error);
      throw error;
    }
  }

  /**
   * Check if an IP asset is eligible for arbitration
   * @param ipAssetId IP asset ID
   * @returns Promise<{eligible: boolean, infringementDetected: boolean}>
   */
  async isArbitrationEligible(ipAssetId: string): Promise<{eligible: boolean, infringementDetected: boolean}> {
    try {
      const result = await this.arbitrationContract.read.isArbitrationEligible([BigInt(ipAssetId)]);
      
      return {
        eligible: result.eligible,
        infringementDetected: result.infringementDetected
      };
    } catch (error) {
      console.error(`❌ Error checking arbitration eligibility for IP Asset ${ipAssetId}:`, error);
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
        hcsTopicId: result.hcsTopicId,
        infringementDetected: result.infringementDetected,
        infringementDetectionTime: Number(result.infringementDetectionTime),
        infringementEvidence: result.infringementEvidence,
        arbitrationEligible: result.arbitrationEligible
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
      await this.ipAssetManagerContract.write.transferIPAsset([assetId, newOwner]);
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
}

// Export singleton instance
export const arbitrationService = new ArbitrationService();



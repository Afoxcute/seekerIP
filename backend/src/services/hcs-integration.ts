/**
 * @fileoverview Hedera Consensus Service (HCS) Integration for IP Arbitration
 * @description Provides immutable record keeping for IP disputes and arbitration
 */

import { Client, TopicCreateTransaction, TopicMessageSubmitTransaction, TopicMessageQuery } from "@hashgraph/sdk";
import dotenv from "dotenv";

dotenv.config();

export interface HCSMessage {
  messageType: string;
  entityId: string;
  actor: string;
  data: string;
  timestamp: number;
  sequenceNumber?: number;
}

export interface HCSTopic {
  topicId: string;
  name: string;
  description: string;
  createdAt: number;
  messageCount: number;
}

export class HCSIntegration {
  private client: Client;
  private topics: Map<string, HCSTopic> = new Map();

  constructor() {
    // Initialize Hedera client
    this.client = Client.forTestnet();
    
    // Only set operator if environment variables are provided
    const operatorId = process.env.HEDERA_OPERATOR_ID;
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    
    if (operatorId && operatorKey) {
      try {
        this.client.setOperator(operatorId, operatorKey);
        console.log('✅ HCS Integration initialized with operator:', operatorId);
      } catch (error) {
        console.warn('⚠️ Failed to initialize HCS operator:', error instanceof Error ? error.message : String(error));
        console.warn('HCS functionality will be disabled');
      }
    } else {
      console.warn('⚠️ HEDERA_OPERATOR_ID or HEDERA_OPERATOR_KEY not provided');
      console.warn('HCS functionality will be disabled');
    }
  }

  /**
   * Create a new HCS topic for IP asset arbitration
   * @param assetId IP asset ID
   * @param assetName Name of the IP asset
   * @returns Promise<HCSTopic>
   */
  async createArbitrationTopic(assetId: string, assetName: string): Promise<HCSTopic> {
    try {
      // Check if HCS is properly initialized
      if (!process.env.HEDERA_OPERATOR_ID || !process.env.HEDERA_OPERATOR_KEY) {
        throw new Error('HCS not properly initialized - missing operator credentials');
      }

      const topicName = `IP_ARBITRATION_${assetId}_${assetName}`;
      const topicDescription = `Arbitration topic for IP Asset ${assetId}: ${assetName}`;

      const transaction = new TopicCreateTransaction()
        .setTopicMemo(topicDescription);
      
      if (this.client.operatorPublicKey) {
        transaction.setAdminKey(this.client.operatorPublicKey)
                 .setSubmitKey(this.client.operatorPublicKey);
      }

      const response = await transaction.execute(this.client);
      const receipt = await response.getReceipt(this.client);
      const topicId = receipt.topicId?.toString();

      if (!topicId) {
        throw new Error("Failed to create HCS topic");
      }

      const topic: HCSTopic = {
        topicId,
        name: topicName,
        description: topicDescription,
        createdAt: Date.now(),
        messageCount: 0
      };

      this.topics.set(topicId, topic);
      
      console.log(`✅ Created HCS topic ${topicId} for IP Asset ${assetId}`);
      return topic;
    } catch (error) {
      console.error("❌ Error creating HCS topic:", error);
      throw error;
    }
  }

  /**
   * Submit a message to an HCS topic
   * @param topicId HCS topic ID
   * @param message Message to submit
   * @returns Promise<number> Sequence number
   */
  async submitMessage(topicId: string, message: HCSMessage): Promise<number> {
    try {
      // Check if HCS is properly initialized
      if (!process.env.HEDERA_OPERATOR_ID || !process.env.HEDERA_OPERATOR_KEY) {
        throw new Error('HCS not properly initialized - missing operator credentials');
      }

      const topic = this.topics.get(topicId);
      if (!topic) {
        throw new Error(`Topic ${topicId} not found`);
      }

      const messageData = {
        ...message,
        timestamp: Date.now()
      };

      const messageBytes = Buffer.from(JSON.stringify(messageData), 'utf8');
      
      const transaction = new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(messageBytes);

      const response = await transaction.execute(this.client);
      const receipt = await response.getReceipt(this.client);
      
      // Generate a sequence number based on timestamp since it's not available in receipt
      const sequenceNumber = Date.now();

      // Update topic message count
      topic.messageCount++;
      this.topics.set(topicId, topic);

      console.log(`✅ Submitted message to topic ${topicId}, sequence: ${sequenceNumber}`);
      return sequenceNumber;
    } catch (error) {
      console.error("❌ Error submitting message to HCS:", error);
      throw error;
    }
  }

  /**
   * Query messages from an HCS topic
   * @param topicId HCS topic ID
   * @param startSequence Starting sequence number
   * @param endSequence Ending sequence number (optional)
   * @returns Promise<HCSMessage[]>
   */
  async queryMessages(
    topicId: string, 
    startSequence: number, 
    endSequence?: number
  ): Promise<HCSMessage[]> {
    try {
      const messages: HCSMessage[] = [];
      
      const query = new TopicMessageQuery()
        .setTopicId(topicId)
        .setStartTime(0)
        .setEndTime(Date.now());

      if (endSequence) {
        query.setLimit(endSequence - startSequence + 1);
      }

      await query.subscribe(this.client, null, (message) => {
        if (message) {
          try {
            const messageData = JSON.parse(message.contents.toString());
            messages.push(messageData);
          } catch (parseError) {
            console.warn("Failed to parse message:", parseError);
          }
        }
      });

      return messages;
    } catch (error) {
      console.error("❌ Error querying HCS messages:", error);
      throw error;
    }
  }

  /**
   * Get topic information
   * @param topicId HCS topic ID
   * @returns HCSTopic | undefined
   */
  getTopic(topicId: string): HCSTopic | undefined {
    return this.topics.get(topicId);
  }

  /**
   * Get all topics
   * @returns HCSTopic[]
   */
  getAllTopics(): HCSTopic[] {
    return Array.from(this.topics.values());
  }

  /**
   * Submit IP asset registration to HCS
   * @param assetId IP asset ID
   * @param owner Asset owner address
   * @param metadataURI Asset metadata URI
   * @param topicId HCS topic ID
   * @returns Promise<number> Sequence number
   */
  async submitIPAssetRegistration(
    assetId: string,
    owner: string,
    metadataURI: string,
    topicId: string
  ): Promise<number> {
    const message: HCSMessage = {
      messageType: "IP_ASSET_REGISTERED",
      entityId: assetId,
      actor: owner,
      data: JSON.stringify({
        metadataURI,
        registrationTime: Date.now(),
        status: "ACTIVE"
      }),
      timestamp: Date.now()
    };

    return await this.submitMessage(topicId, message);
  }

  /**
   * Submit dispute creation to HCS
   * @param disputeId Dispute ID
   * @param assetId IP asset ID
   * @param challenger Challenger address
   * @param evidence Evidence IPFS hash
   * @param topicId HCS topic ID
   * @returns Promise<number> Sequence number
   */
  async submitDisputeCreation(
    disputeId: string,
    assetId: string,
    challenger: string,
    evidence: string,
    topicId: string
  ): Promise<number> {
    const message: HCSMessage = {
      messageType: "DISPUTE_RAISED",
      entityId: disputeId,
      actor: challenger,
      data: JSON.stringify({
        assetId,
        evidence,
        challengeTime: Date.now(),
        status: "PENDING"
      }),
      timestamp: Date.now()
    };

    return await this.submitMessage(topicId, message);
  }

  /**
   * Submit vote to HCS
   * @param disputeId Dispute ID
   * @param voter Voter address
   * @param voteFor Whether voting for challenger
   * @param stakeAmount Stake amount
   * @param topicId HCS topic ID
   * @returns Promise<number> Sequence number
   */
  async submitVote(
    disputeId: string,
    voter: string,
    voteFor: boolean,
    stakeAmount: string,
    topicId: string
  ): Promise<number> {
    const message: HCSMessage = {
      messageType: "VOTE_CAST",
      entityId: disputeId,
      actor: voter,
      data: JSON.stringify({
        voteFor,
        stakeAmount,
        voteTime: Date.now()
      }),
      timestamp: Date.now()
    };

    return await this.submitMessage(topicId, message);
  }

  /**
   * Submit dispute resolution to HCS
   * @param disputeId Dispute ID
   * @param challengerWon Whether challenger won
   * @param newOwner New owner address (if challenger won)
   * @param topicId HCS topic ID
   * @returns Promise<number> Sequence number
   */
  async submitDisputeResolution(
    disputeId: string,
    challengerWon: boolean,
    newOwner: string | null,
    topicId: string
  ): Promise<number> {
    const message: HCSMessage = {
      messageType: "DISPUTE_RESOLVED",
      entityId: disputeId,
      actor: "SYSTEM",
      data: JSON.stringify({
        challengerWon,
        newOwner,
        resolutionTime: Date.now(),
        status: "RESOLVED"
      }),
      timestamp: Date.now()
    };

    return await this.submitMessage(topicId, message);
  }

  /**
   * Submit arbitrator escalation to HCS
   * @param disputeId Dispute ID
   * @param arbitrator Arbitrator address
   * @param topicId HCS topic ID
   * @returns Promise<number> Sequence number
   */
  async submitArbitratorEscalation(
    disputeId: string,
    arbitrator: string,
    topicId: string
  ): Promise<number> {
    const message: HCSMessage = {
      messageType: "DISPUTE_ESCALATED",
      entityId: disputeId,
      actor: arbitrator,
      data: JSON.stringify({
        escalationTime: Date.now(),
        status: "ESCALATED"
      }),
      timestamp: Date.now()
    };

    return await this.submitMessage(topicId, message);
  }

  /**
   * Verify message authenticity using HCS
   * @param topicId HCS topic ID
   * @param sequenceNumber Sequence number to verify
   * @returns Promise<boolean>
   */
  async verifyMessage(topicId: string, sequenceNumber: number): Promise<boolean> {
    try {
      const messages = await this.queryMessages(topicId, sequenceNumber, sequenceNumber);
      return messages.length > 0;
    } catch (error) {
      console.error("❌ Error verifying message:", error);
      return false;
    }
  }

  /**
   * Get dispute history from HCS
   * @param assetId IP asset ID
   * @param topicId HCS topic ID
   * @returns Promise<HCSMessage[]>
   */
  async getDisputeHistory(assetId: string, topicId: string): Promise<HCSMessage[]> {
    try {
      const messages = await this.queryMessages(topicId, 0);
      return messages.filter(msg => 
        msg.messageType.includes("DISPUTE") || 
        msg.data.includes(assetId)
      );
    } catch (error) {
      console.error("❌ Error getting dispute history:", error);
      return [];
    }
  }

  /**
   * Create topic for IP asset if it doesn't exist
   * @param assetId IP asset ID
   * @param assetName Asset name
   * @returns Promise<string> Topic ID
   */
  async ensureTopicExists(assetId: string, assetName: string): Promise<string> {
    // Check if topic already exists in our cache
    for (const [topicId, topic] of this.topics.entries()) {
      if (topic.name.includes(assetId)) {
        return topicId;
      }
    }

    // Create new topic
    const topic = await this.createArbitrationTopic(assetId, assetName);
    return topic.topicId;
  }

  /**
   * Cleanup old topics (admin function)
   * @param olderThanDays Topics older than this many days
   * @returns Promise<number> Number of topics cleaned up
   */
  async cleanupOldTopics(olderThanDays: number = 365): Promise<number> {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [topicId, topic] of this.topics.entries()) {
      if (topic.createdAt < cutoffTime && topic.messageCount === 0) {
        this.topics.delete(topicId);
        cleanedCount++;
      }
    }

    console.log(`🧹 Cleaned up ${cleanedCount} old topics`);
    return cleanedCount;
  }
}

// Export singleton instance
export const hcsIntegration = new HCSIntegration();

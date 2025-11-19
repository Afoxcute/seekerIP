/**
 * @fileoverview Arbitration API Routes
 * @description Express routes for IP dispute arbitration system
 */

import express, { Router } from 'express';
import { arbitrationService } from '../lib/arbitration-service';
import { hcsIntegration } from '../lib/hcs-integration';
import { yakoaIntegration } from '../lib/yakoa-integration';

const router: Router = express.Router();

/**
 * @route POST /api/arbitration/mark-infringement
 * @desc Mark infringement detected for an IP asset and make it eligible for arbitration
 * @access Public
 */
router.post('/mark-infringement', async (req, res) => {
  try {
    const { ipAssetId, infringementEvidence } = req.body;

    if (!ipAssetId || !infringementEvidence) {
      return res.status(400).json({
        success: false,
        message: 'IP Asset ID and infringement evidence are required'
      });
    }

    const result = await arbitrationService.markInfringementDetected(
      BigInt(ipAssetId), 
      infringementEvidence
    );

    res.json({
      success: true,
      message: 'Infringement marked - IP asset is now eligible for arbitration',
      data: result
    });
  } catch (error) {
    console.error('Error marking infringement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark infringement',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/arbitration/initialize-token
 * @desc Initialize the arbitration token (only owner)
 * @access Public
 */
router.post('/initialize-token', async (req, res) => {
  try {
    const result = await arbitrationService.initializeArbitrationToken();

    res.json({
      success: true,
      message: 'Arbitration token initialized successfully',
      data: result
    });
  } catch (error) {
    console.error('Error initializing token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize token',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/arbitration/token-status
 * @desc Check if arbitration token is initialized
 * @access Public
 */
router.get('/token-status', async (req, res) => {
  try {
    const isInitialized = await arbitrationService.isTokenInitialized();

    res.json({
      success: true,
      data: { isInitialized },
      message: isInitialized ? 'Token is initialized' : 'Token is not initialized'
    });
  } catch (error) {
    console.error('Error checking token status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check token status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/arbitration/stake-tokens
 * @desc Stake tokens for governance participation
 * @access Public
 */
router.post('/stake-tokens', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }

    const result = await arbitrationService.stakeTokens(BigInt(amount));

    res.json({
      success: true,
      message: 'Tokens staked successfully',
      data: result
    });
  } catch (error) {
    console.error('Error staking tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stake tokens',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/arbitration/unstake-tokens
 * @desc Unstake tokens
 * @access Public
 */
router.post('/unstake-tokens', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }

    const result = await arbitrationService.unstakeTokens(BigInt(amount));

    res.json({
      success: true,
      message: 'Tokens unstaked successfully',
      data: result
    });
  } catch (error) {
    console.error('Error unstaking tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unstake tokens',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/arbitration/token-balance/:user
 * @desc Get user's token balance and staking info
 * @access Public
 */
router.get('/token-balance/:user', async (req, res) => {
  try {
    const { user } = req.params;

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User address is required'
      });
    }

    const [tokenBalance, stakedTokens, votingPower, pendingRewards] = await Promise.all([
      arbitrationService.getTokenBalance(user),
      arbitrationService.getStakedTokens(user),
      arbitrationService.getVotingPower(user),
      arbitrationService.calculatePendingRewards(user)
    ]);

    res.json({
      success: true,
      data: {
        tokenBalance: tokenBalance.toString(),
        stakedTokens: stakedTokens.toString(),
        votingPower: votingPower.toString(),
        pendingRewards: pendingRewards.toString()
      }
    });
  } catch (error) {
    console.error('Error getting token balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get token balance',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/arbitration/claim-rewards
 * @desc Claim accumulated rewards
 * @access Public
 */
router.post('/claim-rewards', async (req, res) => {
  try {
    const result = await arbitrationService.claimRewards();

    res.json({
      success: true,
      message: 'Rewards claimed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error claiming rewards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to claim rewards',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/arbitration/check-infringements
 * @desc Check for new infringements and process them to make assets eligible for arbitration
 * @access Public
 */
router.post('/check-infringements', async (req, res) => {
  try {
    const result = await yakoaIntegration.checkAndProcessInfringements();

    res.json({
      success: true,
      message: 'Infringement check completed',
      data: result
    });
  } catch (error) {
    console.error('Error checking infringements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check infringements',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/arbitration/eligibility/:assetId
 * @desc Check if an IP asset is eligible for arbitration
 * @access Public
 */
router.get('/eligibility/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;

    if (!assetId) {
      return res.status(400).json({
        success: false,
        message: 'Asset ID is required'
      });
    }

    const result = await arbitrationService.isArbitrationEligible(assetId);

    res.json({
      success: true,
      data: result,
      message: result.eligible ? 'Asset is eligible for arbitration' : 'Asset is not eligible for arbitration'
    });
  } catch (error) {
    console.error('Error checking arbitration eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check arbitration eligibility',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/arbitration/register-asset
 * @desc Register an IP asset for arbitration
 * @access Public
 */
router.post('/register-asset', async (req, res) => {
  try {
    const { metadataURI, assetName } = req.body;

    if (!metadataURI || !assetName) {
      return res.status(400).json({
        success: false,
        message: 'Metadata URI and asset name are required'
      });
    }

    const result = await arbitrationService.registerIPAsset(metadataURI, assetName);

    res.json({
      success: true,
      message: 'IP asset registered for arbitration',
      data: result
    });
  } catch (error) {
    console.error('Error registering IP asset:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register IP asset',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/arbitration/raise-dispute
 * @desc Raise a dispute against an IP asset
 * @access Public
 */
router.post('/raise-dispute', async (req, res) => {
  try {
    const { ipAssetId, evidence, bondAmount } = req.body;

    if (!ipAssetId || !evidence || !bondAmount) {
      return res.status(400).json({
        success: false,
        message: 'IP asset ID, evidence, and bond amount are required'
      });
    }

    const result = await arbitrationService.raiseDispute(ipAssetId, evidence, bondAmount);

    res.json({
      success: true,
      message: 'Dispute raised successfully',
      data: result
    });
  } catch (error) {
    console.error('Error raising dispute:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to raise dispute',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/arbitration/cast-vote
 * @desc Cast a vote on a dispute
 * @access Public
 */
router.post('/cast-vote', async (req, res) => {
  try {
    const { disputeId, voteFor, stakeAmount } = req.body;

    if (!disputeId || voteFor === undefined || !stakeAmount) {
      return res.status(400).json({
        success: false,
        message: 'Dispute ID, vote preference, and stake amount are required'
      });
    }

    const result = await arbitrationService.castVote(disputeId, voteFor, stakeAmount);

    res.json({
      success: true,
      message: 'Vote cast successfully',
      data: result
    });
  } catch (error) {
    console.error('Error casting vote:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cast vote',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/arbitration/resolve-dispute
 * @desc Resolve a dispute based on voting results
 * @access Public
 */
router.post('/resolve-dispute', async (req, res) => {
  try {
    const { disputeId } = req.body;

    if (!disputeId) {
      return res.status(400).json({
        success: false,
        message: 'Dispute ID is required'
      });
    }

    const result = await arbitrationService.resolveDispute(disputeId);

    res.json({
      success: true,
      message: 'Dispute resolved successfully',
      data: result
    });
  } catch (error) {
    console.error('Error resolving dispute:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve dispute',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/arbitration/escalate-dispute
 * @desc Escalate a dispute to human arbitrator
 * @access Public
 */
router.post('/escalate-dispute', async (req, res) => {
  try {
    const { disputeId, arbitratorAddress } = req.body;

    if (!disputeId || !arbitratorAddress) {
      return res.status(400).json({
        success: false,
        message: 'Dispute ID and arbitrator address are required'
      });
    }

    const result = await arbitrationService.escalateDispute(disputeId, arbitratorAddress);

    res.json({
      success: true,
      message: 'Dispute escalated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error escalating dispute:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to escalate dispute',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/arbitration/arbitrator-resolve
 * @desc Arbitrator resolves dispute manually
 * @access Public
 */
router.post('/arbitrator-resolve', async (req, res) => {
  try {
    const { disputeId, challengerWon } = req.body;

    if (!disputeId || challengerWon === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Dispute ID and challenger won status are required'
      });
    }

    const result = await arbitrationService.arbitratorResolve(disputeId, challengerWon);

    res.json({
      success: true,
      message: 'Dispute resolved by arbitrator',
      data: result
    });
  } catch (error) {
    console.error('Error in arbitrator resolution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve dispute via arbitrator',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/arbitration/cancel-dispute
 * @desc Cancel a dispute
 * @access Public
 */
router.post('/cancel-dispute', async (req, res) => {
  try {
    const { disputeId } = req.body;

    if (!disputeId) {
      return res.status(400).json({
        success: false,
        message: 'Dispute ID is required'
      });
    }

    const result = await arbitrationService.cancelDispute(disputeId);

    res.json({
      success: true,
      message: 'Dispute cancelled successfully',
      data: result
    });
  } catch (error) {
    console.error('Error cancelling dispute:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel dispute',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/arbitration/asset/:assetId
 * @desc Get IP asset data
 * @access Public
 */
router.get('/asset/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;

    const assetData = await arbitrationService.getIPAsset(assetId);

    res.json({
      success: true,
      data: assetData
    });
  } catch (error) {
    console.error('Error getting IP asset:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get IP asset data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/arbitration/dispute/:disputeId
 * @desc Get dispute data
 * @access Public
 */
router.get('/dispute/:disputeId', async (req, res) => {
  try {
    const { disputeId } = req.params;

    const disputeData = await arbitrationService.getDispute(disputeId);

    res.json({
      success: true,
      data: disputeData
    });
  } catch (error) {
    console.error('Error getting dispute:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dispute data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/arbitration/vote/:disputeId/:voter
 * @desc Get vote data for a specific voter
 * @access Public
 */
router.get('/vote/:disputeId/:voter', async (req, res) => {
  try {
    const { disputeId, voter } = req.params;

    const voteData = await arbitrationService.getVote(disputeId, voter);

    res.json({
      success: true,
      data: voteData
    });
  } catch (error) {
    console.error('Error getting vote:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get vote data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/arbitration/arbitrator/:address
 * @desc Get arbitrator data
 * @access Public
 */
router.get('/arbitrator/:address', async (req, res) => {
  try {
    const { address } = req.params;

    const arbitratorData = await arbitrationService.getArbitrator(address);

    res.json({
      success: true,
      data: arbitratorData
    });
  } catch (error) {
    console.error('Error getting arbitrator:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get arbitrator data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/arbitration/stats
 * @desc Get dispute statistics
 * @access Public
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await arbitrationService.getDisputeStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting dispute stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dispute statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/arbitration/history/:assetId
 * @desc Get dispute history for an asset
 * @access Public
 */
router.get('/history/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;

    const history = await arbitrationService.getDisputeHistory(assetId);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error getting dispute history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dispute history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/arbitration/verify/:topicId/:sequenceNumber
 * @desc Verify message authenticity using HCS
 * @access Public
 */
router.get('/verify/:topicId/:sequenceNumber', async (req, res) => {
  try {
    const { topicId, sequenceNumber } = req.params;

    const isValid = await arbitrationService.verifyMessage(topicId, parseInt(sequenceNumber));

    res.json({
      success: true,
      data: { isValid }
    });
  } catch (error) {
    console.error('Error verifying message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify message',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/arbitration/topics
 * @desc Get all HCS topics
 * @access Public
 */
router.get('/topics', async (req, res) => {
  try {
    const topics = hcsIntegration.getAllTopics();

    res.json({
      success: true,
      data: topics
    });
  } catch (error) {
    console.error('Error getting topics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get topics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/arbitration/cleanup
 * @desc Cleanup old topics (admin function)
 * @access Public
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { olderThanDays = 365 } = req.body;

    const cleanedCount = await hcsIntegration.cleanupOldTopics(olderThanDays);

    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} old topics`,
      data: { cleanedCount }
    });
  } catch (error) {
    console.error('Error cleaning up topics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup topics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;



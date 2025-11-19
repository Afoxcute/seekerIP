import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { dataSyncService } from '../lib/data-sync-service';
import { thirdwebDataSyncService } from '../lib/thirdweb-data-sync-service';
import { backgroundJobService } from '../lib/background-jobs';

const router = Router();

// Get comprehensive statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await thirdwebDataSyncService.getContractStatistics();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting contract statistics:', error);
    res.status(500).json({ success: false, error: 'Failed to get statistics' });
  }
});

// Get background job status
router.get('/background-jobs/status', async (req, res) => {
  try {
    const status = backgroundJobService.getStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Error getting background job status:', error);
    res.status(500).json({ success: false, error: 'Failed to get background job status' });
  }
});

// Start background jobs
router.post('/background-jobs/start', async (req, res) => {
  try {
    await backgroundJobService.start();
    res.json({ success: true, message: 'Background jobs started' });
  } catch (error) {
    console.error('Error starting background jobs:', error);
    res.status(500).json({ success: false, error: 'Failed to start background jobs' });
  }
});

// Stop background jobs
router.post('/background-jobs/stop', async (req, res) => {
  try {
    await backgroundJobService.stop();
    res.json({ success: true, message: 'Background jobs stopped' });
  } catch (error) {
    console.error('Error stopping background jobs:', error);
    res.status(500).json({ success: false, error: 'Failed to stop background jobs' });
  }
});

// IP Assets endpoints
router.get('/ip-assets', async (req, res) => {
  try {
    const { page = 1, limit = 20, owner, active } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (owner) where.owner = owner as string;
    if (active !== undefined) where.isActive = active === 'true';

    const [assets, total] = await Promise.all([
      prisma.iPAsset.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          lock: true,
          arbitrationCases: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.iPAsset.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        assets,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting IP assets:', error);
    res.status(500).json({ success: false, error: 'Failed to get IP assets' });
  }
});

router.get('/ip-assets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const asset = await prisma.iPAsset.findUnique({
      where: { id },
      include: {
        lock: {
          include: {
            unlockEvents: true
          }
        },
        arbitrationCases: {
          include: {
            votes: true,
            evidence: true
          }
        },
        licenses: true,
        royalties: {
          include: {
            shares: true,
            claims: true
          }
        },
        transactions: {
          orderBy: { timestamp: 'desc' },
          take: 10
        },
        user: true
      }
    });

    if (!asset) {
      return res.status(404).json({ success: false, error: 'IP Asset not found' });
    }

    res.json({ success: true, data: asset });
  } catch (error) {
    console.error('Error getting IP asset:', error);
    res.status(500).json({ success: false, error: 'Failed to get IP asset' });
  }
});

// IP Asset Locker endpoints
router.get('/ip-asset-locks', async (req, res) => {
  try {
    const { page = 1, limit = 20, owner, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (owner) where.owner = owner as string;
    if (status) where.status = status as string;

    const [locks, total] = await Promise.all([
      prisma.iPAssetLock.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          ipAsset: true,
          unlockEvents: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.iPAssetLock.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        locks,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting IP asset locks:', error);
    res.status(500).json({ success: false, error: 'Failed to get IP asset locks' });
  }
});

// HBAR Token endpoints
router.get('/hbar-tokens/balances', async (req, res) => {
  try {
    const { page = 1, limit = 20, minBalance } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (minBalance) {
      where.balance = { gte: BigInt(minBalance as string) };
    }

    const [balances, total] = await Promise.all([
      prisma.hBARTokenBalance.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { balance: 'desc' }
      }),
      prisma.hBARTokenBalance.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        balances,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting HBAR token balances:', error);
    res.status(500).json({ success: false, error: 'Failed to get HBAR token balances' });
  }
});

router.get('/hbar-tokens/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 20, owner, type } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (owner) where.owner = owner as string;
    if (type) where.type = type as string;

    const [transactions, total] = await Promise.all([
      prisma.hBARTokenTransaction.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { timestamp: 'desc' }
      }),
      prisma.hBARTokenTransaction.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting HBAR token transactions:', error);
    res.status(500).json({ success: false, error: 'Failed to get HBAR token transactions' });
  }
});

// Arbitration endpoints
router.get('/arbitration/cases', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, complainant, respondent } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status as string;
    if (complainant) where.complainant = complainant as string;
    if (respondent) where.respondent = respondent as string;

    const [cases, total] = await Promise.all([
      prisma.arbitrationCase.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          ipAsset: true,
          votes: true,
          evidence: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.arbitrationCase.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        cases,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting arbitration cases:', error);
    res.status(500).json({ success: false, error: 'Failed to get arbitration cases' });
  }
});

// Tokenized Assets endpoints
router.get('/tokenized-assets', async (req, res) => {
  try {
    const { page = 1, limit = 20, owner, active } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (owner) where.owner = owner as string;
    if (active !== undefined) where.isActive = active === 'true';

    const [assets, total] = await Promise.all([
      prisma.tokenizedAsset.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          transfers: {
            orderBy: { timestamp: 'desc' },
            take: 5
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.tokenizedAsset.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        assets,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting tokenized assets:', error);
    res.status(500).json({ success: false, error: 'Failed to get tokenized assets' });
  }
});

// Contract state endpoints
router.get('/contract-states', async (req, res) => {
  try {
    const states = await prisma.contractState.findMany({
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ success: true, data: states });
  } catch (error) {
    console.error('Error getting contract states:', error);
    res.status(500).json({ success: false, error: 'Failed to get contract states' });
  }
});

// Event queue endpoints
router.get('/event-queue', async (req, res) => {
  try {
    const { page = 1, limit = 20, processed, contractAddress } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (processed !== undefined) where.processed = processed === 'true';
    if (contractAddress) where.contractAddress = contractAddress as string;

    const [events, total] = await Promise.all([
      prisma.eventQueue.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ blockNumber: 'desc' }, { logIndex: 'desc' }]
      }),
      prisma.eventQueue.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting event queue:', error);
    res.status(500).json({ success: false, error: 'Failed to get event queue' });
  }
});

// Manual sync endpoints
router.post('/sync', async (req, res) => {
  try {
    const { contract } = req.body;
    
    if (contract) {
      // Sync specific contract
      switch (contract) {
        case 'IPAssetManagerV2':
          await thirdwebDataSyncService.syncIPAssetManagerV2();
          break;
        case 'IPAssetLocker':
          await thirdwebDataSyncService.syncIPAssetLocker();
          break;
        case 'HBAREquivalentToken':
          await thirdwebDataSyncService.syncHBAREquivalentToken();
          break;
        case 'IntellectualPropertyArbitration':
          await thirdwebDataSyncService.syncIntellectualPropertyArbitration();
          break;
        case 'TokenizedAssetManager':
          await dataSyncService.syncTokenizedAssetManager();
          break;
        default:
          return res.status(400).json({ success: false, error: 'Unknown contract' });
      }
    } else {
      // Sync all contracts using Thirdweb (same as frontend)
      await thirdwebDataSyncService.syncAllContracts();
    }

    res.json({ success: true, message: 'Sync completed' });
  } catch (error) {
    console.error('Error during sync:', error);
    res.status(500).json({ success: false, error: 'Sync failed' });
  }
});

// Cleanup endpoint
router.post('/cleanup', async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;
    await dataSyncService.cleanupOldData(daysToKeep);
    res.json({ success: true, message: 'Cleanup completed' });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ success: false, error: 'Cleanup failed' });
  }
});

export default router;

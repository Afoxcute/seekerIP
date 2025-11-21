import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';

import yakoaRoutes from './routes/yakoa';
import arbitrationRoutes from './routes/arbitration';
import contractDataRoutes from './routes/contract-data';
import { yakoaIntegration } from './lib/yakoa-integration';
import { backgroundJobService } from './lib/background-jobs';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3087; // Different port from Yakoa backend

// Middleware
app.use(cors());
app.use(bodyParser.json());

// API Routes
app.use('/api/yakoa', yakoaRoutes);
app.use('/api/arbitration', arbitrationRoutes);
app.use('/api/contract-data', contractDataRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'seeker-backend',
    timestamp: new Date().toISOString()
  });
});

// Yakoa backend health check endpoint
app.get('/health/yakoa', async (_req, res) => {
  try {
    const isHealthy = await yakoaIntegration.healthCheck();
    res.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: 'yakoa-backend',
      timestamp: new Date().toISOString(),
      yakoaBackendUrl: process.env.YAKOA_BACKEND_URL || 'https://seekerip-production-f87d.up.railway.app'
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      service: 'yakoa-backend',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Default route
app.get('/', (_req, res) => {
  res.json({
    message: '✅ Seeker Backend with Yakoa Integration is running!',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      yakoaHealth: '/health/yakoa',
      yakoa: {
        register: '/api/yakoa/register/:ipAssetId',
        status: '/api/yakoa/status/:ipAssetId',
        registerMultiple: '/api/yakoa/register-multiple',
        registerAll: '/api/yakoa/register-all',
        reports: '/api/yakoa/reports',
        assets: '/api/yakoa/assets'
      },
      arbitration: {
        registerAsset: '/api/arbitration/register-asset',
        raiseDispute: '/api/arbitration/raise-dispute',
        castVote: '/api/arbitration/cast-vote',
        resolveDispute: '/api/arbitration/resolve-dispute',
        escalateDispute: '/api/arbitration/escalate-dispute',
        arbitratorResolve: '/api/arbitration/arbitrator-resolve',
        cancelDispute: '/api/arbitration/cancel-dispute',
        getAsset: '/api/arbitration/asset/:assetId',
        getDispute: '/api/arbitration/dispute/:disputeId',
        getVote: '/api/arbitration/vote/:disputeId/:voter',
        getArbitrator: '/api/arbitration/arbitrator/:address',
        getStats: '/api/arbitration/stats',
        getHistory: '/api/arbitration/history/:assetId',
        verifyMessage: '/api/arbitration/verify/:topicId/:sequenceNumber',
        getTopics: '/api/arbitration/topics',
        cleanup: '/api/arbitration/cleanup'
      }
    }
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Route ${req.originalUrl} does not exist`
  });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`🚀 Seeker Backend server running at http://localhost:${PORT}`);
  console.log(`🔗 Yakoa Backend URL: ${process.env.YAKOA_BACKEND_URL || 'https://seekerip-production-f87d.up.railway.app'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Yakoa health check: http://localhost:${PORT}/health/yakoa`);
  
  // Start background jobs with smart stopping conditions
  try {
    await backgroundJobService.start();
    console.log('✅ Background jobs started with smart data detection');
  } catch (error) {
    console.error('❌ Failed to start background jobs:', error);
  }
}); 
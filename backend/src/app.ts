// story/backend/src/app.ts

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import registerRoutes from './routes/register';
import yakoaRoutes from './routes/yakoaRoutes';
import licenseRoutes from './routes/license';
import arbitrationRoutes from './routes/arbitration';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// API Routes
app.use('/api/register', registerRoutes);
app.use('/api/yakoa', yakoaRoutes);
app.use('/api/license', licenseRoutes);
app.use('/api/arbitration', arbitrationRoutes);

// Default route (optional)
app.get('/', (_req, res) => {
  res.json({
    message: '✅ Yakoa + Hedera + Arbitration backend is running!',
    version: '1.0.0',
    endpoints: {
      register: '/api/register',
      yakoa: '/api/yakoa',
      license: '/api/license',
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

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running at http://localhost:${PORT}`);
});

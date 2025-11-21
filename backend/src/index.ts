import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';

import registerRoutes from './routes/register';
import yakoaRoutes from './routes/yakoaRoutes';
import licenseRoutes from './routes/license';
import infringementRoutes from './routes/infringement';
import arbitrationRoutes from './routes/arbitration';
import ipAssetLockerRoutes from './routes/ip-asset-locker';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// API Routes
app.use('/api/register', registerRoutes);
app.use('/api/yakoa', yakoaRoutes);
app.use('/api/license', licenseRoutes);
app.use('/api/infringement', infringementRoutes);
app.use('/api/arbitration', arbitrationRoutes);
app.use('/api/ip-asset-locker', ipAssetLockerRoutes);

// Default route (optional)
app.get('/', (_req, res) => {
  res.json({
    message: '✅ Yakoa + Hedera + Arbitration backend is running!',
    version: '1.0.0',
    endpoints: {
      register: '/api/register',
      yakoa: '/api/yakoa',
      license: '/api/license',
      arbitration: '/api/arbitration',
      ipAssetLocker: '/api/ip-asset-locker'
    }
  });
});

// 404 handler - return JSON instead of HTML
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: 'The requested endpoint does not exist. Check the root path for available endpoints.'
  });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message || 'An unexpected error occurred'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running at http://localhost:${PORT}`);
});

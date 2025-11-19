import express from 'express';
import { yakoaIntegration } from '../lib/yakoa-integration';

const router = express.Router();

// POST /api/yakoa/register/:ipAssetId
router.post('/register/:ipAssetId', async (req, res) => {
  try {
    const { ipAssetId } = req.params;
    
    console.log(`🔍 Registering IP Asset ${ipAssetId} with Yakoa...`);
    
    const result = await yakoaIntegration.registerIPAssetForMonitoring(ipAssetId);
    
    res.json({
      success: true,
      data: result,
      message: `IP Asset ${ipAssetId} registered with Yakoa successfully`
    });
    
  } catch (error: any) {
    console.error('❌ Error registering IP Asset with Yakoa:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to register IP Asset with Yakoa'
    });
  }
});

// GET /api/yakoa/status/:ipAssetId
router.get('/status/:ipAssetId', async (req, res) => {
  try {
    const { ipAssetId } = req.params;
    
    console.log(`🔍 Checking infringement status for IP Asset ${ipAssetId}...`);
    
    const status = await yakoaIntegration.checkInfringementStatus(ipAssetId);
    
    res.json({
      success: true,
      data: status,
      message: `Infringement status retrieved for IP Asset ${ipAssetId}`
    });
    
  } catch (error: any) {
    console.error('❌ Error checking infringement status:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to check infringement status'
    });
  }
});

// POST /api/yakoa/register-multiple
router.post('/register-multiple', async (req, res) => {
  try {
    const { ipAssetIds } = req.body;
    
    if (!ipAssetIds || !Array.isArray(ipAssetIds)) {
      return res.status(400).json({
        success: false,
        error: 'ipAssetIds array is required'
      });
    }
    
    console.log(`🔍 Registering ${ipAssetIds.length} IP assets with Yakoa...`);
    
    const result = await yakoaIntegration.registerMultipleIPAssets(ipAssetIds);
    
    res.json({
      success: true,
      data: result,
      message: `Registered ${result.successCount} out of ${result.total} IP assets with Yakoa`
    });
    
  } catch (error: any) {
    console.error('❌ Error registering multiple IP assets:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to register multiple IP assets with Yakoa'
    });
  }
});

// POST /api/yakoa/register-all
router.post('/register-all', async (req, res) => {
  try {
    console.log('🔍 Registering all active IP assets with Yakoa...');
    
    const result = await yakoaIntegration.registerAllActiveIPAssets();
    
    res.json({
      success: true,
      data: result,
      message: `Registered ${result.successCount} out of ${result.total} active IP assets with Yakoa`
    });
    
  } catch (error: any) {
    console.error('❌ Error registering all IP assets:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to register all IP assets with Yakoa'
    });
  }
});

// GET /api/yakoa/reports
router.get('/reports', async (req, res) => {
  try {
    console.log('🔍 Fetching infringement reports for all IP assets...');
    
    const reports = await yakoaIntegration.getAllInfringementReports();
    
    res.json({
      success: true,
      data: reports,
      message: `Retrieved infringement reports for ${reports.successCount} out of ${reports.total} IP assets`
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching infringement reports:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch infringement reports'
    });
  }
});

// GET /api/yakoa/assets
router.get('/assets', async (req, res) => {
  try {
    console.log('🔍 Fetching IP assets for Yakoa registration...');
    
    const assets = await yakoaIntegration.getIPAssetsForYakoaRegistration();
    
    res.json({
      success: true,
      data: assets,
      message: `Found ${assets.length} IP assets available for Yakoa registration`
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching IP assets:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch IP assets for Yakoa registration'
    });
  }
});

export default router; 
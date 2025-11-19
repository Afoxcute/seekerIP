// src/routes/yakoaRoutes.ts
import express from 'express';
import axios from 'axios';

const router = express.Router();

const YAKOA_API_KEY = process.env.YAKOA_API_KEY!;

const BASE_URL = 'https://docs-demo.ip-api-sandbox.yakoa.io/docs-demo/token';

/**
 * Extract base ID without timestamp for Yakoa API calls
 * @param id - The full ID (may include timestamp)
 * @returns Base ID in format contract:tokenId
 */
function getBaseIdForYakoa(id: string): string {
  const parts = id.split(':');
  if (parts.length >= 2) {
    // Return contract:tokenId format (first two parts)
    return `${parts[0]}:${parts[1]}`;
  }
  return id; // Return as-is if no colon found
}

// POST /api/yakoa/register
router.post('/register', async (req, res) => {
  try {
    const { ipAssetId, registrationData } = req.body;

    if (!registrationData) {
      return res.status(400).json({ error: 'Registration data is required' });
    }

    const {
      tokenId,
      transactionHash,
      creatorId,
      title,
      description,
      mediaUrl,
      ipfsHash
    } = registrationData;

    console.log(`🔍 Registering IP Asset ${ipAssetId} with Yakoa...`);
    console.log('Registration data:', registrationData);

    // Check if IP asset already exists in Yakoa
    const baseId = getBaseIdForYakoa(tokenId);
    const checkUrl = `${BASE_URL}/${encodeURIComponent(baseId)}`;

    try {
      await axios.get(checkUrl, {
        headers: {
          'X-API-KEY': YAKOA_API_KEY,
        },
      });
      
      console.log(`⚠️ IP asset ${tokenId} already exists in Yakoa`);
      return res.json({
        success: true,
        alreadyRegistered: true,
        message: 'IP asset already registered in Yakoa',
        tokenId: baseId
      });
    } catch (checkError: any) {
      if (checkError.response?.status !== 404) {
        throw checkError;
      }
      // 404 means not found, so we can proceed with registration
    }

    // Register with Yakoa
    const timestamp = new Date().toISOString();
    
    const yakoaPayload = {
      id: baseId,
      registration_tx: {
        hash: transactionHash,
        block_number: Math.floor(Math.random() * 1000000) + 5000000, // Random block number
        timestamp: timestamp,
      },
      creator_id: creatorId,
      metadata: {
        title: title,
        description: description,
      },
      media: mediaUrl ? [
        {
          media_id: title,
          url: mediaUrl
        }
      ] : []
    };

    console.log('Yakoa payload:', yakoaPayload);

    const response = await axios.post(BASE_URL, yakoaPayload, {
      headers: {
        'X-API-KEY': YAKOA_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Yakoa registration successful:', response.data);

    res.json({
      success: true,
      alreadyRegistered: false,
      message: 'IP asset successfully registered with Yakoa',
      data: response.data,
      tokenId: baseId
    });

  } catch (error: any) {
    console.error('❌ Error registering with Yakoa:', error.response?.data || error.message);
    
    // Handle 409 Conflict (already registered)
    if (error.response?.status === 409) {
      return res.json({
        success: true,
        alreadyRegistered: true,
        message: 'IP asset already registered in Yakoa (handled conflict)',
        tokenId: getBaseIdForYakoa(req.body.registrationData?.tokenId || '')
      });
    }

    res.status(500).json({ 
      error: 'Failed to register with Yakoa',
      details: error.response?.data || error.message
    });
  }
});

// GET /api/yakoa/status/:id
router.get('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const baseId = getBaseIdForYakoa(id);
    
    const yakoaApiUrl = `https://docs-demo.ip-api-sandbox.yakoa.io/docs-demo/token/${encodeURIComponent(baseId)}`;

    console.log("Fetching Yakoa status from:", yakoaApiUrl);
    console.log("🔍 Using base ID for API call:", baseId);

    const response = await axios.get(yakoaApiUrl, {
      headers: {
        'X-API-KEY': process.env.YAKOA_API_KEY || 'your-api-key',
      },
    });
    console.log("Yakoa response:", response.data);

    res.json(response.data);
  } catch (error: any) {
    console.error('❌ Error fetching Yakoa status:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch infringement status' });
  }
});

// GET /api/yakoa/infringements
router.get('/infringements', async (req, res) => {
  try {
    console.log('🔍 Fetching all infringement reports...');
    
    // This would typically fetch from a database or cache
    // For now, return a mock response
    res.json({
      total: 0,
      infringements: [],
      message: 'No infringements found'
    });
  } catch (error: any) {
    console.error('❌ Error fetching infringements:', error.message);
    res.status(500).json({ error: 'Failed to fetch infringements' });
  }
});

export default router;

#!/usr/bin/env tsx

import { yakoaIntegration } from '../lib/yakoa-integration';
import config from '../env.config';

async function testYakoaIntegration() {
  console.log('🧪 Testing Yakoa Integration...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Yakoa Backend Health Check...');
    const isHealthy = await yakoaIntegration.healthCheck();
    console.log(`   Health Status: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    console.log(`   Backend URL: ${config.yakoa.backendUrl}`);
    console.log(`   API Key: ${config.yakoa.apiKey ? '✅ Set' : '❌ Not Set'}\n`);

    if (!isHealthy) {
      console.log('⚠️  Yakoa backend is not healthy. Please ensure it is running on port 5000.\n');
      return;
    }

    // Test 2: Get Available IP Assets
    console.log('2️⃣ Testing IP Assets Retrieval...');
    try {
      const assets = await yakoaIntegration.getIPAssetsForYakoaRegistration();
      console.log(`   Found ${assets.length} IP assets available for registration\n`);
      
      if (assets.length > 0) {
        console.log('   Sample IP Asset:');
        console.log(`   - ID: ${assets[0].id}`);
        console.log(`   - Name: ${assets[0].name}`);
        console.log(`   - Owner: ${assets[0].owner}\n`);
      }
    } catch (error: any) {
      console.log(`   ❌ Error retrieving IP assets: ${error.message}\n`);
    }

    // Test 3: Test Registration with Sample Data
    console.log('3️⃣ Testing IP Asset Registration...');
    try {
      // This would normally use a real IP asset ID from the database
      // For testing, we'll use a mock ID
      const mockIpAssetId = 'test-ip-asset-123';
      console.log(`   Testing with mock IP Asset ID: ${mockIpAssetId}`);
      
      // Note: This will fail if the IP asset doesn't exist in the database
      // but it will test the integration flow
      console.log('   ⚠️  Skipping actual registration test (requires real IP asset in database)');
      console.log('   To test real registration, ensure you have IP assets in your database\n');
    } catch (error: any) {
      console.log(`   ❌ Error in registration test: ${error.message}\n`);
    }

    // Test 4: Test Infringement Status Check
    console.log('4️⃣ Testing Infringement Status Check...');
    try {
      // This would normally use a real IP asset ID from the database
      const mockIpAssetId = 'test-ip-asset-123';
      console.log(`   Testing with mock IP Asset ID: ${mockIpAssetId}`);
      
      // Note: This will fail if the IP asset doesn't exist in the database
      console.log('   ⚠️  Skipping actual status check test (requires real IP asset in database)');
      console.log('   To test real status checks, ensure you have IP assets in your database\n');
    } catch (error: any) {
      console.log(`   ❌ Error in status check test: ${error.message}\n`);
    }

    console.log('✅ Yakoa Integration Test Completed!\n');
    console.log('📋 Next Steps:');
    console.log('   1. Ensure Yakoa backend is running on port 5000');
    console.log('   2. Add real IP assets to your database');
    console.log('   3. Test real registration and status checks');
    console.log('   4. Monitor the integration logs for any issues\n');

  } catch (error: any) {
    console.error('❌ Yakoa Integration Test Failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testYakoaIntegration().catch(console.error); 
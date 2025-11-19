#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function testPrismaBigInt() {
  console.log('🔍 Testing Prisma BigInt handling...');

  const prisma = new PrismaClient();

  try {
    // Test creating a simple BigInt value
    const testValue = BigInt('19000000000000000000');
    console.log('Test BigInt value:', testValue);
    console.log('Test BigInt type:', typeof testValue);

    // Try to create a simple record with BigInt
    const result = await prisma.hBARTokenBalance.create({
      data: {
        owner: '0x9404966338eB27aF420a952574d777598Bbb58c4',
        balance: testValue,
        totalMinted: testValue,
        totalBurned: BigInt(0),
      }
    });

    console.log('✅ Successfully created record:', result);

    // Clean up
    await prisma.hBARTokenBalance.delete({
      where: { id: result.id }
    });

    console.log('✅ Cleaned up test record');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaBigInt().catch(console.error);

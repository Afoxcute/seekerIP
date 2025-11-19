const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testBigIntFix() {
  console.log('🧪 Testing BigInt Fix');
  console.log('===================\n');

  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await prisma.hBARTokenBalance.deleteMany();
    await prisma.iPAsset.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Existing data cleared\n');

    // Add a test user
    console.log('👤 Adding test user...');
    const testUser = await prisma.user.create({
      data: {
        address: '0x9404966338eB27aF420a952574d777598Bbb58c4',
      }
    });
    console.log(`✅ Test user created: ${testUser.address}\n`);

    // Test different BigInt approaches
    console.log('🔢 Testing BigInt approaches...');
    
    const testValue = 1900000000000000000n; // Smaller value within bigint range
    console.log(`Test value: ${testValue.toString()}`);
    console.log(`Test value type: ${typeof testValue}`);

    // Approach 1: Direct BigInt
    try {
      console.log('\n📝 Testing Approach 1: Direct BigInt');
      await prisma.hBARTokenBalance.create({
        data: {
          owner: testUser.address,
          balance: testValue,
          totalMinted: testValue,
          totalBurned: 0n
        }
      });
      console.log('✅ Approach 1: Direct BigInt - SUCCESS');
    } catch (error) {
      console.log('❌ Approach 1: Direct BigInt - FAILED');
      console.log(`Error: ${error.message}`);
    }

    // Approach 2: BigInt from string
    try {
      console.log('\n📝 Testing Approach 2: BigInt from string');
      await prisma.hBARTokenBalance.create({
        data: {
          owner: testUser.address + '2',
          balance: BigInt(testValue.toString()),
          totalMinted: BigInt(testValue.toString()),
          totalBurned: BigInt(0)
        }
      });
      console.log('✅ Approach 2: BigInt from string - SUCCESS');
    } catch (error) {
      console.log('❌ Approach 2: BigInt from string - FAILED');
      console.log(`Error: ${error.message}`);
    }

    // Approach 3: Raw SQL with proper casting
    try {
      console.log('\n📝 Testing Approach 3: Raw SQL with casting');
      await prisma.$executeRaw`
        INSERT INTO hbar_token_balances (id, owner, balance, "totalMinted", "totalBurned", "lastUpdated")
        VALUES (gen_random_uuid(), ${testUser.address + '3'}, ${testValue.toString()}::bigint, ${testValue.toString()}::bigint, 0::bigint, NOW())
      `;
      console.log('✅ Approach 3: Raw SQL with casting - SUCCESS');
    } catch (error) {
      console.log('❌ Approach 3: Raw SQL with casting - FAILED');
      console.log(`Error: ${error.message}`);
    }

    // Check results
    console.log('\n📊 Database Contents:');
    const balances = await prisma.hBARTokenBalance.findMany();
    console.log(`Found ${balances.length} HBAR token balances:`);
    balances.forEach((balance, index) => {
      console.log(`\n${index + 1}. Owner: ${balance.owner}`);
      console.log(`   Balance: ${balance.balance.toString()}`);
      console.log(`   Total Minted: ${balance.totalMinted.toString()}`);
      console.log(`   Total Burned: ${balance.totalBurned.toString()}`);
    });

    console.log('\n🎉 BigInt fix test completed!');

  } catch (error) {
    console.error('❌ Error during BigInt fix test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testBigIntFix()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up database configuration...');

// Check if .env exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    console.log('📋 Creating .env file from env.example...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created');
  } else {
    console.log('❌ env.example file not found');
    process.exit(1);
  }
}

// Read current .env content
let envContent = fs.readFileSync(envPath, 'utf8');

// Update DATABASE_URL to PostgreSQL
if (envContent.includes('DATABASE_URL=file:./prisma/dev.db')) {
  console.log('🔄 Updating DATABASE_URL to PostgreSQL...');
  envContent = envContent.replace(
    'DATABASE_URL=file:./prisma/dev.db',
    'DATABASE_URL=postgresql://postgres:password@localhost:5432/seeker_db'
  );
  
  // Add new contract addresses
  const newAddresses = `
# IP Asset Locker Contracts
IP_ASSET_LOCKER_ADDRESS=0xec0dBd92a8D1A222d34ecdB088B0022F38aF2883
HBAR_EQUIVALENT_TOKEN_ADDRESS=0x9f4FC76E91e483b02DA42A0a10592e603F670dc9
`;

  // Insert new addresses after existing contract addresses
  const contractAddressesEnd = envContent.indexOf('ARBITRATION_CONTRACT_ADDRESS=');
  if (contractAddressesEnd !== -1) {
    const arbitrationLine = envContent.indexOf('\n', contractAddressesEnd);
    if (arbitrationLine !== -1) {
      envContent = envContent.slice(0, arbitrationLine) + newAddresses + envContent.slice(arbitrationLine);
    }
  }

  // Update arbitration contract address
  envContent = envContent.replace(
    'ARBITRATION_CONTRACT_ADDRESS=0x5C7424821131c2314F9f9494f01DDb14C9904A62',
    'ARBITRATION_CONTRACT_ADDRESS=0x60f4a0ee098394951bb704709842C92dF25038b2'
  );

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file updated with PostgreSQL configuration');
} else {
  console.log('ℹ️ .env file already exists, skipping update');
}

console.log('\n📝 Next steps:');
console.log('1. Update the DATABASE_URL in .env with your PostgreSQL credentials');
console.log('2. Ensure PostgreSQL is running and the database exists');
console.log('3. Run: pnpm run db:migrate');
console.log('4. Run: pnpm run db:generate');
console.log('5. Start the server: pnpm run server');

console.log('\n🔗 Database setup complete!');

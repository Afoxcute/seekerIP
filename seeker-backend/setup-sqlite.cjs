#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up SQLite database for testing...');

// Check if .env exists
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update DATABASE_URL to SQLite for testing
  envContent = envContent.replace(
    /DATABASE_URL=postgresql:\/\/.*/,
    'DATABASE_URL=file:./prisma/dev.db'
  );
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Updated .env to use SQLite database');
} else {
  console.log('❌ .env file not found. Run setup-env.cjs first');
  process.exit(1);
}

console.log('\n📝 Next steps:');
console.log('1. Run: pnpm run db:migrate');
console.log('2. Run: pnpm run db:generate');
console.log('3. Start the server: pnpm run server');

console.log('\n🔗 SQLite setup complete!');

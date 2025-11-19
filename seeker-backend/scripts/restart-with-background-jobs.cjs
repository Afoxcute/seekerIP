const { spawn } = require('child_process');
const path = require('path');

console.log('🔄 Restarting server with background jobs enabled...');

// Kill any existing server processes
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping server...');
  process.exit(0);
});

// Start the server
const server = spawn('pnpm', ['run', 'server'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

server.on('error', (error) => {
  console.error('❌ Error starting server:', error);
});

server.on('close', (code) => {
  console.log(`\n📊 Server process exited with code ${code}`);
});

console.log('✅ Server started with background jobs enabled');
console.log('📊 Background jobs will:');
console.log('  - Sync data every 2 minutes');
console.log('  - Stop automatically when no new data is found (3 consecutive empty syncs)');
console.log('  - Handle rate limiting gracefully');
console.log('  - Process events every 30 seconds');
console.log('\n🔍 Monitor status at: http://localhost:3001/api/contract-data/background-jobs/status');
console.log('📊 View data at: http://localhost:3001/api/contract-data/stats');
console.log('\nPress Ctrl+C to stop the server');

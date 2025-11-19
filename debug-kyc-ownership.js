// Debug script to check KYC ownership
// Run this in the browser console on the KYC Management page

async function debugKYCOwnership() {
  console.log('=== KYC OWNERSHIP DEBUG ===');
  
  // Get the current account
  const account = window.thirdweb?.account;
  if (!account) {
    console.error('No account connected');
    return;
  }
  
  console.log('Connected Account:', account.address);
  console.log('Expected Owner:', '0x9404966338eB27aF420a952574d777598Bbb58c4');
  console.log('Is Expected Owner:', account.address.toLowerCase() === '0x9404966338eB27aF420a952574d777598Bbb58c4'.toLowerCase());
  
  // Check contract addresses
  const contractAddresses = {
    IP_ASSET_HTS_KYC: "0x4430248F3b2304F946f08c43A06C3451657FD658",
    IP_ASSET_MANAGER_V2: "0xcBE19598bC8443616A55c0BeD139f9048cb50B06",
    HTSToken: "0x00000000000000000000000000000000006c4167"
  };
  
  console.log('Contract Addresses:', contractAddresses);
  
  // Try to check ownership directly
  try {
    // This would need to be run in the context of the app with thirdweb client
    console.log('To check ownership, look for the debug log in the KYC Management tab');
    console.log('Expected log: "KYC Status Debug: { accountAddress: "...", isOwner: true/false, ... }"');
  } catch (error) {
    console.error('Error checking ownership:', error);
  }
}

// Instructions for the user
console.log(`
=== KYC OWNERSHIP DEBUG INSTRUCTIONS ===

1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Navigate to the KYC Management tab in your app
4. Look for this log: "KYC Status Debug:"
5. Check if isOwner is true or false

Expected values:
- accountAddress: Your connected wallet address
- isOwner: true (if you're the owner)
- deployerAddress: 0x9404966338eB27aF420a952574d777598Bbb58c4

If isOwner is false, you need to connect with the deployer wallet.
`);

// Run the debug function
debugKYCOwnership();




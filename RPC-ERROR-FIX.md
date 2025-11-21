# RPC Endpoint Error Fix - Revenue Payment Issue

## Problem
The `payRevenue` function was failing with error:
```
Error paying revenue: {code: -32603, message: 'RPC endpoint returned HTTP client error.', ...}
```

## Root Cause
The issue was in how the Hedera Testnet chain configuration was being used:

1. **In `contractService.ts`**: The RPC endpoint was hardcoded to `https://testnet.hashio.io/api` without fallback options
2. **In `App.tsx`**: The code was using `defineChain(hederaTestnet.id)` which only passes the chain ID, not the full chain configuration with RPC details

When Thirdweb tried to send transactions, it couldn't properly route them through the RPC endpoint, resulting in HTTP client errors.

## Solution Applied

### 1. Updated `contractService.ts` (lines 9-31)
Added multiple RPC endpoint fallbacks to the Hedera Testnet configuration:
```typescript
export const hederaTestnet = {
  id: 296,
  name: 'Hedera Testnet',
  nativeCurrency: { ... },
  rpc: 'https://testnet.hashio.io/api',
  rpcUrls: {
    default: {
      http: ['https://testnet.hashio.io/api', 'https://hedera-testnet-rpc.allthatnode.com:8545'],
    },
    public: {
      http: ['https://testnet.hashio.io/api', 'https://hedera-testnet-rpc.allthatnode.com:8545'],
    },
  },
  blockExplorers: [ ... ],
};
```

### 2. Updated `App.tsx`
- **Line 29**: Changed import to use `hederaTestnet` from `contractService` instead of `viem/chains`
- **Lines 623, 733, 1150, 1168, 1205, 1222, 1263**: Replaced all `defineChain(hederaTestnet.id)` calls with direct `hederaTestnet` reference
- **Line 16**: Removed unused `defineChain` import

## Why This Works
1. **Full Chain Configuration**: By passing the complete `hederaTestnet` object instead of just the chain ID, Thirdweb has access to the full RPC configuration
2. **Fallback RPC Endpoints**: If the primary endpoint fails, the secondary endpoint can be used for retries
3. **Consistent Configuration**: All contract interactions now use the same properly-configured chain object

## Files Modified
- `app/src/services/contractService.ts` - Added RPC fallback configuration
- `app/src/App.tsx` - Updated all chain references to use proper configuration

## Testing
The `payRevenue` function should now:
1. Successfully connect to the Hedera Testnet RPC endpoint
2. Send the transaction without HTTP client errors
3. Properly wait for receipt confirmation
4. Display success/error notifications correctly

If issues persist, check:
- Network connectivity to Hedera Testnet
- Wallet has sufficient HBAR for gas fees
- Contract address is correct in `deployed_addresses.json`

# KYC Service Debugging Guide

## Issue: "HTS: grant KYC failed"

The KYC granting functionality was failing because it was calling the wrong contract. This guide explains the fix and provides debugging steps.

## Root Cause Analysis

### Problem
The KYC service was calling `grantKYCForIPAssets` on the `IPAssetManagerV2` contract instead of calling `grantKYC` directly on the `IPAssetHTSKYC` contract.

### Architecture
```
IPAssetManagerV2 (0xcBE19598bC8443616A55c0BeD139f9048cb50B06)
    ↓ delegates to
IPAssetHTSKYC (0x4430248F3b2304F946f08c43A06C3451657FD658)
    ↓ manages
HTS Token (0x00000000000000000000000000000000006c4167)
```

## Fix Applied

### 1. Updated Contract References
```typescript
// Before: Using IPAssetManagerV2 for KYC operations
contract: this.ipAssetManagerContract,
method: "function grantKYCForIPAssets(address account)",

// After: Using IPAssetHTSKYC directly
contract: this.htsKycContract,
method: "function grantKYC(address account)",
```

### 2. Added HTS KYC Contract
```typescript
// Initialize HTS KYC contract
this.htsKycContract = getContract({
  address: CONTRACT_ADDRESSES.IP_ASSET_HTS_KYC,
  chain: defineChain(hederaTestnet.id),
  client: this.client,
  abi: IP_ASSET_HTS_KYC_ABI,
});
```

### 3. Updated All KYC Functions
- `grantKYC()` - Now calls HTS KYC contract directly
- `revokeKYC()` - Now calls HTS KYC contract directly  
- `updateKYCKey()` - Now calls HTS KYC contract directly
- `getIPAssetNFTTokenAddress()` - Now reads from HTS KYC contract
- `isOwner()` - Now checks HTS KYC contract ownership

## Common KYC Issues and Solutions

### 1. Account Association Required
**Issue**: Account must be associated with HTS token before KYC can be granted.

**Solution**: 
```typescript
// Check if account is associated (placeholder implementation)
async isAccountAssociated(account: string) {
  // In production, check HTS token association status
  return true; // Placeholder
}
```

### 2. Ownership Verification
**Issue**: Only the contract owner can grant/revoke KYC.

**Solution**:
```typescript
async isOwner(account: any) {
  const owner = await readContract({
    contract: this.htsKycContract,
    method: "function owner() view returns (address)",
    params: [],
  });
  return owner.toLowerCase() === account.address.toLowerCase();
}
```

### 3. KYC Key Management
**Issue**: KYC key must be properly formatted as bytes.

**Solution**:
```typescript
// Convert hex string to bytes
const keyBytes = newKYCKey.startsWith('0x') ? newKYCKey.slice(2) : newKYCKey;
const keyBytesArray = `0x${keyBytes}` as `0x${string}`;
```

## Debugging Steps

### 1. Check Contract Ownership
```typescript
const kycService = createKYCService(client);
const isOwner = await kycService.isOwner(account);
console.log('Is owner:', isOwner);
```

### 2. Verify Contract Addresses
```typescript
const addresses = kycService.getContractAddresses();
console.log('Contract addresses:', addresses);
```

### 3. Check HTS Token Address
```typescript
const tokenAddress = await kycService.getIPAssetNFTTokenAddress();
console.log('HTS Token Address:', tokenAddress);
```

### 4. Test KYC Grant
```typescript
const result = await kycService.grantKYC(account, targetAccount);
if (result.success) {
  console.log('KYC granted successfully:', result.transactionHash);
} else {
  console.error('KYC grant failed:', result.error);
}
```

## Contract Function Signatures

### IPAssetHTSKYC Contract Functions
```solidity
function grantKYC(address account) external onlyOwner
function revokeKYC(address account) external onlyOwner  
function updateKYCKey(bytes newKYCKey) external onlyOwner
function tokenAddress() external view returns (address)
function owner() external view returns (address)
```

### IPAssetManagerV2 Contract Functions (Delegation)
```solidity
function grantKYCForIPAssets(address account) external onlyOwner
function revokeKYCForIPAssets(address account) external onlyOwner
function updateKYCKeyForIPAssets(bytes newKYCKey) external onlyOwner
function getIPAssetNFTTokenAddress() external view returns (address)
```

## Testing Checklist

- [ ] Verify contract addresses are correct
- [ ] Check that the calling account is the owner
- [ ] Ensure target account is associated with HTS token
- [ ] Validate KYC key format (if updating)
- [ ] Check transaction gas limits
- [ ] Verify network connectivity
- [ ] Confirm contract deployment status

## Error Messages and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "HTS: grant KYC failed" | Wrong contract or account not associated | Use HTS KYC contract directly |
| "Ownable: caller is not the owner" | Not the contract owner | Check ownership or use owner account |
| "Account not associated" | Account not associated with HTS token | Associate account first |
| "Invalid KYC key" | Malformed key bytes | Format key as proper hex bytes |

## Production Considerations

1. **Account Association**: Implement proper HTS token association checking
2. **Error Handling**: Add specific error messages for different failure modes
3. **Gas Estimation**: Add gas estimation before transactions
4. **Transaction Monitoring**: Implement transaction status monitoring
5. **Retry Logic**: Add retry logic for transient failures
6. **Logging**: Implement comprehensive logging for debugging

## Next Steps

1. Test the updated KYC service with the frontend
2. Implement proper account association checking
3. Add comprehensive error handling
4. Create integration tests for KYC operations
5. Document KYC workflow for end users




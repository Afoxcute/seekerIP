import { ethers } from 'ethers';

// Contract addresses from deployments
export const CONTRACT_ADDRESSES = {
  // IP Asset Manager V2
  IP_ASSET_MANAGER_V2: '0xA20Ba7d4aD1bb40D46f3B9F8b4e722848C68d80a',
  
  // IP Asset Locker
  IP_ASSET_LOCKER: '0xec0dBd92a8D1A222d34ecdB088B0022F38aF2883',
  
  // HBAR Equivalent Token
  HBAR_EQUIVALENT_TOKEN: '0x9f4FC76E91e483b02DA42A0a10592e603F670dc9',
  
  // Intellectual Property Arbitration
  INTELLECTUAL_PROPERTY_ARBITRATION: '0x60f4a0ee098394951bb704709842C92dF25038b2',
  
  // Tokenized Asset Manager
  TOKENIZED_ASSET_MANAGER: '0x0000000000000000000000000000000000000000', // Update with actual address
  
  // Network configuration
  CHAIN_ID: 296, // Hedera Testnet
  RPC_URL: process.env.HEDERA_RPC_URL || 'https://testnet.hashio.io/api',
} as const;

// Contract ABIs - Event signatures for indexing
export const CONTRACT_EVENTS = {
  IP_ASSET_MANAGER_V2: {
    IPAssetRegistered: 'IPAssetRegistered(uint256,string,address,string,string,uint256,bool,address,address,uint256,uint256,uint256,string)',
    LicenseAttached: 'LicenseAttached(uint256,uint256,string)',
    LicenseTokenMinted: 'LicenseTokenMinted(uint256,address,uint256,uint256)',
    RevenuePaid: 'RevenuePaid(uint256,address,uint256,string)',
    RoyaltyClaimed: 'RoyaltyClaimed(uint256,address,uint256)',
    IPAssetTransferred: 'IPAssetTransferred(uint256,address,address)',
  },
  
  IP_ASSET_LOCKER: {
    IPAssetLocked: 'IPAssetLocked(address,uint256,uint256,uint256)',
    IPAssetUnlocked: 'IPAssetUnlocked(address,uint256,uint256,uint256)',
    HBARTokensMinted: 'HBARTokensMinted(address,uint256,uint256)',
    HBARTokensBurned: 'HBARTokensBurned(address,uint256,uint256)',
  },
  
  HBAR_EQUIVALENT_TOKEN: {
    Transfer: 'Transfer(address,address,uint256)',
    TokensMinted: 'TokensMinted(address,uint256,uint256)',
    TokensBurned: 'TokensBurned(address,uint256,uint256)',
  },
  
  INTELLECTUAL_PROPERTY_ARBITRATION: {
    DisputeCreated: 'DisputeCreated(uint256,address,address,uint256)',
    EvidenceSubmitted: 'EvidenceSubmitted(uint256,address,string,string)',
    VoteCast: 'VoteCast(uint256,address,uint8,uint256)',
    DisputeResolved: 'DisputeResolved(uint256,uint8,string)',
  },
  
  TOKENIZED_ASSET_MANAGER: {
    AssetCreated: 'AssetCreated(uint256,string,string,uint256,uint8,address)',
    Transfer: 'Transfer(address,address,uint256)',
    Approval: 'Approval(address,address,uint256)',
  },
} as const;

// Contract interfaces for reading data
export const CONTRACT_INTERFACES = {
  IP_ASSET_MANAGER_V2: new ethers.Interface([
    'function getIPAsset(uint256) view returns (uint256,address,string,string,string,uint256,bool,address,address,uint256,uint256,uint256,string)',
    'function getUserAssets(address) view returns (uint256[])',
    'function getIPAssetOwner(uint256) view returns (address)',
    'function isIPAssetActive(uint256) view returns (bool)',
  ]),
  
  IP_ASSET_LOCKER: new ethers.Interface([
    'function isIPAssetLocked(uint256) view returns (bool)',
    'function getLockedAmount(uint256) view returns (uint256)',
    'function getUserLockedIPAssets(address) view returns (uint256[])',
    'function getTotalMintedHBAR() view returns (uint256)',
    'function totalLockedAssets() view returns (uint256)',
    'function getIPAssetEligibilityDetails(uint256) view returns (bool,string,bool,bool,bool,bool,bool)',
  ]),
  
  HBAR_EQUIVALENT_TOKEN: new ethers.Interface([
    'function balanceOf(address) view returns (uint256)',
    'function totalMinted() view returns (uint256)',
    'function getLocker() view returns (address)',
    'function isInitialized() view returns (bool)',
  ]),
  
  INTELLECTUAL_PROPERTY_ARBITRATION: new ethers.Interface([
    'function isArbitrationEligible(uint256) view returns (bool,bool)',
    'function getDispute(uint256) view returns (address,address,uint256,uint256,uint256,uint256,uint256,string,bool)',
    'function getDisputeCount() view returns (uint256)',
    'function getVote(uint256,address) view returns (uint8,uint256)',
  ]),
  
  TOKENIZED_ASSET_MANAGER: new ethers.Interface([
    'function getAsset(uint256) view returns (string,string,uint256,uint8,address,bool)',
    'function totalAssets() view returns (uint256)',
    'function balanceOf(address,uint256) view returns (uint256)',
  ]),
} as const;

// Contract configuration for indexing
export const CONTRACT_CONFIGS = [
  {
    name: 'IPAssetManagerV2',
    address: CONTRACT_ADDRESSES.IP_ASSET_MANAGER_V2,
    events: CONTRACT_EVENTS.IP_ASSET_MANAGER_V2,
    interface: CONTRACT_INTERFACES.IP_ASSET_MANAGER_V2,
    startBlock: 0, // Will be updated based on deployment
  },
  {
    name: 'IPAssetLocker',
    address: CONTRACT_ADDRESSES.IP_ASSET_LOCKER,
    events: CONTRACT_EVENTS.IP_ASSET_LOCKER,
    interface: CONTRACT_INTERFACES.IP_ASSET_LOCKER,
    startBlock: 0,
  },
  {
    name: 'HBAREquivalentToken',
    address: CONTRACT_ADDRESSES.HBAR_EQUIVALENT_TOKEN,
    events: CONTRACT_EVENTS.HBAR_EQUIVALENT_TOKEN,
    interface: CONTRACT_INTERFACES.HBAR_EQUIVALENT_TOKEN,
    startBlock: 0,
  },
  {
    name: 'IntellectualPropertyArbitration',
    address: CONTRACT_ADDRESSES.INTELLECTUAL_PROPERTY_ARBITRATION,
    events: CONTRACT_EVENTS.INTELLECTUAL_PROPERTY_ARBITRATION,
    interface: CONTRACT_INTERFACES.INTELLECTUAL_PROPERTY_ARBITRATION,
    startBlock: 0,
  },
  {
    name: 'TokenizedAssetManager',
    address: CONTRACT_ADDRESSES.TOKENIZED_ASSET_MANAGER,
    events: CONTRACT_EVENTS.TOKENIZED_ASSET_MANAGER,
    interface: CONTRACT_INTERFACES.TOKENIZED_ASSET_MANAGER,
    startBlock: 0,
  },
] as const;

export type ContractName = typeof CONTRACT_CONFIGS[number]['name'];
export type ContractConfig = typeof CONTRACT_CONFIGS[number];

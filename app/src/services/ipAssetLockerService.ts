const API_BASE_URL = 'http://localhost:5000/api/ip-asset-locker';

export interface LockedIPAsset {
  ipAssetId: number;
  isLocked: boolean;
  lockedAmount: string;
}

export interface IPAssetLockerStats {
  totalMintedHBAR: string;
  totalHBARTokensMinted: string;
  totalLockedAssets: number;
}

export interface UserLockedAssets {
  lockedAssets: LockedIPAsset[];
  hbarBalance: string;
}

export interface LockIPAssetRequest {
  ipAssetId: number;
  hbarAmount: string;
  userAddress: string;
}

export interface UnlockIPAssetRequest {
  ipAssetId: number;
  hbarAmount: string;
  userAddress: string;
}

export interface EligibilityResponse {
  isEligible: boolean;
  reason?: string;
}

export interface EligibilityDetails {
  eligible: boolean;
  reason: string;
  assetExists: boolean;
  isActive: boolean;
  arbitrationEligible: boolean;
  infringementDetected: boolean;
  alreadyLocked: boolean;
}

class IPAssetLockerService {
  async getStats(): Promise<IPAssetLockerStats> {
    const response = await fetch(`${API_BASE_URL}/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch IP Asset Locker stats');
    }
    const data = await response.json();
    return data.data;
  }

  async getUserLockedAssets(userAddress: string): Promise<UserLockedAssets> {
    const response = await fetch(`${API_BASE_URL}/user/${userAddress}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user locked assets');
    }
    const data = await response.json();
    return data.data;
  }

  async lockIPAsset(request: LockIPAssetRequest): Promise<{ transactionHash: string }> {
    const response = await fetch(`${API_BASE_URL}/lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to lock IP asset');
    }

    const data = await response.json();
    return data;
  }

  async unlockIPAsset(request: UnlockIPAssetRequest): Promise<{ transactionHash: string }> {
    const response = await fetch(`${API_BASE_URL}/unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to unlock IP asset');
    }

    const data = await response.json();
    return data;
  }

  async checkEligibility(ipAssetId: string): Promise<EligibilityResponse> {
    const response = await fetch(`${API_BASE_URL}/eligibility/${ipAssetId}`);
    if (!response.ok) {
      throw new Error('Failed to check eligibility');
    }
    const data = await response.json();
    return data.data;
  }

  async getEligibilityDetails(ipAssetId: string): Promise<EligibilityDetails> {
    const response = await fetch(`${API_BASE_URL}/eligibility-details/${ipAssetId}`);
    if (!response.ok) {
      throw new Error('Failed to get eligibility details');
    }
    const data = await response.json();
    return data.data;
  }

  async getAssetStatus(ipAssetId: string): Promise<{
    isLocked: boolean;
    lockedAmount: string;
    owner: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/status/${ipAssetId}`);
    if (!response.ok) {
      throw new Error('Failed to get asset status');
    }
    const data = await response.json();
    return data.data;
  }

  async getHBARTokenBalance(userAddress: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/balance/${userAddress}`);
    if (!response.ok) {
      throw new Error('Failed to get HBAR token balance');
    }
    const data = await response.json();
    return data.data.balance;
  }
}

export const ipAssetLockerService = new IPAssetLockerService();

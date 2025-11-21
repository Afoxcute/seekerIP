const API_BASE_URL = 'https://seekerip-production-f87d.up.railway.app/api/ip-asset-locker';

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
  private async handleResponse<T>(response: Response, endpoint: string): Promise<T> {
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage = `API Error (${response.status}): ${endpoint}`;
      
      if (contentType?.includes('application/json')) {
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
        } catch {
          errorMessage = `${errorMessage} - Invalid JSON response`;
        }
      } else {
        errorMessage = `${errorMessage} - Backend may not be running or endpoint not found`;
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    return data.data || data;
  }

  async getStats(): Promise<IPAssetLockerStats> {
    const response = await fetch(`${API_BASE_URL}/stats`);
    return this.handleResponse<IPAssetLockerStats>(response, '/stats');
  }

  async getUserLockedAssets(userAddress: string): Promise<UserLockedAssets> {
    const response = await fetch(`${API_BASE_URL}/user/${userAddress}`);
    return this.handleResponse<UserLockedAssets>(response, `/user/${userAddress}`);
  }

  async lockIPAsset(request: LockIPAssetRequest): Promise<{ transactionHash: string }> {
    const response = await fetch(`${API_BASE_URL}/lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    return this.handleResponse<{ transactionHash: string }>(response, '/lock');
  }

  async unlockIPAsset(request: UnlockIPAssetRequest): Promise<{ transactionHash: string }> {
    const response = await fetch(`${API_BASE_URL}/unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    return this.handleResponse<{ transactionHash: string }>(response, '/unlock');
  }

  async checkEligibility(ipAssetId: string): Promise<EligibilityResponse> {
    const response = await fetch(`${API_BASE_URL}/eligibility/${ipAssetId}`);
    return this.handleResponse<EligibilityResponse>(response, `/eligibility/${ipAssetId}`);
  }

  async getEligibilityDetails(ipAssetId: string): Promise<EligibilityDetails> {
    const response = await fetch(`${API_BASE_URL}/eligibility-details/${ipAssetId}`);
    return this.handleResponse<EligibilityDetails>(response, `/eligibility-details/${ipAssetId}`);
  }

  async getAssetStatus(ipAssetId: string): Promise<{
    isLocked: boolean;
    lockedAmount: string;
    owner: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/status/${ipAssetId}`);
    return this.handleResponse<{ isLocked: boolean; lockedAmount: string; owner: string }>(response, `/status/${ipAssetId}`);
  }

  async getHBARTokenBalance(userAddress: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/balance/${userAddress}`);
    const data = await this.handleResponse<{ balance: string }>(response, `/balance/${userAddress}`);
    return data.balance;
  }
}

export const ipAssetLockerService = new IPAssetLockerService();

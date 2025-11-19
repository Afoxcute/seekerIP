import React, { useState, useEffect } from 'react';
import { useActiveAccount } from "thirdweb/react";
import { createKYCService } from '../services/kycService';
import { ThirdwebClient } from "thirdweb";

interface KYCStatusIndicatorProps {
  thirdwebClient: ThirdwebClient;
  className?: string;
}

export const KYCStatusIndicator: React.FC<KYCStatusIndicatorProps> = ({
  thirdwebClient,
  className = '',
}) => {
  const account = useActiveAccount();
  const [kycService] = useState(() => createKYCService(thirdwebClient));
  const [kycStatus, setKycStatus] = useState<{
    hasKYC: boolean;
    isOwner: boolean;
    loading: boolean;
  }>({
    hasKYC: false,
    isOwner: false,
    loading: true,
  });

  useEffect(() => {
    loadKYCStatus();
  }, [account?.address]);

  const loadKYCStatus = async () => {
    if (!account?.address) {
      setKycStatus({ hasKYC: false, isOwner: false, loading: false });
      return;
    }

    try {
      const [hasKYC, isOwner] = await Promise.all([
        kycService.hasKYCForIPAssets(account.address),
        kycService.isOwner(account),
      ]);

      setKycStatus({ hasKYC, isOwner, loading: false });
    } catch (error) {
      console.error('Error loading KYC status:', error);
      setKycStatus({ hasKYC: false, isOwner: false, loading: false });
    }
  };

  if (!account) {
    return null;
  }

  if (kycStatus.loading) {
    return (
      <div className={`kyc-status-indicator loading ${className}`}>
        <span className="kyc-icon">⏳</span>
        <span className="kyc-text">Loading...</span>
      </div>
    );
  }

  return (
    <div className={`kyc-status-indicator ${kycStatus.hasKYC ? 'verified' : 'unverified'} ${className}`}>
      <span className="kyc-icon">
        {kycStatus.isOwner ? '👑' : kycStatus.hasKYC ? '✅' : '❌'}
      </span>
      <span className="kyc-text">
        {kycStatus.isOwner ? 'Owner' : kycStatus.hasKYC ? 'KYC Verified' : 'KYC Required'}
      </span>
    </div>
  );
};

export default KYCStatusIndicator;


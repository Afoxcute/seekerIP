import React, { useState, useEffect } from 'react';
import { useActiveAccount } from "thirdweb/react";
import { createKYCService, CONTRACT_ADDRESSES } from '../services/kycService';
import { ThirdwebClient } from "thirdweb";
import { ComplianceService, ComplianceLevel, EntityType, ComplianceVerificationRequest } from '../services/complianceService';

interface KYCManagementProps {
  thirdwebClient: ThirdwebClient;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

interface KYCStatus {
  hasKYC: boolean;
  isOwner: boolean;
  tokenAddress: string | null;
}

export const KYCManagement: React.FC<KYCManagementProps> = ({
  thirdwebClient,
  onSuccess,
  onError,
}) => {
  const account = useActiveAccount();
  const [kycService] = useState(() => createKYCService(thirdwebClient));
  const [complianceService] = useState(() => new ComplianceService(thirdwebClient));
  const [loading, setLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState<KYCStatus>({
    hasKYC: false,
    isOwner: false,
    tokenAddress: null,
  });

  // Form states
  const [targetAccount, setTargetAccount] = useState('');
  const [newKYCKey, setNewKYCKey] = useState('');

  // Compliance Management States
  const [activeComplianceTab, setActiveComplianceTab] = useState<'verification' | 'officers' | 'audit' | 'violations'>('verification');
  const [verificationRequest, setVerificationRequest] = useState<ComplianceVerificationRequest>({
    entity: '',
    level: ComplianceLevel.BASIC,
    entityType: EntityType.INDIVIDUAL,
    jurisdiction: '',
    registrationNumber: '',
    expiryDate: 0,
    permissions: { canHoldIPAssets: true, canTradeIPAssets: true, canTransferIPAssets: true },
    notes: ''
  });
  const [newOfficerAddress, setNewOfficerAddress] = useState('');
  const [violationReport, setViolationReport] = useState({
    entity: '',
    violation: '',
    assetId: ''
  });

  // Enhanced KYC Management States
  const [kycAccessMode, setKycAccessMode] = useState<'basic' | 'compliance'>('compliance');
  const [revokeReason, setRevokeReason] = useState('');
  const [complianceLevel, setComplianceLevel] = useState<number>(1);

  // Load KYC status on component mount
  useEffect(() => {
    loadKYCStatus();
  }, [account?.address]);

  const loadKYCStatus = async () => {
    if (!account?.address) return;

    try {
      setLoading(true);
      
      const [hasKYC, isOwner, tokenAddress] = await Promise.all([
        kycService.hasKYCForIPAssets(account.address),
        kycService.isOwner(account),
        kycService.getIPAssetNFTTokenAddress(),
      ]);

      // Debug logging
      console.log('KYC Status Debug:', {
        accountAddress: account.address,
        hasKYC,
        isOwner,
        tokenAddress,
        deployerAddress: '0x9404966338eB27aF420a952574d777598Bbb58c4'
      });

      setKycStatus({
        hasKYC,
        isOwner,
        tokenAddress,
      });
    } catch (error) {
      console.error('Error loading KYC status:', error);
      onError?.('Failed to load KYC status');
    } finally {
      setLoading(false);
    }
  };

  const debugKYCGrant = async () => {
    if (!account || !targetAccount.trim()) {
      onError?.('Please enter a valid account address');
      return;
    }

    try {
      const debugInfo = await kycService.debugKYCGrant(account, targetAccount);
      console.log('KYC Grant Debug Info:', debugInfo);
      
      onSuccess?.(`Debug complete. Check console for details. Owner: ${debugInfo.isOwner}, Calling Account Associated: ${debugInfo.callingAccountAssociated}`);
    } catch (error) {
      console.error('Debug KYC grant error:', error);
      onError?.(`Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const debugOwnership = async () => {
    if (!account) {
      console.log('No account connected');
      return;
    }

    console.log('=== OWNERSHIP DEBUG ===');
    console.log('Your Address:', account.address);
    console.log('Expected Owner:', '0x9404966338eB27aF420a952574d777598Bbb58c4');
    console.log('Address Match:', account.address.toLowerCase() === '0x9404966338eB27aF420a952574d777598Bbb58c4'.toLowerCase());
    
    try {
      const isOwner = await kycService.isOwner(account);
      console.log('isOwner Result:', isOwner);
      
      // Check IPAssetManagerV2 owner directly using readContract
      const { readContract } = await import('thirdweb');
      const owner = await readContract({
        contract: kycService.ipAssetManagerContract,
        method: "function owner() view returns (address)",
        params: [],
      });
      console.log('IPAssetManagerV2 Owner:', owner);
      
      onSuccess?.(`Debug complete. Check console for details. Owner: ${owner}`);
    } catch (error) {
      console.error('Debug error:', error);
      onError?.(`Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAssociateAccount = async () => {
    if (!account) {
      onError?.("No account connected");
      return;
    }

    setLoading(true);
    try {
      const result = await kycService.associateAccount(account);
      if (result.success) {
        onSuccess?.(`Account associated successfully! Transaction: ${result.transactionHash}`);
      } else {
        onError?.(`Account association failed: ${result.error}`);
      }
    } catch (error) {
      onError?.(`Error associating account: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantKYC = async () => {
    if (!account || !targetAccount.trim()) {
      onError?.('Please enter a valid account address');
      return;
    }

    try {
      setLoading(true);
      
      // Show a message that we're attempting KYC grant
      onSuccess?.('Attempting to grant KYC. Make sure the target account has associated themselves with the HTS token...');
      
      let result;
      if (kycAccessMode === 'compliance') {
        // Use compliance-based KYC grant
        result = await kycService.grantKYCWithCompliance(account, targetAccount, complianceLevel);
      } else {
        // Use basic KYC grant
        result = await kycService.grantKYC(account, targetAccount);
      }
      
      if (result.success) {
        onSuccess?.(kycAccessMode === 'compliance' ? 
          `KYC granted with compliance validation to ${targetAccount}. Transaction: ${(result as any).transactionHash || 'N/A'}` : 
          `KYC granted to ${targetAccount}. Transaction: ${(result as any).transactionHash || 'N/A'}`);
        setTargetAccount('');
        await loadKYCStatus();
      } else {
        onError?.(result.error || 'Failed to grant KYC');
      }
    } catch (error) {
      console.error('Error granting KYC:', error);
      onError?.('Failed to grant KYC');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeKYC = async () => {
    if (!account || !targetAccount.trim()) {
      onError?.('Please enter a valid account address');
      return;
    }

    try {
      setLoading(true);
      
      let result;
      if (kycAccessMode === 'compliance' && revokeReason.trim()) {
        // Use compliance-based KYC revoke with violation reporting
        result = await kycService.revokeKYCWithCompliance(account, targetAccount, revokeReason);
      } else {
        // Use basic KYC revoke
        result = await kycService.revokeKYC(account, targetAccount);
      }
      
      if (result.success) {
        onSuccess?.(kycAccessMode === 'compliance' && revokeReason.trim() ? 
          `KYC revoked and violation reported for ${targetAccount}` : 
          `KYC revoked from ${targetAccount}`);
        setTargetAccount('');
        setRevokeReason('');
        await loadKYCStatus();
      } else {
        onError?.(result.error || 'Failed to revoke KYC');
      }
    } catch (error) {
      console.error('Error revoking KYC:', error);
      onError?.('Failed to revoke KYC');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateKYCKey = async () => {
    if (!account || !newKYCKey.trim()) {
      onError?.('Please enter a valid KYC key');
      return;
    }

    try {
      setLoading(true);
      const result = await kycService.updateKYCKey(account, newKYCKey);
      
      if (result.success) {
        onSuccess?.('KYC key updated successfully');
        setNewKYCKey('');
        await loadKYCStatus();
      } else {
        onError?.(result.error || 'Failed to update KYC key');
      }
    } catch (error) {
      console.error('Error updating KYC key:', error);
      onError?.('Failed to update KYC key');
    } finally {
      setLoading(false);
    }
  };

  // Compliance Management Functions
  const handleVerifyCompliance = async () => {
    if (!account || !verificationRequest.entity.trim()) {
      onError?.('Please enter a valid entity address');
      return;
    }

    try {
      setLoading(true);
      const result = await complianceService.verifyCompliance(account, verificationRequest);
      
      if (result.success) {
        onSuccess?.('Entity compliance verified successfully');
        setVerificationRequest({
          entity: '',
          level: ComplianceLevel.BASIC,
          entityType: EntityType.INDIVIDUAL,
          jurisdiction: '',
          registrationNumber: '',
          expiryDate: 0,
          permissions: { canHoldIPAssets: true, canTradeIPAssets: true, canTransferIPAssets: true },
          notes: ''
        });
      } else {
        onError?.(result.error || 'Failed to verify compliance');
      }
    } catch (error) {
      console.error('Error verifying compliance:', error);
      onError?.('Failed to verify compliance');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComplianceOfficer = async () => {
    if (!account || !newOfficerAddress.trim()) {
      onError?.('Please enter a valid officer address');
      return;
    }

    try {
      setLoading(true);
      // TODO: Implement addComplianceOfficer method in ComplianceService
      onSuccess?.('Compliance officer functionality not yet implemented');
      setNewOfficerAddress('');
    } catch (error) {
      console.error('Error adding compliance officer:', error);
      onError?.('Failed to add compliance officer');
    } finally {
      setLoading(false);
    }
  };

  const handleReportViolation = async () => {
    if (!account || !violationReport.entity.trim() || !violationReport.violation.trim()) {
      onError?.('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      // TODO: Implement reportViolation method in ComplianceService
      onSuccess?.('Violation reporting functionality not yet implemented');
      setViolationReport({
        entity: '',
        violation: '',
        assetId: ''
      });
    } catch (error) {
      console.error('Error reporting violation:', error);
      onError?.('Failed to report violation');
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🔐 KYC Management</h3>
        </div>
        <div className="card-body">
          <p>Please connect your wallet to manage KYC settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="kyc-management">
      {/* KYC Status Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🔐 KYC Status</h3>
          <button 
            className="btn btn-secondary"
            onClick={loadKYCStatus}
            disabled={loading}
          >
            {loading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
        </div>
        <div className="card-body">
          <div className="kyc-status-grid">
            <div className="kyc-status-item">
              <span className="kyc-status-label">Your KYC Status:</span>
              <span className={`kyc-status-value ${kycStatus.hasKYC ? 'success' : 'error'}`}>
                {kycStatus.hasKYC ? '✅ Verified' : '❌ Not Verified'}
              </span>
            </div>
            <div className="kyc-status-item">
              <span className="kyc-status-label">Owner Status:</span>
              <span className={`kyc-status-value ${kycStatus.isOwner ? 'success' : 'warning'}`}>
                {kycStatus.isOwner ? '👑 Owner' : '👤 User'}
              </span>
            </div>
            <div className="kyc-status-item">
              <span className="kyc-status-label">HTS Token Address:</span>
              <span className="kyc-status-value address">
                {kycStatus.tokenAddress ? `${kycStatus.tokenAddress.substring(0, 10)}...` : 'Not Available'}
              </span>
            </div>
            <div className="kyc-status-item">
              <span className="kyc-status-label">Your Address:</span>
              <span className="kyc-status-value address">
                {account?.address ? `${account.address.substring(0, 10)}...` : 'Not Connected'}
              </span>
            </div>
            <div className="kyc-status-item">
              <span className="kyc-status-label">Deployer Address:</span>
              <span className="kyc-status-value address">
                0x9404966338eB27aF420a952574d777598Bbb58c4
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Association */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🔗 Account Association</h3>
        </div>
        <div className="card-body">
          <p className="card-description">
            Associate your account with the HTS token before granting KYC. This is required for Hedera Token Service.
          </p>
          <div className="form-group-row">
            <button 
              className="btn btn-primary"
              onClick={handleAssociateAccount}
              disabled={loading}
            >
              {loading ? '⏳ Processing...' : '🔗 Associate Account'}
            </button>
            <button 
              className="btn btn-secondary"
              onClick={debugOwnership}
              disabled={loading}
            >
              🔍 Debug Ownership
            </button>
          </div>
        </div>
      </div>

      {/* KYC Management (Owner Only) */}
      {kycStatus.isOwner && (
        <>
          {/* Grant/Revoke KYC */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">👥 Manage Account KYC</h3>
            </div>
            <div className="card-body">
              {/* Access Control Mode Selection */}
              <div className="form-group">
                <label className="form-label">Access Control Mode</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="kycAccessMode"
                      value="compliance"
                      checked={kycAccessMode === 'compliance'}
                      onChange={(e) => setKycAccessMode(e.target.value as 'basic' | 'compliance')}
                    />
                    <span className="radio-text">🏛️ Compliance-Based (Recommended)</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="kycAccessMode"
                      value="basic"
                      checked={kycAccessMode === 'basic'}
                      onChange={(e) => setKycAccessMode(e.target.value as 'basic' | 'compliance')}
                    />
                    <span className="radio-text">🔓 Basic Mode</span>
                  </label>
                </div>
                <div className="form-hint">
                  {kycAccessMode === 'compliance' ? 
                    'Compliance-based mode validates entity compliance before granting KYC access' :
                    'Basic mode grants KYC without compliance validation (not recommended for production)'
                  }
                </div>
              </div>

              {/* Compliance Level Selection (only for compliance mode) */}
              {kycAccessMode === 'compliance' && (
                <div className="form-group">
                  <label className="form-label">Required Compliance Level</label>
                  <select
                    className="form-select"
                    value={complianceLevel}
                    onChange={(e) => setComplianceLevel(Number(e.target.value))}
                  >
                    <option value={1}>Basic (1)</option>
                    <option value={2}>Enhanced (2)</option>
                    <option value={3}>Institutional (3)</option>
                  </select>
                  <div className="form-hint">
                    Only entities with this compliance level or higher can receive KYC
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Account Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={targetAccount}
                  onChange={(e) => setTargetAccount(e.target.value)}
                  placeholder="0x..."
                />
              </div>
              <div className="form-group">
                <p className="card-description">
                  <strong>Important:</strong> The target account must first associate themselves with the HTS token before KYC can be granted. They can do this by:
                  <br />1. Connecting their wallet to this app
                  <br />2. Going to the KYC Management tab
                  <br />3. Clicking "🔗 Associate Account"
                </p>
              </div>
              <div className="form-group-row">
                <button 
                  className="btn btn-success"
                  onClick={handleGrantKYC}
                  disabled={loading || !targetAccount.trim()}
                >
                  {loading ? '⏳ Processing...' : '✅ Grant KYC'}
                </button>
                <button 
                  className="btn btn-error"
                  onClick={handleRevokeKYC}
                  disabled={loading || !targetAccount.trim()}
                >
                  {loading ? '⏳ Processing...' : '❌ Revoke KYC'}
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={debugKYCGrant}
                  disabled={loading || !targetAccount.trim()}
                >
                  🔍 Debug KYC Grant
                </button>
              </div>

              {/* Revoke Reason (only for compliance mode) */}
              {kycAccessMode === 'compliance' && (
                <div className="form-group">
                  <label className="form-label">Revoke Reason (Optional)</label>
                  <textarea
                    className="form-input form-textarea"
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    placeholder="Reason for revoking KYC (will be reported as compliance violation)"
                    rows={2}
                  />
                  <div className="form-hint">
                    If provided, this reason will be reported as a compliance violation
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Update KYC Key */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">🔑 Update KYC Key</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">New KYC Key (Hex)</label>
                <input
                  type="text"
                  className="form-input"
                  value={newKYCKey}
                  onChange={(e) => setNewKYCKey(e.target.value)}
                  placeholder="0x... or hex string"
                />
                <div className="form-hint">
                  Enter a new KYC key in hex format. This will update the KYC key for the entire IP Asset NFT collection.
                </div>
              </div>
              <button 
                className="btn btn-primary"
                onClick={handleUpdateKYCKey}
                disabled={loading || !newKYCKey.trim()}
              >
                {loading ? '⏳ Processing...' : '🔑 Update KYC Key'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Compliance & Regulatory Management */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🏛️ Compliance & Regulatory Management</h3>
        </div>
        <div className="card-body">
          {/* Compliance Tab Navigation */}
          <div className="compliance-tabs">
            <button 
              className={`compliance-tab ${activeComplianceTab === 'verification' ? 'active' : ''}`}
              onClick={() => setActiveComplianceTab('verification')}
            >
              ✅ Verification
            </button>
            <button 
              className={`compliance-tab ${activeComplianceTab === 'officers' ? 'active' : ''}`}
              onClick={() => setActiveComplianceTab('officers')}
            >
              👥 Officers
            </button>
            <button 
              className={`compliance-tab ${activeComplianceTab === 'audit' ? 'active' : ''}`}
              onClick={() => setActiveComplianceTab('audit')}
            >
              📋 Audit Trail
            </button>
            <button 
              className={`compliance-tab ${activeComplianceTab === 'violations' ? 'active' : ''}`}
              onClick={() => setActiveComplianceTab('violations')}
            >
              ⚠️ Violations
            </button>
          </div>

          {/* Compliance Verification Tab */}
          {activeComplianceTab === 'verification' && (
            <div className="compliance-section">
              <h4>Entity Compliance Verification</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Entity Address</label>
                  <input
                    type="text"
                    className="form-input"
                    value={verificationRequest.entity}
                    onChange={(e) => setVerificationRequest({...verificationRequest, entity: e.target.value})}
                    placeholder="0x..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Compliance Level</label>
                  <select
                    className="form-select"
                    value={verificationRequest.level}
                    onChange={(e) => setVerificationRequest({...verificationRequest, level: Number(e.target.value) as ComplianceLevel})}
                  >
                    <option value={ComplianceLevel.BASIC}>Basic</option>
                    <option value={ComplianceLevel.ENHANCED}>Enhanced</option>
                    <option value={ComplianceLevel.INSTITUTIONAL}>Institutional</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Entity Type</label>
                  <select
                    className="form-select"
                    value={verificationRequest.entityType}
                    onChange={(e) => setVerificationRequest({...verificationRequest, entityType: Number(e.target.value) as EntityType})}
                  >
                    <option value={EntityType.INDIVIDUAL}>Individual</option>
                    <option value={EntityType.CORPORATION}>Corporation</option>
                    <option value={EntityType.PARTNERSHIP}>Partnership</option>
                    <option value={EntityType.LLC}>LLC</option>
                    <option value={EntityType.TRUST}>Trust</option>
                    <option value={EntityType.GOVERNMENT}>Government</option>
                    <option value={EntityType.NON_PROFIT}>Non-Profit</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Jurisdiction</label>
                  <input
                    type="text"
                    className="form-input"
                    value={verificationRequest.jurisdiction}
                    onChange={(e) => setVerificationRequest({...verificationRequest, jurisdiction: e.target.value})}
                    placeholder="US, EU, KE, etc."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Registration Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={verificationRequest.registrationNumber}
                    onChange={(e) => setVerificationRequest({...verificationRequest, registrationNumber: e.target.value})}
                    placeholder="Business registration or ID number"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Expiry Date (Unix Timestamp)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={verificationRequest.expiryDate}
                    onChange={(e) => setVerificationRequest({...verificationRequest, expiryDate: Number(e.target.value)})}
                    placeholder="0 for no expiry"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Permissions</label>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={verificationRequest.permissions.canHoldIPAssets}
                        onChange={(e) => {
                          setVerificationRequest({
                            ...verificationRequest, 
                            permissions: {
                              ...verificationRequest.permissions,
                              canHoldIPAssets: e.target.checked
                            }
                          });
                        }}
                      />
                      Can Hold IP Assets
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={verificationRequest.permissions.canTradeIPAssets}
                        onChange={(e) => {
                          setVerificationRequest({
                            ...verificationRequest, 
                            permissions: {
                              ...verificationRequest.permissions,
                              canTradeIPAssets: e.target.checked
                            }
                          });
                        }}
                      />
                      Can Trade IP Assets
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={verificationRequest.permissions.canTransferIPAssets}
                        onChange={(e) => {
                          setVerificationRequest({
                            ...verificationRequest, 
                            permissions: {
                              ...verificationRequest.permissions,
                              canTransferIPAssets: e.target.checked
                            }
                          });
                        }}
                      />
                      Can Transfer IP Assets
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-input form-textarea"
                    value={verificationRequest.notes}
                    onChange={(e) => setVerificationRequest({...verificationRequest, notes: e.target.value})}
                    placeholder="Additional compliance notes"
                    rows={3}
                  />
                </div>
                <button 
                  className="btn btn-primary btn-full"
                  onClick={handleVerifyCompliance}
                  disabled={loading || !verificationRequest.entity.trim()}
                >
                  {loading ? '⏳ Verifying...' : '✅ Verify Compliance'}
                </button>
              </div>
            </div>
          )}

          {/* Compliance Officers Tab */}
          {activeComplianceTab === 'officers' && (
            <div className="compliance-section">
              <h4>Compliance Officer Management</h4>
              <div className="form-group">
                <label className="form-label">Add New Officer Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={newOfficerAddress}
                  onChange={(e) => setNewOfficerAddress(e.target.value)}
                  placeholder="0x..."
                />
              </div>
              <button 
                className="btn btn-primary"
                onClick={handleAddComplianceOfficer}
                disabled={loading || !newOfficerAddress.trim()}
              >
                {loading ? '⏳ Adding...' : '👥 Add Compliance Officer'}
              </button>
            </div>
          )}

          {/* Audit Trail Tab */}
          {activeComplianceTab === 'audit' && (
            <div className="compliance-section">
              <h4>Compliance Audit Trail</h4>
              <p className="card-description">
                View complete compliance audit trail and entity compliance history.
                This feature provides immutable records of all compliance actions.
              </p>
              <div className="info-box">
                <p><strong>Audit Trail Features:</strong></p>
                <ul>
                  <li>Complete compliance action history</li>
                  <li>Entity-specific compliance records</li>
                  <li>Asset-specific compliance tracking</li>
                  <li>Cryptographic integrity verification</li>
                  <li>Regulatory authority access</li>
                </ul>
              </div>
            </div>
          )}

          {/* Violations Tab */}
          {activeComplianceTab === 'violations' && (
            <div className="compliance-section">
              <h4>Report Compliance Violation</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Violating Entity Address</label>
                  <input
                    type="text"
                    className="form-input"
                    value={violationReport.entity}
                    onChange={(e) => setViolationReport({...violationReport, entity: e.target.value})}
                    placeholder="0x..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Asset ID (Optional)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={violationReport.assetId}
                    onChange={(e) => setViolationReport({...violationReport, assetId: e.target.value})}
                    placeholder="IP Asset ID"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Violation Description</label>
                  <textarea
                    className="form-input form-textarea"
                    value={violationReport.violation}
                    onChange={(e) => setViolationReport({...violationReport, violation: e.target.value})}
                    placeholder="Describe the compliance violation"
                    rows={3}
                  />
                </div>
                <button 
                  className="btn btn-error btn-full"
                  onClick={handleReportViolation}
                  disabled={loading || !violationReport.entity.trim() || !violationReport.violation.trim()}
                >
                  {loading ? '⏳ Reporting...' : '⚠️ Report Violation'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contract Information */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📋 Contract Information</h3>
        </div>
        <div className="card-body">
          <div className="contract-info">
            <div className="contract-info-item">
              <span className="contract-info-label">IP Asset HTS KYC:</span>
              <span className="contract-info-value address">
                {CONTRACT_ADDRESSES.IP_ASSET_HTS_KYC}
              </span>
            </div>
            <div className="contract-info-item">
              <span className="contract-info-label">IP Asset Manager V2:</span>
              <span className="contract-info-value address">
                {CONTRACT_ADDRESSES.IP_ASSET_MANAGER_V2}
              </span>
            </div>
            <div className="contract-info-item">
              <span className="contract-info-label">HTS Token:</span>
              <span className="contract-info-value address">
                {CONTRACT_ADDRESSES.HTS_TOKEN}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KYCManagement;

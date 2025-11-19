import React, { useState, useEffect } from 'react';
import { useActiveAccount } from "thirdweb/react";
import { ThirdwebClient } from "thirdweb";
import { 
  EnhancedLicensingService, 
  LicenseType, 
  GeographicRestriction,
  CreateLicenseTermsRequest,
  GrantLicenseRequest,
  EnhancedLicenseTerms,
  LicenseHolder
} from '../services/enhancedLicensingService';

interface EnhancedLicensingManagementProps {
  thirdwebClient: ThirdwebClient;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export const EnhancedLicensingManagement: React.FC<EnhancedLicensingManagementProps> = ({
  thirdwebClient,
  onSuccess,
  onError,
}) => {
  const account = useActiveAccount();
  const [licensingService] = useState(() => new EnhancedLicensingService(thirdwebClient));
  const [loading, setLoading] = useState(false);
  
  // State for different tabs
  const [activeTab, setActiveTab] = useState<'create' | 'grant' | 'manage' | 'view'>('create');
  
  // Create License Terms State
  const [createLicenseForm, setCreateLicenseForm] = useState<CreateLicenseTermsRequest>({
    assetId: '',
    terms: '',
    price: '',
    duration: '',
    maxLicenses: '',
    encryptedTerms: '',
    revenueShare: '',
    licenseType: LicenseType.NON_EXCLUSIVE,
    geographicRestriction: GeographicRestriction.NONE,
    allowedJurisdictions: [],
    restrictedJurisdictions: [],
    requiredComplianceLevel: 1,
    requiresKYC: true
  });
  
  // Grant License State
  const [grantLicenseForm, setGrantLicenseForm] = useState<GrantLicenseRequest>({
    assetId: '',
    licenseId: '',
    licensee: '',
    jurisdiction: ''
  });
  
  // View State
  const [licenseTerms, setLicenseTerms] = useState<EnhancedLicenseTerms | null>(null);
  const [licenseHolders, setLicenseHolders] = useState<LicenseHolder[]>([]);
  const [selectedLicenseId, setSelectedLicenseId] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  
  // Revoke License State
  const [revokeLicenseId, setRevokeLicenseId] = useState('');
  const [revokeReason, setRevokeReason] = useState('');

  // Load data when component mounts
  useEffect(() => {
    if (selectedLicenseId) {
      loadLicenseTerms(selectedLicenseId);
    }
    if (selectedAssetId) {
      loadLicenseHolders(selectedAssetId);
    }
  }, [selectedLicenseId, selectedAssetId]);

  const loadLicenseTerms = async (licenseId: string) => {
    try {
      const terms = await licensingService.getLicenseTerms(licenseId);
      setLicenseTerms(terms);
    } catch (error) {
      console.error('Error loading license terms:', error);
      onError?.('Failed to load license terms');
    }
  };

  const loadLicenseHolders = async (assetId: string) => {
    try {
      const licenseIds = await licensingService.getLicensesByAsset(assetId);
      const holders: LicenseHolder[] = [];
      
      for (const licenseId of licenseIds) {
        const holder = await licensingService.getLicenseHolder(licenseId);
        if (holder) {
          holders.push(holder);
        }
      }
      
      setLicenseHolders(holders);
    } catch (error) {
      console.error('Error loading license holders:', error);
      onError?.('Failed to load license holders');
    }
  };

  const handleCreateLicenseTerms = async () => {
    if (!account) {
      onError?.('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      const result = await licensingService.createEnhancedLicenseTerms(account, createLicenseForm);
      
      if (result.success) {
        onSuccess?.('Enhanced license terms created successfully');
        // Reset form
        setCreateLicenseForm({
          assetId: '',
          terms: '',
          price: '',
          duration: '',
          maxLicenses: '',
          encryptedTerms: '',
          revenueShare: '',
          licenseType: LicenseType.NON_EXCLUSIVE,
          geographicRestriction: GeographicRestriction.NONE,
          allowedJurisdictions: [],
          restrictedJurisdictions: [],
          requiredComplianceLevel: 1,
          requiresKYC: true
        });
      } else {
        onError?.(result.error || 'Failed to create license terms');
      }
    } catch (error) {
      console.error('Error creating license terms:', error);
      onError?.('Failed to create license terms');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantLicense = async () => {
    if (!account) {
      onError?.('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      
      // Validate license grant first
      const validation = await licensingService.validateLicenseGrant(
        grantLicenseForm.licenseId,
        grantLicenseForm.jurisdiction
      );
      
      if (!validation.valid) {
        onError?.(validation.reason || 'License grant validation failed');
        return;
      }
      
      const result = await licensingService.grantLicense(account, grantLicenseForm);
      
      if (result.success) {
        onSuccess?.('License granted successfully');
        // Reset form
        setGrantLicenseForm({
          assetId: '',
          licenseId: '',
          licensee: '',
          jurisdiction: ''
        });
      } else {
        onError?.(result.error || 'Failed to grant license');
      }
    } catch (error) {
      console.error('Error granting license:', error);
      onError?.('Failed to grant license');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeLicense = async () => {
    if (!account) {
      onError?.('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      const result = await licensingService.revokeLicense(account, revokeLicenseId, revokeReason);
      
      if (result.success) {
        onSuccess?.('License revoked successfully');
        setRevokeLicenseId('');
        setRevokeReason('');
        // Reload license holders
        if (selectedAssetId) {
          loadLicenseHolders(selectedAssetId);
        }
      } else {
        onError?.(result.error || 'Failed to revoke license');
      }
    } catch (error) {
      console.error('Error revoking license:', error);
      onError?.('Failed to revoke license');
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📄 Enhanced Licensing Management</h3>
        </div>
        <div className="card-body">
          <p>Please connect your wallet to manage enhanced licensing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-licensing-management">
      {/* Header */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📄 Enhanced Licensing Management</h3>
          <p className="card-description">
            Control who can hold licenses, enforce geographic restrictions, and manage exclusive vs non-exclusive licensing
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="card">
        <div className="card-body">
          <div className="licensing-tabs">
            <button 
              className={`licensing-tab ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              ➕ Create License Terms
            </button>
            <button 
              className={`licensing-tab ${activeTab === 'grant' ? 'active' : ''}`}
              onClick={() => setActiveTab('grant')}
            >
              🎯 Grant License
            </button>
            <button 
              className={`licensing-tab ${activeTab === 'manage' ? 'active' : ''}`}
              onClick={() => setActiveTab('manage')}
            >
              ⚙️ Manage Licenses
            </button>
            <button 
              className={`licensing-tab ${activeTab === 'view' ? 'active' : ''}`}
              onClick={() => setActiveTab('view')}
            >
              👁️ View Licenses
            </button>
          </div>
        </div>
      </div>

      {/* Create License Terms Tab */}
      {activeTab === 'create' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">➕ Create Enhanced License Terms</h3>
          </div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Asset ID</label>
                <input
                  type="number"
                  className="form-input"
                  value={createLicenseForm.assetId}
                  onChange={(e) => setCreateLicenseForm({...createLicenseForm, assetId: e.target.value})}
                  placeholder="Enter IP Asset ID"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">License Terms</label>
                <textarea
                  className="form-input form-textarea"
                  value={createLicenseForm.terms}
                  onChange={(e) => setCreateLicenseForm({...createLicenseForm, terms: e.target.value})}
                  placeholder="Describe the license terms"
                  rows={3}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Price (in KES)</label>
                <input
                  type="number"
                  className="form-input"
                  value={createLicenseForm.price}
                  onChange={(e) => setCreateLicenseForm({...createLicenseForm, price: e.target.value})}
                  placeholder="0"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Duration (seconds, 0 for perpetual)</label>
                <input
                  type="number"
                  className="form-input"
                  value={createLicenseForm.duration}
                  onChange={(e) => setCreateLicenseForm({...createLicenseForm, duration: e.target.value})}
                  placeholder="0"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Max Licenses</label>
                <input
                  type="number"
                  className="form-input"
                  value={createLicenseForm.maxLicenses}
                  onChange={(e) => setCreateLicenseForm({...createLicenseForm, maxLicenses: e.target.value})}
                  placeholder="1"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Revenue Share (basis points)</label>
                <input
                  type="number"
                  className="form-input"
                  value={createLicenseForm.revenueShare}
                  onChange={(e) => setCreateLicenseForm({...createLicenseForm, revenueShare: e.target.value})}
                  placeholder="1000 (10%)"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">License Type</label>
                <select
                  className="form-select"
                  value={createLicenseForm.licenseType}
                  onChange={(e) => setCreateLicenseForm({...createLicenseForm, licenseType: Number(e.target.value) as LicenseType})}
                >
                  <option value={LicenseType.EXCLUSIVE}>Exclusive</option>
                  <option value={LicenseType.NON_EXCLUSIVE}>Non-Exclusive</option>
                  <option value={LicenseType.SOLE}>Sole</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Geographic Restriction</label>
                <select
                  className="form-select"
                  value={createLicenseForm.geographicRestriction}
                  onChange={(e) => setCreateLicenseForm({...createLicenseForm, geographicRestriction: Number(e.target.value) as GeographicRestriction})}
                >
                  <option value={GeographicRestriction.NONE}>No Restrictions</option>
                  <option value={GeographicRestriction.COUNTRY}>Country Level</option>
                  <option value={GeographicRestriction.REGION}>Regional</option>
                  <option value={GeographicRestriction.GLOBAL}>Global</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Required Compliance Level</label>
                <select
                  className="form-select"
                  value={createLicenseForm.requiredComplianceLevel}
                  onChange={(e) => setCreateLicenseForm({...createLicenseForm, requiredComplianceLevel: Number(e.target.value)})}
                >
                  <option value={1}>Basic (1)</option>
                  <option value={2}>Enhanced (2)</option>
                  <option value={3}>Institutional (3)</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Requires KYC</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={createLicenseForm.requiresKYC}
                      onChange={(e) => setCreateLicenseForm({...createLicenseForm, requiresKYC: e.target.checked})}
                    />
                    <span className="checkbox-text">Require KYC verification</span>
                  </label>
                </div>
              </div>
              
              <button 
                className="btn btn-primary btn-full"
                onClick={handleCreateLicenseTerms}
                disabled={loading || !createLicenseForm.assetId.trim() || !createLicenseForm.terms.trim()}
              >
                {loading ? '⏳ Creating...' : '➕ Create License Terms'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grant License Tab */}
      {activeTab === 'grant' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🎯 Grant License</h3>
          </div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Asset ID</label>
                <input
                  type="number"
                  className="form-input"
                  value={grantLicenseForm.assetId}
                  onChange={(e) => setGrantLicenseForm({...grantLicenseForm, assetId: e.target.value})}
                  placeholder="Enter IP Asset ID"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">License ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={grantLicenseForm.licenseId}
                  onChange={(e) => setGrantLicenseForm({...grantLicenseForm, licenseId: e.target.value})}
                  placeholder="Enter License ID"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Licensee Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={grantLicenseForm.licensee}
                  onChange={(e) => setGrantLicenseForm({...grantLicenseForm, licensee: e.target.value})}
                  placeholder="0x..."
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Jurisdiction</label>
                <select
                  className="form-select"
                  value={grantLicenseForm.jurisdiction}
                  onChange={(e) => setGrantLicenseForm({...grantLicenseForm, jurisdiction: e.target.value})}
                >
                  <option value="">Select Jurisdiction</option>
                  {licensingService.getSupportedJurisdictions().map(jurisdiction => (
                    <option key={jurisdiction} value={jurisdiction}>{jurisdiction}</option>
                  ))}
                </select>
              </div>
              
              <button 
                className="btn btn-success btn-full"
                onClick={handleGrantLicense}
                disabled={loading || !grantLicenseForm.assetId.trim() || !grantLicenseForm.licenseId.trim() || !grantLicenseForm.licensee.trim() || !grantLicenseForm.jurisdiction.trim()}
              >
                {loading ? '⏳ Granting...' : '🎯 Grant License'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Licenses Tab */}
      {activeTab === 'manage' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">⚙️ Manage Licenses</h3>
          </div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">License Token ID to Revoke</label>
                <input
                  type="text"
                  className="form-input"
                  value={revokeLicenseId}
                  onChange={(e) => setRevokeLicenseId(e.target.value)}
                  placeholder="Enter License Token ID"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Revocation Reason</label>
                <textarea
                  className="form-input form-textarea"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="Reason for revoking the license"
                  rows={2}
                />
              </div>
              
              <button 
                className="btn btn-error btn-full"
                onClick={handleRevokeLicense}
                disabled={loading || !revokeLicenseId.trim() || !revokeReason.trim()}
              >
                {loading ? '⏳ Revoking...' : '❌ Revoke License'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Licenses Tab */}
      {activeTab === 'view' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">👁️ View Licenses</h3>
          </div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">License ID to View</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedLicenseId}
                  onChange={(e) => setSelectedLicenseId(e.target.value)}
                  placeholder="Enter License ID"
                />
                <button 
                  className="btn btn-secondary"
                  onClick={() => loadLicenseTerms(selectedLicenseId)}
                  disabled={!selectedLicenseId.trim()}
                >
                  🔍 Load License Terms
                </button>
              </div>
              
              <div className="form-group">
                <label className="form-label">Asset ID to View Licenses</label>
                <input
                  type="number"
                  className="form-input"
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  placeholder="Enter Asset ID"
                />
                <button 
                  className="btn btn-secondary"
                  onClick={() => loadLicenseHolders(selectedAssetId)}
                  disabled={!selectedAssetId.trim()}
                >
                  🔍 Load License Holders
                </button>
              </div>
            </div>
            
            {/* License Terms Display */}
            {licenseTerms && (
              <div className="license-terms-display">
                <h4>License Terms</h4>
                <div className="license-terms-grid">
                  <div className="license-term-item">
                    <span className="license-term-label">License Type:</span>
                    <span className="license-term-value">{licensingService.getLicenseTypeDisplayName(licenseTerms.licenseType)}</span>
                  </div>
                  <div className="license-term-item">
                    <span className="license-term-label">Geographic Restriction:</span>
                    <span className="license-term-value">{licensingService.getGeographicRestrictionDisplayName(licenseTerms.geographicRestriction)}</span>
                  </div>
                  <div className="license-term-item">
                    <span className="license-term-label">Price:</span>
                    <span className="license-term-value">{licenseTerms.price} KES</span>
                  </div>
                  <div className="license-term-item">
                    <span className="license-term-label">Max Licenses:</span>
                    <span className="license-term-value">{licenseTerms.maxLicenses}</span>
                  </div>
                  <div className="license-term-item">
                    <span className="license-term-label">Issued Licenses:</span>
                    <span className="license-term-value">{licenseTerms.issuedLicenses}</span>
                  </div>
                  <div className="license-term-item">
                    <span className="license-term-label">Required Compliance Level:</span>
                    <span className="license-term-value">{licenseTerms.requiredComplianceLevel}</span>
                  </div>
                  <div className="license-term-item">
                    <span className="license-term-label">Requires KYC:</span>
                    <span className="license-term-value">{licenseTerms.requiresKYC ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="license-term-item">
                    <span className="license-term-label">Active:</span>
                    <span className="license-term-value">{licenseTerms.isActive ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="license-terms-description">
                  <h5>Terms:</h5>
                  <p>{licenseTerms.terms}</p>
                </div>
              </div>
            )}
            
            {/* License Holders Display */}
            {licenseHolders.length > 0 && (
              <div className="license-holders-display">
                <h4>License Holders</h4>
                <div className="license-holders-grid">
                  {licenseHolders.map((holder, index) => (
                    <div key={index} className="license-holder-item">
                      <div className="license-holder-header">
                        <span className="license-holder-address">{holder.holder.substring(0, 10)}...</span>
                        <span className={`license-holder-status ${holder.isValid ? 'valid' : 'invalid'}`}>
                          {holder.isValid ? 'Valid' : 'Invalid'}
                        </span>
                      </div>
                      <div className="license-holder-details">
                        <div className="license-holder-detail">
                          <span className="license-holder-label">Jurisdiction:</span>
                          <span className="license-holder-value">{holder.jurisdiction}</span>
                        </div>
                        <div className="license-holder-detail">
                          <span className="license-holder-label">Compliance Level:</span>
                          <span className="license-holder-value">{holder.complianceLevel}</span>
                        </div>
                        <div className="license-holder-detail">
                          <span className="license-holder-label">Has KYC:</span>
                          <span className="license-holder-value">{holder.hasKYC ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="license-holder-detail">
                          <span className="license-holder-label">Revenue Share:</span>
                          <span className="license-holder-value">{holder.revenueShare} basis points</span>
                        </div>
                        <div className="license-holder-detail">
                          <span className="license-holder-label">Expires:</span>
                          <span className="license-holder-value">
                            {holder.expiresAt === '115792089237316195423570985008687907853269984665640564039457584007913129639935' 
                              ? 'Never' 
                              : new Date(Number(holder.expiresAt) * 1000).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedLicensingManagement;

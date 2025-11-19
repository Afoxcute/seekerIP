import React, { useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { ComplianceService, ComplianceLevel, EntityType, ComplianceProfile, ComplianceVerificationRequest } from '../services/complianceService';
import { ThirdwebClient } from 'thirdweb';

interface ComplianceManagementProps {
  client: ThirdwebClient;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

const ComplianceManagement: React.FC<ComplianceManagementProps> = ({ client, onSuccess, onError }) => {
  const account = useActiveAccount();
  const [complianceService] = useState(() => new ComplianceService(client));
  
  // State for compliance verification
  const [verificationRequest, setVerificationRequest] = useState<ComplianceVerificationRequest>({
    entity: '',
    level: ComplianceLevel.BASIC,
    entityType: EntityType.INDIVIDUAL,
    jurisdiction: '',
    registrationNumber: '',
    expiryDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year from now
    permissions: {
      canHoldIPAssets: true,
      canTradeIPAssets: true,
      canTransferIPAssets: true,
    },
    notes: '',
  });

  // State for compliance profile viewing
  const [viewEntity, setViewEntity] = useState('');
  const [complianceProfile, setComplianceProfile] = useState<ComplianceProfile | null>(null);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);

  // State for compliance management
  const [manageEntity, setManageEntity] = useState('');
  const [updatePermissions, setUpdatePermissions] = useState({
    canHoldIPAssets: true,
    canTradeIPAssets: true,
    canTransferIPAssets: true,
  });
  const [updateNotes, setUpdateNotes] = useState('');
  const [revokeReason, setRevokeReason] = useState('');

  // State for violation reporting
  const [violationEntity, setViolationEntity] = useState('');
  const [violationDescription, setViolationDescription] = useState('');
  const [violationAssetId, setViolationAssetId] = useState('');

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'verify' | 'view' | 'manage' | 'report'>('verify');

  // Load compliance profile
  const loadComplianceProfile = async (entity: string) => {
    if (!entity.trim()) return;
    
    try {
      setLoading(true);
      const profile = await complianceService.getComplianceProfile(entity);
      setComplianceProfile(profile);
      
      if (profile) {
        const trail = await complianceService.getEntityAuditTrail(entity);
        setAuditTrail(trail);
      }
    } catch (error) {
      console.error('Error loading compliance profile:', error);
      onError?.('Failed to load compliance profile');
    } finally {
      setLoading(false);
    }
  };

  // Handle compliance verification
  const handleVerifyCompliance = async () => {
    if (!account) {
      onError?.('No account connected');
      return;
    }

    try {
      setLoading(true);
      const result = await complianceService.verifyCompliance(account, verificationRequest);
      
      if (result.success) {
        onSuccess?.('Compliance verification successful!');
        // Reset form
        setVerificationRequest({
          entity: '',
          level: ComplianceLevel.BASIC,
          entityType: EntityType.INDIVIDUAL,
          jurisdiction: '',
          registrationNumber: '',
          expiryDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
          permissions: {
            canHoldIPAssets: true,
            canTradeIPAssets: true,
            canTransferIPAssets: true,
          },
          notes: '',
        });
      } else {
        onError?.(result.error || 'Compliance verification failed');
      }
    } catch (error) {
      console.error('Error verifying compliance:', error);
      onError?.('Compliance verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle compliance profile update
  const handleUpdateComplianceProfile = async () => {
    if (!account) {
      onError?.('No account connected');
      return;
    }

    try {
      setLoading(true);
      const result = await complianceService.updateComplianceProfile(
        account,
        manageEntity,
        updatePermissions,
        updateNotes
      );
      
      if (result.success) {
        onSuccess?.('Compliance profile updated successfully!');
        await loadComplianceProfile(manageEntity);
      } else {
        onError?.(result.error || 'Failed to update compliance profile');
      }
    } catch (error) {
      console.error('Error updating compliance profile:', error);
      onError?.('Failed to update compliance profile');
    } finally {
      setLoading(false);
    }
  };

  // Handle compliance revocation
  const handleRevokeCompliance = async () => {
    if (!account) {
      onError?.('No account connected');
      return;
    }

    try {
      setLoading(true);
      const result = await complianceService.revokeCompliance(account, manageEntity, revokeReason);
      
      if (result.success) {
        onSuccess?.('Compliance revoked successfully!');
        await loadComplianceProfile(manageEntity);
      } else {
        onError?.(result.error || 'Failed to revoke compliance');
      }
    } catch (error) {
      console.error('Error revoking compliance:', error);
      onError?.('Failed to revoke compliance');
    } finally {
      setLoading(false);
    }
  };

  // Handle violation reporting
  const handleReportViolation = async () => {
    if (!account) {
      onError?.('No account connected');
      return;
    }

    try {
      setLoading(true);
      const assetId = violationAssetId ? parseInt(violationAssetId) : 0;
      const result = await complianceService.reportComplianceViolation(
        account,
        violationEntity,
        violationDescription,
        assetId
      );
      
      if (result.success) {
        onSuccess?.('Compliance violation reported successfully!');
        setViolationEntity('');
        setViolationDescription('');
        setViolationAssetId('');
      } else {
        onError?.(result.error || 'Failed to report violation');
      }
    } catch (error) {
      console.error('Error reporting violation:', error);
      onError?.('Failed to report violation');
    } finally {
      setLoading(false);
    }
  };

  const getComplianceStatusColor = (profile: ComplianceProfile) => {
    const status = complianceService.getComplianceStatus(profile);
    return status.color;
  };

  const getComplianceStatusMessage = (profile: ComplianceProfile) => {
    const status = complianceService.getComplianceStatus(profile);
    return status.message;
  };

  return (
    <div className="compliance-management">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">🏛️ Compliance & Regulatory Management</h2>
          <p className="card-description">
            Manage compliance verification, regulatory requirements, and audit trails for IP asset holders
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'verify' ? 'active' : ''}`}
            onClick={() => setActiveTab('verify')}
          >
            ✅ Verify Compliance
          </button>
          <button
            className={`tab-button ${activeTab === 'view' ? 'active' : ''}`}
            onClick={() => setActiveTab('view')}
          >
            👁️ View Profile
          </button>
          <button
            className={`tab-button ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage')}
          >
            ⚙️ Manage Compliance
          </button>
          <button
            className={`tab-button ${activeTab === 'report' ? 'active' : ''}`}
            onClick={() => setActiveTab('report')}
          >
            🚨 Report Violation
          </button>
        </div>

        {/* Verify Compliance Tab */}
        {activeTab === 'verify' && (
          <div className="tab-content">
            <div className="card-body">
              <h3>Verify Entity Compliance</h3>
              <p className="card-description">
                Verify compliance for entities to allow them to hold, trade, or transfer IP assets
              </p>

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

              <div className="form-group-row">
                <div className="form-group">
                  <label className="form-label">Compliance Level</label>
                  <select
                    className="form-select"
                    value={verificationRequest.level}
                    onChange={(e) => setVerificationRequest({...verificationRequest, level: parseInt(e.target.value) as ComplianceLevel})}
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
                    onChange={(e) => setVerificationRequest({...verificationRequest, entityType: parseInt(e.target.value) as EntityType})}
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
              </div>

              <div className="form-group-row">
                <div className="form-group">
                  <label className="form-label">Jurisdiction</label>
                  <input
                    type="text"
                    className="form-input"
                    value={verificationRequest.jurisdiction}
                    onChange={(e) => setVerificationRequest({...verificationRequest, jurisdiction: e.target.value})}
                    placeholder="e.g., United States, EU, Singapore"
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
              </div>

              <div className="form-group">
                <label className="form-label">Compliance Expiry Date</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={new Date(verificationRequest.expiryDate * 1000).toISOString().slice(0, 16)}
                  onChange={(e) => setVerificationRequest({...verificationRequest, expiryDate: Math.floor(new Date(e.target.value).getTime() / 1000)})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Permissions</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={verificationRequest.permissions.canHoldIPAssets}
                      onChange={(e) => setVerificationRequest({
                        ...verificationRequest,
                        permissions: {...verificationRequest.permissions, canHoldIPAssets: e.target.checked}
                      })}
                    />
                    Can Hold IP Assets
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={verificationRequest.permissions.canTradeIPAssets}
                      onChange={(e) => setVerificationRequest({
                        ...verificationRequest,
                        permissions: {...verificationRequest.permissions, canTradeIPAssets: e.target.checked}
                      })}
                    />
                    Can Trade IP Assets
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={verificationRequest.permissions.canTransferIPAssets}
                      onChange={(e) => setVerificationRequest({
                        ...verificationRequest,
                        permissions: {...verificationRequest.permissions, canTransferIPAssets: e.target.checked}
                      })}
                    />
                    Can Transfer IP Assets
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Compliance Notes</label>
                <textarea
                  className="form-textarea"
                  value={verificationRequest.notes}
                  onChange={(e) => setVerificationRequest({...verificationRequest, notes: e.target.value})}
                  placeholder="Additional compliance notes or verification details..."
                  rows={3}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={handleVerifyCompliance}
                disabled={loading || !verificationRequest.entity.trim()}
              >
                {loading ? '⏳ Verifying...' : '✅ Verify Compliance'}
              </button>
            </div>
          </div>
        )}

        {/* View Profile Tab */}
        {activeTab === 'view' && (
          <div className="tab-content">
            <div className="card-body">
              <h3>View Compliance Profile</h3>
              <p className="card-description">
                View compliance status and audit trail for any entity
              </p>

              <div className="form-group">
                <label className="form-label">Entity Address</label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-input"
                    value={viewEntity}
                    onChange={(e) => setViewEntity(e.target.value)}
                    placeholder="0x..."
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => loadComplianceProfile(viewEntity)}
                    disabled={loading || !viewEntity.trim()}
                  >
                    {loading ? '⏳ Loading...' : '🔍 Load Profile'}
                  </button>
                </div>
              </div>

              {complianceProfile && (
                <div className="compliance-profile">
                  <h4>Compliance Profile</h4>
                  <div className={`status-badge status-${getComplianceStatusColor(complianceProfile)}`}>
                    {getComplianceStatusMessage(complianceProfile)}
                  </div>

                  <div className="profile-details">
                    <div className="detail-row">
                      <span className="detail-label">Compliance Level:</span>
                      <span className="detail-value">{complianceService.getComplianceLevelString(complianceProfile.level)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Entity Type:</span>
                      <span className="detail-value">{complianceService.getEntityTypeString(complianceProfile.entityType)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Jurisdiction:</span>
                      <span className="detail-value">{complianceProfile.jurisdiction}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Registration Number:</span>
                      <span className="detail-value">{complianceProfile.registrationNumber}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Verification Date:</span>
                      <span className="detail-value">{new Date(complianceProfile.verificationDate * 1000).toLocaleString()}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Expiry Date:</span>
                      <span className="detail-value">{new Date(complianceProfile.expiryDate * 1000).toLocaleString()}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Verifier:</span>
                      <span className="detail-value">{complianceProfile.verifier}</span>
                    </div>
                  </div>

                  <div className="permissions-section">
                    <h5>Permissions</h5>
                    <div className="permissions-grid">
                      <div className={`permission-item ${complianceProfile.canHoldIPAssets ? 'allowed' : 'denied'}`}>
                        {complianceProfile.canHoldIPAssets ? '✅' : '❌'} Hold IP Assets
                      </div>
                      <div className={`permission-item ${complianceProfile.canTradeIPAssets ? 'allowed' : 'denied'}`}>
                        {complianceProfile.canTradeIPAssets ? '✅' : '❌'} Trade IP Assets
                      </div>
                      <div className={`permission-item ${complianceProfile.canTransferIPAssets ? 'allowed' : 'denied'}`}>
                        {complianceProfile.canTransferIPAssets ? '✅' : '❌'} Transfer IP Assets
                      </div>
                    </div>
                  </div>

                  {complianceProfile.complianceNotes && (
                    <div className="notes-section">
                      <h5>Compliance Notes</h5>
                      <p className="notes-text">{complianceProfile.complianceNotes}</p>
                    </div>
                  )}

                  {auditTrail.length > 0 && (
                    <div className="audit-trail-section">
                      <h5>Audit Trail</h5>
                      <div className="audit-trail">
                        {auditTrail.map((entry, index) => (
                          <div key={index} className="audit-entry">
                            <div className="audit-header">
                              <span className="audit-action">{entry.action}</span>
                              <span className="audit-timestamp">{new Date(entry.timestamp * 1000).toLocaleString()}</span>
                            </div>
                            <div className="audit-details">{entry.details}</div>
                            <div className="audit-operator">Operator: {entry.operator}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manage Compliance Tab */}
        {activeTab === 'manage' && (
          <div className="tab-content">
            <div className="card-body">
              <h3>Manage Compliance</h3>
              <p className="card-description">
                Update permissions or revoke compliance for entities
              </p>

              <div className="form-group">
                <label className="form-label">Entity Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={manageEntity}
                  onChange={(e) => setManageEntity(e.target.value)}
                  placeholder="0x..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Update Permissions</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={updatePermissions.canHoldIPAssets}
                      onChange={(e) => setUpdatePermissions({...updatePermissions, canHoldIPAssets: e.target.checked})}
                    />
                    Can Hold IP Assets
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={updatePermissions.canTradeIPAssets}
                      onChange={(e) => setUpdatePermissions({...updatePermissions, canTradeIPAssets: e.target.checked})}
                    />
                    Can Trade IP Assets
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={updatePermissions.canTransferIPAssets}
                      onChange={(e) => setUpdatePermissions({...updatePermissions, canTransferIPAssets: e.target.checked})}
                    />
                    Can Transfer IP Assets
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Update Notes</label>
                <textarea
                  className="form-textarea"
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  placeholder="Reason for permission update..."
                  rows={3}
                />
              </div>

              <div className="form-group-row">
                <button
                  className="btn btn-warning"
                  onClick={handleUpdateComplianceProfile}
                  disabled={loading || !manageEntity.trim()}
                >
                  {loading ? '⏳ Updating...' : '🔄 Update Profile'}
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Revoke Compliance</label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-input"
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    placeholder="Reason for revocation..."
                  />
                  <button
                    className="btn btn-error"
                    onClick={handleRevokeCompliance}
                    disabled={loading || !manageEntity.trim() || !revokeReason.trim()}
                  >
                    {loading ? '⏳ Revoking...' : '❌ Revoke Compliance'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report Violation Tab */}
        {activeTab === 'report' && (
          <div className="tab-content">
            <div className="card-body">
              <h3>Report Compliance Violation</h3>
              <p className="card-description">
                Report compliance violations or suspicious activities
              </p>

              <div className="form-group">
                <label className="form-label">Entity Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={violationEntity}
                  onChange={(e) => setViolationEntity(e.target.value)}
                  placeholder="0x..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Asset ID (Optional)</label>
                <input
                  type="number"
                  className="form-input"
                  value={violationAssetId}
                  onChange={(e) => setViolationAssetId(e.target.value)}
                  placeholder="Asset ID if violation is asset-specific"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Violation Description</label>
                <textarea
                  className="form-textarea"
                  value={violationDescription}
                  onChange={(e) => setViolationDescription(e.target.value)}
                  placeholder="Describe the compliance violation..."
                  rows={4}
                />
              </div>

              <button
                className="btn btn-error"
                onClick={handleReportViolation}
                disabled={loading || !violationEntity.trim() || !violationDescription.trim()}
              >
                {loading ? '⏳ Reporting...' : '🚨 Report Violation'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceManagement;


import React, { useState, useEffect } from 'react';
import './ArbitrationDashboard.css';
import { ipAssetLockerService } from '../services/ipAssetLockerService';

interface DisputeData {
  disputeId: string;
  ipAssetId: string;
  challenger: string;
  currentOwner: string;
  evidence: string;
  bond: string;
  challengeTime: number;
  votingEndTime: number;
  status: 'PENDING' | 'VOTING' | 'RESOLVED' | 'ESCALATED' | 'CANCELLED';
  totalVotesFor: number;
  totalVotesAgainst: number;
  totalStakeFor: string;
  totalStakeAgainst: string;
  hcsSequenceNumber?: string;
}

interface IPAssetData {
  assetId: string;
  owner: string;
  metadataURI: string;
  registrationTime: number;
  isActive: boolean;
  disputeCount: number;
  hcsTopicId: string;
  infringementDetected: boolean;
  infringementDetectionTime: number;
  infringementEvidence: string;
  arbitrationEligible: boolean;
}

interface LockedIPAsset {
  ipAssetId: number;
  isLocked: boolean;
  lockedAmount: string;
}

interface IPAssetLockerStats {
  totalMintedHBAR: string;
  totalHBARTokensMinted: string;
  totalLockedAssets: number;
}

interface DisputeStats {
  total: number;
  resolved: number;
  pending: number;
  voting: number;
  escalated: number;
}

const ArbitrationDashboard: React.FC = () => {
  const [disputes, setDisputes] = useState<DisputeData[]>([]);
  const [assets, setAssets] = useState<IPAssetData[]>([]);
  const [stats, setStats] = useState<DisputeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'disputes' | 'assets' | 'stats' | 'tokens' | 'ip-locker'>('disputes');

  // Token state
  const [tokenInfo, setTokenInfo] = useState({
    isInitialized: false,
    tokenBalance: '0',
    stakedTokens: '0',
    votingPower: '0',
    pendingRewards: '0'
  });
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');

  // New dispute form state
  const [newDispute, setNewDispute] = useState({
    ipAssetId: '',
    evidence: '',
    bondAmount: '10'
  });

  // Vote form state
  const [voteForm, setVoteForm] = useState({
    disputeId: '',
    voteFor: true,
    stakeAmount: '100'
  });

  // IP Asset Locker state
  const [lockedAssets, setLockedAssets] = useState<LockedIPAsset[]>([]);
  const [lockerStats, setLockerStats] = useState<IPAssetLockerStats | null>(null);
  const [lockForm, setLockForm] = useState({
    ipAssetId: '',
    hbarAmount: ''
  });
  const [unlockForm, setUnlockForm] = useState({
    ipAssetId: '',
    hbarAmount: ''
  });
  const [userAddress, setUserAddress] = useState('0x9404966338eB27aF420a952574d777598Bbb58c4'); // Real deployer address

  useEffect(() => {
    loadData();
    loadTokenInfo();
    loadIPAssetLockerData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load dispute statistics
      const statsResponse = await fetch('https://seekerip-production-f87d.up.railway.app/api/arbitration/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      // Load recent disputes (this would need to be implemented in the backend)
      // For now, we'll show a placeholder
      setDisputes([]);
      setAssets([]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const checkInfringements = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://seekerip-production-f87d.up.railway.app/api/arbitration/check-infringements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Infringement check result:', result);
        // Reload data to show updated arbitration eligibility
        await loadData();
        alert(`Infringement check completed. Found ${result.data.successCount} new infringements.`);
      } else {
        throw new Error('Failed to check infringements');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check infringements');
    } finally {
      setLoading(false);
    }
  };

  const loadTokenInfo = async () => {
    try {
      // Check if token is initialized
      const statusResponse = await fetch('https://seekerip-production-f87d.up.railway.app/api/arbitration/token-status');
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setTokenInfo(prev => ({ ...prev, isInitialized: statusData.data.isInitialized }));
      }

      // Load token balance (assuming we have a user address)
      // In a real app, you'd get this from the connected wallet
      const userAddress = '0x1234567890123456789012345678901234567890'; // Placeholder
      const balanceResponse = await fetch(`https://seekerip-production-f87d.up.railway.app/api/arbitration/token-balance/${userAddress}`);
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setTokenInfo(prev => ({
          ...prev,
          tokenBalance: balanceData.data.tokenBalance,
          stakedTokens: balanceData.data.stakedTokens,
          votingPower: balanceData.data.votingPower,
          pendingRewards: balanceData.data.pendingRewards
        }));
      }
    } catch (err) {
      console.error('Error loading token info:', err);
    }
  };

  const initializeToken = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://seekerip-production-f87d.up.railway.app/api/arbitration/initialize-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await response.json();
        alert('Token initialized successfully!');
        await loadTokenInfo();
      } else {
        throw new Error('Failed to initialize token');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize token');
    } finally {
      setLoading(false);
    }
  };

  const stakeTokens = async () => {
    try {
      if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
        alert('Please enter a valid amount to stake');
        return;
      }

      setLoading(true);
      const response = await fetch('https://seekerip-production-f87d.up.railway.app/api/arbitration/stake-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: stakeAmount }),
      });

      if (response.ok) {
        await response.json();
        alert('Tokens staked successfully!');
        setStakeAmount('');
        await loadTokenInfo();
      } else {
        throw new Error('Failed to stake tokens');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stake tokens');
    } finally {
      setLoading(false);
    }
  };

  const unstakeTokens = async () => {
    try {
      if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
        alert('Please enter a valid amount to unstake');
        return;
      }

      setLoading(true);
      const response = await fetch('https://seekerip-production-f87d.up.railway.app/api/arbitration/unstake-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: unstakeAmount }),
      });

      if (response.ok) {
        await response.json();
        alert('Tokens unstaked successfully!');
        setUnstakeAmount('');
        await loadTokenInfo();
      } else {
        throw new Error('Failed to unstake tokens');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unstake tokens');
    } finally {
      setLoading(false);
    }
  };

  const claimRewards = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://seekerip-production-f87d.up.railway.app/api/arbitration/claim-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await response.json();
        alert('Rewards claimed successfully!');
        await loadTokenInfo();
      } else {
        throw new Error('Failed to claim rewards');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim rewards');
    } finally {
      setLoading(false);
    }
  };

  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('https://seekerip-production-f87d.up.railway.app/api/arbitration/raise-dispute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDispute),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Dispute raised successfully! Dispute ID: ${result.data.disputeId}`);
        setNewDispute({ ipAssetId: '', evidence: '', bondAmount: '10' });
        loadData();
      } else {
        const error = await response.json();
        alert(`Failed to raise dispute: ${error.message}`);
      }
    } catch (err) {
      alert(`Error raising dispute: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCastVote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('https://seekerip-production-f87d.up.railway.app/api/arbitration/cast-vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(voteForm),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Vote cast successfully! HCS Sequence: ${result.data.hcsSequenceNumber}`);
        setVoteForm({ disputeId: '', voteFor: true, stakeAmount: '100' });
        loadData();
      } else {
        const error = await response.json();
        alert(`Failed to cast vote: ${error.message}`);
      }
    } catch (err) {
      alert(`Error casting vote: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const resolveDispute = async (disputeId: string) => {
    if (!confirm('Are you sure you want to resolve this dispute?')) return;

    try {
      const response = await fetch('https://seekerip-production-f87d.up.railway.app/api/arbitration/resolve-dispute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ disputeId }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Dispute resolved! Challenger won: ${result.data.challengerWon}`);
        loadData();
      } else {
        const error = await response.json();
        alert(`Failed to resolve dispute: ${error.message}`);
      }
    } catch (err) {
      alert(`Error resolving dispute: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const escalateDispute = async (disputeId: string) => {
    const arbitratorAddress = prompt('Enter arbitrator address:');
    if (!arbitratorAddress) return;

    try {
      const response = await fetch('https://seekerip-production-f87d.up.railway.app/api/arbitration/escalate-dispute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ disputeId, arbitratorAddress }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Dispute escalated successfully! HCS Sequence: ${result.data.hcsSequenceNumber}`);
        loadData();
      } else {
        const error = await response.json();
        alert(`Failed to escalate dispute: ${error.message}`);
      }
    } catch (err) {
      alert(`Error escalating dispute: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // IP Asset Locker functions
  const loadIPAssetLockerData = async () => {
    try {
      // Load IP Asset Locker stats
      const stats = await ipAssetLockerService.getStats();
      setLockerStats(stats);

      // Load user's locked assets
      console.log('Loading locked assets for user:', userAddress);
      const userData = await ipAssetLockerService.getUserLockedAssets(userAddress);
      console.log('User data received:', userData);
      setLockedAssets(userData.lockedAssets);
      console.log('Locked assets set:', userData.lockedAssets);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error loading IP Asset Locker data:', errorMessage);
      
      // Check if backend is running
      if (errorMessage.includes('Backend may not be running')) {
        console.warn('⚠️ IP Asset Locker backend service is not running. Please start the backend server.');
        setError('IP Asset Locker service unavailable - backend not running');
      } else {
        setError(`Failed to load IP Asset Locker data: ${errorMessage}`);
      }
    }
  };

  const lockIPAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!lockForm.ipAssetId || !lockForm.hbarAmount) {
        alert('Please fill in all fields');
        return;
      }

      const result = await ipAssetLockerService.lockIPAsset({
        ipAssetId: parseInt(lockForm.ipAssetId),
        hbarAmount: lockForm.hbarAmount,
        userAddress: userAddress
      });

      alert(`IP Asset locked successfully! Transaction: ${result.transactionHash}`);
      setLockForm({ ipAssetId: '', hbarAmount: '' });
      await loadIPAssetLockerData();
    } catch (err) {
      alert(`Error locking IP asset: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const unlockIPAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!unlockForm.ipAssetId || !unlockForm.hbarAmount) {
        alert('Please fill in all fields');
        return;
      }

      const result = await ipAssetLockerService.unlockIPAsset({
        ipAssetId: parseInt(unlockForm.ipAssetId),
        hbarAmount: unlockForm.hbarAmount,
        userAddress: userAddress
      });

      alert(`IP Asset unlocked successfully! Transaction: ${result.transactionHash}`);
      setUnlockForm({ ipAssetId: '', hbarAmount: '' });
      await loadIPAssetLockerData();
    } catch (err) {
      alert(`Error unlocking IP asset: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const unlockAllFromAsset = async (ipAssetId: number, lockedAmount: string) => {
    try {
      const result = await ipAssetLockerService.unlockIPAsset({
        ipAssetId: ipAssetId,
        hbarAmount: lockedAmount, // Use the exact locked amount
        userAddress: userAddress
      });

      alert(`All ${formatHBAR(lockedAmount)} unlocked successfully from IP Asset #${ipAssetId}! Transaction: ${result.transactionHash}`);
      await loadIPAssetLockerData();
    } catch (err) {
      alert(`Error unlocking IP asset: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const checkAssetEligibility = async (ipAssetId: string) => {
    try {
      const result = await ipAssetLockerService.checkEligibility(ipAssetId);
      alert(`IP Asset ${ipAssetId} is ${result.isEligible ? 'eligible' : 'not eligible'} for locking${result.reason ? `: ${result.reason}` : ''}`);
    } catch (err) {
      alert(`Error checking eligibility: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#f59e0b';
      case 'VOTING': return '#3b82f6';
      case 'RESOLVED': return '#10b981';
      case 'ESCALATED': return '#8b5cf6';
      case 'CANCELLED': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatHBAR = (amount: string) => {
    // The backend returns amounts already formatted by formatEther, so they're already in HBAR
    const hbarAmount = parseFloat(amount);
    return hbarAmount.toFixed(4) + ' HBAR';
  };

  if (loading) {
    return (
      <div className="arbitration-dashboard">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading arbitration data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="arbitration-dashboard">
      <div className="dashboard-header">
        <h1>🏛️ Intellectual Property Arbitration</h1>
        {/* <p>UMA-like dispute resolution system with Hedera Consensus Service</p> */}
        <div className="header-actions">
          <button onClick={checkInfringements} className="check-infringements-btn">
            🔍 Check for Infringements
          </button>
          <button onClick={loadData} className="refresh-btn">🔄 Refresh</button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <p>❌ {error}</p>
          <button onClick={loadData}>Retry</button>
        </div>
      )}

      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'disputes' ? 'active' : ''} 
          onClick={() => setActiveTab('disputes')}
        >
          Disputes
        </button>
        <button 
          className={activeTab === 'assets' ? 'active' : ''} 
          onClick={() => setActiveTab('assets')}
        >
          IP Assets
        </button>
        <button 
          className={activeTab === 'stats' ? 'active' : ''} 
          onClick={() => setActiveTab('stats')}
        >
          Statistics
        </button>
        <button 
          className={activeTab === 'tokens' ? 'active' : ''} 
          onClick={() => setActiveTab('tokens')}
        >
          Tokens
        </button>
        <button 
          className={activeTab === 'ip-locker' ? 'active' : ''} 
          onClick={() => setActiveTab('ip-locker')}
        >
          IP Asset Locker
        </button>
      </div>

      {activeTab === 'disputes' && (
        <div className="disputes-section">
          <div className="section-header">
            <h2>Active Disputes</h2>
            <button onClick={loadData} className="refresh-btn">🔄 Refresh</button>
          </div>

          <div className="disputes-grid">
            {disputes.length === 0 ? (
              <div className="empty-state">
                <p>No disputes found. Disputes will appear here when raised.</p>
              </div>
            ) : (
              disputes.map((dispute) => (
                <div key={dispute.disputeId} className="dispute-card">
                  <div className="dispute-header">
                    <h3>Dispute #{dispute.disputeId}</h3>
                    <span 
                      className="status-badge" 
                      style={{ backgroundColor: getStatusColor(dispute.status) }}
                    >
                      {dispute.status}
                    </span>
                  </div>
                  
                  <div className="dispute-details">
                    <p><strong>IP Asset ID:</strong> {dispute.ipAssetId}</p>
                    <p><strong>Challenger:</strong> {dispute.challenger}</p>
                    <p><strong>Current Owner:</strong> {dispute.currentOwner}</p>
                    <p><strong>Bond:</strong> {formatHBAR(dispute.bond)}</p>
                    <p><strong>Evidence:</strong> {dispute.evidence}</p>
                    <p><strong>Votes For:</strong> {dispute.totalVotesFor}</p>
                    <p><strong>Votes Against:</strong> {dispute.totalVotesAgainst}</p>
                    <p><strong>Stake For:</strong> {formatHBAR(dispute.totalStakeFor)}</p>
                    <p><strong>Stake Against:</strong> {formatHBAR(dispute.totalStakeAgainst)}</p>
                    <p><strong>Challenge Time:</strong> {formatTime(dispute.challengeTime)}</p>
                    <p><strong>Voting End:</strong> {formatTime(dispute.votingEndTime)}</p>
                  </div>

                  <div className="dispute-actions">
                    {dispute.status === 'VOTING' && (
                      <>
                        <button onClick={() => resolveDispute(dispute.disputeId)}>
                          Resolve Dispute
                        </button>
                        <button onClick={() => escalateDispute(dispute.disputeId)}>
                          Escalate to Arbitrator
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* New Dispute Form */}
          <div className="new-dispute-form">
            <h3>Report IP Infringement (Owner Only)</h3>
            <form onSubmit={handleRaiseDispute}>
              <div className="form-group">
                <label>Your IP Asset ID:</label>
                <input
                  type="text"
                  value={newDispute.ipAssetId}
                  onChange={(e) => setNewDispute({ ...newDispute, ipAssetId: e.target.value })}
                  placeholder="Enter IP Asset ID"
                  required
                />
              </div>
              <div className="form-group">
                <label>Infringement Evidence (IPFS Hash):</label>
                <input
                  type="text"
                  value={newDispute.evidence}
                  onChange={(e) => setNewDispute({ ...newDispute, evidence: e.target.value })}
                  placeholder="Enter IPFS hash of infringement evidence"
                  required
                />
              </div>
              <div className="form-group">
                <label>Bond Amount (HBAR):</label>
                <input
                  type="number"
                  value={newDispute.bondAmount}
                  onChange={(e) => setNewDispute({ ...newDispute, bondAmount: e.target.value })}
                  placeholder="10"
                  min="10"
                  required
                />
              </div>
              <button type="submit" className="submit-btn">
                Report Infringement
              </button>
            </form>
          </div>

          {/* Vote Form */}
          <div className="vote-form">
            <h3>Cast Vote</h3>
            <form onSubmit={handleCastVote}>
              <div className="form-group">
                <label>Dispute ID:</label>
                <input
                  type="text"
                  value={voteForm.disputeId}
                  onChange={(e) => setVoteForm({ ...voteForm, disputeId: e.target.value })}
                  placeholder="Enter Dispute ID"
                  required
                />
              </div>
              <div className="form-group">
                <label>Vote For Challenger:</label>
                <input
                  type="checkbox"
                  checked={voteForm.voteFor}
                  onChange={(e) => setVoteForm({ ...voteForm, voteFor: e.target.checked })}
                />
              </div>
              <div className="form-group">
                <label>Stake Amount (HBAR):</label>
                <input
                  type="number"
                  value={voteForm.stakeAmount}
                  onChange={(e) => setVoteForm({ ...voteForm, stakeAmount: e.target.value })}
                  placeholder="100"
                  min="100"
                  required
                />
              </div>
              <button type="submit" className="submit-btn">
                Cast Vote
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'assets' && (
        <div className="assets-section">
          <div className="section-header">
            <h2>IP Assets</h2>
            <button onClick={loadData} className="refresh-btn">🔄 Refresh</button>
          </div>

          <div className="assets-grid">
            {assets.length === 0 ? (
              <div className="empty-state">
                <p>No IP assets found. Assets will appear here when registered.</p>
              </div>
            ) : (
              assets.map((asset) => (
                <div key={asset.assetId} className="asset-card">
                  <div className="asset-header">
                    <h3>Asset #{asset.assetId}</h3>
                    <span className={`status-badge ${asset.isActive ? 'active' : 'inactive'}`}>
                      {asset.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  
                  <div className="asset-details">
                    <p><strong>Owner:</strong> {asset.owner}</p>
                    <p><strong>Metadata URI:</strong> {asset.metadataURI}</p>
                    <p><strong>Registration Time:</strong> {formatTime(asset.registrationTime)}</p>
                    <p><strong>Dispute Count:</strong> {asset.disputeCount}</p>
                    <p><strong>HCS Topic ID:</strong> {asset.hcsTopicId}</p>
                    
                    <div className="infringement-status">
                      <p><strong>Infringement Status:</strong> 
                        <span className={`infringement-badge ${asset.infringementDetected ? 'detected' : 'none'}`}>
                          {asset.infringementDetected ? '🚨 DETECTED' : '✅ NONE'}
                        </span>
                      </p>
                      {asset.infringementDetected && (
                        <>
                          <p><strong>Detection Time:</strong> {formatTime(asset.infringementDetectionTime)}</p>
                          <p><strong>Evidence:</strong> {asset.infringementEvidence}</p>
                        </>
                      )}
                      <p><strong>Arbitration Eligible:</strong> 
                        <span className={`arbitration-badge ${asset.arbitrationEligible ? 'eligible' : 'not-eligible'}`}>
                          {asset.arbitrationEligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="stats-section">
          <div className="section-header">
            <h2>Arbitration Statistics</h2>
            <button onClick={loadData} className="refresh-btn">🔄 Refresh</button>
          </div>

          {stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Disputes</h3>
                <p className="stat-number">{stats.total}</p>
              </div>
              <div className="stat-card">
                <h3>Resolved</h3>
                <p className="stat-number">{stats.resolved}</p>
              </div>
              <div className="stat-card">
                <h3>Pending</h3>
                <p className="stat-number">{stats.pending}</p>
              </div>
              <div className="stat-card">
                <h3>Voting</h3>
                <p className="stat-number">{stats.voting}</p>
              </div>
              <div className="stat-card">
                <h3>Escalated</h3>
                <p className="stat-number">{stats.escalated}</p>
              </div>
            </div>
          )}

          <div className="arbitration-info">
            <h3>Arbitration System Info</h3>
            <div className="info-grid">
              <div className="info-item">
                <strong>Dispute Bond:</strong> 10 HBAR
              </div>
              <div className="info-item">
                <strong>Voting Period:</strong> 7 days
              </div>
              <div className="info-item">
                <strong>Challenge Period:</strong> 3 days
              </div>
              <div className="info-item">
                <strong>Min Stake to Vote:</strong> 100 HBAR
              </div>
              <div className="info-item">
                <strong>Arbitrator Fee:</strong> 50 HBAR
              </div>
              <div className="info-item">
                <strong>HCS Integration:</strong> ✅ Active
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tokens' && (
        <div className="tokens-section">
          <div className="section-header">
            <h2>Token Management</h2>
            <button onClick={loadTokenInfo} className="refresh-btn">🔄 Refresh</button>
          </div>

          <div className="token-status">
            <h3>Token Status</h3>
            <div className="status-indicator">
              <span className={`status-badge ${tokenInfo.isInitialized ? 'active' : 'inactive'}`}>
                {tokenInfo.isInitialized ? '✅ INITIALIZED' : '❌ NOT INITIALIZED'}
              </span>
            </div>
            {!tokenInfo.isInitialized && (
              <button onClick={initializeToken} className="init-token-btn">
                🪙 Initialize Token
              </button>
            )}
          </div>

          {tokenInfo.isInitialized && (
            <>
              <div className="token-balance">
                <h3>Your Token Balance</h3>
                <div className="balance-grid">
                  <div className="balance-item">
                    <strong>Token Balance:</strong> {tokenInfo.tokenBalance} IPAT
                  </div>
                  <div className="balance-item">
                    <strong>Staked Tokens:</strong> {tokenInfo.stakedTokens} IPAT
                  </div>
                  <div className="balance-item">
                    <strong>Voting Power:</strong> {tokenInfo.votingPower} IPAT
                  </div>
                  <div className="balance-item">
                    <strong>Pending Rewards:</strong> {tokenInfo.pendingRewards} IPAT
                  </div>
                </div>
              </div>

              <div className="token-actions">
                <h3>Token Actions</h3>
                
                <div className="action-group">
                  <h4>Stake Tokens</h4>
                  <div className="input-group">
                    <input
                      type="number"
                      placeholder="Amount to stake"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      min="0"
                      step="0.00000001"
                    />
                    <button onClick={stakeTokens} className="action-btn">
                      Stake
                    </button>
                  </div>
                </div>

                <div className="action-group">
                  <h4>Unstake Tokens</h4>
                  <div className="input-group">
                    <input
                      type="number"
                      placeholder="Amount to unstake"
                      value={unstakeAmount}
                      onChange={(e) => setUnstakeAmount(e.target.value)}
                      min="0"
                      step="0.00000001"
                    />
                    <button onClick={unstakeTokens} className="action-btn">
                      Unstake
                    </button>
                  </div>
                </div>

                <div className="action-group">
                  <h4>Claim Rewards</h4>
                  <div className="input-group">
                    <button onClick={claimRewards} className="action-btn claim-btn">
                      Claim {tokenInfo.pendingRewards} IPAT
                    </button>
                  </div>
                </div>
              </div>

              <div className="token-info">
                <h3>Token Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <strong>Token Name:</strong> IP Arbitration Token (IPAT)
                  </div>
                  <div className="info-item">
                    <strong>Symbol:</strong> IPAT
                  </div>
                  <div className="info-item">
                    <strong>Decimals:</strong> 8
                  </div>
                  <div className="info-item">
                    <strong>Total Supply:</strong> 10,000,000 IPAT
                  </div>
                  <div className="info-item">
                    <strong>Stake Lock Period:</strong> 7 days
                  </div>
                  <div className="info-item">
                    <strong>Voting Power:</strong> 1:1 with staked tokens
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'ip-locker' && (
        <div className="ip-locker-section">
          <div className="section-header">
            <h2>IP Asset Locker</h2>
            <button onClick={loadIPAssetLockerData} className="refresh-btn">🔄 Refresh</button>
          </div>

          {/* User Address Input */}
          <div className="user-address-section">
            <h3>User Address</h3>
            <div className="input-group">
              <input
                type="text"
                placeholder="Enter your wallet address"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                className="address-input"
              />
              <button onClick={loadIPAssetLockerData} className="action-btn">
                Load Data
              </button>
            </div>
          </div>

          {/* Statistics */}
          {lockerStats && (
            <div className="locker-stats">
              <h3>System Statistics</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <strong>Total Minted HBAR:</strong> {formatHBAR(lockerStats.totalMintedHBAR)}
                </div>
                <div className="stat-item">
                  <strong>Total HBAR Tokens:</strong> {formatHBAR(lockerStats.totalHBARTokensMinted)}
                </div>
                <div className="stat-item">
                  <strong>Total Locked Assets:</strong> {lockerStats.totalLockedAssets}
                </div>
              </div>
            </div>
          )}

          {/* Lock IP Asset Form */}
          <div className="lock-form">
            <h3>Lock IP Asset</h3>
            <form onSubmit={lockIPAsset}>
              <div className="form-group">
                <label>IP Asset ID:</label>
                <input
                  type="number"
                  value={lockForm.ipAssetId}
                  onChange={(e) => setLockForm({ ...lockForm, ipAssetId: e.target.value })}
                  placeholder="Enter IP Asset ID"
                  required
                />
              </div>
              <div className="form-group">
                <label>HBAR Amount:</label>
                <input
                  type="number"
                  value={lockForm.hbarAmount}
                  onChange={(e) => setLockForm({ ...lockForm, hbarAmount: e.target.value })}
                  placeholder="Enter HBAR amount"
                  step="0.00000001"
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="action-btn lock-btn">
                  🔒 Lock IP Asset
                </button>
                <button 
                  type="button" 
                  onClick={() => checkAssetEligibility(lockForm.ipAssetId)}
                  className="action-btn secondary-btn"
                >
                  Check Eligibility
                </button>
              </div>
            </form>
          </div>

          {/* Unlock IP Asset Form */}
          <div className="unlock-form">
            <h3>Unlock IP Asset</h3>
            <form onSubmit={unlockIPAsset}>
              <div className="form-group">
                <label>IP Asset ID:</label>
                <input
                  type="number"
                  value={unlockForm.ipAssetId}
                  onChange={(e) => setUnlockForm({ ...unlockForm, ipAssetId: e.target.value })}
                  placeholder="Enter IP Asset ID"
                  required
                />
              </div>
              <div className="form-group">
                <label>HBAR Amount:</label>
                <input
                  type="number"
                  value={unlockForm.hbarAmount}
                  onChange={(e) => setUnlockForm({ ...unlockForm, hbarAmount: e.target.value })}
                  placeholder="Enter HBAR amount to unlock"
                  step="0.00000001"
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="action-btn unlock-btn">
                  🔓 Unlock IP Asset
                </button>
              </div>
            </form>
          </div>

          {/* User's Locked Assets */}
          <div className="locked-assets">
            <h3>Your Locked Assets</h3>
            {lockedAssets.length === 0 ? (
              <div className="empty-state">
                <p>No locked assets found. Lock an IP asset to see it here.</p>
              </div>
            ) : (
              <div className="assets-grid">
                {lockedAssets.map((asset) => (
                  <div key={asset.ipAssetId} className="asset-card">
                    <div className="asset-header">
                      <h4>IP Asset #{asset.ipAssetId}</h4>
                      <span className={`status-badge ${asset.isLocked ? 'locked' : 'unlocked'}`}>
                        {asset.isLocked ? '🔒 LOCKED' : '🔓 UNLOCKED'}
                      </span>
                    </div>
                    <div className="asset-details">
                      <p><strong>Locked Amount:</strong> {formatHBAR(asset.lockedAmount)}</p>
                      <p><strong>Status:</strong> {asset.isLocked ? 'Locked' : 'Unlocked'}</p>
                      {asset.isLocked && (
                        <div className="asset-actions">
                          <button 
                            className="unlock-all-btn"
                            onClick={() => unlockAllFromAsset(asset.ipAssetId, asset.lockedAmount)}
                            title={`Unlock all ${formatHBAR(asset.lockedAmount)} from this asset`}
                          >
                            🔓 Unlock All ({formatHBAR(asset.lockedAmount)})
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Information Section */}
          <div className="locker-info">
            <h3>How IP Asset Locking Works</h3>
            <div className="info-content">
              <div className="info-item">
                <strong>🔒 Locking:</strong> Lock your IP assets to mint HBAR equivalent tokens
              </div>
              <div className="info-item">
                <strong>💰 Benefits:</strong> Get liquid HBAR tokens while keeping IP asset ownership
              </div>
              <div className="info-item">
                <strong>⚠️ Requirements:</strong> IP asset must not be in arbitration or dispute
              </div>
              <div className="info-item">
                <strong>🔄 Unlocking:</strong> Burn HBAR tokens to unlock your IP assets
              </div>
              <div className="info-item">
                <strong>📊 Eligibility:</strong> Only non-disputed IP assets can be locked
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArbitrationDashboard;



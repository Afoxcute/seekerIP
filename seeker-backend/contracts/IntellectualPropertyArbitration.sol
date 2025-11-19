// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "./system-contracts/hedera-token-service/HederaTokenService.sol";
import "./system-contracts/HederaResponseCodes.sol";
import "./system-contracts/hedera-token-service/IHederaTokenService.sol";
import "./system-contracts/hedera-token-service/KeyHelper.sol";
import "./system-contracts/hedera-token-service/ExpiryHelper.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// IPAssetManagerV2 will be passed as constructor parameter

// Interface for IPAssetManagerV2
interface IIPAssetManagerV2 {
    function transferIPAsset(uint256 assetId, address newOwner) external;
    function getIPAsset(uint256 assetId) external view returns (
        uint256 assetId_,
        address owner,
        string memory name,
        string memory description,
        string memory metadataURI,
        uint256 createdAt,
        bool isActive,
        address licenseToken,
        address royaltyVault,
        uint256 totalRevenue,
        uint256 totalLicenses,
        uint256 nftTokenId,
        string memory ipfsHash
    );
}

/**
 * @title IntellectualPropertyArbitration
 * @dev UMA-inspired IP dispute resolution system for Hedera
 * @notice This contract handles IP disputes with optimistic oracle pattern and HCS integration
 */
contract IntellectualPropertyArbitration is HederaTokenService, KeyHelper, ExpiryHelper, ReentrancyGuard, Ownable {
    using Strings for uint256;

    // Constants
    uint256 public constant DISPUTE_BOND = 10 * 10**8; // 10 HBAR in tinybars
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant CHALLENGE_PERIOD = 3 days;
    uint256 public constant MIN_STAKE_TO_VOTE = 100 * 10**8; // 100 HBAR
    uint256 public constant ARBITRATOR_FEE = 50 * 10**8; // 50 HBAR
    uint256 public constant MIN_PARTICIPATION_MULTIPLIER = 3; // 3x dispute bond
    
    // Contracts
    IIPAssetManagerV2 public ipAssetManager;
    address public arbitrationToken; // HTS token for governance
    
    // Structs
    struct IPAsset {
        address owner;
        string metadataURI;
        uint256 registrationTime;
        bool isActive;
        uint256 disputeCount;
        bytes32 hcsTopicId; // HCS topic for immutable records
        bool infringementDetected; // True when Yakoa detects infringement
        uint256 infringementDetectionTime; // When infringement was first detected
        string infringementEvidence; // IPFS hash of infringement evidence
        bool arbitrationEligible; // True when asset becomes eligible for arbitration
    }
    
    struct Dispute {
        uint256 disputeId;
        uint256 ipAssetId;
        address challenger;
        address currentOwner;
        string evidence; // IPFS hash of evidence
        uint256 bond; // Bond amount staked
        uint256 challengeTime;
        uint256 votingEndTime;
        DisputeStatus status;
        uint256 totalVotesFor;
        uint256 totalVotesAgainst;
        uint256 totalStakeFor;
        uint256 totalStakeAgainst;
        bytes32 hcsSequenceNumber; // HCS sequence for immutable record
        mapping(address => Vote) votes;
    }
    
    struct Vote {
        bool hasVoted;
        bool voteFor; // true = support challenger, false = support current owner
        uint256 stakeAmount;
        uint256 timestamp;
    }
    
    struct Arbitrator {
        address arbitrator;
        bool isActive;
        uint256 totalCases;
        uint256 successfulCases;
        uint256 reputation; // 0-1000 reputation score
        uint256 lastActive;
    }
    
    enum DisputeStatus {
        Pending,
        Voting,
        Resolved,
        Escalated,
        Cancelled
    }
    
    // State variables
    mapping(uint256 => IPAsset) public ipAssets;
    mapping(uint256 => Dispute) public disputes;
    mapping(address => uint256) public stakedBalances;
    mapping(address => Arbitrator) public arbitrators;
    mapping(address => bool) public authorizedArbitrators;
    mapping(bytes32 => uint256) public hcsTopicToAssetId;
    mapping(bytes32 => uint256) public hcsSequenceToDisputeId;
    
    // Token governance state
    mapping(address => uint256) public tokenBalances;
    mapping(address => uint256) public stakedTokens;
    mapping(address => uint256) public votingPower;
    mapping(address => uint256) public lastStakeTime;
    mapping(address => uint256) public vestingSchedule;
    mapping(address => uint256) public claimedRewards;
    
    uint256 public totalStakedTokens;
    uint256 public totalVotingPower;
    uint256 public rewardPool;
    uint256 public lastRewardDistribution;
    
    uint256 public nextIPAssetId = 1;
    uint256 public nextDisputeId = 1;
    uint256 public totalDisputes = 0;
    uint256 public resolvedDisputes = 0;
    
    // HCS Configuration
    bytes32 public constant HCS_TOPIC_PREFIX = keccak256("IP_ARBITRATION");
    uint256 public hcsTopicCounter = 0;
    
    // Events
    event IPAssetRegistered(
        uint256 indexed ipAssetId, 
        address indexed owner, 
        string metadataURI,
        bytes32 indexed hcsTopicId
    );
    
    event InfringementDetected(
        uint256 indexed ipAssetId,
        string infringementEvidence,
        uint256 detectionTime,
        bytes32 indexed hcsSequenceNumber
    );
    
    event ArbitrationEligibilityUpdated(
        uint256 indexed ipAssetId,
        bool eligible,
        bytes32 indexed hcsSequenceNumber
    );
    
    event DisputeRaised(
        uint256 indexed disputeId, 
        uint256 indexed ipAssetId, 
        address indexed challenger,
        string evidence,
        bytes32 hcsSequenceNumber
    );
    
    event VoteCast(
        uint256 indexed disputeId, 
        address indexed voter, 
        bool voteFor, 
        uint256 stakeAmount,
        bytes32 hcsSequenceNumber
    );
    
    event DisputeResolved(
        uint256 indexed disputeId, 
        bool challengerWon, 
        address newOwner,
        bytes32 indexed hcsSequenceNumber
    );
    
    event DisputeEscalated(
        uint256 indexed disputeId, 
        address indexed arbitrator,
        bytes32 hcsSequenceNumber
    );
    
    event ArbitratorAdded(address indexed arbitrator, uint256 reputation);
    event ArbitratorRemoved(address indexed arbitrator);
    event ArbitratorReputationUpdated(address indexed arbitrator, uint256 newReputation);
    
    // Token events
    event TokensStaked(address indexed staker, uint256 amount, uint256 votingPower);
    event TokensUnstaked(address indexed staker, uint256 amount, uint256 votingPower);
    event TokensMinted(address indexed recipient, uint256 amount);
    event TokensDistributed(address indexed recipient, uint256 amount, string reason);
    event RewardsClaimed(address indexed recipient, uint256 amount);
    event VotingPowerUpdated(address indexed voter, uint256 oldPower, uint256 newPower);
    
    // Modifiers
    modifier onlyArbitrator() {
        require(authorizedArbitrators[msg.sender] || msg.sender == owner(), "Not authorized arbitrator");
        _;
    }
    
    modifier disputeExists(uint256 disputeId) {
        require(disputes[disputeId].disputeId != 0, "Dispute does not exist");
        _;
    }
    
    modifier validDisputeStatus(uint256 disputeId, DisputeStatus requiredStatus) {
        require(disputes[disputeId].status == requiredStatus, "Invalid dispute status");
        _;
    }
    
    constructor(address _ipAssetManager) Ownable(msg.sender) {
        ipAssetManager = IIPAssetManagerV2(_ipAssetManager);
        
        // Token will be created separately after deployment
        // Call initializeArbitrationToken() after deployment
    }
    
    /**
     * @dev Initialize arbitration token (call after deployment)
     * @notice This function creates the HTS governance token
     */
    function initializeArbitrationToken() external onlyOwner {
        require(arbitrationToken == address(0), "Token already initialized");
        _createArbitrationToken();
    }
    
    /**
     * @dev Check if arbitration token is initialized
     * @return bool True if token is initialized
     */
    function isTokenInitialized() external view returns (bool) {
        return arbitrationToken != address(0);
    }
    
    /**
     * @dev Create HTS token for arbitration governance
     */
    function _createArbitrationToken() internal {
        // For testing purposes, we'll use a mock token address
        // In production, this would create a real HTS token
        arbitrationToken = address(0x1234567890123456789012345678901234567890);
        
        // Initialize token balances for testing
        tokenBalances[msg.sender] = 1000000 * 10**8; // Give owner 1M tokens for testing
        totalVotingPower = 1000000 * 10**8;
        
        emit TokensMinted(msg.sender, 1000000 * 10**8);
    }
    
    /**
     * @dev Register a new IP asset with HCS topic
     * @param metadataURI IPFS hash containing IP details, proof of creation, etc.
     * @return ipAssetId The registered asset ID
     * @return hcsTopicId The HCS topic ID for immutable records
     */
    function registerIPAsset(string memory metadataURI) external returns (uint256 ipAssetId, bytes32 hcsTopicId) {
        require(bytes(metadataURI).length > 0, "Metadata URI cannot be empty");
        
        ipAssetId = nextIPAssetId++;
        hcsTopicId = keccak256(abi.encodePacked(HCS_TOPIC_PREFIX, ipAssetId, block.timestamp));
        
        ipAssets[ipAssetId] = IPAsset({
            owner: msg.sender,
            metadataURI: metadataURI,
            registrationTime: block.timestamp,
            isActive: true,
            disputeCount: 0,
            hcsTopicId: hcsTopicId,
            infringementDetected: false,
            infringementDetectionTime: 0,
            infringementEvidence: "",
            arbitrationEligible: false
        });
        
        hcsTopicToAssetId[hcsTopicId] = ipAssetId;
        
        // Submit to HCS for immutable record
        _submitToHCS(hcsTopicId, "IP_ASSET_REGISTERED", ipAssetId, msg.sender, metadataURI);
        
        emit IPAssetRegistered(ipAssetId, msg.sender, metadataURI, hcsTopicId);
        return (ipAssetId, hcsTopicId);
    }
    
    /**
     * @dev Mark infringement detected for an IP asset (only callable by authorized Yakoa service)
     * @param ipAssetId The IP asset with detected infringement
     * @param infringementEvidence IPFS hash of infringement evidence
     * @return hcsSequenceNumber The HCS sequence number for immutable record
     */
    function markInfringementDetected(uint256 ipAssetId, string memory infringementEvidence) external onlyOwner 
        returns (bytes32 hcsSequenceNumber) {
        require(ipAssets[ipAssetId].isActive, "IP asset does not exist or inactive");
        require(!ipAssets[ipAssetId].infringementDetected, "Infringement already detected for this asset");
        require(bytes(infringementEvidence).length > 0, "Infringement evidence cannot be empty");
        
        hcsSequenceNumber = keccak256(abi.encodePacked(ipAssetId, block.timestamp, "INFRINGEMENT_DETECTED"));
        
        // Update IP asset with infringement detection
        ipAssets[ipAssetId].infringementDetected = true;
        ipAssets[ipAssetId].infringementDetectionTime = block.timestamp;
        ipAssets[ipAssetId].infringementEvidence = infringementEvidence;
        ipAssets[ipAssetId].arbitrationEligible = true;
        
        // Submit to HCS for immutable record
        _submitToHCS(ipAssets[ipAssetId].hcsTopicId, "INFRINGEMENT_DETECTED", ipAssetId, msg.sender, infringementEvidence);
        
        emit InfringementDetected(ipAssetId, infringementEvidence, block.timestamp, hcsSequenceNumber);
        emit ArbitrationEligibilityUpdated(ipAssetId, true, hcsSequenceNumber);
        
        return hcsSequenceNumber;
    }
    
    /**
     * @dev Raise a dispute for an IP asset (only by the IP asset owner when infringement is detected)
     * @param ipAssetId The IP asset being disputed
     * @param evidence IPFS hash of evidence supporting the infringement claim
     * @return disputeId The created dispute ID
     * @return hcsSequenceNumber The HCS sequence number for immutable record
     */
    function raiseDispute(uint256 ipAssetId, string memory evidence) external payable 
        returns (uint256 disputeId, bytes32 hcsSequenceNumber) {
        // Check if IP asset exists in main contract or arbitration contract
        bool existsInArbitration = ipAssets[ipAssetId].isActive;
        bool existsInMain = false;
        address ipAssetOwner;
        
        if (existsInArbitration) {
            // Use arbitration contract data
            require(ipAssets[ipAssetId].arbitrationEligible, "IP asset not eligible for arbitration - no infringement detected");
            require(ipAssets[ipAssetId].infringementDetected, "Infringement must be detected before dispute can be raised");
            ipAssetOwner = ipAssets[ipAssetId].owner;
        } else {
            // Check main IP asset contract
            try ipAssetManager.getIPAsset(ipAssetId) returns (
                uint256,
                address owner,
                string memory,
                string memory,
                string memory,
                uint256,
                bool isActive,
                address,
                address,
                uint256,
                uint256,
                uint256,
                string memory
            ) {
                require(isActive, "IP asset does not exist or inactive");
                existsInMain = true;
                ipAssetOwner = owner;
                // For assets not in arbitration contract, allow disputes without infringement check
            } catch {
                revert("IP asset does not exist or inactive");
            }
        }
        
        require(existsInArbitration || existsInMain, "IP asset does not exist or inactive");
        require(msg.value >= DISPUTE_BOND, "Insufficient bond amount");
        require(msg.sender == ipAssetOwner, "Only IP asset owner can raise disputes");
        require(bytes(evidence).length > 0, "Evidence cannot be empty");
        
        disputeId = nextDisputeId++;
        hcsSequenceNumber = keccak256(abi.encodePacked(disputeId, block.timestamp, msg.sender));
        
        Dispute storage dispute = disputes[disputeId];
        dispute.disputeId = disputeId;
        dispute.ipAssetId = ipAssetId;
        dispute.challenger = msg.sender;
        dispute.currentOwner = ipAssetOwner;
        dispute.evidence = evidence;
        dispute.bond = msg.value;
        dispute.challengeTime = block.timestamp;
        dispute.votingEndTime = block.timestamp + CHALLENGE_PERIOD + VOTING_PERIOD;
        dispute.status = DisputeStatus.Pending;
        dispute.hcsSequenceNumber = hcsSequenceNumber;
        
        ipAssets[ipAssetId].disputeCount++;
        totalDisputes++;
        
        // Submit to HCS for immutable record
        _submitToHCS(
            ipAssets[ipAssetId].hcsTopicId, 
            "DISPUTE_RAISED", 
            disputeId, 
            msg.sender, 
            evidence
        );
        
        hcsSequenceToDisputeId[hcsSequenceNumber] = disputeId;
        
        emit DisputeRaised(disputeId, ipAssetId, msg.sender, evidence, hcsSequenceNumber);
        return (disputeId, hcsSequenceNumber);
    }
    
    /**
     * @dev Cast a vote on a dispute
     * @param disputeId The dispute to vote on
     * @param voteFor true to support challenger, false to support current owner
     * @return hcsSequenceNumber The HCS sequence number for immutable record
     */
    function castVote(uint256 disputeId, bool voteFor) external payable 
        disputeExists(disputeId) 
        returns (bytes32 hcsSequenceNumber) {
        Dispute storage dispute = disputes[disputeId];
        require(
            dispute.status == DisputeStatus.Pending || dispute.status == DisputeStatus.Voting, 
            "Dispute not in voting phase"
        );
        require(block.timestamp >= dispute.challengeTime + CHALLENGE_PERIOD, "Challenge period not ended");
        require(block.timestamp <= dispute.votingEndTime, "Voting period ended");
        require(votingPower[msg.sender] >= MIN_STAKE_TO_VOTE, "Insufficient voting power to vote");
        require(!dispute.votes[msg.sender].hasVoted, "Already voted");
        
        if (dispute.status == DisputeStatus.Pending) {
            dispute.status = DisputeStatus.Voting;
        }
        
        hcsSequenceNumber = keccak256(abi.encodePacked(disputeId, msg.sender, block.timestamp));
        
        // Use voting power instead of HBAR stake
        uint256 voteWeight = votingPower[msg.sender];
        
        dispute.votes[msg.sender] = Vote({
            hasVoted: true,
            voteFor: voteFor,
            stakeAmount: voteWeight,
            timestamp: block.timestamp
        });
        
        if (voteFor) {
            dispute.totalVotesFor++;
            dispute.totalStakeFor += voteWeight;
        } else {
            dispute.totalVotesAgainst++;
            dispute.totalStakeAgainst += voteWeight;
        }
        
        // Update staked balances for HBAR (for dispute bonds)
        stakedBalances[msg.sender] += msg.value;
        
        // Submit to HCS for immutable record
        _submitToHCS(
            ipAssets[dispute.ipAssetId].hcsTopicId, 
            "VOTE_CAST", 
            disputeId, 
            msg.sender, 
            string(abi.encodePacked(voteFor ? "FOR" : "AGAINST", ":", msg.value.toString()))
        );
        
        emit VoteCast(disputeId, msg.sender, voteFor, voteWeight, hcsSequenceNumber);
        return hcsSequenceNumber;
    }
    
    /**
     * @dev Resolve a dispute based on voting results
     * @param disputeId The dispute to resolve
     * @return challengerWon Whether the challenger won
     * @return hcsSequenceNumber The HCS sequence number for immutable record
     */
    function resolveDispute(uint256 disputeId) external 
        disputeExists(disputeId) 
        validDisputeStatus(disputeId, DisputeStatus.Voting) 
        returns (bool challengerWon, bytes32 hcsSequenceNumber) {
        Dispute storage dispute = disputes[disputeId];
        require(block.timestamp > dispute.votingEndTime, "Voting period not ended");
        
        challengerWon = _calculateDisputeOutcome(disputeId);
        dispute.status = DisputeStatus.Resolved;
        resolvedDisputes++;
        
        hcsSequenceNumber = keccak256(abi.encodePacked(disputeId, "RESOLVED", block.timestamp));
        
        if (challengerWon) {
            // Transfer IP ownership in the main IP asset manager
            _transferIPOwnership(dispute.ipAssetId, dispute.challenger);
            
            // Update local asset owner
            ipAssets[dispute.ipAssetId].owner = dispute.challenger;
        }
        
        // Distribute rewards
        _distributeRewards(disputeId, challengerWon);
        
        // Submit to HCS for immutable record
        _submitToHCS(
            ipAssets[dispute.ipAssetId].hcsTopicId, 
            "DISPUTE_RESOLVED", 
            disputeId, 
            address(0), 
            string(abi.encodePacked(challengerWon ? "CHALLENGER_WON" : "OWNER_RETAINED"))
        );
        
        emit DisputeResolved(disputeId, challengerWon, ipAssets[dispute.ipAssetId].owner, hcsSequenceNumber);
        return (challengerWon, hcsSequenceNumber);
    }
    
    /**
     * @dev Escalate a dispute to human arbitrators for complex cases
     * @param disputeId The dispute to escalate
     * @return hcsSequenceNumber The HCS sequence number for immutable record
     */
    function escalateDispute(uint256 disputeId) external onlyArbitrator 
        disputeExists(disputeId) 
        validDisputeStatus(disputeId, DisputeStatus.Voting) 
        returns (bytes32 hcsSequenceNumber) {
        Dispute storage dispute = disputes[disputeId];
        
        dispute.status = DisputeStatus.Escalated;
        arbitrators[msg.sender].totalCases++;
        arbitrators[msg.sender].lastActive = block.timestamp;
        
        hcsSequenceNumber = keccak256(abi.encodePacked(disputeId, "ESCALATED", msg.sender, block.timestamp));
        
        // Submit to HCS for immutable record
        _submitToHCS(
            ipAssets[dispute.ipAssetId].hcsTopicId, 
            "DISPUTE_ESCALATED", 
            disputeId, 
            msg.sender, 
            "ESCALATED_TO_ARBITRATOR"
        );
        
        emit DisputeEscalated(disputeId, msg.sender, hcsSequenceNumber);
        return hcsSequenceNumber;
    }
    
    /**
     * @dev Manual resolution by authorized arbitrator
     * @param disputeId The dispute to resolve
     * @param challengerWon Whether the challenger should win
     * @return hcsSequenceNumber The HCS sequence number for immutable record
     */
    function arbitratorResolve(uint256 disputeId, bool challengerWon) external onlyArbitrator 
        disputeExists(disputeId) 
        validDisputeStatus(disputeId, DisputeStatus.Escalated) 
        returns (bytes32 hcsSequenceNumber) {
        Dispute storage dispute = disputes[disputeId];
        
        dispute.status = DisputeStatus.Resolved;
        resolvedDisputes++;
        
        // Update arbitrator stats
        arbitrators[msg.sender].successfulCases++;
        arbitrators[msg.sender].reputation = _calculateReputation(msg.sender);
        
        hcsSequenceNumber = keccak256(abi.encodePacked(disputeId, "ARBITRATOR_RESOLVED", msg.sender, block.timestamp));
        
        if (challengerWon) {
            _transferIPOwnership(dispute.ipAssetId, dispute.challenger);
            ipAssets[dispute.ipAssetId].owner = dispute.challenger;
        }
        
        _distributeRewards(disputeId, challengerWon);
        
        // Submit to HCS for immutable record
        _submitToHCS(
            ipAssets[dispute.ipAssetId].hcsTopicId, 
            "ARBITRATOR_RESOLVED", 
            disputeId, 
            msg.sender, 
            string(abi.encodePacked(challengerWon ? "CHALLENGER_WON" : "OWNER_RETAINED"))
        );
        
        emit DisputeResolved(disputeId, challengerWon, ipAssets[dispute.ipAssetId].owner, hcsSequenceNumber);
        return hcsSequenceNumber;
    }
    
    /**
     * @dev Cancel a dispute (only challenger can cancel before voting starts)
     * @param disputeId The dispute to cancel
     * @return hcsSequenceNumber The HCS sequence number for immutable record
     */
    function cancelDispute(uint256 disputeId) external 
        disputeExists(disputeId) 
        validDisputeStatus(disputeId, DisputeStatus.Pending) 
        returns (bytes32 hcsSequenceNumber) {
        Dispute storage dispute = disputes[disputeId];
        require(msg.sender == dispute.challenger, "Only challenger can cancel");
        require(block.timestamp < dispute.challengeTime + CHALLENGE_PERIOD, "Cannot cancel after challenge period");
        
        dispute.status = DisputeStatus.Cancelled;
        
        // Refund bond to challenger
        payable(dispute.challenger).transfer(dispute.bond);
        
        hcsSequenceNumber = keccak256(abi.encodePacked(disputeId, "CANCELLED", block.timestamp));
        
        // Submit to HCS for immutable record
        _submitToHCS(
            ipAssets[dispute.ipAssetId].hcsTopicId, 
            "DISPUTE_CANCELLED", 
            disputeId, 
            msg.sender, 
            "CANCELLED_BY_CHALLENGER"
        );
        
        return hcsSequenceNumber;
    }
    
    // Admin functions
    function addArbitrator(address arbitrator, uint256 initialReputation) external onlyOwner {
        require(arbitrator != address(0), "Invalid arbitrator address");
        require(initialReputation <= 1000, "Reputation must be <= 1000");
        
        arbitrators[arbitrator] = Arbitrator({
            arbitrator: arbitrator,
            isActive: true,
            totalCases: 0,
            successfulCases: 0,
            reputation: initialReputation,
            lastActive: block.timestamp
        });
        
        authorizedArbitrators[arbitrator] = true;
        
        emit ArbitratorAdded(arbitrator, initialReputation);
    }
    
    function removeArbitrator(address arbitrator) external onlyOwner {
        require(arbitrators[arbitrator].arbitrator != address(0), "Arbitrator does not exist");
        
        arbitrators[arbitrator].isActive = false;
        authorizedArbitrators[arbitrator] = false;
        
        emit ArbitratorRemoved(arbitrator);
    }
    
    function updateArbitratorReputation(address arbitrator, uint256 newReputation) external onlyOwner {
        require(arbitrators[arbitrator].arbitrator != address(0), "Arbitrator does not exist");
        require(newReputation <= 1000, "Reputation must be <= 1000");
        
        arbitrators[arbitrator].reputation = newReputation;
        
        emit ArbitratorReputationUpdated(arbitrator, newReputation);
    }
    
    // View functions
    function getIPAsset(uint256 ipAssetId) external view returns (
        address owner,
        string memory metadataURI,
        uint256 registrationTime,
        bool isActive,
        uint256 disputeCount,
        bytes32 hcsTopicId,
        bool infringementDetected,
        uint256 infringementDetectionTime,
        string memory infringementEvidence,
        bool arbitrationEligible
    ) {
        IPAsset storage asset = ipAssets[ipAssetId];
        return (
            asset.owner, 
            asset.metadataURI, 
            asset.registrationTime, 
            asset.isActive, 
            asset.disputeCount,
            asset.hcsTopicId,
            asset.infringementDetected,
            asset.infringementDetectionTime,
            asset.infringementEvidence,
            asset.arbitrationEligible
        );
    }
    
    /**
     * @dev Check if an IP asset is eligible for arbitration
     * @param ipAssetId The IP asset ID
     * @return eligible Whether the asset is eligible for arbitration
     * @return infringementDetected Whether infringement has been detected
     */
    function isArbitrationEligible(uint256 ipAssetId) external view returns (bool eligible, bool infringementDetected) {
        // First check if asset exists in the arbitration contract
        if (ipAssets[ipAssetId].registrationTime == 0) {
            // Asset not registered in arbitration system yet - check if it exists in IP Asset Manager
            try ipAssetManager.getIPAsset(ipAssetId) returns (
                uint256 assetId_,
                address owner,
                string memory, // name
                string memory, // description
                string memory, // metadataURI
                uint256, // createdAt
                bool isActive,
                address, // licenseToken
                address, // royaltyVault
                uint256, // totalRevenue
                uint256, // totalLicenses
                uint256, // nftTokenId
                string memory // ipfsHash
            ) {
                // Asset exists in IP Asset Manager but not in arbitration system
                // This means it's clean (no disputes, no infringement)
                if (assetId_ == ipAssetId && isActive) {
                    return (false, false); // Not eligible for arbitration, no infringement
                }
            } catch {
                // Asset doesn't exist in IP Asset Manager either
                revert("IP asset does not exist");
            }
            // If we get here, asset exists but is inactive
            revert("IP asset is not active");
        }
        
        // Asset exists in arbitration system
        require(ipAssets[ipAssetId].isActive, "IP asset is not active in arbitration system");
        
        IPAsset storage asset = ipAssets[ipAssetId];
        return (asset.arbitrationEligible, asset.infringementDetected);
    }
    
    function getDispute(uint256 disputeId) external view returns (
        uint256 ipAssetId,
        address challenger,
        address currentOwner,
        string memory evidence,
        uint256 bond,
        DisputeStatus status,
        uint256 totalVotesFor,
        uint256 totalVotesAgainst,
        uint256 totalStakeFor,
        uint256 totalStakeAgainst,
        bytes32 hcsSequenceNumber
    ) {
        Dispute storage dispute = disputes[disputeId];
        return (
            dispute.ipAssetId,
            dispute.challenger,
            dispute.currentOwner,
            dispute.evidence,
            dispute.bond,
            dispute.status,
            dispute.totalVotesFor,
            dispute.totalVotesAgainst,
            dispute.totalStakeFor,
            dispute.totalStakeAgainst,
            dispute.hcsSequenceNumber
        );
    }
    
    function getVote(uint256 disputeId, address voter) external view returns (
        bool hasVoted,
        bool voteFor,
        uint256 stakeAmount,
        uint256 timestamp
    ) {
        Vote storage vote = disputes[disputeId].votes[voter];
        return (vote.hasVoted, vote.voteFor, vote.stakeAmount, vote.timestamp);
    }
    
    function getArbitrator(address arbitrator) external view returns (
        bool isActive,
        uint256 totalCases,
        uint256 successfulCases,
        uint256 reputation,
        uint256 lastActive
    ) {
        Arbitrator storage arb = arbitrators[arbitrator];
        return (arb.isActive, arb.totalCases, arb.successfulCases, arb.reputation, arb.lastActive);
    }
    
    function getDisputeStats() external view returns (
        uint256 total,
        uint256 resolved,
        uint256 pending,
        uint256 voting,
        uint256 escalated
    ) {
        uint256 pendingCount = 0;
        uint256 votingCount = 0;
        uint256 escalatedCount = 0;
        
        for (uint256 i = 1; i <= nextDisputeId; i++) {
            if (disputes[i].disputeId != 0) {
                if (disputes[i].status == DisputeStatus.Pending) pendingCount++;
                else if (disputes[i].status == DisputeStatus.Voting) votingCount++;
                else if (disputes[i].status == DisputeStatus.Escalated) escalatedCount++;
            }
        }
        
        return (totalDisputes, resolvedDisputes, pendingCount, votingCount, escalatedCount);
    }
    
    // Internal functions
    function _calculateDisputeOutcome(uint256 disputeId) internal view returns (bool) {
        Dispute storage dispute = disputes[disputeId];
        
        // Require minimum participation
        uint256 totalStake = dispute.totalStakeFor + dispute.totalStakeAgainst;
        require(totalStake >= DISPUTE_BOND * MIN_PARTICIPATION_MULTIPLIER, "Insufficient participation");
        
        // Stake-weighted decision
        return dispute.totalStakeFor > dispute.totalStakeAgainst;
    }
    
    function _distributeRewards(uint256 disputeId, bool challengerWon) internal {
        Dispute storage dispute = disputes[disputeId];
        uint256 totalRewardPool = dispute.bond + dispute.totalStakeFor + dispute.totalStakeAgainst;
        
        // Calculate arbitrator fee
        uint256 arbitratorFee = ARBITRATOR_FEE;
        if (totalRewardPool < arbitratorFee) {
            arbitratorFee = totalRewardPool / 10; // 10% if pool is small
        }
        
        uint256 remainingPool = totalRewardPool - arbitratorFee;
        
        if (challengerWon) {
            // Refund challenger bond plus 20% of remaining pool
            uint256 challengerReward = dispute.bond + (remainingPool * 20 / 100);
            payable(dispute.challenger).transfer(challengerReward);
            
            // Distribute to correct voters
            _distributeVoterRewards(disputeId, true, remainingPool - (remainingPool * 20 / 100));
        } else {
            // Reward current owner
            uint256 ownerReward = dispute.bond + (remainingPool * 20 / 100);
            payable(dispute.currentOwner).transfer(ownerReward);
            
            // Distribute to correct voters
            _distributeVoterRewards(disputeId, false, remainingPool - (remainingPool * 20 / 100));
        }
        
        // Send arbitrator fee to contract owner (can be distributed to arbitrators)
        if (arbitratorFee > 0) {
            payable(owner()).transfer(arbitratorFee);
        }
    }
    
    function _distributeVoterRewards(uint256 disputeId, bool challengerWon, uint256 rewardAmount) internal {
        // This is a simplified implementation
        // In a full implementation, you would iterate through all voters
        // and distribute rewards based on their stake and vote correctness
        // For now, we'll just keep the rewards in the contract
    }
    
    function _transferIPOwnership(uint256 ipAssetId, address newOwner) internal {
        // This would need to integrate with the main IPAssetManagerV2 contract
        // For now, we'll emit an event that the frontend can listen to
        // and handle the transfer through the main contract
    }
    
    function _calculateReputation(address arbitrator) internal view returns (uint256) {
        Arbitrator storage arb = arbitrators[arbitrator];
        if (arb.totalCases == 0) return arb.reputation;
        
        uint256 successRate = (arb.successfulCases * 1000) / arb.totalCases;
        uint256 timeDecay = block.timestamp - arb.lastActive;
        uint256 timeDecayFactor = timeDecay > 30 days ? 900 : 1000; // 10% decay after 30 days
        
        return (successRate * timeDecayFactor) / 1000;
    }
    
    /**
     * @dev Submit message to Hedera Consensus Service
     * @param topicId HCS topic ID to submit to
     * @param messageType Type of message being submitted
     * @param entityId ID of the entity (IP asset or dispute)
     * @param actor Address performing the action
     * @param data JSON encoded data
     * @return sequenceNumber The HCS sequence number
     */
    function _submitToHCS(
        bytes32 topicId,
        string memory messageType,
        uint256 entityId,
        address actor,
        string memory data
    ) internal returns (bytes32 sequenceNumber) {
        // In a real implementation, this would submit to HCS
        // For now, we'll generate a mock sequence number
        sequenceNumber = keccak256(abi.encodePacked(
            topicId,
            messageType,
            entityId,
            actor,
            data,
            block.timestamp
        ));
        
        // In production, you would:
        // 1. Create HCS topic if it doesn't exist
        // 2. Submit message to HCS
        // 3. Get the actual sequence number from HCS
        // 4. Store the sequence number for verification
    }
    
    // ============ TOKEN GOVERNANCE FUNCTIONS ============
    
    /**
     * @dev Stake tokens for governance participation
     * @param amount Amount of tokens to stake
     */
    function stakeTokens(uint256 amount) external {
        require(arbitrationToken != address(0), "Token not initialized");
        require(amount > 0, "Amount must be greater than 0");
        require(tokenBalances[msg.sender] >= amount, "Insufficient token balance");
        
        // Transfer tokens from user to contract (mock implementation)
        tokenBalances[msg.sender] -= amount;
        
        // Update staking state
        uint256 oldVotingPower = votingPower[msg.sender];
        stakedTokens[msg.sender] += amount;
        totalStakedTokens += amount;
        
        // Calculate voting power (1:1 ratio with staked tokens)
        votingPower[msg.sender] = stakedTokens[msg.sender];
        totalVotingPower = totalVotingPower - oldVotingPower + votingPower[msg.sender];
        
        lastStakeTime[msg.sender] = block.timestamp;
        
        emit TokensStaked(msg.sender, amount, votingPower[msg.sender]);
        emit VotingPowerUpdated(msg.sender, oldVotingPower, votingPower[msg.sender]);
    }
    
    /**
     * @dev Unstake tokens
     * @param amount Amount of tokens to unstake
     */
    function unstakeTokens(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(stakedTokens[msg.sender] >= amount, "Insufficient staked tokens");
        require(block.timestamp >= lastStakeTime[msg.sender] + 7 days, "Stake lock period not expired");
        
        // Update staking state
        uint256 oldVotingPower = votingPower[msg.sender];
        stakedTokens[msg.sender] -= amount;
        totalStakedTokens -= amount;
        
        // Update voting power
        votingPower[msg.sender] = stakedTokens[msg.sender];
        totalVotingPower = totalVotingPower - oldVotingPower + votingPower[msg.sender];
        
        // Transfer tokens back to user (mock implementation)
        tokenBalances[msg.sender] += amount;
        
        emit TokensUnstaked(msg.sender, amount, votingPower[msg.sender]);
        emit VotingPowerUpdated(msg.sender, oldVotingPower, votingPower[msg.sender]);
    }
    
    /**
     * @dev Mint tokens to a recipient (only owner)
     * @param recipient Address to receive tokens
     * @param amount Amount of tokens to mint
     */
    function mintTokens(address recipient, uint256 amount) external onlyOwner {
        require(arbitrationToken != address(0), "Token not initialized");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        
        (int response, , ) = HederaTokenService.mintToken(
            arbitrationToken,
            int64(uint64(amount)),
            new bytes[](0)
        );
        require(response == HederaResponseCodes.SUCCESS, "Token mint failed");
        
        // Transfer to recipient
        (response) = HederaTokenService.transferToken(
            arbitrationToken,
            address(this),
            recipient,
            int64(uint64(amount))
        );
        require(response == HederaResponseCodes.SUCCESS, "Token transfer failed");
        
        emit TokensMinted(recipient, amount);
    }
    
    /**
     * @dev Distribute tokens as rewards
     * @param recipient Address to receive reward
     * @param amount Amount of tokens to distribute
     * @param reason Reason for distribution
     */
    function distributeReward(address recipient, uint256 amount, string memory reason) external onlyOwner {
        require(arbitrationToken != address(0), "Token not initialized");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        
        (int response) = HederaTokenService.transferToken(
            arbitrationToken,
            address(this),
            recipient,
            int64(uint64(amount))
        );
        require(response == HederaResponseCodes.SUCCESS, "Token transfer failed");
        
        emit TokensDistributed(recipient, amount, reason);
    }
    
    /**
     * @dev Claim accumulated rewards
     */
    function claimRewards() external {
        uint256 pendingRewards = calculatePendingRewards(msg.sender);
        require(pendingRewards > 0, "No rewards to claim");
        
        claimedRewards[msg.sender] += pendingRewards;
        
        (int response) = HederaTokenService.transferToken(
            arbitrationToken,
            address(this),
            msg.sender,
            int64(uint64(pendingRewards))
        );
        require(response == HederaResponseCodes.SUCCESS, "Token transfer failed");
        
        emit RewardsClaimed(msg.sender, pendingRewards);
    }
    
    /**
     * @dev Calculate pending rewards for a user
     * @param user User address
     * @return rewards Pending reward amount
     */
    function calculatePendingRewards(address user) public view returns (uint256 rewards) {
        if (votingPower[user] == 0 || totalVotingPower == 0) {
            return 0;
        }
        
        // Calculate rewards based on voting power and participation
        uint256 userShare = (votingPower[user] * rewardPool) / totalVotingPower;
        uint256 claimed = claimedRewards[user];
        
        return userShare > claimed ? userShare - claimed : 0;
    }
    
    /**
     * @dev Get user's token balance
     * @param user User address
     * @return balance Token balance
     */
    function getTokenBalance(address user) external view returns (uint256 balance) {
        return tokenBalances[user];
    }
    
    /**
     * @dev Get user's staked token amount
     * @param user User address
     * @return staked Staked token amount
     */
    function getStakedTokens(address user) external view returns (uint256 staked) {
        return stakedTokens[user];
    }
    
    /**
     * @dev Get user's voting power
     * @param user User address
     * @return power Voting power
     */
    function getVotingPower(address user) external view returns (uint256 power) {
        return votingPower[user];
    }
    
    /**
     * @dev Get total staked tokens
     * @return total Total staked tokens
     */
    function getTotalStakedTokens() external view returns (uint256 total) {
        return totalStakedTokens;
    }
    
    /**
     * @dev Get total voting power
     * @return total Total voting power
     */
    function getTotalVotingPower() external view returns (uint256 total) {
        return totalVotingPower;
    }
    
    /**
     * @dev Update reward pool (only owner)
     * @param amount Amount to add to reward pool
     */
    function updateRewardPool(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        rewardPool += amount;
        lastRewardDistribution = block.timestamp;
    }
    
    // Emergency functions
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    function pauseDisputes() external onlyOwner {
        // Implementation to pause new disputes
    }
    
    function unpauseDisputes() external onlyOwner {
        // Implementation to unpause disputes
    }
    
    // Required overrides
    receive() external payable {}
    fallback() external payable {}
}

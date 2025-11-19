// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./system-contracts/hedera-token-service/IHederaTokenService.sol";
import "./system-contracts/hedera-token-service/HederaTokenService.sol";
import "./system-contracts/hedera-token-service/ExpiryHelper.sol";
import "./system-contracts/hedera-token-service/KeyHelper.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title IPAssetComplianceManager
 * @dev Manages compliance and regulatory requirements for IP-related NFTs
 * @notice Ensures only verified/compliant entities can hold or trade IP assets
 */
contract IPAssetComplianceManager is HederaTokenService, KeyHelper, ExpiryHelper, ReentrancyGuard, Ownable {
    
    // Compliance levels
    enum ComplianceLevel {
        NONE,           // 0 - No compliance verification
        BASIC,          // 1 - Basic identity verification
        ENHANCED,       // 2 - Enhanced due diligence
        INSTITUTIONAL   // 3 - Institutional compliance
    }
    
    // Entity types for regulatory purposes
    enum EntityType {
        INDIVIDUAL,
        CORPORATION,
        PARTNERSHIP,
        LLC,
        TRUST,
        GOVERNMENT,
        NON_PROFIT
    }
    
    // Compliance status for entities
    struct ComplianceProfile {
        bool isVerified;
        ComplianceLevel level;
        EntityType entityType;
        string jurisdiction;
        string registrationNumber;
        uint256 verificationDate;
        uint256 expiryDate;
        bool canHoldIPAssets;
        bool canTradeIPAssets;
        bool canTransferIPAssets;
        string complianceNotes;
        address verifier;
    }
    
    // Audit trail entry
    struct AuditEntry {
        uint256 timestamp;
        address entity;
        string action;
        uint256 assetId;
        string details;
        bytes32 complianceHash;
        address operator;
    }
    
    // State variables
    mapping(address => ComplianceProfile) public complianceProfiles;
    mapping(address => bool) public isComplianceOfficer;
    mapping(address => bool) public isRegulatoryAuthority;
    
    // Audit trail
    AuditEntry[] public auditTrail;
    mapping(address => uint256[]) public entityAuditHistory;
    mapping(uint256 => uint256[]) public assetAuditHistory;
    
    // Compliance requirements
    mapping(ComplianceLevel => bool) public complianceLevelRequired;
    mapping(EntityType => ComplianceLevel) public minimumComplianceLevel;
    
    // Events
    event ComplianceProfileUpdated(
        address indexed entity,
        ComplianceLevel level,
        EntityType entityType,
        bool canHoldIPAssets,
        bool canTradeIPAssets
    );
    
    event ComplianceVerification(
        address indexed entity,
        ComplianceLevel level,
        address indexed verifier,
        uint256 expiryDate
    );
    
    event ComplianceViolation(
        address indexed entity,
        string violation,
        uint256 assetId,
        address indexed reporter
    );
    
    event AuditEntryCreated(
        uint256 indexed entryId,
        address indexed entity,
        string action,
        uint256 assetId,
        bytes32 complianceHash
    );
    
    event ComplianceOfficerAdded(address indexed officer);
    event ComplianceOfficerRemoved(address indexed officer);
    event RegulatoryAuthorityAdded(address indexed authority);
    event RegulatoryAuthorityRemoved(address indexed authority);
    
    // Modifiers
    modifier onlyComplianceOfficer() {
        require(isComplianceOfficer[msg.sender] || msg.sender == owner(), "Not authorized compliance officer");
        _;
    }
    
    modifier onlyRegulatoryAuthority() {
        require(isRegulatoryAuthority[msg.sender] || msg.sender == owner(), "Not regulatory authority");
        _;
    }
    
    modifier onlyCompliantEntity(address entity) {
        require(complianceProfiles[entity].isVerified, "Entity not compliance verified");
        require(complianceProfiles[entity].expiryDate > block.timestamp, "Compliance expired");
        _;
    }
    
    modifier canHoldIPAssets(address entity) {
        require(complianceProfiles[entity].canHoldIPAssets, "Entity cannot hold IP assets");
        _;
    }
    
    modifier canTradeIPAssets(address entity) {
        require(complianceProfiles[entity].canTradeIPAssets, "Entity cannot trade IP assets");
        _;
    }
    
    constructor() Ownable(msg.sender) {
        // Set default compliance requirements
        complianceLevelRequired[ComplianceLevel.BASIC] = true;
        complianceLevelRequired[ComplianceLevel.ENHANCED] = true;
        complianceLevelRequired[ComplianceLevel.INSTITUTIONAL] = true;
        
        // Set minimum compliance levels for entity types
        minimumComplianceLevel[EntityType.INDIVIDUAL] = ComplianceLevel.BASIC;
        minimumComplianceLevel[EntityType.CORPORATION] = ComplianceLevel.ENHANCED;
        minimumComplianceLevel[EntityType.PARTNERSHIP] = ComplianceLevel.ENHANCED;
        minimumComplianceLevel[EntityType.LLC] = ComplianceLevel.ENHANCED;
        minimumComplianceLevel[EntityType.TRUST] = ComplianceLevel.INSTITUTIONAL;
        minimumComplianceLevel[EntityType.GOVERNMENT] = ComplianceLevel.BASIC;
        minimumComplianceLevel[EntityType.NON_PROFIT] = ComplianceLevel.BASIC;
        
        // Owner is default compliance officer
        isComplianceOfficer[msg.sender] = true;
        emit ComplianceOfficerAdded(msg.sender);
    }
    
    /**
     * @dev Add a compliance officer
     * @param officer Address of the compliance officer
     */
    function addComplianceOfficer(address officer) external onlyOwner {
        require(officer != address(0), "Invalid officer address");
        isComplianceOfficer[officer] = true;
        emit ComplianceOfficerAdded(officer);
    }
    
    /**
     * @dev Remove a compliance officer
     * @param officer Address of the compliance officer
     */
    function removeComplianceOfficer(address officer) external onlyOwner {
        require(officer != address(0), "Invalid officer address");
        isComplianceOfficer[officer] = false;
        emit ComplianceOfficerRemoved(officer);
    }
    
    /**
     * @dev Add a regulatory authority
     * @param authority Address of the regulatory authority
     */
    function addRegulatoryAuthority(address authority) external onlyOwner {
        require(authority != address(0), "Invalid authority address");
        isRegulatoryAuthority[authority] = true;
        emit RegulatoryAuthorityAdded(authority);
    }
    
    /**
     * @dev Remove a regulatory authority
     * @param authority Address of the regulatory authority
     */
    function removeRegulatoryAuthority(address authority) external onlyOwner {
        require(authority != address(0), "Invalid authority address");
        isRegulatoryAuthority[authority] = false;
        emit RegulatoryAuthorityRemoved(authority);
    }
    
    /**
     * @dev Verify compliance for an entity
     * @param entity Address of the entity to verify
     * @param level Compliance level
     * @param entityType Type of entity
     * @param jurisdiction Jurisdiction of the entity
     * @param registrationNumber Registration number
     * @param expiryDate Compliance expiry date
     * @param permissions Permissions for IP asset operations
     * @param notes Additional compliance notes
     */
    function verifyCompliance(
        address entity,
        ComplianceLevel level,
        EntityType entityType,
        string memory jurisdiction,
        string memory registrationNumber,
        uint256 expiryDate,
        bool[3] memory permissions, // [canHoldIPAssets, canTradeIPAssets, canTransferIPAssets]
        string memory notes
    ) external onlyComplianceOfficer {
        require(entity != address(0), "Invalid entity address");
        require(expiryDate > block.timestamp, "Expiry date must be in future");
        require(level >= minimumComplianceLevel[entityType], "Insufficient compliance level");
        
        complianceProfiles[entity] = ComplianceProfile({
            isVerified: true,
            level: level,
            entityType: entityType,
            jurisdiction: jurisdiction,
            registrationNumber: registrationNumber,
            verificationDate: block.timestamp,
            expiryDate: expiryDate,
            canHoldIPAssets: permissions[0],
            canTradeIPAssets: permissions[1],
            canTransferIPAssets: permissions[2],
            complianceNotes: notes,
            verifier: msg.sender
        });
        
        emit ComplianceVerification(entity, level, msg.sender, expiryDate);
        emit ComplianceProfileUpdated(
            entity,
            level,
            entityType,
            permissions[0],
            permissions[1]
        );
        
        // Create audit entry
        _createAuditEntry(
            entity,
            "COMPLIANCE_VERIFIED",
            0,
            string(abi.encodePacked(
                "Compliance verified: Level ",
                _complianceLevelToString(level),
                ", Type: ",
                _entityTypeToString(entityType),
                ", Jurisdiction: ",
                jurisdiction
            ))
        );
    }
    
    /**
     * @dev Update compliance profile
     * @param entity Address of the entity
     * @param permissions New permissions
     * @param notes Updated notes
     */
    function updateComplianceProfile(
        address entity,
        bool[3] memory permissions,
        string memory notes
    ) external onlyComplianceOfficer {
        require(complianceProfiles[entity].isVerified, "Entity not verified");
        
        complianceProfiles[entity].canHoldIPAssets = permissions[0];
        complianceProfiles[entity].canTradeIPAssets = permissions[1];
        complianceProfiles[entity].canTransferIPAssets = permissions[2];
        complianceProfiles[entity].complianceNotes = notes;
        
        emit ComplianceProfileUpdated(
            entity,
            complianceProfiles[entity].level,
            complianceProfiles[entity].entityType,
            permissions[0],
            permissions[1]
        );
        
        _createAuditEntry(entity, "COMPLIANCE_UPDATED", 0, "Compliance profile updated");
    }
    
    /**
     * @dev Revoke compliance for an entity
     * @param entity Address of the entity
     * @param reason Reason for revocation
     */
    function revokeCompliance(address entity, string memory reason) external onlyComplianceOfficer {
        require(complianceProfiles[entity].isVerified, "Entity not verified");
        
        complianceProfiles[entity].isVerified = false;
        complianceProfiles[entity].canHoldIPAssets = false;
        complianceProfiles[entity].canTradeIPAssets = false;
        complianceProfiles[entity].canTransferIPAssets = false;
        
        emit ComplianceViolation(entity, reason, 0, msg.sender);
        _createAuditEntry(entity, "COMPLIANCE_REVOKED", 0, reason);
    }
    
    /**
     * @dev Check if entity can hold IP assets
     * @param entity Address of the entity
     * @return canHold True if entity can hold IP assets
     */
    function canEntityHoldIPAssets(address entity) external view returns (bool canHold) {
        ComplianceProfile memory profile = complianceProfiles[entity];
        return profile.isVerified && 
               profile.expiryDate > block.timestamp && 
               profile.canHoldIPAssets;
    }
    
    /**
     * @dev Check if entity can trade IP assets
     * @param entity Address of the entity
     * @return canTrade True if entity can trade IP assets
     */
    function canEntityTradeIPAssets(address entity) external view returns (bool canTrade) {
        ComplianceProfile memory profile = complianceProfiles[entity];
        return profile.isVerified && 
               profile.expiryDate > block.timestamp && 
               profile.canTradeIPAssets;
    }
    
    /**
     * @dev Check if entity can transfer IP assets
     * @param entity Address of the entity
     * @return canTransfer True if entity can transfer IP assets
     */
    function canEntityTransferIPAssets(address entity) external view returns (bool canTransfer) {
        ComplianceProfile memory profile = complianceProfiles[entity];
        return profile.isVerified && 
               profile.expiryDate > block.timestamp && 
               profile.canTransferIPAssets;
    }
    
    /**
     * @dev Get compliance profile for an entity
     * @param entity Address of the entity
     * @return profile Compliance profile
     */
    function getComplianceProfile(address entity) external view returns (ComplianceProfile memory profile) {
        return complianceProfiles[entity];
    }
    
    /**
     * @dev Create audit entry
     * @param entity Address of the entity
     * @param action Action performed
     * @param assetId Asset ID (0 if not applicable)
     * @param details Additional details
     */
    function _createAuditEntry(
        address entity,
        string memory action,
        uint256 assetId,
        string memory details
    ) internal {
        uint256 entryId = auditTrail.length;
        
        AuditEntry memory entry = AuditEntry({
            timestamp: block.timestamp,
            entity: entity,
            action: action,
            assetId: assetId,
            details: details,
            complianceHash: keccak256(abi.encodePacked(
                entity,
                action,
                assetId,
                details,
                block.timestamp
            )),
            operator: msg.sender
        });
        
        auditTrail.push(entry);
        entityAuditHistory[entity].push(entryId);
        
        if (assetId > 0) {
            assetAuditHistory[assetId].push(entryId);
        }
        
        emit AuditEntryCreated(entryId, entity, action, assetId, entry.complianceHash);
    }
    
    /**
     * @dev Get audit trail for an entity
     * @param entity Address of the entity
     * @return entries Array of audit entry IDs
     */
    function getEntityAuditTrail(address entity) external view returns (uint256[] memory entries) {
        return entityAuditHistory[entity];
    }
    
    /**
     * @dev Get audit trail for an asset
     * @param assetId Asset ID
     * @return entries Array of audit entry IDs
     */
    function getAssetAuditTrail(uint256 assetId) external view returns (uint256[] memory entries) {
        return assetAuditHistory[assetId];
    }
    
    /**
     * @dev Get audit entry by ID
     * @param entryId Entry ID
     * @return entry Audit entry
     */
    function getAuditEntry(uint256 entryId) external view returns (AuditEntry memory entry) {
        require(entryId < auditTrail.length, "Invalid entry ID");
        return auditTrail[entryId];
    }
    
    /**
     * @dev Get total number of audit entries
     * @return count Total count
     */
    function getAuditTrailCount() external view returns (uint256 count) {
        return auditTrail.length;
    }
    
    /**
     * @dev Convert compliance level to string
     * @param level Compliance level
     * @return String representation
     */
    function _complianceLevelToString(ComplianceLevel level) internal pure returns (string memory) {
        if (level == ComplianceLevel.NONE) return "NONE";
        if (level == ComplianceLevel.BASIC) return "BASIC";
        if (level == ComplianceLevel.ENHANCED) return "ENHANCED";
        if (level == ComplianceLevel.INSTITUTIONAL) return "INSTITUTIONAL";
        return "UNKNOWN";
    }
    
    /**
     * @dev Convert entity type to string
     * @param entityType Entity type
     * @return String representation
     */
    function _entityTypeToString(EntityType entityType) internal pure returns (string memory) {
        if (entityType == EntityType.INDIVIDUAL) return "INDIVIDUAL";
        if (entityType == EntityType.CORPORATION) return "CORPORATION";
        if (entityType == EntityType.PARTNERSHIP) return "PARTNERSHIP";
        if (entityType == EntityType.LLC) return "LLC";
        if (entityType == EntityType.TRUST) return "TRUST";
        if (entityType == EntityType.GOVERNMENT) return "GOVERNMENT";
        if (entityType == EntityType.NON_PROFIT) return "NON_PROFIT";
        return "UNKNOWN";
    }
    
    /**
     * @dev Report compliance violation
     * @param entity Address of the entity
     * @param violation Description of violation
     * @param assetId Asset ID (0 if not applicable)
     */
    function reportComplianceViolation(
        address entity,
        string memory violation,
        uint256 assetId
    ) external {
        require(complianceProfiles[entity].isVerified, "Entity not verified");
        
        emit ComplianceViolation(entity, violation, assetId, msg.sender);
        _createAuditEntry(entity, "VIOLATION_REPORTED", assetId, violation);
    }
    
    /**
     * @dev Emergency compliance check (for regulatory authorities)
     * @param entity Address of the entity
     * @param action Action to check
     * @return isCompliant True if compliant
     */
    function emergencyComplianceCheck(
        address entity,
        string memory action
    ) external onlyRegulatoryAuthority view returns (bool isCompliant) {
        ComplianceProfile memory profile = complianceProfiles[entity];
        
        if (!profile.isVerified || profile.expiryDate <= block.timestamp) {
            return false;
        }
        
        if (keccak256(bytes(action)) == keccak256(bytes("HOLD"))) {
            return profile.canHoldIPAssets;
        } else if (keccak256(bytes(action)) == keccak256(bytes("TRADE"))) {
            return profile.canTradeIPAssets;
        } else if (keccak256(bytes(action)) == keccak256(bytes("TRANSFER"))) {
            return profile.canTransferIPAssets;
        }
        
        return false;
    }
}


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IPAssetComplianceManager.sol";

/**
 * @title EnhancedLicensingManager
 * @dev Enhanced licensing management with geographic restrictions and exclusive/non-exclusive licensing
 * @notice Controls who can hold licenses, enforces geographic restrictions, and manages exclusive vs non-exclusive licensing
 */
contract EnhancedLicensingManager is Ownable, ReentrancyGuard {
    
    // License types
    enum LicenseType {
        EXCLUSIVE,      // 0 - Only one licensee allowed
        NON_EXCLUSIVE,  // 1 - Multiple licensees allowed
        SOLE           // 2 - Owner + one licensee allowed
    }
    
    // Geographic restriction types
    enum GeographicRestriction {
        NONE,           // 0 - No geographic restrictions
        COUNTRY,        // 1 - Country-level restrictions
        REGION,         // 2 - Regional restrictions
        GLOBAL          // 3 - Global restrictions
    }
    
    // Enhanced license terms with geographic and exclusivity controls
    struct EnhancedLicenseTerms {
        uint256 licenseId;
        uint256 assetId;
        string terms;
        uint256 price;
        uint256 duration; // in seconds, 0 for perpetual
        uint256 maxLicenses;
        uint256 issuedLicenses;
        bool isActive;
        bytes32 encryptedTerms;
        uint256 revenueShare; // Percentage of revenue shared with licensees (basis points)
        
        // Enhanced features
        LicenseType licenseType;
        GeographicRestriction geographicRestriction;
        string[] allowedJurisdictions; // List of allowed jurisdictions
        string[] restrictedJurisdictions; // List of restricted jurisdictions
        uint256 requiredComplianceLevel; // Minimum compliance level required
        bool requiresKYC; // Whether KYC is required for this license
        address[] exclusiveLicensees; // For exclusive licenses
        mapping(address => bool) isExclusiveLicensee; // Quick lookup for exclusive licensees
    }
    
    // License holder information with geographic and compliance data
    struct LicenseHolder {
        address holder;
        uint256 licenseTokenId;
        uint256 assetId;
        uint256 licenseId;
        uint256 issuedAt;
        uint256 expiresAt;
        bool isValid;
        uint256 revenueShare;
        
        // Geographic and compliance data
        string jurisdiction;
        uint256 complianceLevel;
        bool hasKYC;
        string complianceNotes;
    }
    
    // State variables
    mapping(uint256 => EnhancedLicenseTerms) public enhancedLicenseTerms;
    mapping(uint256 => LicenseHolder) public licenseHolders;
    mapping(address => uint256[]) public holderLicenses; // Licenses held by each address
    mapping(uint256 => uint256[]) public assetLicenses; // Licenses for each asset
    mapping(string => bool) public supportedJurisdictions; // Supported jurisdictions
    
    // Compliance manager reference
    IPAssetComplianceManager public complianceManager;
    
    // Events
    event EnhancedLicenseTermsCreated(
        uint256 indexed licenseId,
        uint256 indexed assetId,
        LicenseType licenseType,
        GeographicRestriction geographicRestriction,
        uint256 requiredComplianceLevel,
        bool requiresKYC
    );
    
    event LicenseGranted(
        uint256 indexed licenseTokenId,
        uint256 indexed assetId,
        uint256 indexed licenseId,
        address licensee,
        string jurisdiction,
        uint256 complianceLevel,
        bool hasKYC
    );
    
    event LicenseRevoked(
        uint256 indexed licenseTokenId,
        uint256 indexed assetId,
        address indexed licensee,
        string reason
    );
    
    event GeographicRestrictionViolation(
        uint256 indexed assetId,
        address indexed licensee,
        string attemptedJurisdiction,
        string allowedJurisdictions
    );
    
    event ExclusiveLicenseViolation(
        uint256 indexed assetId,
        address indexed attemptedLicensee,
        address existingExclusiveLicensee
    );
    
    event ComplianceLevelViolation(
        uint256 indexed assetId,
        address indexed licensee,
        uint256 requiredLevel,
        uint256 actualLevel
    );
    
    // Modifiers
    modifier onlyComplianceManager() {
        require(msg.sender == address(complianceManager), "Only compliance manager");
        _;
    }
    
    modifier validJurisdiction(string memory jurisdiction) {
        require(supportedJurisdictions[jurisdiction], "Jurisdiction not supported");
        _;
    }
    
    constructor(address _complianceManager) Ownable(msg.sender) {
        complianceManager = IPAssetComplianceManager(_complianceManager);
        
        // Initialize supported jurisdictions
        _initializeSupportedJurisdictions();
    }
    
    /**
     * @dev Create enhanced license terms with geographic and exclusivity controls
     */
    function createEnhancedLicenseTerms(
        uint256 assetId,
        string memory terms,
        uint256 price,
        uint256 duration,
        uint256 maxLicenses,
        bytes32 encryptedTerms,
        uint256 revenueShare,
        LicenseType licenseType,
        GeographicRestriction geographicRestriction,
        string[] memory allowedJurisdictions,
        string[] memory restrictedJurisdictions,
        uint256 requiredComplianceLevel,
        bool requiresKYC
    ) external onlyOwner {
        require(bytes(terms).length > 0, "Terms cannot be empty");
        require(maxLicenses > 0, "Max licenses must be greater than 0");
        require(revenueShare <= 10000, "Revenue share cannot exceed 100%");
        require(requiredComplianceLevel <= 3, "Invalid compliance level");
        
        // Validate jurisdictions
        for (uint256 i = 0; i < allowedJurisdictions.length; i++) {
            require(supportedJurisdictions[allowedJurisdictions[i]], "Unsupported allowed jurisdiction");
        }
        for (uint256 i = 0; i < restrictedJurisdictions.length; i++) {
            require(supportedJurisdictions[restrictedJurisdictions[i]], "Unsupported restricted jurisdiction");
        }
        
        uint256 licenseId = uint256(keccak256(abi.encodePacked(assetId, block.timestamp, msg.sender)));
        
        EnhancedLicenseTerms storage license = enhancedLicenseTerms[licenseId];
        license.licenseId = licenseId;
        license.assetId = assetId;
        license.terms = terms;
        license.price = price;
        license.duration = duration;
        license.maxLicenses = maxLicenses;
        license.issuedLicenses = 0;
        license.isActive = true;
        license.encryptedTerms = encryptedTerms;
        license.revenueShare = revenueShare;
        license.licenseType = licenseType;
        license.geographicRestriction = geographicRestriction;
        license.requiredComplianceLevel = requiredComplianceLevel;
        license.requiresKYC = requiresKYC;
        
        // Set allowed jurisdictions
        for (uint256 i = 0; i < allowedJurisdictions.length; i++) {
            license.allowedJurisdictions.push(allowedJurisdictions[i]);
        }
        
        // Set restricted jurisdictions
        for (uint256 i = 0; i < restrictedJurisdictions.length; i++) {
            license.restrictedJurisdictions.push(restrictedJurisdictions[i]);
        }
        
        emit EnhancedLicenseTermsCreated(
            licenseId,
            assetId,
            licenseType,
            geographicRestriction,
            requiredComplianceLevel,
            requiresKYC
        );
    }
    
    /**
     * @dev Grant a license with comprehensive validation
     */
    function grantLicense(
        uint256 assetId,
        uint256 licenseId,
        address licensee,
        string memory jurisdiction
    ) external onlyOwner nonReentrant validJurisdiction(jurisdiction) {
        EnhancedLicenseTerms storage license = enhancedLicenseTerms[licenseId];
        require(license.isActive, "License not active");
        require(license.issuedLicenses < license.maxLicenses, "Max licenses reached");
        require(licensee != address(0), "Invalid licensee address");
        
        // Check compliance requirements
        IPAssetComplianceManager.ComplianceProfile memory profile = complianceManager.getComplianceProfile(licensee);
        require(profile.isVerified, "Licensee not compliance verified");
        require(profile.expiryDate > block.timestamp, "Licensee compliance expired");
        require(uint256(profile.level) >= license.requiredComplianceLevel, "Insufficient compliance level");
        
        // Check KYC requirements
        if (license.requiresKYC) {
            require(complianceManager.canEntityTradeIPAssets(licensee), "Licensee KYC required");
        }
        
        // Check geographic restrictions
        require(_isJurisdictionAllowed(licenseId, jurisdiction), "Jurisdiction not allowed");
        require(!_isJurisdictionRestricted(licenseId, jurisdiction), "Jurisdiction restricted");
        
        // Check exclusivity restrictions
        require(_canGrantExclusiveLicense(licenseId, licensee), "Exclusive license already granted");
        
        // Create license holder
        uint256 licenseTokenId = uint256(keccak256(abi.encodePacked(assetId, licenseId, licensee, block.timestamp)));
        
        LicenseHolder storage holder = licenseHolders[licenseTokenId];
        holder.holder = licensee;
        holder.licenseTokenId = licenseTokenId;
        holder.assetId = assetId;
        holder.licenseId = licenseId;
        holder.issuedAt = block.timestamp;
        holder.expiresAt = license.duration > 0 ? block.timestamp + license.duration : type(uint256).max;
        holder.isValid = true;
        holder.revenueShare = license.revenueShare;
        holder.jurisdiction = jurisdiction;
        holder.complianceLevel = uint256(profile.level);
        holder.hasKYC = license.requiresKYC;
        holder.complianceNotes = profile.complianceNotes;
        
        // Update counters and mappings
        license.issuedLicenses++;
        holderLicenses[licensee].push(licenseTokenId);
        assetLicenses[assetId].push(licenseTokenId);
        
        // Handle exclusive licensing
        if (license.licenseType == LicenseType.EXCLUSIVE) {
            license.exclusiveLicensees.push(licensee);
            license.isExclusiveLicensee[licensee] = true;
        }
        
        emit LicenseGranted(
            licenseTokenId,
            assetId,
            licenseId,
            licensee,
            jurisdiction,
            holder.complianceLevel,
            holder.hasKYC
        );
    }
    
    /**
     * @dev Revoke a license
     */
    function revokeLicense(
        uint256 licenseTokenId,
        string memory reason
    ) external onlyOwner {
        LicenseHolder storage holder = licenseHolders[licenseTokenId];
        require(holder.isValid, "License not valid");
        
        holder.isValid = false;
        
        // Remove from exclusive licensees if applicable
        EnhancedLicenseTerms storage license = enhancedLicenseTerms[holder.licenseId];
        if (license.licenseType == LicenseType.EXCLUSIVE) {
            license.isExclusiveLicensee[holder.holder] = false;
        }
        
        emit LicenseRevoked(licenseTokenId, holder.assetId, holder.holder, reason);
    }
    
    /**
     * @dev Check if a jurisdiction is allowed for a license
     */
    function _isJurisdictionAllowed(uint256 licenseId, string memory jurisdiction) internal view returns (bool) {
        EnhancedLicenseTerms storage license = enhancedLicenseTerms[licenseId];
        
        if (license.geographicRestriction == GeographicRestriction.NONE) {
            return true;
        }
        
        for (uint256 i = 0; i < license.allowedJurisdictions.length; i++) {
            if (keccak256(bytes(license.allowedJurisdictions[i])) == keccak256(bytes(jurisdiction))) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * @dev Check if a jurisdiction is restricted for a license
     */
    function _isJurisdictionRestricted(uint256 licenseId, string memory jurisdiction) internal view returns (bool) {
        EnhancedLicenseTerms storage license = enhancedLicenseTerms[licenseId];
        
        for (uint256 i = 0; i < license.restrictedJurisdictions.length; i++) {
            if (keccak256(bytes(license.restrictedJurisdictions[i])) == keccak256(bytes(jurisdiction))) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * @dev Check if an exclusive license can be granted
     */
    function _canGrantExclusiveLicense(uint256 licenseId, address licensee) internal view returns (bool) {
        EnhancedLicenseTerms storage license = enhancedLicenseTerms[licenseId];
        
        if (license.licenseType == LicenseType.NON_EXCLUSIVE) {
            return true;
        }
        
        if (license.licenseType == LicenseType.EXCLUSIVE) {
            return license.exclusiveLicensees.length == 0;
        }
        
        if (license.licenseType == LicenseType.SOLE) {
            return license.exclusiveLicensees.length < 1;
        }
        
        return true;
    }
    
    /**
     * @dev Get license holder information
     */
    function getLicenseHolder(uint256 licenseTokenId) external view returns (
        address holder,
        uint256 assetId,
        uint256 licenseId,
        uint256 issuedAt,
        uint256 expiresAt,
        bool isValid,
        uint256 revenueShare,
        string memory jurisdiction,
        uint256 complianceLevel,
        bool hasKYC
    ) {
        LicenseHolder storage holderData = licenseHolders[licenseTokenId];
        return (
            holderData.holder,
            holderData.assetId,
            holderData.licenseId,
            holderData.issuedAt,
            holderData.expiresAt,
            holderData.isValid,
            holderData.revenueShare,
            holderData.jurisdiction,
            holderData.complianceLevel,
            holderData.hasKYC
        );
    }
    
    /**
     * @dev Get licenses held by an address
     */
    function getLicensesByHolder(address holder) external view returns (uint256[] memory) {
        return holderLicenses[holder];
    }
    
    /**
     * @dev Get licenses for an asset
     */
    function getLicensesByAsset(uint256 assetId) external view returns (uint256[] memory) {
        return assetLicenses[assetId];
    }
    
    /**
     * @dev Check if an address has a valid license for an asset
     */
    function hasValidLicense(uint256 assetId, address holder) external view returns (bool) {
        uint256[] memory licenses = holderLicenses[holder];
        for (uint256 i = 0; i < licenses.length; i++) {
            LicenseHolder storage holderData = licenseHolders[licenses[i]];
            if (holderData.assetId == assetId && 
                holderData.isValid &&
                (holderData.expiresAt == type(uint256).max || holderData.expiresAt > block.timestamp)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @dev Get license terms
     */
    function getLicenseTerms(uint256 licenseId) external view returns (
        uint256 assetId,
        string memory terms,
        uint256 price,
        uint256 duration,
        uint256 maxLicenses,
        uint256 issuedLicenses,
        bool isActive,
        uint256 revenueShare,
        LicenseType licenseType,
        GeographicRestriction geographicRestriction,
        uint256 requiredComplianceLevel,
        bool requiresKYC
    ) {
        EnhancedLicenseTerms storage license = enhancedLicenseTerms[licenseId];
        return (
            license.assetId,
            license.terms,
            license.price,
            license.duration,
            license.maxLicenses,
            license.issuedLicenses,
            license.isActive,
            license.revenueShare,
            license.licenseType,
            license.geographicRestriction,
            license.requiredComplianceLevel,
            license.requiresKYC
        );
    }
    
    /**
     * @dev Add supported jurisdiction
     */
    function addSupportedJurisdiction(string memory jurisdiction) external onlyOwner {
        supportedJurisdictions[jurisdiction] = true;
    }
    
    /**
     * @dev Remove supported jurisdiction
     */
    function removeSupportedJurisdiction(string memory jurisdiction) external onlyOwner {
        supportedJurisdictions[jurisdiction] = false;
    }
    
    /**
     * @dev Initialize supported jurisdictions
     */
    function _initializeSupportedJurisdictions() internal {
        supportedJurisdictions["US"] = true;
        supportedJurisdictions["EU"] = true;
        supportedJurisdictions["UK"] = true;
        supportedJurisdictions["CA"] = true;
        supportedJurisdictions["AU"] = true;
        supportedJurisdictions["JP"] = true;
        supportedJurisdictions["CN"] = true;
        supportedJurisdictions["IN"] = true;
        supportedJurisdictions["BR"] = true;
        supportedJurisdictions["MX"] = true;
        supportedJurisdictions["KE"] = true;
        supportedJurisdictions["NG"] = true;
        supportedJurisdictions["ZA"] = true;
        supportedJurisdictions["GLOBAL"] = true;
    }
}

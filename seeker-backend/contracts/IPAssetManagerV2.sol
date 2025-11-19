// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./system-contracts/hedera-token-service/HederaTokenService.sol";
import "./system-contracts/HederaResponseCodes.sol";
import "./system-contracts/hedera-token-service/IHederaTokenService.sol";
import "./system-contracts/hedera-token-service/KeyHelper.sol";
import "./system-contracts/hedera-token-service/ExpiryHelper.sol";
import "./IPAssetHTSKYC.sol";
import "./IPAssetComplianceManager.sol";

/**
 * @title IPAssetManagerV2
 * @dev Enhanced IP Asset Manager with NFT integration, Hedera Token Service, and Compliance
 * @notice This contract manages IP assets, mints NFTs, handles licensing, revenue distribution, and compliance
 */
contract IPAssetManagerV2 is HederaTokenService, KeyHelper, ExpiryHelper, ReentrancyGuard, Ownable {
    using Strings for uint256;

    // Constants
    address constant KES = address(0x5880fb);
    IHederaTokenService constant hts = IHederaTokenService(address(0x167));
    
    // Contracts
    IPAssetHTSKYC public ipAssetNFT;
    IPAssetComplianceManager public complianceManager;
    
    // Structs
    struct IPAsset {
        uint256 assetId;
        address owner;
        string name;
        string description;
        string metadataURI;
        uint256 createdAt;
        bool isActive;
        address licenseToken;
        address royaltyVault;
        uint256 totalRevenue;
        uint256 totalLicenses;
        uint256 nftTokenId; // NFT token ID
        string ipfsHash; // IPFS hash for encrypted content
    }
    
    struct LicenseTerms {
        uint256 licenseId;
        string terms;
        uint256 price;
        uint256 duration; // in seconds, 0 for perpetual
        uint256 maxLicenses;
        uint256 issuedLicenses;
        bool isActive;
        bytes32 encryptedTerms; // IPFS hash or encrypted content
        uint256 revenueShare; // Percentage of revenue shared with licensees (basis points)
    }
    
    struct LicenseToken {
        uint256 tokenId;
        uint256 assetId;
        uint256 licenseId;
        address licensee;
        uint256 issuedAt;
        uint256 expiresAt;
        bool isValid;
        uint256 revenueShare; // Licensee's share of revenue
    }
    
    struct RoyaltyVault {
        address vaultAddress;
        uint256 assetId;
        uint256 totalRoyaltyTokens;
        uint256 distributedRoyalties;
        mapping(address => uint256) royaltyTokenBalance;
        mapping(address => uint256) claimedAmounts;
        mapping(address => uint256) revenueShares; // Revenue share percentages
    }
    
    // State variables
    uint256 private _nextAssetId;
    uint256 private _nextLicenseId;
    uint256 private _nextLicenseTokenId;
    
    mapping(uint256 => IPAsset) public ipAssets;
    mapping(uint256 => LicenseTerms) public licenseTerms;
    mapping(uint256 => LicenseToken) public licenseTokens;
    mapping(uint256 => RoyaltyVault) public royaltyVaults;
    mapping(address => uint256[]) public userAssets;
    mapping(address => uint256[]) public userLicenses;
    mapping(string => bool) public registeredIPFSHashes; // Prevent duplicate IPFS hashes
    
    // Events
    event IPAssetRegistered(
        uint256 indexed assetId,
        address indexed owner,
        string name,
        string metadataURI,
        uint256 nftTokenId,
        string ipfsHash
    );
    
    event LicenseTermsAttached(
        uint256 indexed assetId,
        uint256 indexed licenseId,
        string terms,
        uint256 price,
        uint256 revenueShare
    );
    
    event LicenseTokenMinted(
        uint256 indexed tokenId,
        uint256 indexed assetId,
        uint256 indexed licenseId,
        address licensee,
        uint256 expiresAt,
        uint256 revenueShare
    );
    
    event RevenueReceived(
        uint256 indexed assetId,
        address indexed payer,
        uint256 amount,
        string reason
    );
    
    event RoyaltyClaimed(
        uint256 indexed assetId,
        address indexed claimant,
        uint256 amount
    );
    
    event LicenseTokenRevoked(
        uint256 indexed tokenId,
        uint256 indexed assetId,
        address indexed licensee
    );
    
    event IPAssetTransferred(
        uint256 indexed assetId,
        address indexed from,
        address indexed to
    );
    
    // Modifiers
    modifier onlyAssetOwner(uint256 assetId) {
        require(ipAssets[assetId].owner == msg.sender, "Not asset owner");
        _;
    }
    
    modifier assetExists(uint256 assetId) {
        require(ipAssets[assetId].assetId != 0, "Asset does not exist");
        _;
    }
    
    modifier licenseExists(uint256 licenseId) {
        require(licenseTerms[licenseId].licenseId != 0, "License does not exist");
        _;
    }
    
    modifier licenseActive(uint256 licenseId) {
        require(licenseTerms[licenseId].isActive, "License not active");
        _;
    }
    
    modifier licenseTokenExists(uint256 tokenId) {
        require(licenseTokens[tokenId].tokenId != 0, "License token does not exist");
        _;
    }
    
    modifier licenseTokenValid(uint256 tokenId) {
        require(licenseTokens[tokenId].isValid, "License token not valid");
        _;
    }
    
    modifier onlyNFTContract() {
        require(msg.sender == address(ipAssetNFT), "Only NFT contract can call this");
        _;
    }
    
    constructor(address payable _ipAssetNFT, address _complianceManager) Ownable(msg.sender) {
        ipAssetNFT = IPAssetHTSKYC(_ipAssetNFT);
        complianceManager = IPAssetComplianceManager(_complianceManager);
    }
    
    /**
     * @dev Set compliance manager address
     * @param _complianceManager Address of the compliance manager
     */
    function setComplianceManager(address _complianceManager) external onlyOwner {
        require(_complianceManager != address(0), "Invalid compliance manager address");
        complianceManager = IPAssetComplianceManager(_complianceManager);
    }
    
    /**
     * @dev Create HTS NFT collection for IP assets
     * @param name Collection name
     * @param symbol Collection symbol
     */
    function createHTSCollection(string memory name, string memory symbol) external payable onlyOwner {
        ipAssetNFT.createIPAssetNFTCollection{value: msg.value}(name, symbol);
    }
    
    /**
     * @dev Register a new IP asset and mint an NFT
     * @param name Name of the IP asset
     * @param description Description of the IP asset
     * @param metadataURI URI containing metadata (IPFS hash, etc.)
     * @param ipfsHash IPFS hash of the encrypted IP content
     */
    function registerIPAsset(
        string memory name,
        string memory description,
        string memory metadataURI,
        string memory ipfsHash
    ) external returns (uint256) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(metadataURI).length > 0, "Metadata URI cannot be empty");
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(!registeredIPFSHashes[ipfsHash], "IPFS hash already registered");
        
        // Compliance check: Ensure sender can hold IP assets
        require(complianceManager.canEntityHoldIPAssets(msg.sender), "Entity not authorized to hold IP assets");
        
        _nextAssetId++;
        uint256 assetId = _nextAssetId;
        
        // Create IP Asset
        ipAssets[assetId] = IPAsset({
            assetId: assetId,
            owner: msg.sender,
            name: name,
            description: description,
            metadataURI: metadataURI,
            createdAt: block.timestamp,
            isActive: true,
            licenseToken: address(0),
            royaltyVault: address(0),
            totalRevenue: 0,
            totalLicenses: 0,
            nftTokenId: 0,
            ipfsHash: ipfsHash
        });
        
        // Create Royalty Vault
        address vaultAddress = _createRoyaltyVault(assetId);
        ipAssets[assetId].royaltyVault = vaultAddress;
        
        // Mint NFT
        uint256 nftTokenId = ipAssetNFT.mintIPAssetNFT(msg.sender, assetId, metadataURI);
        ipAssets[assetId].nftTokenId = nftTokenId;
        
        // Mark IPFS hash as registered
        registeredIPFSHashes[ipfsHash] = true;
        
        // Add to user's assets
        userAssets[msg.sender].push(assetId);
        
        emit IPAssetRegistered(assetId, msg.sender, name, metadataURI, nftTokenId, ipfsHash);
        
        return assetId;
    }

    /**
     * @dev Attach license terms to an IP asset
     * @param assetId ID of the IP asset
     * @param terms Human-readable license terms
     * @param price Price for the license in KES
     * @param duration Duration in seconds (0 for perpetual)
     * @param maxLicenses Maximum number of licenses that can be issued
     * @param encryptedTerms Encrypted or IPFS hash of detailed terms
     * @param revenueShare Revenue share percentage for licensees (basis points)
     */
    function attachLicenseTerms(
        uint256 assetId,
        string memory terms,
        uint256 price,
        uint256 duration,
        uint256 maxLicenses,
        bytes32 encryptedTerms,
        uint256 revenueShare
    ) external onlyAssetOwner(assetId) assetExists(assetId) {
        require(bytes(terms).length > 0, "Terms cannot be empty");
        require(maxLicenses > 0, "Max licenses must be greater than 0");
        require(revenueShare <= 10000, "Revenue share cannot exceed 100%");
        
        _nextLicenseId++;
        uint256 licenseId = _nextLicenseId;
        
        licenseTerms[licenseId] = LicenseTerms({
            licenseId: licenseId,
            terms: terms,
            price: price,
            duration: duration,
            maxLicenses: maxLicenses,
            issuedLicenses: 0,
            isActive: true,
            encryptedTerms: encryptedTerms,
            revenueShare: revenueShare
        });
        
        // Link license to asset
        ipAssets[assetId].licenseToken = address(this);
        
        emit LicenseTermsAttached(assetId, licenseId, terms, price, revenueShare);
    }
    
    /**
     * @dev Mint a license token for an IP asset
     * @param assetId ID of the IP asset
     * @param licenseId ID of the license terms
     */
    function mintLicenseToken(
        uint256 assetId,
        uint256 licenseId
    ) external payable assetExists(assetId) licenseExists(licenseId) licenseActive(licenseId) {
        // Compliance check: Ensure sender can trade IP assets
        require(complianceManager.canEntityTradeIPAssets(msg.sender), "Entity not authorized to trade IP assets");
        
        IPAsset storage asset = ipAssets[assetId];
        LicenseTerms storage license = licenseTerms[licenseId];
        
        require(asset.licenseToken != address(0), "No license attached to asset");
        require(license.issuedLicenses < license.maxLicenses, "Max licenses reached");
        require(msg.value >= license.price, "Insufficient payment");
        
        // Check if user already has a valid license
        uint256[] memory userLicensesArray = userLicenses[msg.sender];
        for (uint256 i = 0; i < userLicensesArray.length; i++) {
            uint256 existingTokenId = userLicensesArray[i];
            if (licenseTokens[existingTokenId].assetId == assetId && 
                licenseTokens[existingTokenId].isValid) {
                revert("User already has valid license for this asset");
            }
        }
        
        _nextLicenseTokenId++;
        uint256 tokenId = _nextLicenseTokenId;
        
        uint256 expiresAt = license.duration > 0 ? 
            block.timestamp + license.duration : 
            type(uint256).max;
        
        licenseTokens[tokenId] = LicenseToken({
            tokenId: tokenId,
            assetId: assetId,
            licenseId: licenseId,
            licensee: msg.sender,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            isValid: true,
            revenueShare: license.revenueShare
        });
        
        // Update counters
        license.issuedLicenses++;
        asset.totalLicenses++;
        
        // Add to user's licenses
        userLicenses[msg.sender].push(tokenId);
        
        // Update royalty vault with licensee's revenue share
        _addLicenseeToRoyaltyVault(assetId, msg.sender, license.revenueShare);
        
        // Transfer payment to asset owner
        (bool success, ) = asset.owner.call{value: msg.value}("");
        require(success, "Payment transfer failed");
        
        emit LicenseTokenMinted(tokenId, assetId, licenseId, msg.sender, expiresAt, license.revenueShare);
    }
    
    /**
     * @dev Pay revenue to an IP asset
     * @param assetId ID of the IP asset
     * @param reason Reason for the payment
     */
    function payIPAsset(
        uint256 assetId,
        string memory reason
    ) external payable assetExists(assetId) {
        require(msg.value > 0, "Payment amount must be greater than 0");
        require(bytes(reason).length > 0, "Reason cannot be empty");
        
        IPAsset storage asset = ipAssets[assetId];
        asset.totalRevenue += msg.value;
        
        // Distribute to royalty vault
        _distributeToRoyaltyVault(assetId, msg.value);
        
        emit RevenueReceived(assetId, msg.sender, msg.value, reason);
    }
    
    /**
     * @dev Claim royalties from the vault
     * @param assetId ID of the IP asset
     */
    function claimRoyalties(uint256 assetId) external nonReentrant assetExists(assetId) {
        RoyaltyVault storage vault = royaltyVaults[assetId];
        uint256 claimableAmount = vault.royaltyTokenBalance[msg.sender];
        
        require(claimableAmount > 0, "No royalties to claim");
        require(claimableAmount > vault.claimedAmounts[msg.sender], "Already claimed");
        
        uint256 claimAmount = claimableAmount - vault.claimedAmounts[msg.sender];
        vault.claimedAmounts[msg.sender] = claimableAmount;
        vault.distributedRoyalties += claimAmount;
        
        // Transfer KES to claimant
        (bool success, ) = msg.sender.call{value: claimAmount}("");
        require(success, "Royalty transfer failed");
        
        emit RoyaltyClaimed(assetId, msg.sender, claimAmount);
    }
    
    /**
     * @dev Transfer IP asset ownership (transfers NFT as well)
     * @param assetId ID of the IP asset
     * @param newOwner New owner address
     */
    function transferIPAsset(uint256 assetId, address newOwner) external onlyAssetOwner(assetId) {
        require(newOwner != address(0), "Invalid new owner");
        require(newOwner != msg.sender, "Cannot transfer to self");
        
        // Compliance checks
        require(complianceManager.canEntityTransferIPAssets(msg.sender), "Sender not authorized to transfer IP assets");
        require(complianceManager.canEntityHoldIPAssets(newOwner), "Recipient not authorized to hold IP assets");
        
        IPAsset storage asset = ipAssets[assetId];
        address oldOwner = asset.owner;
        
        // Transfer NFT via ERC721 facade
        address htsTokenAddress = ipAssetNFT.tokenAddress();
        IERC721(htsTokenAddress).transferFrom(oldOwner, newOwner, asset.nftTokenId);
        
        // Update asset owner
        asset.owner = newOwner;
        
        // Update user assets arrays
        _removeFromUserAssets(oldOwner, assetId);
        userAssets[newOwner].push(assetId);
        
        // Update royalty vault ownership
        _updateRoyaltyVaultOwnership(assetId, oldOwner, newOwner);
        
        emit IPAssetTransferred(assetId, oldOwner, newOwner);
    }
    
    /**
     * @dev Revoke a license token (only asset owner can do this)
     * @param tokenId ID of the license token to revoke
     */
    function revokeLicenseToken(uint256 tokenId) external licenseTokenExists(tokenId) {
        LicenseToken storage licenseToken = licenseTokens[tokenId];
        IPAsset storage asset = ipAssets[licenseToken.assetId];
        
        require(asset.owner == msg.sender, "Only asset owner can revoke licenses");
        require(licenseToken.isValid, "License already revoked");
        
        licenseToken.isValid = false;
        
        // Remove licensee from royalty vault
        _removeLicenseeFromRoyaltyVault(licenseToken.assetId, licenseToken.licensee);
        
        emit LicenseTokenRevoked(tokenId, licenseToken.assetId, licenseToken.licensee);
    }
    
    // View functions
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
    ) {
        IPAsset storage asset = ipAssets[assetId];
        return (
            asset.assetId,
            asset.owner,
            asset.name,
            asset.description,
            asset.metadataURI,
            asset.createdAt,
            asset.isActive,
            asset.licenseToken,
            asset.royaltyVault,
            asset.totalRevenue,
            asset.totalLicenses,
            asset.nftTokenId,
            asset.ipfsHash
        );
    }
    
    function getLicenseTerms(uint256 licenseId) external view returns (
        uint256 licenseId_,
        string memory terms,
        uint256 price,
        uint256 duration,
        uint256 maxLicenses,
        uint256 issuedLicenses,
        bool isActive,
        bytes32 encryptedTerms,
        uint256 revenueShare
    ) {
        LicenseTerms storage license = licenseTerms[licenseId];
        return (
            license.licenseId,
            license.terms,
            license.price,
            license.duration,
            license.maxLicenses,
            license.issuedLicenses,
            license.isActive,
            license.encryptedTerms,
            license.revenueShare
        );
    }
    
    function getLicenseToken(uint256 tokenId) external view returns (
        uint256 tokenId_,
        uint256 assetId,
        uint256 licenseId,
        address licensee,
        uint256 issuedAt,
        uint256 expiresAt,
        bool isValid,
        uint256 revenueShare
    ) {
        LicenseToken storage licenseToken = licenseTokens[tokenId];
        return (
            licenseToken.tokenId,
            licenseToken.assetId,
            licenseToken.licenseId,
            licenseToken.licensee,
            licenseToken.issuedAt,
            licenseToken.expiresAt,
            licenseToken.isValid,
            licenseToken.revenueShare
        );
    }
    
    function getUserAssets(address user) external view returns (uint256[] memory) {
        return userAssets[user];
    }
    
    function getUserLicenses(address user) external view returns (uint256[] memory) {
        return userLicenses[user];
    }
    
    function getRoyaltyBalance(uint256 assetId, address user) external view returns (uint256) {
        RoyaltyVault storage vault = royaltyVaults[assetId];
        return vault.royaltyTokenBalance[user];
    }
    
    function hasValidLicense(uint256 assetId, address user) external view returns (bool) {
        uint256[] memory licenses = userLicenses[user];
        for (uint256 i = 0; i < licenses.length; i++) {
            uint256 tokenId = licenses[i];
            if (licenseTokens[tokenId].assetId == assetId && 
                licenseTokens[tokenId].isValid &&
                (licenseTokens[tokenId].expiresAt == type(uint256).max || 
                 licenseTokens[tokenId].expiresAt > block.timestamp)) {
                return true;
            }
        }
        return false;
    }
    
    // Internal functions
    function _createRoyaltyVault(uint256 assetId) internal returns (address) {
        RoyaltyVault storage vault = royaltyVaults[assetId];
        vault.vaultAddress = address(this);
        vault.assetId = assetId;
        vault.totalRoyaltyTokens = 0;
        vault.distributedRoyalties = 0;
        
        return address(this);
    }
    
    function _addLicenseeToRoyaltyVault(uint256 assetId, address licensee, uint256 revenueShare) internal {
        RoyaltyVault storage vault = royaltyVaults[assetId];
        vault.revenueShares[licensee] = revenueShare;
    }
    
    function _removeLicenseeFromRoyaltyVault(uint256 assetId, address licensee) internal {
        RoyaltyVault storage vault = royaltyVaults[assetId];
        delete vault.revenueShares[licensee];
        delete vault.royaltyTokenBalance[licensee];
        delete vault.claimedAmounts[licensee];
    }
    
    function _distributeToRoyaltyVault(uint256 assetId, uint256 amount) internal {
        RoyaltyVault storage vault = royaltyVaults[assetId];
        IPAsset storage asset = ipAssets[assetId];
        
        // Calculate owner's share (100% - sum of all licensee shares)
        uint256 totalLicenseeShares = 0;
        uint256[] memory licenses = userLicenses[asset.owner];
        
        for (uint256 i = 0; i < licenses.length; i++) {
            uint256 tokenId = licenses[i];
            if (licenseTokens[tokenId].assetId == assetId && licenseTokens[tokenId].isValid) {
                totalLicenseeShares += licenseTokens[tokenId].revenueShare;
            }
        }
        
        uint256 ownerShare = 10000 - totalLicenseeShares; // Basis points
        uint256 ownerAmount = (amount * ownerShare) / 10000;
        
        // Distribute to owner
        vault.royaltyTokenBalance[asset.owner] += ownerAmount;
        
        // Distribute to licensees
        for (uint256 i = 0; i < licenses.length; i++) {
            uint256 tokenId = licenses[i];
            if (licenseTokens[tokenId].assetId == assetId && licenseTokens[tokenId].isValid) {
                uint256 licenseeAmount = (amount * licenseTokens[tokenId].revenueShare) / 10000;
                vault.royaltyTokenBalance[licenseTokens[tokenId].licensee] += licenseeAmount;
            }
        }
        
        vault.totalRoyaltyTokens += amount;
    }
    
    function _updateRoyaltyVaultOwnership(uint256 assetId, address oldOwner, address newOwner) internal {
        RoyaltyVault storage vault = royaltyVaults[assetId];
        
        // Transfer owner's balance to new owner
        uint256 ownerBalance = vault.royaltyTokenBalance[oldOwner];
        if (ownerBalance > 0) {
            vault.royaltyTokenBalance[newOwner] = ownerBalance;
            delete vault.royaltyTokenBalance[oldOwner];
        }
        
        // Transfer claimed amounts
        uint256 claimedAmount = vault.claimedAmounts[oldOwner];
        if (claimedAmount > 0) {
            vault.claimedAmounts[newOwner] = claimedAmount;
            delete vault.claimedAmounts[oldOwner];
        }
    }
    
    function _removeFromUserAssets(address user, uint256 assetId) internal {
        uint256[] storage assets = userAssets[user];
        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i] == assetId) {
                assets[i] = assets[assets.length - 1];
                assets.pop();
                break;
            }
        }
    }
    
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    // Required overrides for HederaTokenService
    receive() external payable {}
    
    fallback() external payable {}
    
    // ---------------------------------------------------------------------------
    // KYC Management Functions for IP Asset NFTs
    // ---------------------------------------------------------------------------
    
    /**
     * @dev Grant KYC to an account for IP Asset NFTs
     * @param account Address to grant KYC to
     */
    function grantKYCForIPAssets(address account) external onlyOwner {
        ipAssetNFT.grantKYC(account);
    }
    
    /**
     * @dev Revoke KYC from an account for IP Asset NFTs
     * @param account Address to revoke KYC from
     */
    function revokeKYCForIPAssets(address account) external onlyOwner {
        ipAssetNFT.revokeKYC(account);
    }
    
    /**
     * @dev Update the KYC key for IP Asset NFTs
     * @param newKYCKey New KYC key (SECP256K1 format)
     */
    function updateKYCKeyForIPAssets(bytes memory newKYCKey) external onlyOwner {
        ipAssetNFT.updateKYCKey(newKYCKey);
    }
    
    /**
     * @dev Get the underlying HTS token address for IP Asset NFTs
     */
    function getIPAssetNFTTokenAddress() external view returns (address) {
        return ipAssetNFT.tokenAddress();
    }
    
    /**
     * @dev Check if an account has KYC for IP Asset NFTs
     * Note: This requires calling the HTS system contract directly
     * @return bool Always returns true as a placeholder
     */
    function hasKYCForIPAssets(address /* account */) external pure returns (bool) {
        // This would require integration with HTS system contract
        // For now, we'll return true as a placeholder
        // In a real implementation, you'd call the HTS system contract
        return true;
    }
} 
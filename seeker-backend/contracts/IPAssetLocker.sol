// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./system-contracts/hedera-token-service/HederaTokenService.sol";
import "./system-contracts/HederaResponseCodes.sol";
import "./system-contracts/hedera-token-service/IHederaTokenService.sol";
import "./system-contracts/hedera-token-service/KeyHelper.sol";
import "./system-contracts/hedera-token-service/ExpiryHelper.sol";

// Interface for IPAssetManagerV2
interface IIPAssetManagerV2 {
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

// Interface for IntellectualPropertyArbitration
interface IIntellectualPropertyArbitration {
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
    );
    
    function isArbitrationEligible(uint256 ipAssetId) external view returns (bool eligible, bool infringementDetected);
    
    function getDispute(uint256 disputeId) external view returns (
        uint256 ipAssetId,
        address challenger,
        address currentOwner,
        string memory evidence,
        uint256 bond,
        uint8 status, // DisputeStatus enum
        uint256 totalVotesFor,
        uint256 totalVotesAgainst,
        uint256 totalStakeFor,
        uint256 totalStakeAgainst,
        bytes32 hcsSequenceNumber
    );
    
    function getDisputeStats() external view returns (
        uint256 total,
        uint256 resolved,
        uint256 pending,
        uint256 voting,
        uint256 escalated
    );
}

/**
 * @title IPAssetLocker
 * @notice Contract for locking IP assets and minting HBAR equivalent tokens
 * @dev Only allows locking of IP assets that are not in arbitration
 */
contract IPAssetLocker is HederaTokenService, KeyHelper, ExpiryHelper, ReentrancyGuard, Ownable {

    // Constants
    address constant KES = address(0x5880fb);
    IHederaTokenService constant hts = IHederaTokenService(address(0x167));
    
    // Contracts
    IIPAssetManagerV2 public ipAssetManager;
    IIntellectualPropertyArbitration public arbitrationContract;
    
    // HBAR Equivalent Token
    address public hbarToken;
    
    // Structs
    struct LockedIPAsset {
        uint256 ipAssetId;
        address owner;
        uint256 hbarAmount;
        uint256 lockTime;
        bool isLocked;
    }
    
    // State variables
    mapping(uint256 => LockedIPAsset) private _lockedAssets;
    mapping(address => uint256[]) private _userLockedAssets;
    uint256 public totalMintedHBAR;
    uint256 public totalLockedAssets;

    // Events
    event IPAssetLocked(
        address indexed owner,
        uint256 indexed ipAssetId,
        uint256 hbarAmount,
        uint256 timestamp
    );

    event IPAssetUnlocked(
        address indexed owner,
        uint256 indexed ipAssetId,
        uint256 hbarAmount,
        uint256 timestamp
    );

    event HBARTokensMinted(
        address indexed to,
        uint256 amount,
        uint256 indexed ipAssetId
    );

    event HBARTokensBurned(
        address indexed from,
        uint256 amount,
        uint256 indexed ipAssetId
    );

    /**
     * @notice Constructor
     * @param ipAssetManager_ Address of the IP Asset Manager contract
     * @param arbitrationContract_ Address of the Arbitration contract
     * @param owner_ Owner of the contract
     */
    constructor(
        address ipAssetManager_,
        address arbitrationContract_,
        address owner_
    ) Ownable(owner_) {
        require(ipAssetManager_ != address(0), "IPAssetLocker: IP Asset Manager cannot be zero");
        require(arbitrationContract_ != address(0), "IPAssetLocker: Arbitration contract cannot be zero");
        
        ipAssetManager = IIPAssetManagerV2(ipAssetManager_);
        arbitrationContract = IIntellectualPropertyArbitration(arbitrationContract_);
        totalMintedHBAR = 0;
        totalLockedAssets = 0;
    }

    /**
     * @notice Initializes the contract with the HBAR token address
     * @param hbarToken_ Address of the HBAR equivalent token
     */
    function initialize(address hbarToken_) external onlyOwner {
        require(hbarToken == address(0), "IPAssetLocker: already initialized");
        require(hbarToken_ != address(0), "IPAssetLocker: HBAR token cannot be zero");
        
        hbarToken = hbarToken_;
    }

    /**
     * @notice Locks an IP asset and mints HBAR equivalent tokens
     * @param ipAssetId The ID of the IP asset to lock
     * @param hbarAmount The amount of HBAR equivalent to mint
     * @return success Whether the operation was successful
     */
    function lockIPAsset(uint256 ipAssetId, uint256 hbarAmount) external nonReentrant returns (bool success) {
        require(hbarToken != address(0), "IPAssetLocker: not initialized");
        require(hbarAmount > 0, "IPAssetLocker: HBAR amount must be positive");
        require(!isIPAssetLocked(ipAssetId), "IPAssetLocker: IP asset already locked");
        require(isIPAssetEligibleForLocking(ipAssetId), "IPAssetLocker: IP asset not eligible for locking");
        
        // Verify ownership using IP Asset Manager
        (uint256 assetId_, address owner, string memory name, string memory description, 
         string memory metadataURI, uint256 createdAt, bool isActive, 
         address licenseToken, address royaltyVault, uint256 totalRevenue, 
         uint256 totalLicenses, uint256 nftTokenId, string memory ipfsHash) = 
         ipAssetManager.getIPAsset(ipAssetId);
        
        require(assetId_ == ipAssetId, "IPAssetLocker: IP asset does not exist");
        require(isActive, "IPAssetLocker: IP asset is not active");
        require(owner == msg.sender, "IPAssetLocker: caller is not the owner");
        
        // Create locked asset record
        _lockedAssets[ipAssetId] = LockedIPAsset({
            ipAssetId: ipAssetId,
            owner: owner,
            hbarAmount: hbarAmount,
            lockTime: block.timestamp,
            isLocked: true
        });
        
        // Add to user's locked assets
        _userLockedAssets[owner].push(ipAssetId);
        
        // Update totals
        totalMintedHBAR += hbarAmount;
        totalLockedAssets++;
        
        // Mint HBAR equivalent tokens
        _mintHBARTokens(owner, hbarAmount, ipAssetId);
        
        emit IPAssetLocked(owner, ipAssetId, hbarAmount, block.timestamp);
        emit HBARTokensMinted(owner, hbarAmount, ipAssetId);
        
        return true;
    }

    /**
     * @notice Unlocks an IP asset and burns HBAR equivalent tokens
     * @param ipAssetId The ID of the IP asset to unlock
     * @param hbarAmount The amount of HBAR equivalent to burn
     * @return success Whether the operation was successful
     */
    function unlockIPAsset(uint256 ipAssetId, uint256 hbarAmount) external nonReentrant returns (bool success) {
        require(hbarToken != address(0), "IPAssetLocker: not initialized");
        require(isIPAssetLocked(ipAssetId), "IPAssetLocker: IP asset not locked");
        require(hbarAmount > 0, "IPAssetLocker: HBAR amount must be positive");
        
        LockedIPAsset storage lockedAsset = _lockedAssets[ipAssetId];
        require(lockedAsset.owner == msg.sender, "IPAssetLocker: not the owner");
        require(lockedAsset.hbarAmount >= hbarAmount, "IPAssetLocker: insufficient locked amount");
        require(lockedAsset.isLocked, "IPAssetLocker: asset not in locked status");
        
        // Check if user has enough HBAR tokens to burn
        require(IERC20(hbarToken).balanceOf(msg.sender) >= hbarAmount, "IPAssetLocker: insufficient HBAR token balance");
        
        // Update locked asset
        lockedAsset.hbarAmount -= hbarAmount;
        if (lockedAsset.hbarAmount == 0) {
            lockedAsset.isLocked = false;
            totalLockedAssets--;
            
            // Remove from user's locked assets
            _removeUserLockedAsset(msg.sender, ipAssetId);
        }
        
        // Update totals
        totalMintedHBAR -= hbarAmount;
        
        // Burn HBAR equivalent tokens
        _burnHBARTokens(msg.sender, hbarAmount, ipAssetId);
        
        emit IPAssetUnlocked(msg.sender, ipAssetId, hbarAmount, block.timestamp);
        emit HBARTokensBurned(msg.sender, hbarAmount, ipAssetId);
        
        return true;
    }

    /**
     * @notice Checks if an IP asset is locked
     * @param ipAssetId The ID of the IP asset
     * @return locked Whether the IP asset is locked
     */
    function isIPAssetLocked(uint256 ipAssetId) public view returns (bool locked) {
        return _lockedAssets[ipAssetId].isLocked;
    }

    /**
     * @notice Gets the locked amount for an IP asset
     * @param ipAssetId The ID of the IP asset
     * @return amount The locked HBAR equivalent amount
     */
    function getLockedAmount(uint256 ipAssetId) external view returns (uint256 amount) {
        return _lockedAssets[ipAssetId].hbarAmount;
    }

    /**
     * @notice Gets the owner of a locked IP asset
     * @param ipAssetId The ID of the IP asset
     * @return owner The owner address
     */
    function getLockedIPAssetOwner(uint256 ipAssetId) external view returns (address owner) {
        return _lockedAssets[ipAssetId].owner;
    }

    /**
     * @notice Gets detailed eligibility information for an IP asset
     * @param ipAssetId The ID of the IP asset
     * @return eligible Whether the IP asset is eligible for locking
     * @return reason Detailed reason if not eligible
     * @return assetExists Whether the asset exists
     * @return isActive Whether the asset is active
     * @return arbitrationEligible Whether the asset is in arbitration
     * @return infringementDetected Whether infringement was detected
     * @return alreadyLocked Whether the asset is already locked
     */
    function getIPAssetEligibilityDetails(uint256 ipAssetId) external view returns (
        bool eligible,
        string memory reason,
        bool assetExists,
        bool isActive,
        bool arbitrationEligible,
        bool infringementDetected,
        bool alreadyLocked
    ) {
        // Check if already locked
        alreadyLocked = isIPAssetLocked(ipAssetId);
        if (alreadyLocked) {
            return (false, "IP asset is already locked", false, false, false, false, true);
        }

        // Try to get IP asset info
        try ipAssetManager.getIPAsset(ipAssetId) returns (
            uint256 assetId_,
            address owner,
            string memory name,
            string memory description,
            string memory metadataURI,
            uint256 createdAt,
            bool isActive_,
            address licenseToken,
            address royaltyVault,
            uint256 totalRevenue,
            uint256 totalLicenses,
            uint256 nftTokenId,
            string memory ipfsHash
        ) {
            assetExists = (assetId_ == ipAssetId);
            isActive = isActive_;
            
            if (!assetExists) {
                return (false, "IP asset does not exist", false, false, false, false, false);
            }
            
            if (!isActive) {
                return (false, "IP asset is not active", true, false, false, false, false);
            }
            
            // Check arbitration status
            try arbitrationContract.isArbitrationEligible(ipAssetId) returns (
                bool arbitrationEligible_,
                bool infringementDetected_
            ) {
                arbitrationEligible = arbitrationEligible_;
                infringementDetected = infringementDetected_;
                
                if (arbitrationEligible) {
                    return (false, "IP asset is in arbitration or has disputes", true, true, true, infringementDetected, false);
                }
                
                if (infringementDetected) {
                    return (false, "IP asset has detected infringement", true, true, false, true, false);
                }
                
                // All checks passed
                return (true, "IP asset is eligible for locking", true, true, false, false, false);
                
            } catch {
                return (false, "Failed to check arbitration status", true, true, false, false, false);
            }
            
        } catch {
            return (false, "Failed to retrieve IP asset information", false, false, false, false, false);
        }
    }

    /**
     * @notice Checks if an IP asset is eligible for locking (not in arbitration)
     * @param ipAssetId The ID of the IP asset
     * @return eligible Whether the IP asset is eligible for locking
     */
    function isIPAssetEligibleForLocking(uint256 ipAssetId) public view returns (bool eligible) {
        try ipAssetManager.getIPAsset(ipAssetId) returns (
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
            // Asset must exist and be active
            if (assetId_ != ipAssetId || !isActive) {
                return false;
            }
            
            // Check arbitration eligibility using arbitration contract
            try arbitrationContract.isArbitrationEligible(ipAssetId) returns (
                bool arbitrationEligible,
                bool infringementDetected
            ) {
                // Asset is eligible if it's not arbitration eligible (meaning no disputes)
                // and no infringement has been detected
                return !arbitrationEligible && !infringementDetected;
            } catch {
                // If arbitration check fails, consider asset not eligible
                return false;
            }
            
        } catch {
            // If IP asset manager call fails, consider asset not eligible
            return false;
        }
    }

    /**
     * @notice Gets all locked IP assets for a user
     * @param user The user address
     * @return ipAssetIds Array of locked IP asset IDs
     */
    function getUserLockedIPAssets(address user) external view returns (uint256[] memory ipAssetIds) {
        return _userLockedAssets[user];
    }

    /**
     * @notice Gets the total HBAR equivalent minted for locked IP assets
     * @return total The total HBAR equivalent minted
     */
    function getTotalMintedHBAR() external view returns (uint256 total) {
        return totalMintedHBAR;
    }

    /**
     * @notice Gets the total number of locked IP assets
     * @return total The total number of locked IP assets
     */
    function getTotalLockedAssets() external view returns (uint256 total) {
        return totalLockedAssets;
    }

    /**
     * @notice Gets detailed information about a locked IP asset
     * @param ipAssetId The ID of the IP asset
     * @return lockedAsset The locked asset information
     */
    function getLockedIPAsset(uint256 ipAssetId) external view returns (LockedIPAsset memory lockedAsset) {
        return _lockedAssets[ipAssetId];
    }

    /**
     * @notice Updates the IP Asset Manager address
     * @param newManager New IP Asset Manager address
     */
    function updateIPAssetManager(address newManager) external onlyOwner {
        require(newManager != address(0), "IPAssetLocker: manager cannot be zero address");
        ipAssetManager = IIPAssetManagerV2(newManager);
    }

    /**
     * @notice Updates the Arbitration contract address
     * @param newArbitration New Arbitration contract address
     */
    function updateArbitrationContract(address newArbitration) external onlyOwner {
        require(newArbitration != address(0), "IPAssetLocker: arbitration contract cannot be zero address");
        arbitrationContract = IIntellectualPropertyArbitration(newArbitration);
    }

    /**
     * @notice Mints HBAR equivalent tokens
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     * @param ipAssetId The IP asset ID associated with this mint
     */
    function _mintHBARTokens(address to, uint256 amount, uint256 ipAssetId) internal {
        // Call the HBAR token contract to mint tokens
        (bool success, bytes memory data) = hbarToken.call(
            abi.encodeWithSignature("mint(address,uint256,uint256)", to, amount, ipAssetId)
        );
        
        require(success, "IPAssetLocker: token mint failed");
        
        emit HBARTokensMinted(to, amount, ipAssetId);
    }

    /**
     * @notice Burns HBAR equivalent tokens
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     * @param ipAssetId The IP asset ID associated with this burn
     */
    function _burnHBARTokens(address from, uint256 amount, uint256 ipAssetId) internal {
        // Call the HBAR token contract to burn tokens
        (bool success, bytes memory data) = hbarToken.call(
            abi.encodeWithSignature("burn(address,uint256,uint256)", from, amount, ipAssetId)
        );
        
        require(success, "IPAssetLocker: token burn failed");
        
        emit HBARTokensBurned(from, amount, ipAssetId);
    }

    /**
     * @notice Removes an IP asset from a user's locked assets list
     * @param user The user address
     * @param ipAssetId The IP asset ID to remove
     */
    function _removeUserLockedAsset(address user, uint256 ipAssetId) internal {
        uint256[] storage userAssets = _userLockedAssets[user];
        for (uint256 i = 0; i < userAssets.length; i++) {
            if (userAssets[i] == ipAssetId) {
                userAssets[i] = userAssets[userAssets.length - 1];
                userAssets.pop();
                break;
            }
        }
    }
}

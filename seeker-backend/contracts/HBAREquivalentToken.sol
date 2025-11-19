// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./system-contracts/hedera-token-service/HederaTokenService.sol";
import "./system-contracts/HederaResponseCodes.sol";
import "./system-contracts/hedera-token-service/IHederaTokenService.sol";
import "./system-contracts/hedera-token-service/KeyHelper.sol";
import "./system-contracts/hedera-token-service/ExpiryHelper.sol";

/**
 * @title HBAREquivalentToken
 * @notice HTS token representing HBAR equivalent for locked IP assets
 * @dev Only the IPAssetLocker can mint and burn these tokens
 */
contract HBAREquivalentToken is HederaTokenService, KeyHelper, ExpiryHelper, ReentrancyGuard, Ownable {

    // Constants
    address constant KES = address(0x5880fb);
    IHederaTokenService constant hts = IHederaTokenService(address(0x167));
    
    /// @notice The IPAssetLocker contract that can mint/burn these tokens
    address public ipAssetLocker;
    
    /// @notice Whether the token has been initialized
    bool private _initialized;

    /// @notice Total HBAR equivalent minted (for tracking)
    uint256 public totalMinted;
    
    /// @notice Individual balances for each address
    mapping(address => uint256) private _balances;

    // Events
    event LockerUpdated(address indexed oldLocker, address indexed newLocker);
    event TokensMinted(address indexed to, uint256 amount, uint256 indexed ipAssetId);
    event TokensBurned(address indexed from, uint256 amount, uint256 indexed ipAssetId);

    /**
     * @notice Constructor
     * @param owner_ Owner of the contract (typically IPAssetLocker)
     */
    constructor(address owner_) Ownable(owner_) {
        _initialized = false;
        totalMinted = 0;
    }

    /**
     * @notice Initializes the token with its IPAssetLocker address
     * @param ipAssetLocker_ Address of the IPAssetLocker contract
     * @dev Can only be called once by the owner
     */
    function initialize(address ipAssetLocker_) external onlyOwner {
        require(!_initialized, "HBAREquivalentToken: already initialized");
        require(ipAssetLocker_ != address(0), "HBAREquivalentToken: locker cannot be zero address");
        
        ipAssetLocker = ipAssetLocker_;
        _initialized = true;
        
        emit LockerUpdated(address(0), ipAssetLocker_);
    }

    /**
     * @notice Mints new tokens (only callable by the IPAssetLocker)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     * @param ipAssetId The IP asset ID associated with this mint
     */
    function mint(address to, uint256 amount, uint256 ipAssetId) external onlyLocker nonReentrant {
        require(to != address(0), "HBAREquivalentToken: mint to zero address");
        require(amount > 0, "HBAREquivalentToken: mint amount must be positive");
        
        // Update individual balance and total
        _balances[to] += amount;
        totalMinted += amount;
        
        emit TokensMinted(to, amount, ipAssetId);
    }

    /**
     * @notice Burns tokens (only callable by the IPAssetLocker)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     * @param ipAssetId The IP asset ID associated with this burn
     */
    function burn(address from, uint256 amount, uint256 ipAssetId) external onlyLocker nonReentrant {
        require(from != address(0), "HBAREquivalentToken: burn from zero address");
        require(amount > 0, "HBAREquivalentToken: burn amount must be positive");
        require(amount <= _balances[from], "HBAREquivalentToken: burn amount exceeds balance");
        require(amount <= totalMinted, "HBAREquivalentToken: burn amount exceeds total minted");
        
        // Update individual balance and total
        _balances[from] -= amount;
        totalMinted -= amount;
        
        emit TokensBurned(from, amount, ipAssetId);
    }

    /**
     * @notice Gets the associated IPAssetLocker address
     * @return locker Address of the IPAssetLocker
     */
    function getLocker() external view returns (address) {
        return ipAssetLocker;
    }

    /**
     * @notice Checks if the token is initialized
     * @return initialized Whether the token is initialized
     */
    function isInitialized() external view returns (bool) {
        return _initialized;
    }

    /**
     * @notice Updates the IPAssetLocker address (only owner)
     * @param newLocker New IPAssetLocker address
     * @dev Emergency function to update locker if needed
     */
    function updateLocker(address newLocker) external onlyOwner {
        require(newLocker != address(0), "HBAREquivalentToken: locker cannot be zero address");
        require(newLocker != ipAssetLocker, "HBAREquivalentToken: same locker address");
        
        address oldLocker = ipAssetLocker;
        ipAssetLocker = newLocker;
        
        emit LockerUpdated(oldLocker, newLocker);
    }

    /**
     * @notice Gets the balance of HBAR equivalent tokens for an address
     * @param account The account address
     * @return balance The balance of tokens
     */
    function balanceOf(address account) external view returns (uint256 balance) {
        return _balances[account];
    }

    /**
     * @notice Modifier to restrict access to IPAssetLocker only
     */
    modifier onlyLocker() {
        require(_initialized, "HBAREquivalentToken: not initialized");
        require(msg.sender == ipAssetLocker, "HBAREquivalentToken: caller is not the locker");
        _;
    }
}

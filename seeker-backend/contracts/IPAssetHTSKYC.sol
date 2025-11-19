// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// Admin/ownership like the OZ example
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
// Read/transfer via ERC721 facade exposed at the HTS token EVM address
import {IERC721} from "@openzeppelin/contracts/interfaces/IERC721.sol";

// Hedera HTS system contracts (v1, NOT v2)
import {HederaTokenService} from "./system-contracts/hedera-token-service/HederaTokenService.sol";
import {IHederaTokenService} from "./system-contracts/hedera-token-service/IHederaTokenService.sol";
import {HederaResponseCodes} from "./system-contracts/HederaResponseCodes.sol";
import {KeyHelper} from "./system-contracts/hedera-token-service/KeyHelper.sol";

/**
 * @title IPAssetHTSKYC
 * @dev HTS-backed ERC721-like collection for Intellectual Property assets with KYC functionality
 * @notice This contract creates HTS NFT collections with KYC enforcement for IP assets
 * 
 * Features:
 * - Creates HTS NFT collection with KYC key management
 * - SUPPLY key = this contract (mint/burn only via contract)
 * - ADMIN key = this contract (admin updates only via contract)  
 * - KYC key = this contract (KYC management via contract)
 * - Holders use the token's ERC721 facade directly (SDK or EVM)
 */
contract IPAssetHTSKYC is HederaTokenService, KeyHelper, Ownable {
    // Underlying HTS NFT token EVM address (set during initialize. This is the "ERC721-like" token)
    address public tokenAddress;

    // Cosmetic copies for convenience (optional)
    string public name;
    string public symbol;

    // Small non-empty default metadata for simple mints (<=100 bytes as per HTS limit)
    bytes private constant DEFAULT_METADATA = hex"01";
    uint256 private constant INT64_MAX = 0x7fffffffffffffff;

    // Mapping from token ID to IP asset metadata
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => uint256) public tokenToIPAsset;
    mapping(uint256 => uint256) public ipAssetToToken;
    
    uint256 private _nextTokenId = 1;

    // Events
    event IPAssetNFTCollectionCreated(address indexed token);
    event IPAssetNFTMinted(
        address indexed to,
        uint256 indexed tokenId,
        uint256 indexed ipAssetId,
        int64 newTotalSupply
    );
    event IPAssetNFTBurned(uint256 indexed tokenId, uint256 indexed ipAssetId, int64 newTotalSupply);
    event KYCGranted(address indexed account);
    event KYCRevoked(address indexed account);
    event KYCKeyUpdated(bytes newKey);
    event HBARReceived(address indexed from, uint256 amount);
    event HBARFallback(address sender, uint256 amount, bytes data);
    event HBARWithdrawn(address indexed to, uint256 amount);

    /**
     * Constructor sets ownership.
     * Actual HTS token creation happens in createIPAssetNFTCollection().
     */
    constructor() Ownable(msg.sender) {}

    /**
     * Creates the HTS NFT collection for IP assets with KYC enforcement.
     * Can be called exactly once by the owner after deployment.
     *
     * @param _name         Token/collection name
     * @param _symbol       Token/collection symbol
     */
    function createIPAssetNFTCollection(
        string memory _name,
        string memory _symbol
    ) external payable onlyOwner {
        require(tokenAddress == address(0), "Already initialized");

        name = _name;
        symbol = _symbol;

        // Build token definition
        IHederaTokenService.HederaToken memory token;
        token.name = name;
        token.symbol = symbol;
        token.treasury = address(this);
        token.memo = "IP Asset NFT Collection with KYC";

        // Keys: SUPPLY + ADMIN + KYC -> contractId
        IHederaTokenService.TokenKey[]
            memory keys = new IHederaTokenService.TokenKey[](3);
        keys[0] = getSingleKey(
            KeyType.SUPPLY,
            KeyValueType.CONTRACT_ID,
            address(this)
        );
        keys[1] = getSingleKey(
            KeyType.ADMIN,
            KeyValueType.CONTRACT_ID,
            address(this)
        );
        keys[2] = getSingleKey(
            KeyType.KYC,
            KeyValueType.CONTRACT_ID,
            address(this)
        );
        token.tokenKeys = keys;

        (int rc, address created) = createNonFungibleToken(token);
        require(rc == HederaResponseCodes.SUCCESS, "HTS: create NFT failed");
        tokenAddress = created;

        // KYC the treasury so it may receive and operate on NFTs when KYC is enforced
        int rcTreasuryKyc = grantTokenKyc(tokenAddress, address(this));
        require(
            rcTreasuryKyc == HederaResponseCodes.SUCCESS,
            "HTS: self KYC failed"
        );

        emit IPAssetNFTCollectionCreated(created);
    }

    // ---------------------------------------------------------------------------
    // IP Asset NFT minting (admin via Ownable + SUPPLY key on contract)
    // ---------------------------------------------------------------------------

    /**
     * @dev Mint an IP Asset NFT with KYC enforcement
     * @param to Address to receive the NFT
     * @param ipAssetId ID of the IP asset
     * @param metadataURI URI containing the token metadata
     */
    function mintIPAssetNFT(
        address to,
        uint256 ipAssetId,
        string memory metadataURI
    ) external onlyOwner returns (uint256) {
        require(tokenAddress != address(0), "HTS: not created");
        require(ipAssetToToken[ipAssetId] == 0, "IP Asset already has NFT");
        
        // Convert metadata URI to bytes (must be <= 100 bytes for HTS)
        bytes memory metadata = bytes(metadataURI);
        require(metadata.length <= 100, "HTS: metadata >100 bytes");
        
        uint256 tokenId = _mintAndSend(to, metadata);
        
        // Link token to IP asset
        tokenToIPAsset[tokenId] = ipAssetId;
        ipAssetToToken[ipAssetId] = tokenId;
        _tokenURIs[tokenId] = metadataURI;
        
        emit IPAssetNFTMinted(to, tokenId, ipAssetId, 0); // Total supply not easily accessible
        
        return tokenId;
    }

    /**
     * @dev Mint an IP Asset NFT with custom metadata bytes
     * @param to Address to receive the NFT
     * @param ipAssetId ID of the IP asset
     * @param metadata Custom metadata bytes (<= 100 bytes)
     */
    function mintIPAssetNFTWithBytes(
        address to,
        uint256 ipAssetId,
        bytes memory metadata
    ) external onlyOwner returns (uint256) {
        require(tokenAddress != address(0), "HTS: not created");
        require(ipAssetToToken[ipAssetId] == 0, "IP Asset already has NFT");
        require(metadata.length <= 100, "HTS: metadata >100 bytes");
        
        uint256 tokenId = _mintAndSend(to, metadata);
        
        // Link token to IP asset
        tokenToIPAsset[tokenId] = ipAssetId;
        ipAssetToToken[ipAssetId] = tokenId;
        
        emit IPAssetNFTMinted(to, tokenId, ipAssetId, 0);
        
        return tokenId;
    }

    function _mintAndSend(
        address to,
        bytes memory metadata
    ) internal returns (uint256 tokenId) {
        // 1) Mint to treasury (this contract)
        bytes[] memory arr = new bytes[](1);
        arr[0] = metadata;
        (int rc, int64 _newTotalSupply, int64[] memory serials) = mintToken(
            tokenAddress,
            0,
            arr
        );
        require(
            rc == HederaResponseCodes.SUCCESS && serials.length == 1,
            "HTS: mint failed"
        );

        // 2) Transfer from treasury -> recipient via ERC721 facade
        uint256 serial = uint256(uint64(serials[0]));
        // Recipient must be associated (or have auto-association available)
        IERC721(tokenAddress).transferFrom(address(this), to, serial);

        return serial;
    }

    // ---------------------------------------------------------------------------
    // IP Asset NFT burning
    // ---------------------------------------------------------------------------

    /**
     * @dev Burn an IP Asset NFT
     * @param tokenId ID of the token to burn
     */
    function burnIPAssetNFT(uint256 tokenId) external {
        require(tokenAddress != address(0), "HTS: not created");

        address owner_ = IERC721(tokenAddress).ownerOf(tokenId);
        uint256 ipAssetId = tokenToIPAsset[tokenId];

        // Match ERC721Burnable semantics: only the token owner or an approved operator may trigger burn
        require(
            msg.sender == owner_ ||
                IERC721(tokenAddress).getApproved(tokenId) == msg.sender ||
                IERC721(tokenAddress).isApprovedForAll(owner_, msg.sender),
            "caller not owner nor approved"
        );

        // If not already in treasury, ensure this contract is approved to pull the token and then pull it
        if (owner_ != address(this)) {
            bool contractApproved = IERC721(tokenAddress).getApproved(
                tokenId
            ) ==
                address(this) ||
                IERC721(tokenAddress).isApprovedForAll(owner_, address(this));
            require(contractApproved, "contract not approved to transfer");
            IERC721(tokenAddress).transferFrom(owner_, address(this), tokenId);
        }

        // Burn via HTS (requires token to be in treasury)
        int64[] memory serials = new int64[](1);
        serials[0] = _toI64(tokenId);
        (int rc, int64 newTotalSupply) = burnToken(tokenAddress, 0, serials);
        require(rc == HederaResponseCodes.SUCCESS, "HTS: burn failed");

        // Remove links
        delete tokenToIPAsset[tokenId];
        delete ipAssetToToken[ipAssetId];
        delete _tokenURIs[tokenId];

        emit IPAssetNFTBurned(tokenId, ipAssetId, newTotalSupply);
    }

    // ---------------------------------------------------------------------------
    // KYC Management Functions
    // ---------------------------------------------------------------------------

    /**
     * @dev Grant KYC to an account for the IP Asset NFT collection
     * @param account Address to grant KYC to
     */
    function grantKYC(address account) external {
        require(tokenAddress != address(0), "HTS: not created");
        int response = grantTokenKyc(tokenAddress, account);
        require(
            response == HederaResponseCodes.SUCCESS,
            "HTS: grant KYC failed"
        );
        emit KYCGranted(account);
    }

    /**
     * @dev Revoke KYC from an account for the IP Asset NFT collection
     * @param account Address to revoke KYC from
     */
    function revokeKYC(address account) external {
        require(tokenAddress != address(0), "HTS: not created");
        int response = revokeTokenKyc(tokenAddress, account);
        require(
            response == HederaResponseCodes.SUCCESS ||
                response ==
                HederaResponseCodes.ACCOUNT_KYC_NOT_GRANTED_FOR_TOKEN,
            "HTS: revoke KYC failed"
        );
        emit KYCRevoked(account);
    }

    /**
     * @dev Update the KYC key on the token
     * @param newKYCKey New KYC key (SECP256K1 format)
     */
    function updateKYCKey(bytes memory newKYCKey) external onlyOwner {
        require(tokenAddress != address(0), "HTS: not created");

        // Create a new TokenKey array with just the KYC key
        IHederaTokenService.TokenKey[]
            memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = getSingleKey(KeyType.KYC, KeyValueType.SECP256K1, newKYCKey);

        int responseCode = updateTokenKeys(tokenAddress, keys);
        require(
            responseCode == HederaResponseCodes.SUCCESS,
            "HTS: update KYC key failed"
        );

        emit KYCKeyUpdated(newKYCKey);
    }

    // ---------------------------------------------------------------------------
    // View Functions
    // ---------------------------------------------------------------------------

    /**
     * @dev Get the IP asset ID associated with a token
     * @param tokenId ID of the token
     */
    function getIPAssetId(uint256 tokenId) external view returns (uint256) {
        return tokenToIPAsset[tokenId];
    }

    /**
     * @dev Get the token ID associated with an IP asset
     * @param ipAssetId ID of the IP asset
     */
    function getTokenId(uint256 ipAssetId) external view returns (uint256) {
        return ipAssetToToken[ipAssetId];
    }

    /**
     * @dev Check if an IP asset has an associated NFT
     * @param ipAssetId ID of the IP asset
     */
    function hasNFT(uint256 ipAssetId) external view returns (bool) {
        return ipAssetToToken[ipAssetId] != 0;
    }

    /**
     * @dev Get token URI for a given token ID
     * @param tokenId ID of the token
     */
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        return _tokenURIs[tokenId];
    }

    // ---------------------------------------------------------------------------
    // HBAR handling
    // ---------------------------------------------------------------------------

    // Accept HBAR
    receive() external payable {
        emit HBARReceived(msg.sender, msg.value);
    }

    fallback() external payable {
        emit HBARFallback(msg.sender, msg.value, msg.data);
    }

    function withdrawHBAR() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No HBAR to withdraw");
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Failed to withdraw HBAR");
        emit HBARWithdrawn(owner(), balance);
    }

    // --------------------- internal helpers ---------------------
    function _toI64(uint256 x) internal pure returns (int64) {
        require(x <= INT64_MAX, "cast: > int64.max");
        return int64(uint64(x));
    }
}

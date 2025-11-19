// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IPAssetManager.sol";

/**
 * @title IPAssetNFT
 * @dev ERC721 NFT contract for representing Intellectual Property assets
 * @notice This contract mints NFTs that represent ownership of IP assets
 */
contract IPAssetNFT is ERC721, Ownable {
    uint256 private _tokenIds;
    
    IPAssetManager public ipAssetManager;
    
    // Mapping from token ID to IP asset ID
    mapping(uint256 => uint256) public tokenToIPAsset;
    mapping(uint256 => uint256) public ipAssetToToken;
    
    // Mapping from token ID to URI
    mapping(uint256 => string) private _tokenURIs;
    
    // Events
    event IPAssetNFTMinted(
        uint256 indexed tokenId,
        uint256 indexed ipAssetId,
        address indexed owner,
        string tokenURI
    );
    
    event IPAssetNFTBurned(
        uint256 indexed tokenId,
        uint256 indexed ipAssetId,
        address indexed owner
    );
    
    event IPAssetManagerUpdated(
        address indexed oldManager,
        address indexed newManager
    );
    
    modifier onlyIPAssetManager() {
        require(msg.sender == address(ipAssetManager), "Only IP Asset Manager can call this");
        _;
    }
    
    constructor() ERC721("IP Asset NFT", "IPNFT") Ownable(msg.sender) {
        // Initialize with zero address, will be set later
        ipAssetManager = IPAssetManager(address(0));
    }
    
    /**
     * @dev Set the IP Asset Manager (only callable by owner)
     * @param _ipAssetManager Address of the new IP Asset Manager
     */
    function setIPAssetManager(address _ipAssetManager) external onlyOwner {
        require(_ipAssetManager != address(0), "Invalid manager address");
        address oldManager = address(ipAssetManager);
        ipAssetManager = IPAssetManager(_ipAssetManager);
        emit IPAssetManagerUpdated(oldManager, _ipAssetManager);
    }
    
    /**
     * @dev Mint an NFT for an IP asset (only callable by IPAssetManager)
     * @param to Address to receive the NFT
     * @param ipAssetId ID of the IP asset
     * @param uri URI containing the token metadata
     */
    function mintIPAssetNFT(
        address to,
        uint256 ipAssetId,
        string memory uri
    ) external onlyIPAssetManager returns (uint256) {
        require(ipAssetToToken[ipAssetId] == 0, "IP Asset already has NFT");
        
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        
        _mint(to, newTokenId);
        _tokenURIs[newTokenId] = uri;
        
        // Link token to IP asset
        tokenToIPAsset[newTokenId] = ipAssetId;
        ipAssetToToken[ipAssetId] = newTokenId;
        
        emit IPAssetNFTMinted(newTokenId, ipAssetId, to, uri);
        
        return newTokenId;
    }
    
    /**
     * @dev Burn an IP asset NFT (only callable by IPAssetManager)
     * @param tokenId ID of the token to burn
     */
    function burnIPAssetNFT(uint256 tokenId) external onlyIPAssetManager {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        
        uint256 ipAssetId = tokenToIPAsset[tokenId];
        address owner = ownerOf(tokenId);
        
        // Remove links
        delete tokenToIPAsset[tokenId];
        delete ipAssetToToken[ipAssetId];
        
        burn(tokenId);
        
        emit IPAssetNFTBurned(tokenId, ipAssetId, owner);
    }
    
    /**
     * @dev Get the IP asset ID associated with a token
     * @param tokenId ID of the token
     */
    function getIPAssetId(uint256 tokenId) external view returns (uint256) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
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
    
    // Required overrides for ERC721
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        return _tokenURIs[tokenId];
    }
    
    function burn(uint256 tokenId) internal {
        super._burn(tokenId);
        delete _tokenURIs[tokenId];
    }
} 
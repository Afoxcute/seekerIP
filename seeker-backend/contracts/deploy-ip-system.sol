// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "./IPAssetHTSKYC.sol";
import "./IPAssetManagerV2.sol";
import "./IPAssetComplianceManager.sol";

/**
 * @title IPAssetSystemDeployer
 * @dev Deployment script for the IP Asset Management System with Compliance
 * @notice This contract demonstrates how to deploy and initialize the IP asset system with compliance
 */
contract IPAssetSystemDeployer {
    
    IPAssetHTSKYC public ipAssetNFT;
    IPAssetManagerV2 public ipAssetManager;
    IPAssetComplianceManager public complianceManager;
    
    event SystemDeployed(
        address indexed ipAssetNFT,
        address indexed ipAssetManager,
        address indexed complianceManager,
        address deployer
    );
    
    constructor() {
        // Deploy Compliance Manager first
        complianceManager = new IPAssetComplianceManager();
        
        // Deploy IP Asset NFT contract
        ipAssetNFT = new IPAssetHTSKYC();
        
        // Deploy IP Asset Manager with NFT contract and compliance manager addresses
        ipAssetManager = new IPAssetManagerV2(payable(address(ipAssetNFT)), address(complianceManager));
        
        // Transfer ownership of NFT contract to the manager
        ipAssetNFT.transferOwnership(address(ipAssetManager));
        
        emit SystemDeployed(
            address(ipAssetNFT),
            address(ipAssetManager),
            address(complianceManager),
            msg.sender
        );
    }
    
    /**
     * @dev Get the deployed contract addresses
     */
    function getDeployedAddresses() external view returns (
        address nftContract,
        address managerContract
    ) {
        return (address(ipAssetNFT), address(ipAssetManager));
    }
    
    /**
     * @dev Transfer ownership of the IP Asset Manager to a new owner
     * @param newOwner New owner address
     */
    function transferManagerOwnership(address newOwner) external {
        ipAssetManager.transferOwnership(newOwner);
    }
} 
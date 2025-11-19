// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import "./system-contracts/hedera-token-service/IHederaTokenService.sol";
import "./system-contracts/HederaResponseCodes.sol";
import "./system-contracts/hedera-token-service/IHRC719.sol";

contract AssetCollateralReserve {
    address constant KES = address(0x5880fb);
    IHederaTokenService constant hts = IHederaTokenService(address(0x167));
    address asset;
    address issuer;
    uint256 public totalReserve;

    modifier onlyAdmin() {
        require(msg.sender == issuer || msg.sender == address(this), "Only admin can call this function");
        _;
    }

    constructor(address _asset) {
        uint256 responseCode = IHRC719(KES).associate(); // TODO: we might need to use a different token association mechanism
        if (int32(uint32(responseCode)) != HederaResponseCodes.SUCCESS) {
            revert("Failed to setup USDC token association");
        }
        asset = _asset;
        totalReserve = 0;
        issuer = msg.sender;
    }

    function deposit(uint64 amount) public {
        totalReserve += amount;
    }

    function withdraw(uint64 amount) public {
        totalReserve -= amount;
    }

    function grantAllowanceToIssuer(uint256 amount) private onlyAdmin() {
        int64 responseCode = hts.approve(KES, issuer, amount);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert("Failed to grant allowance to issuer");
        }
    }

    function grantAllowanceToSelf(uint256 amount) private onlyAdmin() {
        int64 responseCode = hts.approve(KES, address(this), amount);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert("Failed to grant allowance to self");
        }
    }

    function refund(uint256 amount, address account) public onlyAdmin() {
        // if(msg.sender == lender){
        //     grantAllowanceToLender(amount);
        // } else if(msg.sender == issuer){
        //     grantAllowanceToIssuer(amount);
        // }
        grantAllowanceToSelf(amount);
        int64 responseCode = hts.transferFrom(KES, address(this), account, amount);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert("Failed to refund");
        }
        totalReserve -= amount;
    }


}
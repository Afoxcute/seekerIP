// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

// TODO: Intergrate with issuer contract

contract Control {
    address public admin;
    bool public PAUSE_TRADING = false;

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    function pauseTrading() public onlyAdmin {
        PAUSE_TRADING = true;
    }
}
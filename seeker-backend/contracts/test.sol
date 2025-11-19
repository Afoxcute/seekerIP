// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

contract MyContract {
    string public constant scriptId = 'HFWV2_hscsSC';

    mapping(address => string) public names;

    constructor() {
        names[msg.sender] = "Creator";
    }

    function introduce(string memory name) public {
        names[msg.sender] = name;
    }

    function greet() public view returns (string memory) {
        // NOTE: Store name in smart contract
        string memory name = names[msg.sender];
        return string.concat("Hello future! - ", name);
    }
}
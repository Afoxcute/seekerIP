// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import "./system-contracts/hedera-token-service/HederaTokenService.sol";
import "./system-contracts/HederaResponseCodes.sol";
import "./system-contracts/hedera-token-service/IHederaTokenService.sol";
import "./system-contracts/hedera-token-service/KeyHelper.sol";
import "./PriceOracle.sol";
import "./Reserve.sol";
import "./TokenizedAssetManager.sol";

interface IERC20 {

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

}

function stringToBytes32(string memory source) pure returns (bytes32 result) {
    bytes memory temp = bytes(source);
    if (temp.length == 0) {
        return 0x0;
    }
    assembly {
        result := mload(add(temp, 32))
    }
}


// TODO: add controls to prevent over liquidation from reserve in case of more than 10% of reserve has been loaned out
contract Issuer {

    event AssetMinted(uint64 indexed amount, uint256 indexed newTotalSupply, address indexed token);
    event AssetBurned(uint64 indexed amount, uint256 indexed newTotalSupply, address indexed token);
    event KYCGranted(address indexed account, address indexed token);

    event AssetPurchased(address indexed asset, uint64 indexed amount, address indexed buyer);
    event AssetSold(address indexed asset, uint64 indexed amount, address indexed seller);
    event AssetCreated(bytes32 indexed name, bytes32 indexed symbol, address indexed token);
    
    address public admin;
    PriceOracle constant oracle = PriceOracle(address(0x0000000000000000000000000000000000588104));
    IHederaTokenService constant hts = IHederaTokenService(address(0x167));
    address constant KES = address(0x5880fb);
    mapping(string => TokenizedAssetManager) public tokenizedAssets;
    mapping(address => AssetCollateralReserve) public reserves;

    

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    receive() external payable {
        // do nothing
    }

    fallback() external payable {
        // do nothing
    }

    constructor() {
        admin = msg.sender;
    }
    
    function createTokenizedAsset(string memory _name, string memory _symbol) payable public onlyAdmin {
        TokenizedAssetManager asset = new TokenizedAssetManager{value: msg.value}(_name, _symbol);
        AssetCollateralReserve reserve = new AssetCollateralReserve(address(asset));
        tokenizedAssets[_name] = asset;
        reserves[asset.token()] = reserve;

        emit AssetCreated(stringToBytes32(_name), stringToBytes32(_symbol), asset.token());
    }

    function mint(string memory name, uint64 amount) public onlyAdmin() {
        tokenizedAssets[name].mint(amount);
        address token = tokenizedAssets[name].token();
        uint256 currentSupply = IERC20(token).totalSupply();
        emit AssetMinted(amount, currentSupply, token);
    }

    function burn(string memory name, uint64 amount) public onlyAdmin() {
        tokenizedAssets[name].burn(amount);
        address token = tokenizedAssets[name].token();
        uint256 currentSupply = IERC20(token).totalSupply();
        emit AssetBurned(amount, currentSupply, token);
    }

    function grantKYC(string memory name, address account) public onlyAdmin() {
        tokenizedAssets[name].grantKYC(account);
        emit KYCGranted(account, tokenizedAssets[name].token());
    }

    function getTokenAddress(string memory name) public view returns (address) {
        return tokenizedAssets[name].token();
    }

    function purchaseAsset(string memory name, uint64 amount) public {
        TokenizedAssetManager asset = tokenizedAssets[name];
        address token = asset.token();
        AssetCollateralReserve assetCollateralReserve = reserves[token];

        uint64 kesPricePerAsset = oracle.getPrice(token);

        // calculate kes price
        uint64 totalCost = (kesPricePerAsset * amount);

        // Transfer KES to reserve
        int responseCode = hts.transferFrom(KES, msg.sender, address(assetCollateralReserve), uint64(totalCost));

        if(responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to transfer KES");
        }
        
        // airdrop asset to buyer
        asset.airdropPurchasedTokens(msg.sender, amount);
        assetCollateralReserve.deposit(totalCost);

        emit AssetPurchased(token, amount, msg.sender);
    }


    function sellAsset(string memory name, uint64 suppliedAssets) public {
        // TODO: add restrictions on howmuch can be withdrawn from reserve
        TokenizedAssetManager a = tokenizedAssets[name];
        address token = a.token();
        AssetCollateralReserve r = reserves[token];

        uint64 kesPricePerAsset = oracle.getPrice(token);

        uint64 refundAmount = (suppliedAssets * kesPricePerAsset);

        // transfer asset from user to contract
        int responseCode = hts.transferFrom(token, msg.sender, address(a), uint64(suppliedAssets));

        if(responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to transfer");
        }

        r.refund(uint64(refundAmount), msg.sender);

        emit AssetSold(token, suppliedAssets, msg.sender);
    }
}
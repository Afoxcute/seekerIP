// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import "./system-contracts/hedera-token-service/HederaTokenService.sol";
import "./system-contracts/HederaResponseCodes.sol";
import "./system-contracts/hedera-token-service/IHederaTokenService.sol";
import "./system-contracts/hedera-token-service/KeyHelper.sol";
import "./system-contracts/hedera-token-service/IHRC719.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Strings.sol"; 
import "./PriceOracle.sol";

using Strings for uint64;

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


contract LendingTokenReserve is HederaTokenService, KeyHelper {
    address public asset;
    address public token;
    address public admin;
    uint64 public totalSupply;
    address constant KES = address(0x5880fb);
    IHederaTokenService constant hts = IHederaTokenService(address(0x167));

    struct Loan {
        uint64 loanAmountKES;
        uint64 collateralAmountAsset;
        uint64 liquidationKESPrice;
        uint64 repayAmountKES;
        bool isLiquidated;
        bool isRepaid;
        bool isOutstanding;
    }

    mapping (address => Loan) private loans;

    receive() external payable {
        // do nothing
    }

    fallback() external payable {
        // do nothing
    }

    modifier onlyAdmin() {
        require(msg.sender == admin || msg.sender == address(this), "Only admin can call this function");
        _;
    }

    

    constructor(string memory _name, string memory _symbol, address _asset) payable {
        admin = msg.sender;

        asset = _asset;
        IHederaTokenService.HederaToken memory tokenDetails;
        tokenDetails.name = _name;
        tokenDetails.symbol = _symbol;
        tokenDetails.treasury = address(this);
        IHederaTokenService.Expiry memory expiry;
        expiry.autoRenewAccount = address(this);
        expiry.autoRenewPeriod = 7890000;
        tokenDetails.expiry = expiry;

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](6);

        keys[0] = getSingleKey(KeyType.ADMIN, KeyValueType.CONTRACT_ID, address(this));
        keys[1] = getSingleKey(KeyType.FREEZE, KeyValueType.CONTRACT_ID, address(this));
        keys[2] = getSingleKey(KeyType.WIPE, KeyValueType.CONTRACT_ID, address(this));
        keys[3] = getSingleKey(KeyType.SUPPLY, KeyValueType.CONTRACT_ID, address(this));
        keys[4] = getSingleKey(KeyType.FEE, KeyValueType.CONTRACT_ID, address(this));
        keys[5] = getSingleKey(KeyType.PAUSE, KeyValueType.CONTRACT_ID, address(this));

        tokenDetails.tokenKeys = keys;
        
        (int response, address tokenAddress) = HederaTokenService.createFungibleToken(tokenDetails, 0, 6);

        if (response != HederaResponseCodes.SUCCESS){
            revert("Failed to create token");
        }

        token = tokenAddress;
        totalSupply = 0;

        uint256 associationResponseCode = IHRC719(_asset).associate();

        if(int64(uint64(associationResponseCode)) != HederaResponseCodes.SUCCESS){
            revert("Failed to associate token to KES");
        }

        associationResponseCode = IHRC719(KES).associate();

        if(int64(uint64(associationResponseCode)) != HederaResponseCodes.SUCCESS){
            revert("Failed to associate KES token");
        }



    }


    function mint(uint64 amount) private onlyAdmin() {
        (int responseCode, int64 _newTotalSupply, ) = HederaTokenService.mintToken(token, int64(amount), new bytes[](0));

        if(responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to mint asset");
        }

        totalSupply = uint64(_newTotalSupply);

    }

    function burn(uint64 amount) private onlyAdmin() {
       (int responseCode, int64 _newTokenSupply) = HederaTokenService.burnToken(token, int64(amount), new int64[](0));

       if(responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to burn asset");
       }

         totalSupply = uint64(_newTokenSupply);

    }


    function airdropTokens(uint64 amount, address target) private onlyAdmin() {
        
        bool isAssociated = IHRC719(token).isAssociated();

        if(!isAssociated){
            revert("Token is not associated");
        }

        IHederaTokenService.AccountAmount memory recipientAccount; 
        recipientAccount.accountID = target;
        recipientAccount.amount = int64(amount);

        IHederaTokenService.AccountAmount memory senderAccount;
        senderAccount.accountID = address(this);
        senderAccount.amount = -int64(amount);

        IHederaTokenService.TokenTransferList memory transferList;

        transferList.token = token;
        transferList.transfers = new IHederaTokenService.AccountAmount[](2);
        transferList.transfers[0] = senderAccount;
        transferList.transfers[1] = recipientAccount;

        IHederaTokenService.TokenTransferList[] memory airdropList = new IHederaTokenService.TokenTransferList[](1);
        airdropList[0] = transferList;

        int responseCode = HederaTokenService.airdropTokens(airdropList);

        if(responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to airdrop tokens");
        }
        

    }


    function provideLiquidity(uint64 amount, address user) public onlyAdmin() {

        mint(amount);

        airdropTokens(amount, user);

        
    } 

    function withdrawLiquidity(uint64 amount, address user) public onlyAdmin() {

        require(IERC20(token).balanceOf(user) >= amount, "Insufficient balance");
        
        // TODO: handling rewards

        int responseCode = hts.approve(KES, address(this), amount);

        if(responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to grant self allowance");
        }


        burn(amount);

        responseCode = hts.transferFrom(KES, address(this), user, amount);

        if(responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to transfer KES");
        }
    }

    function recordLoan(address borrower, uint64 loanAmountKES, uint64 collateralAmountAsset, uint64 liquidationKESPrice, uint64 repayAmount) public onlyAdmin() {
        Loan storage existingLoan = loans[borrower];
        require(!existingLoan.isOutstanding, "Loan already exists for borrower");
        loans[borrower] = Loan(loanAmountKES, collateralAmountAsset, liquidationKESPrice, repayAmount, false, false, true);

    }

    function liquidateLoan(address borrower) public onlyAdmin() {
        Loan storage loan = loans[borrower];
        loan.isLiquidated = true;

    }

    function repayLoan(address borrower) public onlyAdmin() {
        Loan storage loan = loans[borrower];
        loan.isRepaid = true;
        loan.isOutstanding = false;
        loan.isLiquidated = false;
        loan.loanAmountKES = 0;
        loan.collateralAmountAsset = 0;
        loan.liquidationKESPrice = 0;
        loan.repayAmountKES = 0;

    }

    function getLoan(address borrower) public view returns (Loan memory) {
        return loans[borrower];
    }

    function grantKESAllowanceToSelf(uint256 amount) private onlyAdmin() {
        int64 responseCode = hts.approve(KES, address(this), amount);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert("Failed to grant allowance to self");
        }
    }

    function loanOut(address borrower, uint256 amount) public onlyAdmin() {
        grantKESAllowanceToSelf(amount);

        int64 responseCode = hts.transferFrom(KES, address(this), borrower, amount);

        if(responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to transfer KES");
        }
    }

    function refundCollateral(address borrower, uint256 amount) public onlyAdmin() {

        int64 approvalResponseCode = hts.approve(asset, address(this), amount);

        if(approvalResponseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to approve asset transfer");
        }


        int64 responseCode = hts.transferFrom(asset, address(this), borrower, amount);

        if(responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to transfer asset");
        }
    }
}


contract Lender {

    event AssetLendingReserveCreated(address indexed asset,address indexed token, bytes32 indexed name);
    event LoanRecorded(address indexed token, address indexed borrower, uint64 indexed loanAmountKES, uint64 collateralAmountAsset, uint64 liquidationKESPrice, uint64 repayAmount);
    event LoanLiquidated(address indexed token, address indexed borrower);
    event LoanRepaid(address indexed token, address indexed borrower, uint64 indexed repayAmount);
    event LiquidityProvided(address indexed asset, uint64 indexed amount, address indexed user);
    event LiquidityWithdrawn(address indexed asset, uint64 indexed amount, address indexed user);


    address public admin;
    PriceOracle constant oracle = PriceOracle(address(0x0000000000000000000000000000000000588104));
    IHederaTokenService constant hts = IHederaTokenService(address(0x167));
    address constant KES = address(0x5880fb);
    mapping(address => LendingTokenReserve) public lendingReserves;

    receive() external payable {
        // do nothing
    }

    fallback() external payable {
        // do nothing
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function"); 
        _;
    }

    constructor(){
        admin = msg.sender;
    }

    function addLenderPool(address asset, string memory lender_token_name, string memory lender_token_symbol) payable public onlyAdmin() {
        LendingTokenReserve tokenReserve = new LendingTokenReserve{value: msg.value}(lender_token_name, lender_token_symbol, asset);
        lendingReserves[asset] = tokenReserve;
        emit AssetLendingReserveCreated(asset, tokenReserve.token(), stringToBytes32(lender_token_name));
    }

    function getLpTokenAddress(address asset) public view returns(address){
        return lendingReserves[asset].token();
    }

    // only for purpouses of granting kyc by issuer
    function getReserveAddress(address asset) public view returns(address){
        return address(lendingReserves[asset]);
    }

    function provideLiquidity(address asset, uint64 amount) public {
        LendingTokenReserve reserve = lendingReserves[asset];

        int responseCode = hts.transferFrom(KES, msg.sender, address(reserve), uint256(amount));

        if(responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to transfer KES");
        } 

        reserve.provideLiquidity(amount, msg.sender);

        emit LiquidityProvided(asset, amount, msg.sender);
    }

    function withdrawLiquidity(address asset, uint64 amount) public {
        LendingTokenReserve reserve = lendingReserves[asset];
        // TODO: add functionality for distributing rewards

        int responseCode = hts.transferFrom(reserve.token(), msg.sender, address(reserve), amount);

        if(responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to transfer token");
        }


        reserve.withdrawLiquidity(amount, msg.sender);

        emit LiquidityWithdrawn(asset, amount, msg.sender);
    }


    function takeOutLoan(address asset, uint64 amount) public {
        LendingTokenReserve reserve = lendingReserves[asset];
        
        LendingTokenReserve.Loan memory existingLoan = reserve.getLoan(msg.sender);

        require(existingLoan.isOutstanding == false, "Loan already exists");
        require(existingLoan.isLiquidated == false, "Loan already exists");

        uint64 kesPricePerAsset = oracle.getPrice(asset);

        uint64 baseLockedAssets = uint64(Math.ceilDiv(uint256(amount) , uint256(kesPricePerAsset)));
        
        uint64 collateralisedLockedAssets = uint64(Math.ceilDiv((baseLockedAssets * 125) , 100)); // 125% collateralisation ratio

        uint64 liquidationPriceKES = uint64(Math.ceilDiv((kesPricePerAsset * 90) ,100));

        uint64 repayAmount = uint64(Math.ceilDiv((amount * 110) , 100)); // 110% repayment amount


        // transfer asset from user to contract
        int responseCode = hts.transferFrom(asset, msg.sender, address(reserve), uint256(collateralisedLockedAssets));

        if(responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to transfer asset");
        }

        // assetCollateralReserve.refund(uint256(amount), msg.sender);
        reserve.loanOut(msg.sender, amount);

        reserve.recordLoan(msg.sender, amount, collateralisedLockedAssets, liquidationPriceKES, repayAmount);

        emit LoanRecorded(asset, msg.sender, amount, collateralisedLockedAssets, liquidationPriceKES, repayAmount);
    }

    function repayOutstandingLoan(address asset) public {
        // Before contract call, approve KES transfer from user to contract
        LendingTokenReserve reserve = lendingReserves[asset];
        LendingTokenReserve.Loan memory loan = reserve.getLoan(msg.sender);

        if(!loan.isOutstanding ){
            revert("No outstanding loan for borrower");
        }

        if(loan.isLiquidated){
            revert("Loan is liquidated"); // TODO: may add functionality to refund any remaining collateral after liquidation
        }

        if(loan.isRepaid){
            revert("Loan is already repaid");
        }

        int responseCode = hts.transferFrom(KES, msg.sender, address(reserve), uint256(uint64(loan.repayAmountKES)));

        if(responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to transfer KES");
        }

        reserve.refundCollateral(msg.sender, uint64(loan.collateralAmountAsset));

        if(responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to transfer asset");
        }

        emit LoanRepaid(asset, msg.sender, loan.repayAmountKES);


        reserve.repayLoan(msg.sender);


    }

    // function liquidateLoan(string memory collateralizedAsset, address borrower) public {
    //     // actual liquidation of assets will be handled separately
    //     TokenizedAssetManager asset = issuer.tokenizedAssets(collateralizedAsset);
    //     TokenizedAssetManager.Loan memory loan = asset.getLoan(borrower);

    //     if(!loan.isOutstanding){
    //         revert("No outstanding loan for borrower");
    //     }

    //     if(loan.isLiquidated){
    //         revert("Loan is already liquidated");
    //     }

    //     if(loan.isRepaid){
    //         revert("Loan is already repaid");
    //     }

    //     asset.liquidateLoan(borrower);
    //     // handle actual liquidation of assets by burning and minting appropriately
    // }

}
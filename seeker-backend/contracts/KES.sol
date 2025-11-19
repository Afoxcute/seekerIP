// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;
pragma experimental ABIEncoderV2;


import "./system-contracts/hedera-token-service/HederaTokenService.sol";
import "./system-contracts/HederaResponseCodes.sol";
import "./system-contracts/hedera-token-service/IHederaTokenService.sol";
import "./system-contracts/hedera-token-service/KeyHelper.sol";
import "./system-contracts/hedera-token-service/ExpiryHelper.sol";
import "./system-contracts/hedera-token-service/IHRC719.sol";

contract KES is HederaTokenService, KeyHelper, ExpiryHelper {
    address public token;
    address admin;

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

    function initialize() external payable onlyAdmin() {
        IHederaTokenService.HederaToken memory tokenDetails;
        tokenDetails.name = "Kenyan Shilling";
        tokenDetails.symbol = "KES";
        tokenDetails.treasury = address(this);
        tokenDetails.expiry = createAutoRenewExpiry(address(this), 7890000);
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](6);

        keys[0] = getSingleKey(KeyType.ADMIN, KeyValueType.CONTRACT_ID, address(this));
        // keys[1] = getSingleKey(KeyType.KYC, KeyValueType.CONTRACT_ID, address(this));
        keys[1] = getSingleKey(KeyType.FREEZE, KeyValueType.CONTRACT_ID, address(this));
        keys[2] = getSingleKey(KeyType.WIPE, KeyValueType.CONTRACT_ID, address(this));
        keys[3] = getSingleKey(KeyType.SUPPLY, KeyValueType.CONTRACT_ID, address(this));
        keys[4] = getSingleKey(KeyType.FEE, KeyValueType.CONTRACT_ID, address(this));
        keys[5] = getSingleKey(KeyType.PAUSE, KeyValueType.CONTRACT_ID, address(this));

        tokenDetails.tokenKeys = keys;
        
        (int response, address tokenAddress) = createFungibleToken(tokenDetails, 100_000_000_000_000, 6);

        if (response != HederaResponseCodes.SUCCESS){
            revert("Failed to create token");
        }

        token = tokenAddress;

    }

    function getToken() public view returns(address){
        return token;
    }

    function mint(int64 amount) public onlyAdmin() {
        (int responseCode, , ) = HederaTokenService.mintToken(token, amount, new bytes[](0));

        if(responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to mint asset");
        }
    }

    function burn(int64 amount) public onlyAdmin() {
       (int responseCode, ) = HederaTokenService.burnToken(token, amount, new int64[](0));

       if(responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to burn asset");
       }
    }


    function grantKYC(address account) public onlyAdmin(){
        int responseCode = HederaTokenService.grantTokenKyc(token, account);
        if (responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to grant kyc");
        }
    }

    function requestAirdrop(uint64 amount) public {

        (int mintResponse, , ) = HederaTokenService.mintToken(token, int64(amount), new bytes[](0)); // !IMPORTANT only for testing

        if(mintResponse != HederaResponseCodes.SUCCESS){
            revert("Failed to mint asset");
        }

        bool isAssociated = IHRC719(token).isAssociated();

        if(!isAssociated){
            revert("Token is not associated");
        }

        // (,bool isKYCed) = HederaTokenService.isKyc(token, msg.sender);

        // if(!isKYCed){
        //     revert("KYC not granted to recipient");
        // }

        
        IHederaTokenService.AccountAmount memory recipientAccount;
        recipientAccount.accountID = address(msg.sender);
        recipientAccount.amount = int64(amount);

        IHederaTokenService.AccountAmount memory senderAccount;
        senderAccount.accountID = address(this);
        senderAccount.amount = -int64(amount);

        IHederaTokenService.TokenTransferList memory tokenTransferList;

        tokenTransferList.token = token;
        tokenTransferList.transfers = new IHederaTokenService.AccountAmount[](2);
        tokenTransferList.transfers[0] = senderAccount;
        tokenTransferList.transfers[1] = recipientAccount;

        IHederaTokenService.TokenTransferList[] memory airdropList = new IHederaTokenService.TokenTransferList[](1);
        airdropList[0] = tokenTransferList;

        int responseCode = HederaTokenService.airdropTokens(airdropList);

        if(responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to airdrop asset");
        }


    }
}


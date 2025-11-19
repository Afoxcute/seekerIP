import "dotenv/config"
import { AccountAllowanceApproveTransaction, AccountId, ContractExecuteTransaction, ContractFunctionParameters, ContractId, EvmAddress, Long, PrivateKey, Status, TokenAllowance, TokenAssociateTransaction, TokenId } from "@hashgraph/sdk";
import { getClient, getEnv } from "../../utils";
import { testStore } from "../../lib/test-store";

interface User {
    PRIVATE_KEY: PrivateKey
    ACCOUNT_ID: AccountId
    ADDRESS: EvmAddress
    NETWORK?: string
}

const admin = getEnv()
const client = getClient()
const tokenString = testStore.get("SAF_TOKEN_ADDRESS")
if(!tokenString) throw new Error("SAF Token Address not found")
const SAF_TOKEN_ADDRESS = EvmAddress.fromString(tokenString)
const SAF_TOKEN_ID = TokenId.fromSolidityAddress(tokenString)

const usdcTokenAddress = testStore.get("USDC_TOKEN_ADDRESS")
if(!usdcTokenAddress) throw new Error("USDC Token Address not found")
const USDC_TOKEN_ADDRESS = EvmAddress.fromString(usdcTokenAddress)
const USDC_TOKEN_ID = TokenId.fromSolidityAddress(usdcTokenAddress)

const tempUSDCContractIdString = testStore.get("TempUSDC")
if(!tempUSDCContractIdString) throw new Error("TempUSDC Contract ID not found");
const tempUSDCContractEvmAddress = EvmAddress.fromString(tempUSDCContractIdString)
const tempUSDCContractId = ContractId.fromString(tempUSDCContractIdString)

const issuerContractIdString = testStore.get("Issuer")
if(!issuerContractIdString) throw new Error("Issuer Contract ID not found");
const issuerContractEvmAddress = EvmAddress.fromString(issuerContractIdString)
const issuerContractId = ContractId.fromString(issuerContractIdString)

export async function setupTestUserWithSAFToken(user: User){

    const testUserSetup = testStore.get(`test_user_setup_${user.ACCOUNT_ID.toString()}`)
    if(testUserSetup == "confirmed") {
        console.log("User Setup Already Complete")
        // return
    }
    client.setOperator(user.ACCOUNT_ID, user.PRIVATE_KEY)
    const associateUSDCTx = await new TokenAssociateTransaction()
    .setTokenIds([USDC_TOKEN_ID])
    .setAccountId(user.ACCOUNT_ID)
    .freezeWith(client)
    .sign(user.PRIVATE_KEY)

    const submittedAssociateUSDCTx = await associateUSDCTx.execute(client)
    const associateUSDCReceipt = await submittedAssociateUSDCTx.getReceipt(client)
    // client.setOperator(admin.ACCOUNT_ID, admin.PRIVATE_KEY)
    if(associateUSDCReceipt.status != Status.Success) throw new Error("Token Associate Transaction Failed");

    client.setOperator(user.ACCOUNT_ID, user.PRIVATE_KEY)
        
    const airdropUSDCTx = await new ContractExecuteTransaction()
    .setContractId(tempUSDCContractId)
    .setFunction("requestAirdrop", 
        new ContractFunctionParameters()
        .addUint64(10_000 * 1_000_000)
    )
    .setGas(3000000)
    .freezeWith(client)
    .sign(user.PRIVATE_KEY)
            
    const airdropSubmittedTx = await airdropUSDCTx.execute(client);
        
    const receipt = await airdropSubmittedTx.getReceipt(client);

    if(receipt.status != Status.Success) throw new Error("Airdrop Transaction Failed");
        
    client.setOperator(admin.ACCOUNT_ID, admin.PRIVATE_KEY)


    const associateTx = await new TokenAssociateTransaction()
    .setTokenIds([SAF_TOKEN_ID])
    .setAccountId(user.ACCOUNT_ID)
    .freezeWith(client)
    .sign(user.PRIVATE_KEY)

    const submittedAssociateTx = await associateTx.execute(client)
    const associateReceipt = await submittedAssociateTx.getReceipt(client)
    if(associateReceipt.status != Status.Success) throw new Error("Token Associate Transaction Failed");

    client.setOperator(user.ACCOUNT_ID, user.PRIVATE_KEY)

    const usdcSpendAllowance = await new AccountAllowanceApproveTransaction({ // !IMPORTANT: Means we need to factor in slippage costs
        tokenApprovals: [
            new TokenAllowance({
                tokenId: USDC_TOKEN_ID,
                ownerAccountId: user.ACCOUNT_ID,
                spenderAccountId: AccountId.fromString(issuerContractIdString),
                amount: Long.fromNumber(1000 * 10**6) // 1000 USDC
            })
        ]
    })
    .freezeWith(client)
    .sign(user.PRIVATE_KEY)
        
    const submittedUSDCSpendTx = await usdcSpendAllowance.execute(client)
    const usdcSpendReceipt = await submittedUSDCSpendTx.getReceipt(client)
        
    client.setOperator(admin.ACCOUNT_ID, admin.PRIVATE_KEY)
    
    if(usdcSpendReceipt.status != Status.Success) throw new Error("USDC Spend Allowance Transaction Failed");
    
    const grantKYCTx = await new ContractExecuteTransaction()
    .setContractId(issuerContractId)
    .setGas(4_000_000)
    .setFunction("grantKYC",
        new ContractFunctionParameters()
        .addString("Safaricom")
        .addAddress(user.ADDRESS)
    )
    .freezeWith(client)
    .sign(admin.PRIVATE_KEY)
    
    const submittedGrantKYCTx = await grantKYCTx.execute(client)
    const grantReceipt = await submittedGrantKYCTx.getReceipt(client)

    if(grantReceipt.status != Status.Success) throw new Error("Grant KYC Transaction Failed");

    // Purchase 500 SAF Tokens

    client.setOperator(user.ACCOUNT_ID, user.PRIVATE_KEY)

    const purchaseAssetTx = await new ContractExecuteTransaction()
    .setContractId(issuerContractId)
    .setGas(4_000_000)
    .setFunction("purchaseAsset",
        new ContractFunctionParameters()
        .addString("Safaricom")
        .addUint64(100)
    )
    .freezeWith(client)
    .sign(user.PRIVATE_KEY) 
        
    const purchaseSubmittedTx = await purchaseAssetTx.execute(client)
    const purchareReceipt  = await purchaseSubmittedTx.getReceipt(client)

    if(purchareReceipt.status != Status.Success) throw new Error("Purchase Asset Transaction Failed");

    client.setOperator(admin.ACCOUNT_ID, admin.PRIVATE_KEY)

    console.log("User Setup Complete")

    testStore.set(`test_user_setup_${user.ACCOUNT_ID.toString()}`, "confirmed")
}
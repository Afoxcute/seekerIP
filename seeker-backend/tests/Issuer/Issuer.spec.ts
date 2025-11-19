import { describe, test } from "node:test"
import { testStore } from "../../lib/test-store"
import { getClient, getEnv, getTestUser } from "../../utils"
import { AccountAllowanceApproveTransaction, AccountId, ContractCallQuery, ContractExecuteTransaction, ContractFunctionParameters, ContractId, Hbar, Long, TokenAllowance, TokenAssociateTransaction, TokenGrantKycTransaction, TokenId } from "@hashgraph/sdk"

const client = getClient()
const admin = getEnv()
const user = getTestUser()

const TOKEN_NAME = "Bamburi Cement"
const TOKEN_SYMBOL = "BAMB"

describe("Issuer", async ()=> {
    const contractId = process.env.Issuer_TESTNET
    console.log("Contract ID", contractId)
    const usdcTokenAddress = process.env.USDC_TOKEN_ADDRESS;

    if(!contractId || !usdcTokenAddress) throw new Error("Contract ID not found")

    test("Admin: create safaricom tokenized asset", async () => {
    
            const tx = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(2_000_000)
            .setPayableAmount(new Hbar(40))
            .setFunction("createTokenizedAsset", 
                new ContractFunctionParameters()
                    .addString(TOKEN_NAME)
                    .addString(TOKEN_SYMBOL)
            )
            .freezeWith(client)
            .sign(admin.PRIVATE_KEY)
    
            const submittedTx = await tx.execute(client)
            const receipt = await submittedTx.getReceipt(client)
    
            console.log(`Tx Hash: ${tx.transactionId} Status: ${receipt.status}`)
            console.log(`Contract ID: ${receipt.contractId}`)
    
            const tokenAddressQuery = await new ContractCallQuery()
            .setContractId(contractId)
            .setGas(300_000)
            .setFunction("getTokenAddress",
                new ContractFunctionParameters()
                    .addString(TOKEN_NAME)
            )
            .execute(client)
    
            const tokenAddress = tokenAddressQuery.getAddress()
    
            console.log(`Token Address: ${tokenAddress}`)
    
        testStore.set(`TOKEN_ADDRESS_${TOKEN_NAME}`, tokenAddress.toString())
    
        })

    test("Admin: mint 1 billion SAF", async () => {
    
    
            const tx = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(4_000_000)
            .setFunction("mint",
                new ContractFunctionParameters()
                    .addString(TOKEN_NAME)
                .addUint64(1_000_000_000)
            )
            .freezeWith(client)
            .sign(admin.PRIVATE_KEY)
    
            const submittedTx = await tx.execute(client)
            const receipt = await submittedTx.getReceipt(client)
    
            console.log(`Tx Hash: ${tx.transactionId} Status: ${receipt.status}`)
            console.log(`Contract ID: ${receipt.contractId}`)
        })
    
    test.skip("User: associate with saf token", async () => {
            const tokenAddress = testStore.get("SAF_TOKEN_ADDRESS")
            if(!tokenAddress) throw new Error("Token Address not found")
            //     const isAssociated = testStore.get(`${user.ACCOUNT_ID}_ASSOCIATED_${tokenAddress}`)
            // if(isAssociated) return
    
            client.setOperator(user.ACCOUNT_ID, user.PRIVATE_KEY)
    
            const tx = await new TokenAssociateTransaction()
            .setTokenIds([TokenId.fromSolidityAddress(tokenAddress)])
            .setAccountId(user.ACCOUNT_ID)
            .freezeWith(client)
            .sign(user.PRIVATE_KEY)
    
            const submittedTx = await tx.execute(client)
            const receipt = await submittedTx.getReceipt(client)
    
            console.log(`Tx Hash: ${tx.transactionId} Status: ${receipt.status}`)
    
            testStore.set(`${user.ACCOUNT_ID}_ASSOCIATED_${tokenAddress}`, "confirmed")
    
            client.setOperator(admin.ACCOUNT_ID, admin.PRIVATE_KEY)
    
        })
    
        // TODO: KYC granted on intial purchase tos test user, but need to add explicit tests with another user
    
    test.skip("Update Price Oracle with valuation of SAF in USDC", async () => {
            const priceOracleContractId = testStore.get("PriceOracle")
            if(!priceOracleContractId) throw new Error("Price Oracle Contract ID not found");
            const tokenAddress = testStore.get("SAF_TOKEN_ADDRESS")
            if(!tokenAddress) throw new Error("Token Address not found")
            
            const tx = await new ContractExecuteTransaction()
            .setContractId(priceOracleContractId)
            .setGas(4_000_000)
            .setFunction("updatePrice",
                new ContractFunctionParameters()
                .addAddress(tokenAddress)
                .addUint64(10_000_000) // value of 1 SAF in USDC i.e 1 SAF = 10 USDC
            )
            .freezeWith(client)
            .sign(admin.PRIVATE_KEY)
            
            const submittedTx = await tx.execute(client)
            const receipt = await submittedTx.getReceipt(client)
    
            console.log(`Tx Hash: ${tx.transactionId} Status: ${receipt.status}`)
            console.log(`Contract ID: ${receipt.contractId}`)
    
        })
    
    test.skip("Approve Spending TempUSDC", async () => {
            client.setOperator(user.ACCOUNT_ID, user.PRIVATE_KEY)
            const tempUSDCAddress = testStore.get("USDC_TOKEN_ADDRESS")
            const tempUSDCId = testStore.get("USDC_TOKEN_ID")
    
            if(!tempUSDCAddress || !tempUSDCId) throw new Error("Temp USDC Address not found");
    
            const tx = await new AccountAllowanceApproveTransaction({ // !IMPORTANT: Means we need to factor in slippage costs
                tokenApprovals: [
                    new TokenAllowance({
                        tokenId: TokenId.fromString(tempUSDCId),
                        ownerAccountId: user.ACCOUNT_ID,
                        spenderAccountId: AccountId.fromString(contractId),
                        amount: Long.fromNumber(1000 * 10**6) // 1000 USDC
                    })
                ]
            })
            .freezeWith(client)
            .sign(user.PRIVATE_KEY)
    
            const submittedTx = await tx.execute(client)
            const receipt = await submittedTx.getReceipt(client)
    
            console.log(`Tx Hash: ${tx.transactionId} Status: ${receipt.status}`)
            console.log(`Contract ID: ${receipt.contractId}`)
    
            client.setOperator(admin.ACCOUNT_ID, admin.PRIVATE_KEY)
    
        })

    test.skip("Grant KYC to user", async () => {

            const tx = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(4_000_000)
            .setFunction("grantKYC",
                new ContractFunctionParameters()
                .addString("Safaricom")
                .addAddress(user.ADDRESS)
            )
            .freezeWith(client)
            .sign(admin.PRIVATE_KEY)

            const submittedTx = await tx.execute(client)
            const receipt = await submittedTx.getReceipt(client)

            console.log(`Tx Hash: ${tx.transactionId} Status: ${receipt.status}`)
            console.log(`Contract ID: ${receipt.contractId}`)

        })
    
    test.skip("Purchase 100 SAF", async () => { 
    
            client.setOperator(user.ACCOUNT_ID, user.PRIVATE_KEY)
    
            const tx = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(4_000_000)
            .setFunction("purchaseAsset",
                new ContractFunctionParameters()
                .addString("Safaricom")
                .addUint64(100)
            )
            .freezeWith(client)
            .sign(user.PRIVATE_KEY) 
    
            const submittedTx = await tx.execute(client)
            const receipt = await submittedTx.getReceipt(client)
    
            console.log(`Tx Hash: ${tx.transactionId} Status: ${receipt.status}`)
            console.log(`Contract ID: ${receipt.contractId}`)
            
            client.setOperator(admin.ACCOUNT_ID, admin.PRIVATE_KEY)
        })
    
    test.skip("Give contract allowance to spend 50 SAF", async () => {
    
            client.setOperator(user.ACCOUNT_ID, user.PRIVATE_KEY)
            const safToknenAddress = testStore.get("SAF_TOKEN_ADDRESS")
            if(!safToknenAddress) throw new Error("SAF Token Address not found");
    
            const tx = await new AccountAllowanceApproveTransaction({
                tokenApprovals: [
                    new TokenAllowance({
                        tokenId: TokenId.fromSolidityAddress(safToknenAddress),
                        ownerAccountId: user.ACCOUNT_ID,
                        spenderAccountId: AccountId.fromString(contractId),
                        amount: Long.fromNumber(50)
                    })
                ]
            })
            .freezeWith(client)
            .sign(user.PRIVATE_KEY)
    
            const submittedTx = await tx.execute(client)
            const receipt = await submittedTx.getReceipt(client)
    
            console.log(`Tx Hash: ${tx.transactionId} Status: ${receipt.status}`)
            console.log(`Contract ID: ${receipt.contractId}`)
    
            client.setOperator(admin.ACCOUNT_ID, admin.PRIVATE_KEY)
        })
    
    test.skip("Sell 50 SAF", async () => {
    
            client.setOperator(user.ACCOUNT_ID, user.PRIVATE_KEY)
    
            const tx = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(4_000_000)
            .setFunction("sellAsset",
                new ContractFunctionParameters()
                .addString("Safaricom")
                .addUint64(50)
            )
            .freezeWith(client)
            .sign(user.PRIVATE_KEY)
    
            const submittedTx = await tx.execute(client)
            const receipt = await submittedTx.getReceipt(client)
    
            console.log(`Tx Hash: ${tx.transactionId} Status: ${receipt.status}`)
            console.log(`Contract ID: ${receipt.contractId}`)
    
            client.setOperator(admin.ACCOUNT_ID, admin.PRIVATE_KEY)
        })
    
    test.skip("burn 50 SAF", async () => {
    
            const tx = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(4_000_000)
            .setFunction("burn", 
                new ContractFunctionParameters()
                .addString("Safaricom")
                .addUint64(50)
            )
            .freezeWith(client)
            .sign(admin.PRIVATE_KEY)
    
            const submittedTx = await tx.execute(client)
    
            const receipt = await submittedTx.getReceipt(client)
    
            console.log(`Tx Hash: ${tx.transactionId} Status: ${receipt.status}`)
    
        })


    

})
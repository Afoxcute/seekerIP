import { test, describe } from "node:test"
import { Client, ContractCallQuery, ContractExecuteTransaction, ContractFunctionParameters, Hbar, PrivateKey, TokenAssociateTransaction, TokenId } from "@hashgraph/sdk";
import { testStore } from "../../lib/test-store";
import { getClient, getEnv, getTestUser } from "../../utils";

const client = getClient()
const user = getTestUser()
const admin = getEnv()


describe("KES", async ()=>{

    test("Initialize KES tokens", async (t)=> {
    
        const contractId = testStore.get("KES")
            if(!contractId) throw new Error("Contract ID not found")
            
            const tx = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setFunction("initialize")
            .setPayableAmount(new Hbar(40))
            .setGas(3000000)
            .freezeWith(client)
            .sign(admin.PRIVATE_KEY)
            
            
    
            const submittedTx = await tx.execute(client);
    
            const receipt = await submittedTx.getReceipt(client);
    
            console.log(`Tx Hash: ${tx.transactionId}`); 
    
            const queryRes = await new ContractCallQuery({
                contractId: contractId,
                gas: 300000
            })
            .setFunction("getToken")
            .execute(client)
    
            const tokenAddress = queryRes.getAddress()
    
            console.log(`Token Address: ${tokenAddress}`);
    
            const tokenID = TokenId.fromSolidityAddress(tokenAddress)
    
            console.log(`Token ID: ${tokenID}`);
    
            testStore.set("KES_TOKEN_ID", tokenID.toString())
            testStore.set("KES_TOKEN_ADDRESS", tokenAddress)
    
    
    
    })
    
    
    test("Mint Temp USDC tokens", async ()=> {
        const contractId = testStore.get("KES")
        if(!contractId) throw new Error("Contract ID not found")
    
        const tx = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setFunction("mint", new ContractFunctionParameters().addUint64(1000 * 1000000))
        .setGas(3000000)
        .freezeWith(client)
        .sign(admin.PRIVATE_KEY)
        
        const submittedTx = await tx.execute(client);
    
        const receipt = await submittedTx.getReceipt(client);
    
        console.log(`Tx Hash: ${tx.transactionId}`);
        console.log(`Receipt: ${receipt}`);
        console.log(`Contract ID: ${receipt.contractId}`);
        console.log(`Token ID: ${receipt.tokenId}`);
        console.log(`File ID: ${receipt.fileId}`);
        console.log(`Status: ${receipt.status}`);
    
        console.log("Mint successful")
    })
    
    test("Associate and Grant KYC", async () => {
        
        const contractId = testStore.get("KES")
        const tokenId = testStore.get("KES_TOKEN_ID")
        const tokenAddress = testStore.get("KES_TOKEN_ADDRESS")
        console.log("Token Address", tokenId)
    
        if(!contractId || !tokenAddress || !tokenId) throw new Error("Contract ID not found")
    
        const tx = await new TokenAssociateTransaction({
            accountId: user.ACCOUNT_ID,
            tokenIds: [tokenId]
        })
        .freezeWith(client)
        .sign(user.PRIVATE_KEY)
        
    
        const submittedTx = await tx.execute(client);
    
        const receipt = await submittedTx.getReceipt(client);
    
        console.log(`Tx Hash: ${tx.transactionId} Status: ${receipt.status}`);

        
    })
    
    test("Airdrop a billion temp USDC to user", async ()=> {
        
        const contractId = testStore.get("KES")
        if(!contractId) throw new Error("Contract ID not found")
        
        client.setOperator(user.ACCOUNT_ID, user.PRIVATE_KEY)
    
        const tx = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setFunction("requestAirdrop", new ContractFunctionParameters().addUint64(10_000 * 1_000_000))
        .setGas(3000000)
        .freezeWith(client)
        .sign(user.PRIVATE_KEY)
        
        const submittedTx = await tx.execute(client);
    
        const receipt = await submittedTx.getReceipt(client);
    
        console.log(`Tx Hash: ${tx.transactionId}`);
        console.log(`Receipt: ${receipt}`);
        console.log(`Contract ID: ${receipt.contractId}`);
        console.log(`Token ID: ${receipt.tokenId}`);
        console.log(`File ID: ${receipt.fileId}`);
        console.log(`Status: ${receipt.status}`);
    
        console.log("Airdrop successful")
    
        client.setOperator(admin.ACCOUNT_ID, admin.PRIVATE_KEY)
    })
    
})

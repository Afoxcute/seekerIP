import { ContractCallQuery, ContractExecuteTransaction, ContractFunctionParameters, Status } from "@hashgraph/sdk"
import { describe, test } from "node:test"
import { testStore } from "../../lib/test-store"
import { getClient, getEnv, getTestUser } from "../../utils"
import assert from "node:assert"

const client = getClient()
const admin = getEnv()
const user = getTestUser()


describe("PriceOracle", async ()=>{
    const contractId = testStore.get("PriceOracle")
    const tempUSDCID = testStore.get("USDC_TOKEN_ID")
    const tempUSDCAddress = testStore.get("USDC_TOKEN_ADDRESS")


    if(!contractId) throw new Error("Contract ID not found")
    if(!tempUSDCID) throw new Error("Temp USDC ID not found")

    test("update prices of token", async ()=> {
        // using temp usdc as the token for testing

        if(!contractId) throw new Error("Contract ID not found")

        const updatePricingTx = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(3_000_000)
        .setFunction("updatePrice", new ContractFunctionParameters().addAddress(tempUSDCAddress).addUint64(100))
        .freezeWith(client)
        .sign(admin.PRIVATE_KEY)
        
        const submittedTx = await updatePricingTx.execute(client);

        const receipt = await submittedTx.getReceipt(client);

        console.log(`Tx Hash: ${updatePricingTx.transactionId}`);

        assert.strictEqual(receipt.status, Status.Success)
    })  

    test("get price of token", async ()=> {
        const getPriceTx = await new ContractCallQuery()
        .setContractId(contractId)
        .setGas(300_000)
        .setFunction("getPrice", new ContractFunctionParameters().addAddress(tempUSDCAddress))
        .execute(client)

        const price = getPriceTx.getInt64().toNumber()

        console.log(`Price: ${price}`)

        assert.strictEqual(price, 100)

    })

})
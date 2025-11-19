import "../../loadIntoEnv"
import { AccountId, ContractCallQuery, ContractExecuteTransaction, ContractFunctionParameters, Hbar } from "@hashgraph/sdk"
import { getClient, getEnv } from "../../utils"
import { testStore } from "../../lib/test-store"

const ISSUER_CONTRACT_ID = process.env.Issuer!
const LENDER_CONTRACT_ID = process.env.Lender!
const client = getClient()
const admin = getEnv()

export async function setupIssuerForToken(args: {
    TOKEN_NAME: string,
    TOKEN_SYMBOL: string
}){
    const { TOKEN_NAME, TOKEN_SYMBOL } = args
    try {
        const tx = await new ContractExecuteTransaction()
                    .setContractId(ISSUER_CONTRACT_ID)
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
                    .setContractId(ISSUER_CONTRACT_ID)
                    .setGas(300_000)
                    .setFunction("getTokenAddress",
                        new ContractFunctionParameters()
                            .addString(TOKEN_NAME)
                    )
                    .execute(client)
            
                    const tokenAddress = tokenAddressQuery.getAddress()
            
                    console.log(`Token Address: ${tokenAddress}`)
            
                testStore.set(`TOKEN_ADDRESS_${TOKEN_NAME}`, tokenAddress.toString())

                const mtx = await new ContractExecuteTransaction()
                .setContractId(ISSUER_CONTRACT_ID)
                .setGas(4_000_000)
                .setFunction("mint",
                    new ContractFunctionParameters()
                        .addString(TOKEN_NAME)
                    .addUint64(1_000_000_000_000)
                )
                .freezeWith(client)
                .sign(admin.PRIVATE_KEY)
                    
                const msubmittedTx = await mtx.execute(client)
                const mreceipt = await msubmittedTx.getReceipt(client)
                    
                console.log(`Tx Hash: ${mtx.transactionId} Status: ${mreceipt.status}`)
                console.log(`Contract ID: ${mreceipt.contractId}`)


        try {
            await setupLenderPools({
                TOKEN_ADDRESS: tokenAddress,
                LTOKEN_NAME: `LEND ${TOKEN_NAME}`,
                LTOKEN_SYMBOL: `l${TOKEN_SYMBOL}`,
                TOKEN_NAME
            })
        }
        catch (e)
        {
            console.log("Something went wrong while setting up lender", e)
        }
    } catch (e)
    {
        console.log("Something went wrong", e)
    }
}

export async function setupLenderPools(args: {
    TOKEN_ADDRESS: string
    LTOKEN_NAME: string
    LTOKEN_SYMBOL: string,
    TOKEN_NAME: string
}){
    const { TOKEN_ADDRESS, LTOKEN_NAME, LTOKEN_SYMBOL, TOKEN_NAME } = args
    const tx = await new ContractExecuteTransaction()
    .setContractId(LENDER_CONTRACT_ID)
    .setFunction("addLenderPool",
        new ContractFunctionParameters()
            .addAddress(TOKEN_ADDRESS)
            .addString(LTOKEN_NAME)
            .addString(LTOKEN_SYMBOL)
    )
    .setGas(3000000)
    .setPayableAmount(new Hbar(20))
    .freezeWith(client)
    .sign(admin.PRIVATE_KEY)
    
    const submittedTx = await tx.execute(client)
    const receipt = await submittedTx.getReceipt(client)
    
    console.log(`Tx Hash: ${tx.transactionId}`)
    console.log(`Receipt: ${receipt.status}`)


    const queryRes = await new ContractCallQuery({
        contractId: LENDER_CONTRACT_ID,
        gas: 300000,
        senderAccountId: admin.ACCOUNT_ID
    })
        .setFunction("getLpTokenAddress", new ContractFunctionParameters().addAddress(TOKEN_ADDRESS))
        .execute(client)
    
    const lpTokenAddress = queryRes.getAddress()
    
    console.log(`LP Token Address: ${lpTokenAddress}`)
    testStore.set(`LP_TOKEN_ADDRESS_${LTOKEN_NAME}`, lpTokenAddress)
    
    const reserveQuery = await new ContractCallQuery({
        contractId: LENDER_CONTRACT_ID,
        gas: 300000,
        senderAccountId: admin.ACCOUNT_ID
    })
    .setFunction("getReserveAddress", new ContractFunctionParameters().addAddress(TOKEN_ADDRESS))
    .execute(client)
    
    const reserveAddress = reserveQuery.getAddress()
    
    console.log(`Reserve Address: ${reserveAddress}`)
    
    testStore.set(`RESERVE_ADDRESS_${LTOKEN_NAME}`, reserveAddress)


    const reserveId = AccountId.fromString(reserveAddress)
    
    const gtx = await new ContractExecuteTransaction()
    .setContractId(process.env.Issuer_TESTNET!)
    .setFunction("grantKYC",
        new ContractFunctionParameters()
            .addString(TOKEN_NAME)
            .addAddress(reserveId.toSolidityAddress())
    )
    .setGas(3000000)
    .freezeWith(client)
    .sign(admin.PRIVATE_KEY)
    
    const gsubmittedTx = await gtx.execute(client)
    
    const greceipt = await gsubmittedTx.getReceipt(client)
    
    console.log(`Tx Hash: ${gtx.transactionId}`)
    console.log(`Receipt: ${greceipt.status}`)
}

export async function grantKYCToReserve(args: {
    TOKEN_NAME: string
}){
    const { TOKEN_NAME } = args

    const LTOKEN_NAME = `LEND ${TOKEN_NAME}`
    const RESERVE_ADDRESS = testStore.get(`RESERVE_ADDRESS_${LTOKEN_NAME}`)

    const gtx = await new ContractExecuteTransaction()
    .setContractId(process.env.Issuer_TESTNET!)
    .setFunction("grantKYC",
        new ContractFunctionParameters()
            .addString(TOKEN_NAME)
            .addAddress(RESERVE_ADDRESS)
    )
    .setGas(3000000)
    .freezeWith(client)
    .sign(admin.PRIVATE_KEY)
    
    const gsubmittedTx = await gtx.execute(client)
    
    const greceipt = await gsubmittedTx.getReceipt(client)
    
    console.log(`Tx Hash: ${gtx.transactionId}`)
    console.log(`Receipt: ${greceipt.status}`)

}


export const assets = [
    {
      id: "scom",
      name: "Safaricom",
      symbol: "SCOM",
      tokenizedSymbol: "hhSCOM"
    },
    {
      id: "eqty",
      name: "Equity Group Holdings",
      symbol: "EQTY",
      tokenizedSymbol: "hhEQTY"
    },
    {
      id: "kq",
      name: "Kenya Airways",
      symbol: "KQ",
      tokenizedSymbol: "hhKQ"
    },
    {
      id: "kcb",
      name: "KCB Group",
      symbol: "KCB",
      tokenizedSymbol: "hhKCB"
    },
    {
      id: "absa",
      name: "ABSA Bank Kenya",
      symbol: "ABSA",
      tokenizedSymbol: "hhABSA"
    },
    {
      id: "eabl",
      name: "East African Breweries",
      symbol: "EABL",
      tokenizedSymbol: "hhEABL"
    },
    {
        id: "coop",
        name: "Co-operative Bank",
        symbol: "COOP",
        tokenizedSymbol: "hhCOOP"
    },
    {
        id: "bamb",
        name: "Bamburi Cement",
        symbol: "BAMB",
        tokenizedSymbol: "hhBAMB"
    },
  ];

async function main () {

    for (const asset of assets) {
        try {
            await setupIssuerForToken({
                TOKEN_NAME: asset.name,
                TOKEN_SYMBOL: asset.tokenizedSymbol
            })
        }
        catch (e)
        {
            console.log(`Unable to setup ::`, asset, e)
        }
    }

}

async function kycs(){
    
    for (const asset of assets) {
        await grantKYCToReserve({
            TOKEN_NAME: asset.name
        })
    }
}

await main()
// await kycs()
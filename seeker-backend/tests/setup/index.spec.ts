import { describe, test} from "node:test"
import { testStore } from "../../lib/test-store"
import { ContractExecuteTransaction, ContractFunctionParameters, ContractId } from "@hashgraph/sdk"
import { getClient, getEnv, getTestUser } from "../../utils"

const client = getClient()
const user = getTestUser()
const admin = getEnv()

describe("Setup Lender and Issuer", async()=>{
    const ISSUER_CONTRACT_ID = testStore.get("Issuer")
    const LENDER_CONTRACT_ID = testStore.get("Lender")

    if (!ISSUER_CONTRACT_ID || !LENDER_CONTRACT_ID) throw new Error("Contracts not deployed");

    const issuerContract = ContractId.fromString(ISSUER_CONTRACT_ID)
    const lenderContract = ContractId.fromString(LENDER_CONTRACT_ID)


})
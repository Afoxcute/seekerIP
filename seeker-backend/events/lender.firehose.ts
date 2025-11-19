import "../loadIntoEnv"
import { testStore } from "../lib/test-store"
import lenderContract from "../abi/Lender.json"
import { lenderFireStore } from "../lib/stores"
import { eventReader } from "./utils"

const LIMIT = 10
const LENDER_CONTRACT_ID = process.env.Lender!
console.log("STARTED LENDER FIREHOSE")
console.log("Lender contract", LENDER_CONTRACT_ID)

await eventReader({
    store: lenderFireStore,
    abi: lenderContract.abi,
    contract_id: LENDER_CONTRACT_ID,
    limit: LIMIT
})
console.log("ENDED LENDER FIREHOSE")

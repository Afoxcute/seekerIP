import { Client, ContractCreateFlow, ContractCreateTransaction, Hbar, PrivateKey } from "@hashgraph/sdk";
import { getClient, getShared, updateShared } from "./utils";
import fs from "node:fs"
import { testStore } from "./lib/test-store";


async function deploy(contractName: string, byteCode: string) {
    const client = getClient()
    console.log(`Deploying contract: ${contractName}`)
    const contractDeployTx = await new ContractCreateFlow()
    .setBytecode(byteCode)
    .setGas(2_000_000)
    .execute(client)

    const contractReceipt = await contractDeployTx.getReceipt(client)

    console.log(`Contract ID: ${contractReceipt.contractId}`)
    testStore.set(contractName, contractReceipt.contractId?.toString() ?? "")
}

async function main() {

    // get first argument
    const args = process.argv.slice(2)
    if (args.length < 1) {
        console.error("Missing argument: contract name")
        process.exit(1)
    }

    const contractName = args[0]

    // get contract abi at ./abi/contractName.json
    const abiStr = fs.readFileSync(`./abi/${contractName}.json`, 'utf-8')
    const abi = JSON.parse(abiStr) as {abi: any, bin: string}

    await deploy(contractName, abi.bin)

}


main()

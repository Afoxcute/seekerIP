import "dotenv/config"
import { testStore } from "./lib/test-store";
const NETWORK = process.env.NETWORK ?? "localnet";

function getEnv(variableName: string, network?: string) {
    const value = network == "testnet" ? process.env[`${variableName}_TESTNET`] : process.env[variableName];
    if (!value) {
        return testStore.get(variableName);
    }
    return value;
}

process.env.Issuer = getEnv("Issuer", NETWORK);
process.env.PriceOracle = getEnv("PriceOracle", NETWORK);
process.env.Lender = getEnv("Lender", NETWORK)
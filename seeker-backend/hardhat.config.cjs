require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.29",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
    // Add Hedera testnet configuration
    hedera_testnet: {
      url: process.env.HEDERA_TESTNET_URL || "https://testnet.hashio.io/api",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 296,
      gas: "auto",
      gasPrice: "auto",
      timeout: 60000,
      httpHeaders: {
        "Content-Type": "application/json",
      },
    },
    // Add Hedera mainnet configuration
    hedera_mainnet: {
      url: process.env.HEDERA_MAINNET_URL || "https://mainnet.hashio.io/api",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 295,
    },
  },
  etherscan: {
    apiKey: {
      hedera_testnet: process.env.HEDERA_API_KEY || "",
      hedera_mainnet: process.env.HEDERA_API_KEY || "",
    },
    customChains: [
      {
        network: "hedera_testnet",
        chainId: 296,
        urls: {
          apiURL: "https://testnet.hashio.io/api",
          browserURL: "https://hashscan.io/testnet",
        },
      },
      {
        network: "hedera_mainnet",
        chainId: 295,
        urls: {
          apiURL: "https://mainnet.hashio.io/api",
          browserURL: "https://hashscan.io",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./hardhat-config/test",
    cache: "./hardhat-config/cache",
    artifacts: "./hardhat-config/artifacts",
  },
  mocha: {
    timeout: 40000,
  },
}; 
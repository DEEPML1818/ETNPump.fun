require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      evmVersion: "london", // Set EVM version to London
      viaIR: true, // Enable IR-based optimization
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    etn: {
      url: "https://rpc.ankr.com/electroneum", // Replace with actual ETN RPC URL
      accounts: [process.env.PRIVATE_KEY, process.env.PRIVATE_KEY_USER1, process.env.PRIVATE_KEY_USER2], // Store private key in .env
    },
    "etn-testnet": {
      url: "https://rpc.ankr.com/electroneum_testnet", // Replace with actual ETN RPC URL
      accounts: [process.env.PRIVATE_KEY, process.env.PRIVATE_KEY_USER1, process.env.PRIVATE_KEY_USER2], // Store private key in .env
    },
  },
  etherscan: {
    apiKey: process.env.ETNSCAN_API_KEY, // For contract verification
    customChains: [
      {
        network: "etn",
        chainId: 52014, // Replace with the correct ETN chain ID
        urls: {
          apiURL: "https://blockexplorer.electroneum.com/api",
          browserURL: "https://blockexplorer.electroneum.com",
        },
      },
    ],
  },
};

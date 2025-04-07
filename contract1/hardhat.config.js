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
    // Local network configuration for local testing.
    localhost: {
      url: "http://127.0.0.1:8545",
      // Optional: Specify accounts if needed. Otherwise, Hardhat will auto-generate a list.
      // accounts: process.env.LOCAL_PRIVATE_KEYS ? process.env.LOCAL_PRIVATE_KEYS.split(",") : undefined,
    },
    etn: {
      url: "https://rpc.ankr.com/electroneum", // Replace with actual ETN RPC URL
      accounts: [
        process.env.PRIVATE_KEY,
        process.env.PRIVATE_KEY_USER1,
        process.env.PRIVATE_KEY_USER2,
      ],
    },
    "etn-testnet": {
      url: "https://rpc.ankr.com/electroneum_testnet", // Replace with actual ETN RPC URL
      accounts: [
        process.env.PRIVATE_KEY,
        process.env.PRIVATE_KEY_USER1,
        process.env.PRIVATE_KEY_USER2,
      ],
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
// You can add custom tasks or scripts here if needed
// For example, you can create a task to deploy contracts or interact with them
// task("deploy", "Deploys the contract").setAction(async (taskArgs, hre) => {
//   const [deployer] = await hre.ethers.getSigners();
//   console.log("Deploying contracts with the account:", deployer.address);
//   const ContractFactory = await hre.ethers.getContractFactory("YourContract"); // Replace with your contract name
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    // ... other networks ...
    ftmTestnet: {
      url: "https://rpc.testnet.fantom.network",
      chainId: 4002,
      accounts: [PRIVATE_KEY],
      gasPrice: 3000000000, // 3 gwei
      gas: 8000000, // gas limit
      timeout: 60000, // 60 seconds
    },
  },
};

// paths: {
//   sources: "./contracts",
//   tests: "./test",
//   cache: "./cache",
//   artifacts: "./artifacts",
//   imports: "./node_modules",
// },

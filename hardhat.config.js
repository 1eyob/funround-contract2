require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PRIVATE_KEY_2 = process.env.PRIVATE_KEY_2 || PRIVATE_KEY;
const PRIVATE_KEY_3 = process.env.PRIVATE_KEY_3 || PRIVATE_KEY;


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    ftmTestnet: {
      url: "https://rpc.testnet.fantom.network",
      chainId: 4002,
      accounts: [PRIVATE_KEY, PRIVATE_KEY_2, PRIVATE_KEY_3],
      gasPrice: 3000000000, // 3 gwei
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

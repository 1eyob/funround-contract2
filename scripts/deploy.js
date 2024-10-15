const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "FTM");

  const FunRound = await hre.ethers.getContractFactory("FunRound");
  const funRound = await FunRound.deploy();

  await funRound.waitForDeployment();
  const deployedAddress = await funRound.getAddress();
  console.log("FunRound deployed to:", deployedAddress);

  fs.writeFileSync('deployed-address.txt', deployedAddress);
  console.log("Address saved to deployed-address.txt");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

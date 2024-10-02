const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "FTM");

  const FunRound = await hre.ethers.getContractFactory("FunRound");
  const funRound = await FunRound.deploy(); // Deploy the contract

  await funRound.waitForDeployment();
  console.log("FunRound deployed to:", await funRound.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

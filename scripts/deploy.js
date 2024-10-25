const hre = require("hardhat");
const fs = require("fs");
const { ethers } = require("ethers");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "FTM");

  // Deploy MockUSDT
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const initialSupply = ethers.parseUnits("1000000", 6); // 1 million USDT
  const mockUSDT = await MockUSDT.deploy(initialSupply);
  await mockUSDT.waitForDeployment();
  const mockUSDTAddress = await mockUSDT.getAddress();
  console.log("MockUSDT deployed to:", mockUSDTAddress);

  // Deploy FunRound with MockUSDT address
  const FunRound = await hre.ethers.getContractFactory("FunRound");
  const funRound = await FunRound.deploy(mockUSDTAddress);
  await funRound.waitForDeployment();
  const funRoundAddress = await funRound.getAddress();
  console.log("FunRound deployed to:", funRoundAddress);

  // Save addresses
  const addresses = {
    mockUSDT: mockUSDTAddress,
    funRound: funRoundAddress,
  };
  fs.writeFileSync(
    "deployed-addresses.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("Addresses saved to deployed-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

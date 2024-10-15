const hre = require("hardhat");
const fs = require('fs');

async function main() {
  // Read the deployed contract address
  const deployedAddress = fs.readFileSync('deployed-address.txt', 'utf-8').trim();
  console.log("Deployed contract address:", deployedAddress);

  // Get the contract factory and attach it to the deployed address
  const FunRound = await hre.ethers.getContractFactory("FunRound");
  const funRound = FunRound.attach(deployedAddress);

  // Get a signer (your account)
  const [signer1, signer2, signer3] = await hre.ethers.getSigners();

  console.log("\nJoining games:");
  const gameId1 = await joinGame(funRound, signer1);
  const gameId2 = await joinGame(funRound, signer2);
  const gameId3 = await joinGame(funRound, signer3);

  console.log("\nChecking game states:");
  await checkGameState(funRound, gameId1);
  await checkGameState(funRound, gameId2);
  await checkGameState(funRound, gameId3);
}

async function joinGame(contract, signer) {
  const depositAmount = hre.ethers.parseEther("0.02");
  const tx = await contract.connect(signer).joinGame({ value: depositAmount });
  const receipt = await tx.wait();
  const gameId = receipt.events.find(e => e.event === 'Deposit').args.gameId;
  console.log(`${signer.address} joined game ${gameId}`);
  return gameId;
}

async function checkGameState(contract, gameId) {
  const players = await contract.getGamePlayers(gameId);
  const isActive = await contract.isGameInProgress(gameId);
  console.log(`Game ${gameId}:`);
  console.log("  Players:", players);
  console.log("  Is active:", isActive);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

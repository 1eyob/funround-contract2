const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const deployedAddress = fs.readFileSync('deployed-address.txt', 'utf-8').trim();
  console.log("Deployed contract address:", deployedAddress);

  const FunRound = await hre.ethers.getContractFactory("FunRound");
  const funRound = FunRound.attach(deployedAddress);


  const signers = await hre.ethers.getSigners();
  const owner = signers[0];
  console.log("Contract owner:", await funRound.owner());
  console.log("Script owner address:", owner.address);

  if (signers.length < 3) {
    console.log("Not enough signers available. Using the same signer for all operations.");
    const player1 = owner;
    const player2 = owner;
    await runGameSimulation(funRound, owner, player1, player2);
  } else {
    const player1 = signers[1];
    const player2 = signers[2];
    console.log("Player 1 address:", player1.address);
    console.log("Player 2 address:", player2.address);
    await runGameSimulation(funRound, owner, player1, player2);
  }

  console.log("\nChecking contract state:");
  await checkContractState(funRound);
}

async function runGameSimulation(funRound, owner, player1, player2) {
  // Check balances
  console.log("\nChecking balances:");
  await checkBalance(owner, "Owner");
  await checkBalance(player1, "Player 1");
  await checkBalance(player2, "Player 2");

  console.log("\nCreating a new game:");
  try {
    const gameId = await createGame(funRound, player1, player2);
    console.log(`Game created with ID: ${gameId}`);

    console.log("\nGame state after creation:");
    await checkGameState(funRound, gameId);

    console.log("\nSubmitting game result...");
    await submitResult(funRound, gameId, player1, player1.address);
    
    console.log("\nChecking game state after first submission:");
    await checkGameState(funRound, gameId);

    await submitResult(funRound, gameId, player2, player2.address);

    console.log("\nFinal game state:");
    await checkGameState(funRound, gameId);
  } catch (error) {
    console.error("Error during game creation or play:", error.message);
  }

  console.log("\nContract balance:");
  await getContractBalance(funRound);
}

async function checkBalance(signer, label) {
  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log(`${label} balance:`, hre.ethers.formatEther(balance), "ETH");
}

async function createGame(contract, player1, player2) {
  const depositAmount = hre.ethers.parseEther("0.02");
  console.log(`Attempting to join game with ${hre.ethers.formatEther(depositAmount)} ETH`);
  
  try {
    const tx1 = await contract.connect(player1).joinGame({ value: depositAmount });
    console.log("Transaction 1 sent, waiting for confirmation...");
    const receipt1 = await tx1.wait();
    console.log("Transaction 1 confirmed");
    
    let gameId;
    if (receipt1.events) {
      const depositEvent = receipt1.events.find(e => e.event === 'Deposit');
      if (depositEvent) {
        gameId = depositEvent.args.gameId;
      }
    }
    
    if (gameId === undefined) {
      console.log("Couldn't find gameId in events, fetching from contract...");
      const nextGameId = await contract.nextGameId();
      gameId = nextGameId > 0n ? nextGameId - 1n : 0n;
    }
    
    console.log(`Player 1 (${player1.address}) joined game ${gameId.toString()}`);

    const tx2 = await contract.connect(player2).joinGame({ value: depositAmount });
    console.log("Transaction 2 sent, waiting for confirmation...");
    await tx2.wait();
    console.log(`Player 2 (${player2.address}) joined game ${gameId.toString()}`);

    return gameId;
  } catch (error) {
    console.error("Error in createGame:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    throw error;
  }
}

async function checkGameState(contract, gameId) {
  try {
    const [isActive, players, hasPlayed] = await contract.getGameState(gameId);
    console.log(`Game ${gameId.toString()}:`);
    console.log("  Is active:", isActive);
    console.log("  Players:", players);
    console.log("  Has played:", hasPlayed);
  } catch (error) {
    console.error(`Error checking game state for game ${gameId.toString()}:`, error.message);
  }
}

async function submitResult(contract, gameId, signer, winnerAddress) {
  try {
    console.log(`Submitting result for game ${gameId.toString()} by ${signer.address}`);
    const tx = await contract.connect(signer).submitGameResult(gameId, winnerAddress);
    console.log("Transaction sent, waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("Transaction confirmed");
    
    if (receipt.events) {
      for (const event of receipt.events) {
        if (event.event === 'ResultSubmitted') {
          console.log(`Result submitted. Proposed winner: ${event.args.proposedWinner}`);
        } else if (event.event === 'ResultAlreadySubmitted') {
          console.log(`Result already submitted by ${event.args.player}`);
        } else if (event.event === 'GameEnded') {
          console.log(`Game ended. Winner: ${event.args.winner}`);
        }
      }
    } else {
      console.log("No events found in the transaction receipt");
    }
  } catch (error) {
    console.error(`Error submitting result for game ${gameId.toString()}:`, error.message);
    if (error.data) {
      try {
        const decodedError = contract.interface.parseError(error.data);
        if (decodedError) {
          console.error("Decoded error:", decodedError.name, decodedError.args);
        }
      } catch (parseError) {
        console.error("Failed to parse error data:", error.data);
      }
    }
  }
}

async function getContractBalance(contract) {
  try {
    const balance = await contract.getContractBalance();
    console.log("Contract balance:", hre.ethers.formatEther(balance), "ETH");
  } catch (error) {
    console.error("Failed to get contract balance:", error.message);
  }
}

async function checkContractState(contract) {
  const owner = await contract.owner();
  const nextGameId = await contract.nextGameId();
  console.log("Contract owner:", owner);
  console.log("Next game ID:", nextGameId.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });

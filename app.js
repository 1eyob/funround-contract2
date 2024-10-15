app.get('/players', async (req, res) => {
  try {
    const players = await contract.getPlayers();
    // Filter out empty addresses
    const activePlayers = players.filter(player => player !== '0x0000000000000000000000000000000000000000');
    res.json({ players: activePlayers });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players', details: error.message });
  }
});

app.post('/api/v1/game/submit-game-result', async (req, res) => {
  try {
    const { winnerAddress } = req.body;
    
    // Assuming you have middleware to verify the player's address
    const playerAddress = req.playerAddress;

    const tx = await contract.submitGameResult(winnerAddress);
    const receipt = await tx.wait();

    const event = receipt.events.find(e => e.event === 'GameResultSubmitted');
    
    res.json({
      error: false,
      message: "Game result submitted successfully",
      data: {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        contractAddress: contract.address,
        event: {
          submitter: event.args.submitter,
          winner: event.args.winner
        }
      }
    });
  } catch (error) {
    console.error('Error submitting game result:', error);
    res.status(500).json({ error: true, message: 'Failed to submit game result', details: error.message });
  }
});
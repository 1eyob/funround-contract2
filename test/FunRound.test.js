const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FunRound Contract", function () {
  let FunRound;
  let funRound;
  let MockUSDT;
  let mockUSDT;
  let owner;
  let player1;
  let player2;
  const initialSupply = ethers.parseUnits("10000", 6);

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    MockUSDT = await ethers.getContractFactory("MockUSDT");
    mockUSDT = await MockUSDT.deploy(initialSupply);

    FunRound = await ethers.getContractFactory("FunRound");
    funRound = await FunRound.deploy(await mockUSDT.getAddress());

    // Distribute some USDT to player1 and player2
    await mockUSDT.mint(player1.address, ethers.parseUnits("1000", 6)); // 1,000 USDT
    await mockUSDT.mint(player2.address, ethers.parseUnits("1000", 6)); // 1,000 USDT
  });

  describe("USDT Deposits", function () {
    it("should deposit USDT and collect fees", async function () {
      const depositAmount = ethers.parseUnits("100", 6); // 100 USDT
      const feePercent = 10n;
      const feeAmount = (depositAmount * feePercent) / 100n;
      const depositAfterFee = depositAmount - feeAmount;

      // Approve and deposit USDT
      await mockUSDT
        .connect(player1)
        .approve(await funRound.getAddress(), depositAmount);
      await expect(funRound.connect(player1).depositUSDT(depositAmount))
        .to.emit(funRound, "USDTDeposited")
        .withArgs(player1.address, depositAfterFee)
        .and.to.emit(funRound, "FeeCollected")
        .withArgs(feeAmount)
        .and.to.emit(funRound, "DepositSuccessful")
        .withArgs(player1.address, depositAfterFee, depositAfterFee);

      // Verify player's balance in the contract
      const playerBalance = await funRound.getPlayerUSDTBalance(
        player1.address
      );
      expect(playerBalance).to.equal(depositAfterFee);

      // Verify contract balance (only fees should remain)
      const contractBalance = await mockUSDT.balanceOf(
        await funRound.getAddress()
      );
      expect(contractBalance).to.equal(depositAmount);
    });

    it("should fail if deposit amount is 0", async function () {
      await expect(funRound.connect(player1).depositUSDT(0)).to.be.revertedWith(
        "Deposit amount must be greater than 0"
      );
    });

    it("should fail if USDT transfer fails", async function () {
      const depositAmount = ethers.parseUnits("100", 6); // 100 USDT
      await expect(
        funRound.connect(player2).depositUSDT(depositAmount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("should handle multiple deposits correctly", async function () {
      const depositAmount1 = ethers.parseUnits("50", 6);
      const depositAmount2 = ethers.parseUnits("75", 6);

      await mockUSDT
        .connect(player1)
        .approve(await funRound.getAddress(), depositAmount1 + depositAmount2);

      await funRound.connect(player1).depositUSDT(depositAmount1);
      await funRound.connect(player1).depositUSDT(depositAmount2);

      const expectedBalance = ((depositAmount1 + depositAmount2) * 90n) / 100n;
      const actualBalance = await funRound.getPlayerUSDTBalance(
        player1.address
      );

      expect(actualBalance).to.equal(expectedBalance);
    });
  });

  describe("Betting", function () {
    it("should allow players to bet and create a game", async function () {
      const depositAmount = ethers.parseUnits("100", 6);
      const betAmount = ethers.parseUnits("10", 6);

      // Deposit USDT for both players
      await mockUSDT
        .connect(player1)
        .approve(await funRound.getAddress(), depositAmount);
      await funRound.connect(player1).depositUSDT(depositAmount);
      await mockUSDT
        .connect(player2)
        .approve(await funRound.getAddress(), depositAmount);
      await funRound.connect(player2).depositUSDT(depositAmount);

      // Place bets
      await expect(funRound.connect(player1).betUSDT(betAmount))
        .to.emit(funRound, "USDTBet")
        .withArgs(0, player1.address, betAmount);

      await expect(funRound.connect(player2).betUSDT(betAmount))
        .to.emit(funRound, "USDTBet")
        .withArgs(0, player2.address, betAmount)
        .and.to.emit(funRound, "GameStarted")
        .withArgs(0, player1.address, player2.address);

      // Check game state
      const gameState = await funRound.getGameState(0);
      expect(gameState.isActive).to.be.true;
      expect(gameState.players).to.deep.equal([
        player1.address,
        player2.address,
      ]);
      expect(gameState.hasPlayed).to.deep.equal([false, false]);
    });

    it("should fail if bet amount is invalid", async function () {
      const depositAmount = ethers.parseUnits("100", 6);
      const invalidBetAmount = ethers.parseUnits("3", 6); // Not 1, 2, 5, or 10 USDT

      await mockUSDT
        .connect(player1)
        .approve(await funRound.getAddress(), depositAmount);
      await funRound.connect(player1).depositUSDT(depositAmount);

      await expect(
        funRound.connect(player1).betUSDT(invalidBetAmount)
      ).to.be.revertedWith("Invalid bet amount");
    });
  });

  describe("Game Results", function () {
    it("should allow players to submit results and finalize the game", async function () {
      // Setup game
      const depositAmount = ethers.parseUnits("100", 6);
      const betAmount = ethers.parseUnits("10", 6);

      await mockUSDT
        .connect(player1)
        .approve(await funRound.getAddress(), depositAmount);
      await funRound.connect(player1).depositUSDT(depositAmount);
      await mockUSDT
        .connect(player2)
        .approve(await funRound.getAddress(), depositAmount);
      await funRound.connect(player2).depositUSDT(depositAmount);

      await funRound.connect(player1).betUSDT(betAmount);
      await funRound.connect(player2).betUSDT(betAmount);

      // Submit results
      await expect(
        funRound.connect(player1).submitGameResult(0, player1.address)
      )
        .to.emit(funRound, "ResultSubmitted")
        .withArgs(0, player1.address, player1.address);

      await expect(
        funRound.connect(player2).submitGameResult(0, player1.address)
      )
        .to.emit(funRound, "ResultSubmitted")
        .withArgs(0, player2.address, player1.address)
        .and.to.emit(funRound, "WinningsPaid")
        .and.to.emit(funRound, "GameEnded");

      // Check game state after finalization
      const gameState = await funRound.getGameState(0);
      expect(gameState.isActive).to.be.false;
    });

    it("should prevent non-players from submitting results", async function () {
      // Setup game
      const depositAmount = ethers.parseUnits("100", 6);
      const betAmount = ethers.parseUnits("10", 6);

      await mockUSDT
        .connect(player1)
        .approve(await funRound.getAddress(), depositAmount);
      await funRound.connect(player1).depositUSDT(depositAmount);
      await mockUSDT
        .connect(player2)
        .approve(await funRound.getAddress(), depositAmount);
      await funRound.connect(player2).depositUSDT(depositAmount);

      await funRound.connect(player1).betUSDT(betAmount);
      await funRound.connect(player2).betUSDT(betAmount);

      // Attempt to submit result as non-player
      await expect(
        funRound.connect(owner).submitGameResult(0, player1.address)
      ).to.be.revertedWith("Only players can submit result");
    });
  });

  // ... Add more test cases for other functions ...
});

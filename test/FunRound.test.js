const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FunRound", function () {
  let FunRound, funRound, owner, addr1, addr2;

  beforeEach(async function () {
    FunRound = await ethers.getContractFactory("FunRound");
    [owner, addr1, addr2] = await ethers.getSigners();
    funRound = await FunRound.deploy();
    await funRound.waitForDeployment();
  });

  it("Should set the right owner", async function () {
    expect(await funRound.owner()).to.equal(owner.address);
  });

  it("Should allow players to deposit", async function () {
    const depositAmount = ethers.parseEther("0.02");
    await funRound.connect(addr1).deposit({ value: depositAmount });
    const expectedBalance = (BigInt(depositAmount) * BigInt(90)) / BigInt(100);
    expect(await funRound.getPlayerBalance(addr1.address)).to.equal(expectedBalance);
  });

  it("Should allow players to join a game after depositing", async function () {
    const depositAmount = ethers.parseEther("0.02");
    await funRound.connect(addr1).deposit({ value: depositAmount });
    await funRound.connect(addr1).joinGame();
    const gameId = await funRound.nextGameId() - 1n;
    const [isActive, players, ] = await funRound.getGameState(gameId);
    expect(isActive).to.be.false;
    expect(players[0]).to.equal(addr1.address);
  });

  it("Should start a game when two players join", async function () {
    const depositAmount = ethers.parseEther("0.02");
    await funRound.connect(addr1).deposit({ value: depositAmount });
    await funRound.connect(addr2).deposit({ value: depositAmount });
    await funRound.connect(addr1).joinGame();
    await funRound.connect(addr2).joinGame();
    const gameId = await funRound.nextGameId() - 1n;
    const [isActive, players, ] = await funRound.getGameState(gameId);
    expect(isActive).to.be.true;
    expect(players).to.deep.equal([addr1.address, addr2.address]);
  });

  it("should not allow joining a game without sufficient balance", async function () {
    await expect(funRound.connect(addr1).joinGame()).to.be.revertedWith("Insufficient balance");
  });

  it("should accept direct deposits", async function () {
    const initialBalance = await funRound.getContractBalance();
    
    // Send 1 ether directly to the contract
    const tx = await addr1.sendTransaction({
      to: await funRound.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    const newBalance = await funRound.getContractBalance();
    expect(newBalance).to.equal(initialBalance + ethers.parseEther("1.0"));
  });

  it("Should allow submitting game results", async function () {
    const depositAmount = ethers.parseEther("0.02");
    await funRound.connect(addr1).deposit({ value: depositAmount });
    await funRound.connect(addr2).deposit({ value: depositAmount });
    await funRound.connect(addr1).joinGame();
    await funRound.connect(addr2).joinGame();
    const gameId = await funRound.nextGameId() - 1n;

    await funRound.connect(addr1).submitGameResult(gameId, addr1.address);
    await funRound.connect(addr2).submitGameResult(gameId, addr1.address);

    const [isActive, , ] = await funRound.getGameState(gameId);
    expect(isActive).to.be.false;
  });

  it("Should not allow non-players to submit game results", async function () {
    const depositAmount = ethers.parseEther("0.02");
    await funRound.connect(addr1).deposit({ value: depositAmount });
    await funRound.connect(addr2).deposit({ value: depositAmount });
    await funRound.connect(addr1).joinGame();
    await funRound.connect(addr2).joinGame();
    const gameId = await funRound.nextGameId() - 1n;

    await expect(funRound.connect(owner).submitGameResult(gameId, addr1.address))
      .to.be.revertedWith("Only players can submit result");
  });

  it("Should allow owner to withdraw fees", async function () {
    const depositAmount = ethers.parseEther("0.02");
    await funRound.connect(addr1).deposit({ value: depositAmount });
    
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
    await funRound.connect(owner).withdrawFees();
    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);

    expect(finalOwnerBalance).to.be.gt(initialOwnerBalance);
  });

  it("Should not allow non-owners to withdraw fees", async function () {
    await expect(funRound.connect(addr1).withdrawFees())
      .to.be.revertedWith("Only owner can call this function");
  });

  it("Should allow owner to reset a game", async function () {
    const depositAmount = ethers.parseEther("0.02");
    await funRound.connect(addr1).deposit({ value: depositAmount });
    await funRound.connect(addr2).deposit({ value: depositAmount });
    await funRound.connect(addr1).joinGame();
    await funRound.connect(addr2).joinGame();
    const gameId = await funRound.nextGameId() - 1n;

    await funRound.connect(owner).resetGame(gameId);

    const [isActive, players, ] = await funRound.getGameState(gameId);
    expect(isActive).to.be.false;
    expect(players[0]).to.equal(ethers.ZeroAddress);
    expect(players[1]).to.equal(ethers.ZeroAddress);
  });

  it("Should not allow non-owners to reset a game", async function () {
    const gameId = 0;
    await expect(funRound.connect(addr1).resetGame(gameId))
      .to.be.revertedWith("Only owner can reset the game");
  });

  it("Should correctly report if a game is in progress", async function () {
    const depositAmount = ethers.parseEther("0.02");
    await funRound.connect(addr1).deposit({ value: depositAmount });
    await funRound.connect(addr2).deposit({ value: depositAmount });
    await funRound.connect(addr1).joinGame();
    const gameId = await funRound.nextGameId() - 1n;

    expect(await funRound.isGameInProgress(gameId)).to.be.false;

    await funRound.connect(addr2).joinGame();
    expect(await funRound.isGameInProgress(gameId)).to.be.true;
  });
});

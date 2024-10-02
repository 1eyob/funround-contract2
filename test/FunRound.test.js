const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FunRound", function () {
  let FunRound, funRound, owner, addr1, addr2;

  beforeEach(async function () {
    FunRound = await ethers.getContractFactory("FunRound");
    [owner, addr1, addr2] = await ethers.getSigners();
    funRound = await FunRound.deploy();
  });

  it("Should set the right owner", async function () {
    expect(await funRound.owner()).to.equal(owner.address);
  });

  it("Should allow players to deposit", async function () {
    const depositAmount = ethers.parseEther("0.01");
    await funRound.connect(addr1).deposit({ value: depositAmount });
    const expectedBalance = (BigInt(depositAmount) * BigInt(90)) / BigInt(100);
    expect(await funRound.getPlayerBalance(addr1.address)).to.equal(
      expectedBalance
    );
  });

  it("Should start a game when two players deposit", async function () {
    const depositAmount = ethers.parseEther("0.01");
    await funRound.connect(addr1).deposit({ value: depositAmount });
    await funRound.connect(addr2).deposit({ value: depositAmount });
    expect(await funRound.getPlayers()).to.have.lengthOf(0);
  });
});

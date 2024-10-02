// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FunRound {
    address public immutable owner;
    uint256 private constant PLATFORM_FEE_PERCENT = 10;
    uint256 private constant SESSION_FEE = 0.01 ether;
    uint256 private constant MAX_PLAYERS = 2;
    
    struct Player {
        uint256 balance;
        bool hasPlayed;
    }
    
    mapping(address => Player) public players;
    address[MAX_PLAYERS] public playerList;
    uint8 public playerCount;

    event Deposit(address indexed player, uint256 amount);
    event WinningsPaid(address indexed winner, uint256 amount);
    event FeeCollected(uint256 feeAmount);
    event GameStarted(address indexed player1, address indexed player2);
    event GameEnded(address indexed winner);

    constructor() {
        owner = msg.sender;
    }

    function deposit() external payable {
        require(playerCount < MAX_PLAYERS, "Game is full");
        require(msg.value >= SESSION_FEE, "Insufficient deposit");

        uint256 playerFee = (msg.value * PLATFORM_FEE_PERCENT) / 100;
        uint256 depositAfterFee = msg.value - playerFee;

        players[msg.sender].balance += depositAfterFee;
        playerList[playerCount] = msg.sender;
        playerCount++;

        emit FeeCollected(playerFee);
        emit Deposit(msg.sender, depositAfterFee);

        if (playerCount == MAX_PLAYERS) {
            emit GameStarted(playerList[0], playerList[1]);
        }
    }

    function submitGameResult(address winner) external {
        require(playerCount == MAX_PLAYERS, "Game hasn't started");
        require(msg.sender == playerList[0] || msg.sender == playerList[1], "Only players can submit result");
        require(winner == playerList[0] || winner == playerList[1], "Invalid winner address");
        require(!players[msg.sender].hasPlayed, "You have already submitted the result");

        players[msg.sender].hasPlayed = true;

        if (players[playerList[0]].hasPlayed && players[playerList[1]].hasPlayed) {
            _finalizeGame(winner);
        }
    }

    function _finalizeGame(address winner) private {
        uint256 winnings = players[playerList[0]].balance + players[playerList[1]].balance;
        delete players[playerList[0]];
        delete players[playerList[1]];
        playerCount = 0;

        payable(winner).transfer(winnings);
        emit WinningsPaid(winner, winnings);
        emit GameEnded(winner);
    }

    function getPlayerBalance(address _player) external view returns (uint256) {
        return players[_player].balance;
    }

    function getPlayers() external view returns (address[MAX_PLAYERS] memory) {
        return playerList;
    }

    function withdrawFees() external {
        require(msg.sender == owner, "Only owner can call this function");
        uint256 contractBalance = address(this).balance;
        require(contractBalance > 0, "No fees to withdraw");
        payable(owner).transfer(contractBalance);
    }
}
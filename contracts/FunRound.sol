// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FunRound {
    address public immutable owner;
    uint256 private constant PLATFORM_FEE_PERCENT = 10;
    uint256 private constant SESSION_FEE = 0.01 ether;
    uint256 private constant MAX_PLAYERS_PER_GAME = 2;
    
    struct Player {
        uint256 balance;
        bool hasPlayed;
    }
    
    struct Game {
        address[MAX_PLAYERS_PER_GAME] players;
        uint8 playerCount;
        bool isActive;
    }
    
    mapping(uint256 => Game) public games;
    mapping(uint256 => mapping(address => Player)) public gamePlayers;
    uint256 public nextGameId;

    event Deposit(uint256 indexed gameId, address indexed player, uint256 amount);
    event WinningsPaid(uint256 indexed gameId, address indexed winner, uint256 amount);
    event FeeCollected(uint256 feeAmount);
    event GameStarted(uint256 indexed gameId, address indexed player1, address indexed player2);
    event GameEnded(uint256 indexed gameId, address indexed winner);
    event GameReset(uint256 indexed gameId);
    event ResultSubmitted(uint256 indexed gameId, address indexed player, address proposedWinner);
    event ResultAlreadySubmitted(uint256 indexed gameId, address indexed player);

    constructor() {
        owner = msg.sender;
    }

    function joinGame() external payable returns (uint256) {
        require(msg.value >= SESSION_FEE, "Insufficient deposit");

        uint256 gameId = findOrCreateGame();
        Game storage game = games[gameId];

        uint256 playerFee = (msg.value * PLATFORM_FEE_PERCENT) / 100;
        uint256 depositAfterFee = msg.value - playerFee;

        gamePlayers[gameId][msg.sender].balance += depositAfterFee;
        game.players[game.playerCount] = msg.sender;
        game.playerCount++;

        emit FeeCollected(playerFee);
        emit Deposit(gameId, msg.sender, depositAfterFee);

        if (game.playerCount == MAX_PLAYERS_PER_GAME) {
            game.isActive = true;
            emit GameStarted(gameId, game.players[0], game.players[1]);
        }

        return gameId;
    }

    function findOrCreateGame() internal returns (uint256) {
        for (uint256 i = 0; i < nextGameId; i++) {
            if (!games[i].isActive && games[i].playerCount < MAX_PLAYERS_PER_GAME) {
                return i;
            }
        }
        
        uint256 newGameId = nextGameId++;
        games[newGameId] = Game([address(0), address(0)], 0, false);
        return newGameId;
    }

    function submitGameResult(uint256 gameId, address winner) external {
        Game storage game = games[gameId];
        require(game.isActive, "Game not active");
        require(msg.sender == game.players[0] || msg.sender == game.players[1], "Only players can submit result");
        require(winner == game.players[0] || winner == game.players[1], "Invalid winner address");
        
        if (gamePlayers[gameId][msg.sender].hasPlayed) {
            emit ResultAlreadySubmitted(gameId, msg.sender);
            return;
        }

        gamePlayers[gameId][msg.sender].hasPlayed = true;
        emit ResultSubmitted(gameId, msg.sender, winner);

        if (gamePlayers[gameId][game.players[0]].hasPlayed && gamePlayers[gameId][game.players[1]].hasPlayed) {
            _finalizeGame(gameId, winner);
        }
    }

    function _finalizeGame(uint256 gameId, address winner) private {
        Game storage game = games[gameId];
        require(game.isActive, "Game already finalized");
        
        uint256 winnings = gamePlayers[gameId][game.players[0]].balance + gamePlayers[gameId][game.players[1]].balance;
        delete gamePlayers[gameId][game.players[0]];
        delete gamePlayers[gameId][game.players[1]];
        game.isActive = false;

        payable(winner).transfer(winnings);
        emit WinningsPaid(gameId, winner, winnings);
        emit GameEnded(gameId, winner);
    }

    function getPlayerBalance(uint256 gameId, address player) external view returns (uint256) {
        return gamePlayers[gameId][player].balance;
    }

    function getGamePlayers(uint256 gameId) external view returns (address[MAX_PLAYERS_PER_GAME] memory) {
        return games[gameId].players;
    }

    function withdrawFees() external {
        require(msg.sender == owner, "Only owner can call this function");
        uint256 contractBalance = address(this).balance;
        require(contractBalance > 0, "No fees to withdraw");
        payable(owner).transfer(contractBalance);
    }

    function resetGame(uint256 gameId) external {
        require(msg.sender == owner, "Only owner can reset the game");
        Game storage game = games[gameId];
        for (uint8 i = 0; i < game.playerCount; i++) {
            if (gamePlayers[gameId][game.players[i]].balance > 0) {
                payable(game.players[i]).transfer(gamePlayers[gameId][game.players[i]].balance);
            }
            delete gamePlayers[gameId][game.players[i]];
        }
        delete games[gameId];
        emit GameReset(gameId);
    }

    function getContractBalance() external view returns (uint256) {
        uint256 balance = address(this).balance;
        require(balance <= type(uint256).max, "Balance overflow");
        return balance;
    }

    function isGameInProgress(uint256 gameId) public view returns (bool) {
        return games[gameId].isActive;
    }

    function getGameState(uint256 gameId) external view returns (bool isActive, address[MAX_PLAYERS_PER_GAME] memory players, bool[MAX_PLAYERS_PER_GAME] memory hasPlayed) {
        Game storage game = games[gameId];
        isActive = game.isActive;
        players = game.players;
        hasPlayed[0] = gamePlayers[gameId][game.players[0]].hasPlayed;
        hasPlayed[1] = gamePlayers[gameId][game.players[1]].hasPlayed;
    }
}

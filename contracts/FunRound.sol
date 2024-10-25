// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FunRound {
    address public immutable owner;
    IERC20 public usdtToken;
    uint256 private constant PLATFORM_FEE_PERCENT = 10;
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
    mapping(address => uint256) public playerUSDTBalances;

    event USDTDeposited(address indexed player, uint256 amount);
    event FeeCollected(uint256 feeAmount);
    event GameStarted(uint256 indexed gameId, address indexed player1, address indexed player2);
    event GameEnded(uint256 indexed gameId, address indexed winner);
    event GameReset(uint256 indexed gameId);
    event ResultSubmitted(uint256 indexed gameId, address indexed player, address proposedWinner);
    event ResultAlreadySubmitted(uint256 indexed gameId, address indexed player);
    event DepositSuccessful(address indexed player, uint256 amount, uint256 newBalance);
    event USDTBet(uint256 indexed gameId, address indexed player, uint256 amount);
    event WinningsPaid(uint256 indexed gameId, address indexed winner, uint256 amount);

    constructor(address _usdtToken) {
        owner = msg.sender;
        usdtToken = IERC20(_usdtToken);
    }

    function depositUSDT(uint256 amount) external {
        require(amount > 0, "Deposit amount must be greater than 0");
        require(usdtToken.transferFrom(msg.sender, address(this), amount), "USDT transfer failed");
        uint256 playerFee = (amount * PLATFORM_FEE_PERCENT) / 100;
        uint256 depositAfterFee = amount - playerFee;
        playerUSDTBalances[msg.sender] += depositAfterFee;
        emit USDTDeposited(msg.sender, depositAfterFee);
        emit FeeCollected(playerFee);
        emit DepositSuccessful(msg.sender, depositAfterFee, playerUSDTBalances[msg.sender]);
    }

    function betUSDT(uint256 amount) external returns (uint256) {
        require(playerUSDTBalances[msg.sender] >= amount, "Insufficient USDT balance");
        require(amount == 1 * 10**6 || amount == 2 * 10**6 || amount == 5 * 10**6 || amount == 10 * 10**6, "Invalid bet amount");

        uint256 gameId = findOrCreateGame();
        Game storage game = games[gameId];

        playerUSDTBalances[msg.sender] -= amount;
        gamePlayers[gameId][msg.sender].balance += amount;
        game.players[game.playerCount] = msg.sender;
        game.playerCount++;

        emit USDTBet(gameId, msg.sender, amount);

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

        require(usdtToken.transfer(winner, winnings), "USDT transfer failed");
        emit WinningsPaid(gameId, winner, winnings);
        emit GameEnded(gameId, winner);
    }

    function getPlayerUSDTBalance(address player) external view returns (uint256) {
        return playerUSDTBalances[player];
    }

    function getGamePlayers(uint256 gameId) external view returns (address[MAX_PLAYERS_PER_GAME] memory) {
        return games[gameId].players;
    }

    function withdrawFees() external {
        require(msg.sender == owner, "Only owner can call this function");
        uint256 contractBalance = usdtToken.balanceOf(address(this));
        require(contractBalance > 0, "No fees to withdraw");
        require(usdtToken.transfer(owner, contractBalance), "USDT transfer failed");
    }

    function resetGame(uint256 gameId) external {
        require(msg.sender == owner, "Only owner can reset the game");
        Game storage game = games[gameId];
        for (uint8 i = 0; i < game.playerCount; i++) {
            if (gamePlayers[gameId][game.players[i]].balance > 0) {
                require(usdtToken.transfer(game.players[i], gamePlayers[gameId][game.players[i]].balance), "USDT transfer failed");
            }
            delete gamePlayers[gameId][game.players[i]];
        }
        delete games[gameId];
        emit GameReset(gameId);
    }

    function getContractBalance() external view returns (uint256) {
        return usdtToken.balanceOf(address(this));
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

    function directDepositUSDT(uint256 amount) external {
        require(amount > 0, "Deposit amount must be greater than 0");
        require(usdtToken.transferFrom(msg.sender, address(this), amount), "USDT transfer failed");
        uint256 playerFee = (amount * PLATFORM_FEE_PERCENT) / 100;
        uint256 depositAfterFee = amount - playerFee;
        playerUSDTBalances[msg.sender] += depositAfterFee;
        emit USDTDeposited(msg.sender, depositAfterFee);
        emit FeeCollected(playerFee);
        emit DepositSuccessful(msg.sender, depositAfterFee, playerUSDTBalances[msg.sender]);
    }

    function onTokenTransfer(address from, uint256 amount, bytes calldata) external returns (bool) {
        require(msg.sender == address(usdtToken), "Only USDT token contract can call this function");
        uint256 playerFee = (amount * PLATFORM_FEE_PERCENT) / 100;
        uint256 depositAfterFee = amount - playerFee;
        playerUSDTBalances[from] += depositAfterFee;
        emit USDTDeposited(from, depositAfterFee);
        emit FeeCollected(playerFee);
        emit DepositSuccessful(from, depositAfterFee, playerUSDTBalances[from]);
        return true;
    }

    function tokenFallback(address from, uint256 amount, bytes calldata) external returns (bool) {
        require(msg.sender == address(usdtToken), "Only USDT token contract can call this function");
        require(amount > 0, "Deposit amount must be greater than 0");
        
        uint256 playerFee = (amount * PLATFORM_FEE_PERCENT) / 100;
        uint256 depositAfterFee = amount - playerFee;
        playerUSDTBalances[from] += depositAfterFee;
        
        emit USDTDeposited(from, depositAfterFee);
        emit FeeCollected(playerFee);
        emit DepositSuccessful(from, depositAfterFee, playerUSDTBalances[from]);
        
        return true;
    }
}

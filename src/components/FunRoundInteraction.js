import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

function FunRoundInteraction({ funRoundContract, mockUSDTContract, userAddress }) {
  const [usdtBalance, setUsdtBalance] = useState('0');
  const [depositAmount, setDepositAmount] = useState('');
  const [gameBalance, setGameBalance] = useState('0');

  useEffect(() => {
    updateBalances();
  }, [userAddress]);

  const updateBalances = async () => {
    if (userAddress) {
      const usdtBal = await mockUSDTContract.balanceOf(userAddress);
      setUsdtBalance(ethers.utils.formatUnits(usdtBal, 6));
      const gameBal = await funRoundContract.getPlayerUSDTBalance(userAddress);
      setGameBalance(ethers.utils.formatUnits(gameBal, 6));
    }
  };

  const mintMockUSDT = async () => {
    try {
      const amount = ethers.utils.parseUnits('1000', 6); // Mint 1000 USDT
      const tx = await mockUSDTContract.mint(userAddress, amount);
      await tx.wait();
      alert('1000 MockUSDT minted successfully!');
      updateBalances();
    } catch (error) {
      console.error('Error minting MockUSDT:', error);
      alert('Failed to mint MockUSDT');
    }
  };

  const approveUSDT = async () => {
    try {
      const amount = ethers.utils.parseUnits('1000000', 6); // Approve a large amount
      const tx = await mockUSDTContract.approve(funRoundContract.address, amount);
      await tx.wait();
      alert('MockUSDT approved successfully!');
    } catch (error) {
      console.error('Error approving MockUSDT:', error);
      alert('Failed to approve MockUSDT');
    }
  };

  const depositUSDT = async () => {
    try {
      const amount = ethers.utils.parseUnits(depositAmount, 6);
      const tx = await funRoundContract.depositUSDT(amount);
      await tx.wait();
      alert(`${depositAmount} USDT deposited successfully!`);
      updateBalances();
    } catch (error) {
      console.error('Error depositing USDT:', error);
      alert('Failed to deposit USDT');
    }
  };

  return (
    <div>
      <h2>FunRound Interaction</h2>
      <p>USDT Balance: {usdtBalance}</p>
      <p>Game Balance: {gameBalance}</p>
      <button onClick={mintMockUSDT}>Mint 1000 MockUSDT</button>
      <button onClick={approveUSDT}>Approve MockUSDT</button>
      <input 
        type="number" 
        value={depositAmount} 
        onChange={(e) => setDepositAmount(e.target.value)}
        placeholder="Amount to deposit"
      />
      <button onClick={depositUSDT}>Deposit USDT</button>
    </div>
  );
}

export default FunRoundInteraction;

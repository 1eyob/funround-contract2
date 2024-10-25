import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import FunRoundInteraction from './components/FunRoundInteraction';
import FunRoundABI from './abis/FunRound.json'; // Make sure this path is correct
import MockUSDTABI from './abis/MockUSDT.json';
import deployedAddresses from './deployed-addresses.json';

function App() {
  const [funRoundContract, setFunRoundContract] = useState(null);
  const [mockUSDTContract, setMockUSDTContract] = useState(null);
  const [userAddress, setUserAddress] = useState(null);

  useEffect(() => {
    const initContracts = async () => {
      if (window.ethereum) {
        try {
          // Request account access
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          const address = await signer.getAddress();
          setUserAddress(address);

          const funRoundContract = new ethers.Contract(deployedAddresses.funRound, FunRoundABI, signer);
          setFunRoundContract(funRoundContract);

          const mockUSDTContract = new ethers.Contract(deployedAddresses.mockUSDT, MockUSDTABI, signer);
          setMockUSDTContract(mockUSDTContract);
        } catch (error) {
          console.error("Failed to connect to MetaMask", error);
        }
      } else {
        console.log("Please install MetaMask!");
      }
    };

    initContracts();
  }, []);

  return (
    <div className="App">
      <h1>FunRound Game</h1>
      {userAddress && <p>Connected Address: {userAddress}</p>}
      {funRoundContract && mockUSDTContract && (
        <FunRoundInteraction 
          funRoundContract={funRoundContract} 
          mockUSDTContract={mockUSDTContract} 
          userAddress={userAddress} 
        />
      )}
    </div>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import Web3 from 'web3';

const FACTORY_ADDRESS = "YOUR_FACTORY_CONTRACT_ADDRESS_HERE";
const factoryABI = [
  {
    "inputs": [],
    "name": "getDeployedTokens",
    "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }],
    "stateMutability": "view",
    "type": "function"
  }
];

const Dashboard = () => {
  const [account, setAccount] = useState("");
  const [tokens, setTokens] = useState([]);
  const [status, setStatus] = useState("");

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await web3.eth.getAccounts();
        setAccount(accounts[0]);
      } catch (err) {
        console.error(err);
        setStatus("Wallet connection failed.");
      }
    } else {
      alert("Please install MetaMask");
    }
  };

  const loadTokens = async () => {
    try {
      const web3 = new Web3(window.ethereum);
      const factory = new web3.eth.Contract(factoryABI, FACTORY_ADDRESS);
      const deployedTokens = await factory.methods.getDeployedTokens().call();
      setTokens(deployedTokens);
      setStatus(`Found ${deployedTokens.length} tokens.`);
    } catch (err) {
      console.error(err);
      setStatus("Failed to load tokens.");
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      connectWallet();
    }
  }, []);

  useEffect(() => {
    if (account) {
      loadTokens();
    }
  }, [account]);

  return (
    <div>
      <h1>Dashboard</h1>
      {!account && <button onClick={connectWallet}>Connect Wallet</button>}
      {account && (
        <div>
          <p><strong>Connected Account:</strong> {account}</p>
          <h2>Deployed Tokens</h2>
          {tokens.length === 0 ? (
            <p>No tokens deployed yet.</p>
          ) : (
            <ul>
              {tokens.map((tokenAddress, idx) => (
                <li key={idx}>{tokenAddress}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p>{status}</p>
    </div>
  );
};

export default Dashboard;

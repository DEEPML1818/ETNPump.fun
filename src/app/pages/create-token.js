import React, { useState } from 'react';
import Web3 from 'web3';

const FACTORY_ADDRESS = "YOUR_FACTORY_CONTRACT_ADDRESS_HERE";
// Minimal ABI for PumpFunFactory: createToken and getDeployedTokens
const factoryABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "symbol", "type": "string" },
      { "internalType": "uint256", "name": "initialSupply", "type": "uint256" }
    ],
    "name": "createToken",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const CreateToken = () => {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [supply, setSupply] = useState("");
  const [status, setStatus] = useState("");
  const [account, setAccount] = useState("");

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await web3.eth.getAccounts();
        setAccount(accounts[0]);
        setStatus("Wallet connected.");
      } catch (err) {
        console.error(err);
        setStatus("Wallet connection failed.");
      }
    } else {
      alert("Please install MetaMask");
    }
  };

  const createToken = async () => {
    if (!name || !symbol || !supply) {
      setStatus("Please fill in all fields.");
      return;
    }
    try {
      const web3 = new Web3(window.ethereum);
      const factory = new web3.eth.Contract(factoryABI, FACTORY_ADDRESS);
      // Ensure supply is provided in wei (assume 18 decimals)
      const initialSupply = web3.utils.toWei(supply, "ether");
      setStatus("Creating token...");
      const tx = await factory.methods.createToken(name, symbol, initialSupply)
        .send({ from: account });
      const tokenAddress = tx.events.TokenCreated.returnValues.tokenAddress;
      setStatus(`Token created at ${tokenAddress}`);
    } catch (err) {
      console.error(err);
      setStatus("Token creation failed.");
    }
  };

  return (
    <div>
      <h1>Create Token</h1>
      {!account && <button onClick={connectWallet}>Connect Wallet</button>}
      {account && (
        <div>
          <p><strong>Connected Account:</strong> {account}</p>
          <div>
            <label>Token Name: </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label>Token Symbol: </label>
            <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          </div>
          <div>
            <label>Initial Supply (in tokens): </label>
            <input type="number" value={supply} onChange={(e) => setSupply(e.target.value)} />
          </div>
          <button onClick={createToken}>Create Token</button>
        </div>
      )}
      <p>{status}</p>
    </div>
  );
};

export default CreateToken;

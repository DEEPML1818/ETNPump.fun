import React, { useState, useEffect } from 'react';
import Web3 from 'web3';

const ROUTER_ADDRESS = "YOUR_ROUTER_CONTRACT_ADDRESS_HERE";
const routerABI = [
  {
    "inputs": [],
    "name": "getCurrentBondingPrice",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "buyTokens",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenAmount", "type": "uint256" }],
    "name": "sellTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const RouterPage = () => {
  const [account, setAccount] = useState("");
  const [bondingPrice, setBondingPrice] = useState("0");
  const [buyEth, setBuyEth] = useState("");
  const [sellTokens, setSellTokens] = useState("");
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

  const loadBondingPrice = async () => {
    try {
      const web3 = new Web3(window.ethereum);
      const router = new web3.eth.Contract(routerABI, ROUTER_ADDRESS);
      const price = await router.methods.getCurrentBondingPrice().call();
      // Price is assumed to be scaled in wei (1e18)
      setBondingPrice(web3.utils.fromWei(price, "ether"));
    } catch (err) {
      console.error(err);
      setStatus("Failed to load bonding price.");
    }
  };

  const buyToken = async () => {
    if (!buyEth) return setStatus("Enter ETH amount to buy tokens.");
    try {
      const web3 = new Web3(window.ethereum);
      const router = new web3.eth.Contract(routerABI, ROUTER_ADDRESS);
      const value = web3.utils.toWei(buyEth, "ether");
      setStatus("Buying tokens...");
      await router.methods.buyTokens().send({ from: account, value });
      setStatus("Tokens purchased successfully.");
      loadBondingPrice();
    } catch (err) {
      console.error(err);
      setStatus("Buying tokens failed.");
    }
  };

  const sellToken = async () => {
    if (!sellTokens) return setStatus("Enter token amount to sell.");
    try {
      const web3 = new Web3(window.ethereum);
      const router = new web3.eth.Contract(routerABI, ROUTER_ADDRESS);
      // Assume token has 18 decimals
      const tokenAmount = web3.utils.toWei(sellTokens, "ether");
      setStatus("Selling tokens...");
      await router.methods.sellTokens(tokenAmount).send({ from: account });
      setStatus("Tokens sold successfully.");
      loadBondingPrice();
    } catch (err) {
      console.error(err);
      setStatus("Selling tokens failed.");
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      connectWallet();
    }
  }, []);

  useEffect(() => {
    if (account) {
      loadBondingPrice();
    }
  }, [account]);

  return (
    <div>
      <h1>Router</h1>
      {!account && <button onClick={connectWallet}>Connect Wallet</button>}
      {account && (
        <div>
          <p><strong>Connected Account:</strong> {account}</p>
          <h2>Current Bonding Price: {bondingPrice} ETH per token</h2>
          <div style={{ marginTop: '20px' }}>
            <h3>Buy Tokens</h3>
            <input
              type="number"
              placeholder="ETH amount"
              value={buyEth}
              onChange={(e) => setBuyEth(e.target.value)}
              style={{ marginRight: '10px' }}
            />
            <button onClick={buyToken}>Buy</button>
          </div>
          <div style={{ marginTop: '20px' }}>
            <h3>Sell Tokens</h3>
            <input
              type="number"
              placeholder="Token amount"
              value={sellTokens}
              onChange={(e) => setSellTokens(e.target.value)}
              style={{ marginRight: '10px' }}
            />
            <button onClick={sellToken}>Sell</button>
          </div>
        </div>
      )}
      <p>{status}</p>
    </div>
  );
};

export default RouterPage;

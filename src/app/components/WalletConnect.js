// app/components/WalletConnect.js
'use client';

import { useState, useEffect } from 'react';
import Web3 from 'web3';

export default function WalletConnect() {
  const [account, setAccount] = useState("");
  const [web3, setWeb3] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const web3Instance = new Web3(window.ethereum);
      setWeb3(web3Instance);
      // Check if already connected:
      web3Instance.eth.getAccounts().then((accounts) => {
        if (accounts.length > 0) setAccount(accounts[0]);
      });
    }
  }, []);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0]);
      } catch (err) {
        console.error("Wallet connect error:", err);
      }
    } else {
      alert("Please install MetaMask");
    }
  };

  const disconnectWallet = () => {
    // MetaMask does not support programmatic disconnect.
    // We simply clear our local state.
    setAccount("");
  };

  return (
    <div className="wallet-connect">
      {account ? (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>
            {account.slice(0,6)}...{account.slice(-4)}
          </span>
          <button onClick={disconnectWallet} className="wallet-btn">
            Disconnect
          </button>
        </div>
      ) : (
        <button onClick={connectWallet} className="wallet-btn">
          Connect Wallet
        </button>
      )}
      <style jsx>{`
        .wallet-btn {
          background-color: #e91e63;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background-color 0.2s ease;
        }
        .wallet-btn:hover {
          background-color: #d81b60;
        }
      `}</style>
    </div>
  );
}

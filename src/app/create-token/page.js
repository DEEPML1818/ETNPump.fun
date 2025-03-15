'use client';

import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import Web3 from 'web3';
import '../pumpfun-create.css'; // Ensure your CSS is in this path
import { NetworkContext } from '../NetworkProvider';

// The ABIs now include the targetNative parameter along with imageURL.
const createTokenABI = {
  "inputs": [
    { "internalType": "string", "name": "name", "type": "string" },
    { "internalType": "string", "name": "symbol", "type": "string" },
    { "internalType": "uint256", "name": "initialSupply", "type": "uint256" },
    { "internalType": "string", "name": "description", "type": "string" },
    { "internalType": "string", "name": "imageURL", "type": "string" },
    { "internalType": "uint256", "name": "targetNative", "type": "uint256" }
  ],
  "name": "createToken",
  "outputs": [
    { "internalType": "address", "name": "", "type": "address" },
    { "internalType": "address", "name": "", "type": "address" }
  ],
  "stateMutability": "nonpayable",
  "type": "function"
};

const createTokenWithSocialABI = {
  "inputs": [
    { "internalType": "string", "name": "name", "type": "string" },
    { "internalType": "string", "name": "symbol", "type": "string" },
    { "internalType": "uint256", "name": "initialSupply", "type": "uint256" },
    { "internalType": "string", "name": "description", "type": "string" },
    { "internalType": "string", "name": "telegram", "type": "string" },
    { "internalType": "string", "name": "xProfile", "type": "string" },
    { "internalType": "string", "name": "website", "type": "string" },
    { "internalType": "string", "name": "imageURL", "type": "string" },
    { "internalType": "uint256", "name": "targetNative", "type": "uint256" }
  ],
  "name": "createTokenWithSocial",
  "outputs": [
    { "internalType": "address", "name": "", "type": "address" },
    { "internalType": "address", "name": "", "type": "address" }
  ],
  "stateMutability": "nonpayable",
  "type": "function"
};

export default function CreateTokenPage() {
  const { selectedNetwork } = useContext(NetworkContext);
  const router = useRouter();

  // Basic fields
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [supply, setSupply] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [targetNative, setTargetNative] = useState("");

  // Optional advanced fields
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [telegram, setTelegram] = useState("");
  const [xLink, setXLink] = useState("");
  const [website, setWebsite] = useState("");

  // UI states
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("");

  // Get wallet account on mount
  useEffect(() => {
    async function fetchAccount() {
      if (window.ethereum) {
        try {
          const web3 = new Web3(window.ethereum);
          const accounts = await web3.eth.requestAccounts();
          if (accounts.length > 0) setAccount(accounts[0]);
        } catch (err) {
          console.error(err);
          setStatus("Error fetching wallet account.");
        }
      } else {
        setStatus("MetaMask not installed.");
      }
    }
    fetchAccount();
  }, []);

  // Use the factory address from the selected network
  const factoryAddress = selectedNetwork.factoryAddress;

  const createToken = async () => {
    if (!name || !symbol || !supply || !description || !targetNative) {
      setStatus("Fill in Name, Symbol, Supply, Description, and Target Native.");
      return;
    }
    if (!account) {
      setStatus("Wallet not connected.");
      return;
    }
    setStatus("Creating token on-chain...");

    try {
      const web3 = new Web3(window.ethereum);
      const supplyWei = web3.utils.toWei(supply, "ether");
      const targetNativeWei = web3.utils.toWei(targetNative, "ether");

      if (showAdvanced) {
        const contract = new web3.eth.Contract([createTokenWithSocialABI], factoryAddress);
        const tx = await contract.methods.createTokenWithSocial(
          name,
          symbol,
          supplyWei,
          description,
          telegram,
          xLink,
          website,
          imageUrl,
          targetNativeWei
        ).send({ from: account });

        if (tx.events?.TokenAndRouterCreated) {
          const newTokenAddr = tx.events.TokenAndRouterCreated.returnValues.tokenAddress;
          setStatus(`Token created successfully at ${newTokenAddr}`);
        } else {
          setStatus("Token created, but no event found.");
        }
      } else {
        const contract = new web3.eth.Contract([createTokenABI], factoryAddress);
        const tx = await contract.methods.createToken(
          name,
          symbol,
          supplyWei,
          description,
          imageUrl,
          targetNativeWei
        ).send({ from: account });

        if (tx.events?.TokenAndRouterCreated) {
          const newTokenAddr = tx.events.TokenAndRouterCreated.returnValues.tokenAddress;
          setStatus(`Token created successfully at ${newTokenAddr}`);
        } else {
          setStatus("Token created, but no event found.");
        }
      }
    } catch (err) {
      console.error(err);
      setStatus(`Token creation failed: ${err.message}`);
    }
  };

  const toggleAdvanced = () => setShowAdvanced(prev => !prev);

  return (
    <div className="create-token-page" style={styles.page}>
      <button style={styles.goBackBtn} onClick={() => router.back()}>[go back]</button>
      <div style={styles.container}>
        <h1 style={styles.title}>start a new coin</h1>
        <p style={styles.connectedText}>{account ? account : "Wallet not connected"}</p>

        {/* Basic Fields */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Name *</label>
          <input type="text" placeholder="e.g. PumpFun Token" style={styles.input} value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Symbol *</label>
          <input type="text" placeholder="e.g. PFT" style={styles.input} value={symbol} onChange={e => setSymbol(e.target.value)} />
        </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Max Supply *</label>
            <input
              type="number"
              placeholder="1000000000 (for 1 billion)"
              style={styles.input}
              value={supply}
              min="1000000000"
              max="10000000000000"
              onChange={e => {
                const value = Number(e.target.value);
                if (value < 1000000000) {
                  setSupply(1000000000);
                } else if (value > 10000000000000) {
                  setSupply(10000000000000);
                } else {
                  setSupply(value);
                }
              }}
            />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Description *</label>
          <textarea rows={3} placeholder="Describe your token..." style={{ ...styles.input, height: '70px', resize: 'none' }} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Image URL</label>
          <input type="text" placeholder="https://gateway.pinata.cloud/ipfs/..." style={styles.input} value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Target Native (in native coin)</label>
          <input type="text" placeholder="e.g. 10" style={styles.input} value={targetNative} onChange={e => setTargetNative(e.target.value)} />
        </div>

        {/* Advanced Toggle */}
        <div style={styles.arrowContainer} onClick={toggleAdvanced}>
          {showAdvanced ? '▲ advanced ▲' : '▼ advanced ▼'}
        </div>

        {showAdvanced && (
          <div style={styles.advancedSection}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Telegram</label>
              <input type="text" placeholder="https://t.me/yourgroup" style={styles.input} value={telegram} onChange={e => setTelegram(e.target.value)} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>X (Twitter)</label>
              <input type="text" placeholder="https://x.com/yourprofile" style={styles.input} value={xLink} onChange={e => setXLink(e.target.value)} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Website</label>
              <input type="text" placeholder="https://yourwebsite.com" style={styles.input} value={website} onChange={e => setWebsite(e.target.value)} />
            </div>
          </div>
        )}

        <button style={styles.createBtn} onClick={createToken} disabled={!account}>create token</button>
        {status && <p style={styles.statusText}>{status}</p>}
      </div>
    </div>
  );
}

const styles = {
  page: { width: '100%', height: '100vh', background: 'linear-gradient(to bottom, #141414, #1d1d1d, #141414)', color: '#fff', fontFamily: 'Arial, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  goBackBtn: { position: 'absolute', top: '1rem', left: '1rem', background: 'none', border: 'none', color: '#aaa', fontSize: '0.85rem', cursor: 'pointer' },
  container: { background: 'rgba(31,31,31,0.9)', border: '1px solid #444', borderRadius: '8px', padding: '2rem', width: '100%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' },
  title: { fontSize: '1.8rem', marginBottom: '1rem', fontWeight: 'bold' },
  connectedText: { marginBottom: '1rem', fontSize: '0.9rem', color: '#aaa', wordBreak: 'break-all' },
  formGroup: { marginBottom: '1rem', textAlign: 'left' },
  label: { display: 'block', marginBottom: '0.5rem', color: '#ccc', fontSize: '0.9rem' },
  input: { width: '100%', background: '#333', border: '1px solid #444', borderRadius: '4px', padding: '0.5rem', color: '#fff', fontSize: '0.95rem', outline: 'none' },
  arrowContainer: { fontSize: '1rem', cursor: 'pointer', margin: '0.5rem auto', color: '#666', width: '8rem', textAlign: 'center', transition: 'transform 0.2s ease' },
  advancedSection: { marginBottom: '1rem' },
  createBtn: { backgroundColor: '#00d18f', border: 'none', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem', transition: 'background-color 0.2s ease' },
  statusText: { marginTop: '1rem', fontSize: '0.85rem', color: '#ccc' }
};

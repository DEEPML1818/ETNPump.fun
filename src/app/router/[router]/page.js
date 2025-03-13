'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Web3 from 'web3';
import BN from 'bn.js';
import '../../pumpfun-router.css';
import NivoLineChart from './NivoLineChart'; // Adjust the path if needed

// --- Router Contract ABI (as provided) ---
const routerABI = [
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "tokenAddress",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_targetNative",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_targetToken",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "_treasury",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_maxSellAmount",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "OwnableInvalidOwner",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "OwnableUnauthorizedAccount",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ReentrancyGuardReentrantCall",
		"type": "error"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "maxSellAmount",
				"type": "uint256"
			}
		],
		"name": "MaxSellAmountUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "previousOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "price",
				"type": "uint256"
			}
		],
		"name": "PriceSnapshot",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "bool",
				"name": "paused",
				"type": "bool"
			}
		],
		"name": "SellPaused",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "buyer",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "ethSpent",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "tokensMinted",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "treasuryFee",
				"type": "uint256"
			}
		],
		"name": "TokensPurchased",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "seller",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "tokensBurned",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "nativeReturned",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "feeRetained",
				"type": "uint256"
			}
		],
		"name": "TokensSold",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "trader",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "tradeType",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "ethAmount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "tokenAmount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "price",
				"type": "uint256"
			}
		],
		"name": "TradeExecuted",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "BUY_FEE_PERCENT",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "IMPACT_THRESHOLD_PERCENT",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "MAX_SELL_FEE_PERCENT",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "MIN_SELL_FEE_PERCENT",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256[]",
				"name": "nativeAmounts",
				"type": "uint256[]"
			},
			{
				"internalType": "uint256[]",
				"name": "minTokensOuts",
				"type": "uint256[]"
			}
		],
		"name": "batchBuy",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256[]",
				"name": "tokenAmounts",
				"type": "uint256[]"
			}
		],
		"name": "batchSell",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "nativeIn",
				"type": "uint256"
			}
		],
		"name": "calculateTokensToMint",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "tokensMinted",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getCurrentBondingPrice",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "price",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getPriceHistory",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "initialPrice",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "liquidityPool",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "maxSellAmount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "priceHistory",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "sellPaused",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bool",
				"name": "_paused",
				"type": "bool"
			}
		],
		"name": "setSellPaused",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "targetNative",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "targetToken",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "token",
		"outputs": [
			{
				"internalType": "contract PumpFunToken",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "treasury",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_maxSellAmount",
				"type": "uint256"
			}
		],
		"name": "updateMaxSellAmount",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"stateMutability": "payable",
		"type": "receive"
	}
];

// --- Token Contract ABI (minimal) ---
const tokenABI = [
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  }
];

export default function RouterPage() {
  const params = useParams();
  const routerAddress = params.router || params.token;

  // State hooks
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenName, setTokenName] = useState("Loading...");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [decimals, setDecimals] = useState(18);
  const [price, setPrice] = useState("0");
  const [trades, setTrades] = useState([]);
  const [buyEthAmount, setBuyEthAmount] = useState("");
  const [sellTokenAmount, setSellTokenAmount] = useState("");
  const [slippageTolerance, setSlippageTolerance] = useState("10");
  const [isBuy, setIsBuy] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [priceHistory, setPriceHistory] = useState([]);

  useEffect(() => {
    if (!routerAddress) {
      setStatus("Router address not specified in URL.");
      return;
    }
    initPage();
  }, [routerAddress]);

  // Periodic updates every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (routerAddress) {
        fetchPrice();
        fetchTrades();
        fetchChatMessages();
        fetchPriceHistory();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [routerAddress]);

  async function initPage() {
    if (!window.ethereum) {
      setStatus("Please install MetaMask.");
      return;
    }
    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.requestAccounts();
      if (accounts.length) setAccount(accounts[0]);

      const routerContract = new web3.eth.Contract(routerABI, routerAddress);
      const tAddress = await routerContract.methods.token().call();
      setTokenAddress(tAddress);

      const tokenContract = new web3.eth.Contract(tokenABI, tAddress);
      const [name, symbol, tokenDecimals] = await Promise.all([
        tokenContract.methods.name().call(),
        tokenContract.methods.symbol().call(),
        tokenContract.methods.decimals().call()
      ]);
      setTokenName(name);
      setTokenSymbol(symbol);
      setDecimals(Number(tokenDecimals));

      await fetchPrice();
      await fetchTrades();
      await fetchChatMessages();
      await fetchPriceHistory();
    } catch (err) {
      console.error("Initialization error:", err);
      setStatus("Error initializing page. Check console.");
    }
  }

  async function fetchPrice() {
    try {
      const web3 = new Web3(window.ethereum);
      const routerContract = new web3.eth.Contract(routerABI, routerAddress);
      const rawPrice = await routerContract.methods.getCurrentBondingPrice().call();
      const priceInNative = web3.utils.fromWei(rawPrice, "ether");
      setPrice(priceInNative);
    } catch (err) {
      console.error("Error fetching price:", err);
    }
  }

  async function fetchPriceHistory() {
    try {
      const web3 = new Web3(window.ethereum);
      const routerContract = new web3.eth.Contract(routerABI, routerAddress);
      const history = await routerContract.methods.getPriceHistory().call();
      const formattedHistory = history.map((p, index) => ({
        x: index,
        y: Number(Web3.utils.fromWei(p, "ether"))
      }));
      setPriceHistory(formattedHistory);
    } catch (err) {
      console.error("Error fetching price history:", err);
    }
  }

  async function fetchTrades() {
    try {
      // (Your existing trade fetching logic here)
    } catch (err) {
      console.error("Error fetching trades:", err);
    }
  }

  async function fetchChatMessages() {
    try {
      // (Your existing chat fetching logic here)
    } catch (err) {
      console.error("Error fetching chat messages:", err);
    }
  }

  // Updated handleBuy:
  // If the user enters a single value, we use buyTokens (one input).
  // If the input is comma-separated (e.g. "1,5,10"), we use batchBuy (two arrays).
  async function handleBuy() {
    if (!account) return setStatus("Connect your wallet first.");
    const sanitizedInput = buyEthAmount.replace(/\s/g, "");
    if (!sanitizedInput || Number(sanitizedInput.replace(/,/g, '')) <= 0) {
      return setStatus("Enter a valid amount to spend.");
    }
  
    setStatus("Buying tokens...");
    try {
      const web3 = new Web3(window.ethereum);
      const routerContract = new web3.eth.Contract(routerABI, routerAddress);
      
      // Use a safe minimum value. (We use "1" so that the contract check passes if tokens are minted.)
      const safeMin = "1";
          
        
      
      // Batch buy case
      const amounts = buyEthAmount.split(',').map(s => s.trim()).filter(Boolean);
      if (amounts.length === 0) return setStatus("Enter valid amounts.");

      const nativeAmounts = [];
      const minTokensOuts = [];
      let totalValueBN = new BN("0");

      for (let amt of amounts) {
        if (Number(amt) <= 0) {
          return setStatus("Each amount must be greater than zero.");
        }
        const amtWei = web3.utils.toWei(amt, "ether");
        nativeAmounts.push(amtWei);
        totalValueBN = totalValueBN.add(new BN(amtWei));
        
        // For each individual amount, check if tokens would be minted.
        const estTokens = await routerContract.methods.calculateTokensToMint(amtWei).call();
        if (new BN(estTokens).isZero()) {
          return setStatus(`Buy value of ${amt} ETH is too low – no tokens minted. Increase this value.`);
        }
        minTokensOuts.push(safeMin);
      }
      
      if (totalValueBN.isZero()) {
        return setStatus("Total native amount cannot be zero.");
      }
      
      await routerContract.methods.batchBuy(nativeAmounts, minTokensOuts).send({
        from: account,
        value: totalValueBN.toString()
      });
    
    setStatus("Buy transaction confirmed.");
    fetchPrice();
    fetchTrades();
    fetchPriceHistory();
  } catch (err) {
    console.error("Buy error:", err);
    setStatus(err.message);
  }
}
  
  

async function handleSell() {
	if (!account)
	  return setStatus("Connect your wallet first.");
	if (!sellTokenAmount || Number(sellTokenAmount) <= 0)
	  return setStatus("Enter a valid token amount to sell.");
	setStatus("Selling tokens...");
	try {
	  const web3 = new Web3(window.ethereum);
	  const routerContract = new web3.eth.Contract(routerABI, routerAddress);
	  // Use the imported BN instead of web3.utils.toBN
	  const tokenAmount = new BN(10)
		.pow(new BN(decimals))
		.mul(new BN(sellTokenAmount));
	  await routerContract.methods.sellTokens(tokenAmount.toString()).send({ from: account });
	  setStatus("Sell transaction confirmed.");
	  fetchPrice();
	  fetchTrades();
	  fetchPriceHistory();
	} catch (err) {
	  console.error("Sell error:", err);
	  setStatus(err.message);
	}
  }
  

  async function handlePostChat() {
    if (!account)
      return setStatus("Connect your wallet to post a message.");
    if (!chatInput.trim()) return;
    setStatus("Posting chat message...");
    try {
      const web3 = new Web3(window.ethereum);
      const routerContract = new web3.eth.Contract(routerABI, routerAddress);
      await routerContract.methods.postChatMessage(chatInput).send({ from: account });
      setStatus("Chat message posted.");
      setChatInput("");
      fetchChatMessages();
    } catch (err) {
      console.error("Chat error:", err);
      setStatus(err.message);
    }
  }

  return (
    <div className="router-page">
      {/* Top Bar */}
      <div className="router-topbar">
        <div className="left-section">
          <h1 className="token-title">
            {tokenName} <span>({tokenSymbol})</span>
          </h1>
          <p className="router-address">Router: {routerAddress}</p>
        </div>
        <div className="right-section">
          <div className="token-price">
            Current Price: <span>{Number(price).toFixed(8)}</span>
          </div>
          <div className="user-account">
            Wallet: {account || "Not connected"}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="router-main-content">
        {/* Chart Column */}
        <div className="chart-column">
          <div className="chart-box">
            <div className="chart-header">
              <span>{tokenSymbol || "Token"} Price History</span>
              <div className="timeframe-buttons">
                <button>1m</button>
                <button>5m</button>
                <button>15m</button>
                <button>1h</button>
                <button>1d</button>
              </div>
            </div>
            {priceHistory.length ? (
              <NivoLineChart 
                priceHistory={priceHistory} 
                currentPrice={price} 
                tokenSymbol={tokenSymbol} 
              />
            ) : (
              <div className="no-data-message">
                No trades yet. Make a trade to see the chart update.
              </div>
            )}
          </div>
        </div>

        {/* Trade Panel */}
        <div className="trade-panel">
          <div className="trade-tabs">
            <button 
              className={isBuy ? "tab-btn active" : "tab-btn"} 
              onClick={() => setIsBuy(true)}
            >
              buy
            </button>
            <button 
              className={!isBuy ? "tab-btn active-sell" : "tab-btn"} 
              onClick={() => setIsBuy(false)}
            >
              sell
            </button>
          </div>
          <div className="slippage-link">set max slippage</div>
          {isBuy ? (
            <div className="buy-panel">
              <div className="input-row">
                <input 
                  type="text" 
                  placeholder="0.00 (or comma separated for batch buy)" 
                  value={buyEthAmount} 
                  onChange={(e) => setBuyEthAmount(e.target.value)}
                />
                <span className="token-label">ETN</span>
              </div>
              <div className="quick-fill">
                <button onClick={() => setBuyEthAmount("0")}>reset</button>
                <button onClick={() => setBuyEthAmount("1")}>1 ETN</button>
                <button onClick={() => setBuyEthAmount("5")}>5 ETN</button>
                <button onClick={() => setBuyEthAmount("10")}>10 ETN</button>
              </div>
              <button className="place-trade buy-trade" onClick={handleBuy}>
                place trade
              </button>
            </div>
          ) : (
            <div className="sell-panel">
              <div className="input-row">
                <input 
                  type="number" 
                  placeholder="0.00" 
                  value={sellTokenAmount} 
                  onChange={(e) => setSellTokenAmount(e.target.value)}
                />
                <span className="token-label">{tokenSymbol}</span>
              </div>
              <div className="quick-fill">
                <button onClick={() => setSellTokenAmount("0")}>reset</button>
                <button onClick={() => setSellTokenAmount("25")}>25%</button>
                <button onClick={() => setSellTokenAmount("50")}>50%</button>
                <button onClick={() => setSellTokenAmount("75")}>75%</button>
                <button onClick={() => setSellTokenAmount("100")}>100%</button>
              </div>
              <button className="place-trade sell-trade" onClick={handleSell}>
                place trade
              </button>
            </div>
          )}
          {status && (
            <div className="status-box">
              <p>{status}</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Section */}
      <div className="chat-section">
        <h2>Live Chat</h2>
        <div className="chat-messages">
          {chatMessages.map((msg, idx) => (
            <div className="chat-message" key={idx}>
              <div className="chat-meta">
                <span className="chat-sender">{msg.sender.slice(0, 6)}..</span>
                <span className="chat-time">
                  {new Date(Number(msg.timestamp) * 1000).toLocaleTimeString()}
                </span>
              </div>
              <div className="chat-text">{msg.message}</div>
            </div>
          ))}
        </div>
        <div className="chat-input-box">
          <input 
            type="text" 
            placeholder="Your message..." 
            value={chatInput} 
            onChange={(e) => setChatInput(e.target.value)}
          />
          <button onClick={handlePostChat}>Send</button>
        </div>
      </div>
    </div>
  );
}

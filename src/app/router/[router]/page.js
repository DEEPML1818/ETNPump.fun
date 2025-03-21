'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Web3 from 'web3';
import BN from 'bn.js';
import dynamic from 'next/dynamic';
import '../../pumpfun-router.css';

// We'll remove NivoLineChart and use our new LightweightChart
import LightweightChart from './LightweightChart'; // Adjust path if needed

// Dynamically import the TradingViewChart component to ensure it renders only on the client side

const TradingViewChart = dynamic(() => import('./TradingViewChart'), { ssr: false });

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
				"components": [
					{
						"internalType": "uint256",
						"name": "timestamp",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "price",
						"type": "uint256"
					}
				],
				"internalType": "struct PriceSnapshotStruct[]",
				"name": "",
				"type": "tuple[]"
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
				"name": "timestamp",
				"type": "uint256"
			},
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
	const [sellPercentage, setSellPercentage] = useState("");
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

  // Convert raw priceHistory data from contract into the format: { time: 'YYYY-MM-DD', value: number }
  async function fetchPriceHistory() {
	try {
	  const web3 = new Web3(window.ethereum);
	  const routerContract = new web3.eth.Contract(routerABI, routerAddress);
	  const history = await routerContract.methods.getPriceHistory().call();
	  const historyArray = Array.isArray(history) ? history : Object.values(history);
	  const formattedHistory = historyArray.map(item => {
		if (item && typeof item === 'object') {
		  return {
			time: Number(item.timestamp) * 1000, // Convert to ms
			value: Number(web3.utils.fromWei(item.price, "ether"))
		  };
		}
		return null;
	  }).filter(Boolean);
	  
	  setPriceHistory(formattedHistory);
	  window.priceHistoryData = formattedHistory; // Expose for datafeed
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
	if (!sellTokenAmount || Number(sellTokenAmount.replace(/,/g, '')) <= 0)
	  return setStatus("Enter a valid token amount to sell.");
	setStatus("Selling tokens...");
	try {
	  const web3 = new Web3(window.ethereum);
	  const routerContract = new web3.eth.Contract(routerABI, routerAddress);
	  
	  // Helper: Convert an individual token amount string to its BN representation.
	  const convertToTokenAmount = (amountStr) => {
		// amountStr is in whole tokens (e.g., "10")
		return new BN(10).pow(new BN(decimals)).mul(new BN(amountStr));
	  };
  
	  if (sellTokenAmount.includes(',')) {
		// Batch sell mode: multiple comma separated values.
		const amounts = sellTokenAmount.split(',').map(s => s.trim()).filter(Boolean);
		if (amounts.length === 0)
		  return setStatus("Enter valid token amounts to sell.");
  
		const tokenAmounts = amounts.map(amt => convertToTokenAmount(amt).toString());
  
		await routerContract.methods.batchSell(tokenAmounts).send({ from: account });
	  } else {
		// Single sell mode.
		const tokenAmount = convertToTokenAmount(sellTokenAmount);
		await routerContract.methods.batchSell([tokenAmount.toString()]).send({ from: account });
	  }
	  
	  setStatus("Sell transaction confirmed.");
	  fetchPrice();
	  fetchTrades();
	  fetchPriceHistory();
	} catch (err) {
	  console.error("Sell error:", err);
	  setStatus(err.message);
	}
  }
  async function handleSell() {
	if (!account) return setStatus("Connect your wallet first.");
	if (!sellTokenAmount && !sellPercentage)
	  return setStatus("Enter a valid token amount or percentage to sell.");
	  
	setStatus("Selling tokens...");
  
	try {
	  const web3 = new Web3(window.ethereum);
	  const routerContract = new web3.eth.Contract(routerABI, routerAddress);
	  const tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);
  
	  // Helper: Convert an individual token amount string to its BN representation.
	  const convertToTokenAmount = (amountStr) => {
		return new BN(10).pow(new BN(decimals)).mul(new BN(amountStr));
	  };
  
	  let tokenAmount;
  
	  if (sellPercentage) {
		// Fetch user's total balance
		const balance = await tokenContract.methods.balanceOf(account).call();
		const percentageDecimal = new BN(sellPercentage).mul(new BN(balance)).div(new BN(100));
		tokenAmount = percentageDecimal;
	  } else {
		// Single token amount (fixed value)
		tokenAmount = convertToTokenAmount(sellTokenAmount);
	  }
  
	  await routerContract.methods.batchSell([tokenAmount.toString()]).send({ from: account });
  
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

  const sampleData = [
	{ date: '2023-10-01', price: 100 },
	{ date: '2023-10-02', price: 101 },
	{ date: '2023-10-03', price: 102 },

  ];

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
        <div className="chart-column" style={{ width: "100%", marginBottom: "20px" }}>
		<div
			className="chart-box"
			style={{
				padding: "20px",
				backgroundColor: "#fff",
				borderRadius: "8px",
				boxShadow: "0px 2px 10px rgba(0,0,0,0.1)",
				margin: "0 auto",
				maxWidth: "1200px", // Increased width
				width: "100%", // Ensure the width is set to 100%
			}}
			>
			<div
				className="chart-header"
				style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				marginBottom: "10px",
				}}
			>
				<h2 style={{ margin: 0, fontSize: "1.5rem" }}>
				{tokenSymbol || "Token"} Price History
				</h2>
				<div className="timeframe-buttons" style={{ display: "flex", gap: "8px" }}>
				{["1m", "5m", "15m", "1h", "1d"].map((label) => (
					<button
					key={label}
					style={{
						padding: "5px 10px",
						fontSize: "0.9rem",
						border: "none",
						backgroundColor: "#f0f0f0",
						borderRadius: "4px",
						cursor: "pointer",
					}}
					>
					{label}
					</button>
				))}
				</div>
			</div>
			{priceHistory.length ? (
				<TradingViewChart symbol={tokenSymbol} data={sampleData}  />
			) : (
				<div style={{ textAlign: "center", color: "#888", padding: "20px", fontSize: "1rem" }}>
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
			{/* New input for percentage */}
			<div className="input-row">
			  <input
				type="text"
				placeholder="Enter percentage to sell (e.g. 50)"
				value={sellPercentage}
				onChange={(e) => setSellPercentage(e.target.value)}
			  />
			  <span className="token-label">%</span>
			</div>
			<div className="quick-fill">
			  <button onClick={() => { setSellTokenAmount("0"); setSellPercentage(""); }}>reset</button>
			  <button onClick={() => setSellPercentage("25")}>25%</button>
			  <button onClick={() => setSellPercentage("50")}>50%</button>
			  <button onClick={() => setSellPercentage("75")}>75%</button>
			  <button onClick={() => setSellPercentage("100")}>100%</button>
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

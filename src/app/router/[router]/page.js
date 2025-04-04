"use client";

import { useEffect, useState, useRef, useContext } from "react";
import { useParams } from "next/navigation";
import Web3 from "web3";
import BN from "bn.js";
import dynamic from "next/dynamic";
import "../../pumpfun-router.css";
import { NetworkContext } from "../../NetworkProvider";
// Import ethers helpers for v6:
import { ethers, formatUnits, parseUnits } from "ethers";

// Dynamically import ApexCharts to avoid SSR issues.
const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ----- Provider Helper Functions ----- //
function getWeb3Provider(selectedNetwork) {
  // If a wallet is connected, use its provider.
  if (window.ethereum && window.ethereum.selectedAddress) {
    console.log("Using wallet provider:", window.ethereum);
    return new Web3(window.ethereum);
  }
  // Otherwise, create a Web3 instance using the RPC URL from selectedNetwork.
  return new Web3(new Web3.providers.HttpProvider(selectedNetwork.rpc));
}

async function getEthersProvider(selectedNetwork) {
  const FALLBACK_RPC = selectedNetwork.rpc;
  if (window.ethereum && window.ethereum.selectedAddress) {
    console.log("Using wallet ethers provider:", window.ethereum);
    return new ethers.providers.Web3Provider(window.ethereum);
  }
  console.log("Using fallback ethers provider:", FALLBACK_RPC);
  return new ethers.providers.JsonRpcProvider(FALLBACK_RPC);
}


// ----- Helper Functions for Providers ----- //

/**
 * Returns a Web3 provider instance:
 * - If the wallet is connected (window.ethereum.selectedAddress exists), use that.
 * - Otherwise, use a fallback RPC URL.
 */
/**
function getWeb3Provider() {
  const FALLBACK_RPC = "https://rpc.ankr.com/electroneum_testnet";
  if (window.ethereum && window.ethereum.selectedAddress) {
    return new Web3(window.ethereum);
  }
  return new Web3(FALLBACK_RPC);
}
*/
/**
 * Returns an ethers.js provider:
 * - If the wallet is connected, use window.ethereum.
 * - Otherwise, use the fallback RPC URL.
 */
/**
async function getEthersProvider() {
  const { ethers } = await import("ethers");
  const FALLBACK_RPC = "https://rpc.ankr.com/electroneum_testnet";
  if (window.ethereum && window.ethereum.selectedAddress) {
    return new ethers.providers.Web3Provider(window.ethereum);
  }
  return new ethers.providers.JsonRpcProvider(FALLBACK_RPC);
}
*/

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

// ----- Off-Chain Aggregator Logic (for Router Page) ----- //

// We'll bucket data every 60 seconds.
// ----- Aggregator Logic ----- //
// We bucket events in 60-second intervals.
// We'll bucket data in 60-second intervals.
// Bucket interval in seconds.
const BUCKET_INTERVAL = 60;
const AGGREGATOR_INTERVAL = BUCKET_INTERVAL;

// Listen for events and bucket the data.
async function startAggregator(routerAddress, aggregatorBuckets, selectedNetwork) {
  if (!routerAddress) return;
  if (aggregatorBuckets[routerAddress]) return; // Already started

  aggregatorBuckets[routerAddress] = {};

  const provider = await getEthersProvider(selectedNetwork);
  const contract = new ethers.Contract(routerAddress, routerABI, provider);

  // Listen for TradeExecuted events.
  contract.on("TradeExecuted", (trader, tradeType, timestamp, ethAmount, tokenAmount, price) => {
    try {
      const ts = timestamp.toNumber();
      const p = parseFloat(ethers.utils.formatUnits(price, 18));
      const vol = parseFloat(ethers.utils.formatUnits(ethAmount, 18));
      const bucketStart = Math.floor(ts / AGGREGATOR_INTERVAL) * AGGREGATOR_INTERVAL;
      const buckets = aggregatorBuckets[routerAddress];
      if (!buckets[bucketStart]) {
        buckets[bucketStart] = { startTime: bucketStart, open: p, high: p, low: p, close: p, volume: vol };
      } else {
        buckets[bucketStart].high = Math.max(buckets[bucketStart].high, p);
        buckets[bucketStart].low = Math.min(buckets[bucketStart].low, p);
        buckets[bucketStart].close = p;
        buckets[bucketStart].volume += vol;
      }
      console.log(`Off-chain (TradeExecuted): Price ${p} at bucket ${bucketStart}`);
    } catch (err) {
      console.error("Error processing TradeExecuted event:", err);
    }
  });

  // Listen for PriceSnapshot events.
  contract.on("PriceSnapshot", (timestamp, price) => {
    try {
      const ts = timestamp.toNumber();
      const p = parseFloat(ethers.utils.formatUnits(price, 18));
      const bucketStart = Math.floor(ts / AGGREGATOR_INTERVAL) * AGGREGATOR_INTERVAL;
      const buckets = aggregatorBuckets[routerAddress];
      if (!buckets[bucketStart]) {
        buckets[bucketStart] = { startTime: bucketStart, open: p, high: p, low: p, close: p, volume: 0 };
      } else {
        buckets[bucketStart].high = Math.max(buckets[bucketStart].high, p);
        buckets[bucketStart].low = Math.min(buckets[bucketStart].low, p);
        buckets[bucketStart].close = p;
      }
      console.log(`Off-chain (PriceSnapshot): Price ${p} at bucket ${bucketStart}`);
    } catch (err) {
      console.error("Error processing PriceSnapshot event:", err);
    }
  });

  console.log(`Started aggregator for router ${routerAddress}`);
}

function getAggregatedData(routerAddress, aggregatorBuckets) {
  const buckets = aggregatorBuckets[routerAddress] || {};
  const bucketArray = Object.values(buckets);
  bucketArray.sort((a, b) => a.startTime - b.startTime);
  return bucketArray;
}

// Fallback: Fetch getPriceHistory from contract.
async function fetchFallbackPriceHistory(routerAddress, selectedNetwork) {
  try {
    const web3 = getWeb3Provider(selectedNetwork);
    const routerContract = new web3.eth.Contract(routerABI, routerAddress);
    const history = await routerContract.methods.getPriceHistory().call();
    const historyArray = Array.isArray(history) ? history : Object.values(history);
    const fallbackData = historyArray.map((item) => {
      const ts = item.timestamp || item[0];
      const pr = item.price || item[1];
      if (!ts || !pr) return null;
      const time = Number(ts) * 1000;
      const p = parseFloat(web3.utils.fromWei(pr, "ether"));
      return {
        startTime: Math.floor(time / 1000),
        open: p,
        high: p,
        low: p,
        close: p,
        volume: 0
      };
    }).filter(Boolean);
    console.log("Fallback getPriceHistory:", fallbackData);
    return fallbackData;
  } catch (error) {
    console.error("Fallback getPriceHistory error:", error);
    return [];
  }
}

// ----- Error Boundary for ApexChart -----
import React from "react";
class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ApexChart Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <div>Error rendering chart: {this.state.error.message}</div>;
    }
    return this.props.children;
  }
}

// ----- Router Page Component -----
export default function RouterPage() {
  const params = useParams();
  const routerAddress = params.router || params.token;
  const { selectedNetwork } = useContext(NetworkContext);

  // Basic state hooks.
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
  const [aggregatedData, setAggregatedData] = useState([]);

  // Ref to hold aggregator buckets.
  const aggregatorRef = useRef({});

  // Start aggregator and update aggregated data every 5 seconds.
  useEffect(() => {
    if (!routerAddress) {
      setStatus("Router address not specified in URL.");
      return;
    }
    (async () => {
      await startAggregator(routerAddress, aggregatorRef.current, selectedNetwork);
    })();
    const interval = setInterval(async () => {
      let data = getAggregatedData(routerAddress, aggregatorRef.current);
      // If no off-chain data, use fallback.
      if (data.length === 0) {
        data = await fetchFallbackPriceHistory(routerAddress, selectedNetwork);
      }
      setAggregatedData(data);
      console.log("Aggregated OHLCV Data:", data);
    }, 5000);
    return () => clearInterval(interval);
  }, [routerAddress, selectedNetwork]);

  // Standard initialization for wallet, token info, etc.
  useEffect(() => {
    if (!routerAddress) {
      setStatus("Router address not specified in URL.");
      return;
    }
    initPage();
  }, [routerAddress]);

  async function initPage() {
    if (!window.ethereum) {
      setStatus("Please install MetaMask.");
      return;
    }
    try {
      const web3 = getWeb3Provider(selectedNetwork);
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
      const web3 = getWeb3Provider(selectedNetwork);
      const routerContract = new web3.eth.Contract(routerABI, routerAddress);
      const rawPrice = await routerContract.methods.getCurrentBondingPrice().call();
      const priceInNative = web3.utils.fromWei(rawPrice, "ether");
      setPrice(priceInNative);
      console.log("getCurrentBondingPrice:", priceInNative);
    } catch (err) {
      console.error("Error fetching price:", err);
    }
  }

  async function fetchPriceHistory() {
    try {
      const web3 = getWeb3Provider(selectedNetwork);
      const routerContract = new web3.eth.Contract(routerABI, routerAddress);
      const history = await routerContract.methods.getPriceHistory().call();
      const historyArray = Array.isArray(history) ? history : Object.values(history);
      const formattedHistory = historyArray.map(item => {
        if (item && typeof item === "object") {
          return {
            time: Number(item.timestamp) * 1000,
            value: Number(web3.utils.fromWei(item.price, "ether"))
          };
        }
        return null;
      }).filter(Boolean);
      setPriceHistory(formattedHistory);
      console.log("getPriceHistory:", formattedHistory);
      window.priceHistoryData = formattedHistory;
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

  async function handleBuy() {
    if (!account) return setStatus("Connect your wallet first.");
    const sanitizedInput = buyEthAmount.replace(/\s/g, "");
    if (!sanitizedInput || Number(sanitizedInput.replace(/,/g, "")) <= 0) {
      return setStatus("Enter a valid amount to spend.");
    }
    setStatus("Buying tokens...");
    try {
      const web3 = getWeb3Provider(selectedNetwork);
      const routerContract = new web3.eth.Contract(routerABI, routerAddress);
      const safeMin = "1";
      const amounts = buyEthAmount.split(",").map(s => s.trim()).filter(Boolean);
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
    if (!account) return setStatus("Connect your wallet first.");
    if (!sellTokenAmount && !sellPercentage)
      return setStatus("Enter a valid token amount or percentage to sell.");
    setStatus("Selling tokens...");
    try {
      const web3 = getWeb3Provider(selectedNetwork);
      const routerContract = new web3.eth.Contract(routerABI, routerAddress);
      const tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);
      const convertToTokenAmount = (amountStr) => {
        return new BN(10).pow(new BN(decimals)).mul(new BN(amountStr));
      };
      let tokenAmount;
      if (sellPercentage) {
        const balance = await tokenContract.methods.balanceOf(account).call();
        const percentageDecimal = new BN(sellPercentage).mul(new BN(balance)).div(new BN(100));
        tokenAmount = percentageDecimal;
      } else {
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
    if (!account) return setStatus("Connect your wallet to post a message.");
    if (!chatInput.trim()) return;
    setStatus("Posting chat message...");
    try {
      const web3 = getWeb3Provider(selectedNetwork);
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

  // ----- ApexCharts Options & Series for Candlestick Chart ----- //
  const chartOptions = {
    chart: {
      type: "candlestick",
      height: 400,
      animations: { enabled: true }
    },
    title: { text: `${tokenSymbol || "Token"} Price History`, align: "left" },
    xaxis: { type: "datetime" },
    yaxis: { tooltip: { enabled: true } },
    tooltip: { x: { format: "dd MMM HH:mm" } }
  };

  const chartSeries = [
    {
      name: "Price",
      data: aggregatedData.map((bucket) => ({
        x: new Date(bucket.startTime * 1000),
        y: [bucket.open, bucket.high, bucket.low, bucket.close]
      }))
    }
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
              maxWidth: "1200px",
              width: "100%"
            }}
          >
            <div
              className="chart-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px"
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
                      cursor: "pointer"
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <ChartErrorBoundary>
              {aggregatedData.length ? (
                <ApexChart options={chartOptions} series={chartSeries} type="candlestick" height={400} />
              ) : (
                <div style={{ textAlign: "center", color: "#888", padding: "20px", fontSize: "1rem" }}>
                  No trades yet. Make a trade to see the chart update.
                </div>
              )}
            </ChartErrorBoundary>
          </div>
        </div>

        {/* Trade Panel */}
        <div className="trade-panel">
          <div className="trade-tabs">
            <button className={isBuy ? "tab-btn active" : "tab-btn"} onClick={() => setIsBuy(true)}>
              buy
            </button>
            <button className={!isBuy ? "tab-btn active-sell" : "tab-btn"} onClick={() => setIsBuy(false)}>
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



// ----- Helper for "time ago" formatting -----
function timeSince(timestamp) {
  if (!timestamp) return "";
  const now = Date.now();
  const secondsPast = Math.floor((now - timestamp) / 1000);
  if (secondsPast < 60) return `${secondsPast}s`;
  if (secondsPast < 3600) return `${Math.floor(secondsPast / 60)}m`;
  if (secondsPast < 86400) return `${Math.floor(secondsPast / 3600)}h`;
  return `${Math.floor(secondsPast / 86400)}d`;
}
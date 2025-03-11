'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Web3 from 'web3';
import BN from 'bn.js';
import '../../pumpfun-router.css';

// Import Chart.js with a line chart configuration
import { Chart as ChartJS, CategoryScale, LinearScale, TimeScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

// --- Router Contract ABI ---
const routerABI = [
  {
    "inputs": [],
    "name": "getCurrentBondingPrice",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "minTokensOut", "type": "uint256" }],
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
  },
  {
    "inputs": [{ "internalType": "string", "name": "message", "type": "string" }],
    "name": "postChatMessage",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "buyer", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "netEthSpent", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "tokensMinted", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "treasuryFee", "type": "uint256" }
    ],
    "name": "TokensPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "seller", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "tokensBurned", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "nativeReturned", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "feeRetained", "type": "uint256" }
    ],
    "name": "TokensSold",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "message", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "ChatMessage",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "token",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  // The PriceSnapshot event is emitted on every trade to record the price history.
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "timestamp", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "price", "type": "uint256" }
    ],
    "name": "PriceSnapshot",
    "type": "event"
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

  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

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

  // New state to hold our trading line data (price history)
  const [priceHistory, setPriceHistory] = useState([]);

  // Initialization
  useEffect(() => {
    if (!routerAddress) {
      setStatus("Router address not specified in URL.");
      return;
    }
    initPage();
  }, [routerAddress]);

  // Periodic updates (price, trades, chat, and price history)
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

  // Update chart when priceHistory changes (we use it for trading line)
  useEffect(() => {
    if (chartRef.current) {
      updateChart();
    }
  }, [priceHistory]);

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

  // Fetch trading line data from PriceSnapshot events
  async function fetchPriceHistory() {
    try {
      const web3 = new Web3(window.ethereum);
      const routerContract = new web3.eth.Contract(routerABI, routerAddress);
      const events = await routerContract.getPastEvents("PriceSnapshot", {
        fromBlock: 0,
        toBlock: "latest"
      });
      // Map events into data points: x is timestamp (in ms), y is price in native unit
      const history = events.map(ev => {
        const ts = Number(ev.returnValues.timestamp) * 1000;
        const pricePoint = Number(web3.utils.fromWei(ev.returnValues.price, "ether"));
        return { x: ts, y: pricePoint };
      });
      // Sort by timestamp
      history.sort((a, b) => a.x - b.x);
      setPriceHistory(history);
    } catch (err) {
      console.error("Error fetching price history:", err);
    }
  }

  // Process trade events into candlestick data (original function; not used in line chart)
  function processCandlestickData(tradeData) {
    const grouped = {};
    tradeData.forEach(trade => {
      const ts = Number(trade.timestamp);
      if (!ts) return;
      const date = new Date(ts * 1000);
      const key = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()).getTime();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(trade);
    });

    const candlesticks = Object.keys(grouped).sort().map(timeKey => {
      const groupTrades = grouped[timeKey];
      let open, high, low, close;
      groupTrades.forEach((t, i) => {
        if (Number(t.tokenAmount) === 0) return;
        let tradePrice = 0;
        if (t.type === "buy") {
          tradePrice = Number(Web3.utils.fromWei(String(t.netEthSpent), "ether")) / Number(t.tokenAmount);
        } else if (t.type === "sell") {
          tradePrice = Number(Web3.utils.fromWei(String(t.ethReturned), "ether")) / Number(t.tokenAmount);
        }
        if (!tradePrice || isNaN(tradePrice) || !isFinite(tradePrice)) {
          tradePrice = i === 0 ? 0 : close;
        }
        if (i === 0) {
          open = high = low = close = tradePrice;
        } else {
          if (tradePrice > high) high = tradePrice;
          if (tradePrice < low) low = tradePrice;
          close = tradePrice;
        }
      });
      return { x: new Date(Number(timeKey)), o: open || 0, h: high || 0, l: low || 0, c: close || 0 };
    });

    return candlesticks;
  }

  // Update the chart to display a trading line based on priceHistory
  function updateChart() {
    if (!chartRef.current) return;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }
    const ctx = chartRef.current.getContext('2d');
    chartInstanceRef.current = new ChartJS(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: `${tokenSymbol || 'Token'} Price History`,
          data: priceHistory,
          fill: false,
          borderColor: 'rgba(75, 192, 192, 1)',
          tension: 0.1,
          pointRadius: 2
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            type: 'time',
            time: { unit: 'minute' },
            title: { display: true, text: 'Time' }
          },
          y: {
            title: { display: true, text: 'Price' }
          }
        },
        plugins: { legend: { display: true } }
      }
    });
  }

  async function fetchTrades() {
    try {
      const web3 = new Web3(window.ethereum);
      const routerContract = new web3.eth.Contract(routerABI, routerAddress);
      // Fetch buy events
      const purchaseEvents = await routerContract.getPastEvents("TokensPurchased", {
        fromBlock: 0,
        toBlock: "latest"
      });
      const purchases = await Promise.all(
        purchaseEvents.map(async (ev) => {
          const block = await web3.eth.getBlock(ev.blockNumber);
          return {
            type: "buy",
            timestamp: block.timestamp,
            netEthSpent: ev.returnValues.netEthSpent,
            tokenAmount: ev.returnValues.tokensMinted,
            trader: ev.returnValues.buyer
          };
        })
      );
      // Fetch sell events
      const saleEvents = await routerContract.getPastEvents("TokensSold", {
        fromBlock: 0,
        toBlock: "latest"
      });
      const sales = await Promise.all(
        saleEvents.map(async (ev) => {
          const block = await web3.eth.getBlock(ev.blockNumber);
          return {
            type: "sell",
            timestamp: block.timestamp,
            ethReturned: ev.returnValues.nativeReturned,
            tokenAmount: ev.returnValues.tokensBurned,
            trader: ev.returnValues.seller
          };
        })
      );
      const allTrades = [...purchases, ...sales].sort((a, b) => a.timestamp - b.timestamp);
      setTrades(allTrades);
      // We update the chart using priceHistory, so no need to call updateChart(trades) here.
    } catch (err) {
      console.error("Error fetching trades:", err);
    }
  }

  async function fetchChatMessages() {
    try {
      const web3 = new Web3(window.ethereum);
      const routerContract = new web3.eth.Contract(routerABI, routerAddress);
      const chatEvents = await routerContract.getPastEvents("ChatMessage", { fromBlock: 0, toBlock: "latest" });
      const chats = chatEvents.map(ev => ({
        sender: ev.returnValues.sender,
        message: ev.returnValues.message,
        timestamp: ev.returnValues.timestamp
      })).sort((a, b) => b.timestamp - a.timestamp);
      setChatMessages(chats);
    } catch (err) {
      console.error("Error fetching chat messages:", err);
    }
  }

  async function handleBuy() {
    if (!account) return setStatus("Connect your wallet first.");
    if (!buyEthAmount || Number(buyEthAmount) <= 0) return setStatus("Enter a valid amount to spend.");
    setStatus("Buying tokens...");
    try {
      const web3 = new Web3(window.ethereum);
      const routerContract = new web3.eth.Contract(routerABI, routerAddress);
      const valueWei = web3.utils.toWei(buyEthAmount, "ether");
      const rawPrice = await routerContract.methods.getCurrentBondingPrice().call();
      const valueWeiBN = new BN(valueWei);
      const rawPriceBN = new BN(rawPrice);
      const oneEtherBN = new BN("1000000000000000000");
      const tokensToMintBN = valueWeiBN.mul(oneEtherBN).div(rawPriceBN);
      const slippageBN = new BN(slippageTolerance);
      const hundredBN = new BN("100");
      const minTokensOutBN = tokensToMintBN.mul(hundredBN.sub(slippageBN)).div(hundredBN);

      await routerContract.methods.buyTokens(minTokensOutBN.toString()).send({ from: account, value: valueWei });
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
    if (!sellTokenAmount || Number(sellTokenAmount) <= 0) return setStatus("Enter a valid token amount to sell.");
    setStatus("Selling tokens...");
    try {
      const web3 = new Web3(window.ethereum);
      const routerContract = new web3.eth.Contract(routerABI, routerAddress);
      const tokenAmount = web3.utils.toBN(10).pow(web3.utils.toBN(decimals)).muln(Number(sellTokenAmount));
      await routerContract.methods.sellTokens(tokenAmount).send({ from: account });
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
            <canvas ref={chartRef} className="trade-chart" />
          </div>
        </div>

        {/* Trade Panel */}
        <div className="trade-panel">
          <div className="trade-tabs">
            <button className={isBuy ? "tab-btn active" : "tab-btn"} onClick={() => setIsBuy(true)}>buy</button>
            <button className={!isBuy ? "tab-btn active-sell" : "tab-btn"} onClick={() => setIsBuy(false)}>sell</button>
          </div>
          <div className="slippage-link">set max slippage</div>
          {isBuy ? (
            <div className="buy-panel">
              <div className="input-row">
                <input
                  type="number"
                  placeholder="0.00"
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

function timeSince(timestamp) {
  if (!timestamp) return "";
  const now = Date.now();
  const secondsPast = Math.floor((now - Number(timestamp) * 1000) / 1000);
  if (secondsPast < 60) return `${secondsPast}s`;
  if (secondsPast < 3600) return `${Math.floor(secondsPast / 60)}m`;
  if (secondsPast < 86400) return `${Math.floor(secondsPast / 3600)}h`;
  return `${Math.floor(secondsPast / 86400)}d`;
}

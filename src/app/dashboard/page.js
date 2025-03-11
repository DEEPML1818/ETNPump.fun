'use client';

import { useState, useEffect, useContext } from 'react';
import Web3 from 'web3';
import Link from 'next/link';
import '../pumpfun-dashboard.css';
import { NetworkContext } from '../NetworkProvider';

const factoryABI = [
  {
    "inputs": [],
    "name": "getDeployedTokens",
    "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDeployedRouters",
    "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "creator", "type": "address" },
      { "indexed": false, "internalType": "address", "name": "tokenAddress", "type": "address" },
      { "indexed": false, "internalType": "address", "name": "routerAddress", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "name", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "symbol", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "initialSupply", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "description", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "telegram", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "xProfile", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "website", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "imageURL", "type": "string" }
    ],
    "name": "TokenAndRouterCreated",
    "type": "event"
  }
];

const routerTradeEventABI = {
  "anonymous": false,
  "inputs": [
    { "indexed": true, "internalType": "address", "name": "trader", "type": "address" },
    { "indexed": false, "internalType": "address", "name": "tokenAddress", "type": "address" },
    { "indexed": false, "internalType": "bool", "name": "isBuy", "type": "bool" },
    { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
    { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
  ],
  "name": "Trade",
  "type": "event"
};

export default function DashboardPage() {
  const { selectedNetwork } = useContext(NetworkContext);
  const [account, setAccount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [tokens, setTokens] = useState([]);
  const [filters, setFilters] = useState(["meme", "nft", "stonks", "compression", "degen"]);
  const [activeFilter, setActiveFilter] = useState("");
  const [status, setStatus] = useState("");

  // Use the factory address from the selected network
  const factoryAddress = selectedNetwork.factoryAddress;

  useEffect(() => {
    async function init() {
      if (window.ethereum) {
        try {
          const web3 = new Web3(window.ethereum);
          const accounts = await web3.eth.requestAccounts();
          if (accounts.length > 0) setAccount(accounts[0]);

          // Create a contract instance using the dynamic factory address
          const factory = new web3.eth.Contract(factoryABI, factoryAddress);
          // Fetch all TokenAndRouterCreated events
          const creationEvents = await factory.getPastEvents("TokenAndRouterCreated", {
            fromBlock: 0,
            toBlock: "latest"
          });
          // Parse events into token data
          const tokenData = creationEvents.map(ev => {
            const { creator, tokenAddress, routerAddress, name, symbol, initialSupply, timestamp, description, telegram, xProfile, website, imageURL } = ev.returnValues;
            const createdAtMs = Number(timestamp) * 1000;
            return { creator, tokenAddress, routerAddress, name, symbol, initialSupply, createdAt: createdAtMs, description, telegram, xProfile, website, imageURL };
          });

          // Enrich tokens with total tokens bought from Trade events
          const enrichedPromises = tokenData.map(async (item) => {
            let boughtTotal = 0;
            try {
              if (item.routerAddress) {
                const router = new web3.eth.Contract([routerTradeEventABI], item.routerAddress);
                const tradeEvents = await router.getPastEvents("Trade", {
                  filter: { tokenAddress: item.tokenAddress },
                  fromBlock: 0,
                  toBlock: "latest"
                });
                tradeEvents.forEach(ev => {
                  if (ev.returnValues.isBuy) {
                    boughtTotal += Number(ev.returnValues.amount);
                  }
                });
              }
            } catch (err) {
              console.error("Error fetching trade events for token", item.tokenAddress, err);
            }
            return { ...item, bought: boughtTotal };
          });

          const enriched = await Promise.all(enrichedPromises);
          setTokens(enriched);
          setStatus(`Found ${enriched.length} tokens.`);
        } catch (err) {
          console.error(err);
          setStatus("Failed to load tokens.");
        }
      } else {
        setStatus("Please install MetaMask.");
      }
    }
    init();
  }, [factoryAddress]);

  const filteredTokens = tokens.filter(token => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      token.name.toLowerCase().includes(term) ||
      token.symbol.toLowerCase().includes(term) ||
      token.description.toLowerCase().includes(term);
    const matchesFilter = activeFilter ? token.description.toLowerCase().includes(activeFilter) : true;
    return matchesSearch && matchesFilter;
  });

  const handleSearch = (e) => setSearchTerm(e.target.value);
  const selectFilter = (filter) => setActiveFilter(filter === activeFilter ? "" : filter);

  return (
    <div className="dashboard-page">
      {/* Animated Ticker */}
      <div className="ticker-container">
        <div className="ticker-text">
          {"Live feed: new tokens & trades will appear here..."}
        </div>
      </div>
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <h1>[start a new coin]</h1>
        <p className="subtext">{account ? `Connected as ${account}` : 'Not connected'}</p>
      </div>
      {/* Top Actions */}
      <div className="top-actions">
        <Link href="/create-token">
          <button className="start-coin-btn">start a new coin</button>
        </Link>
        <div className="search-box">
          <input
            type="text"
            placeholder="search for token"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </div>
      {/* Filter Buttons */}
      <div className="filter-row">
        {filters.map((f, idx) => (
          <button
            key={idx}
            className="filter-btn"
            style={{ backgroundColor: activeFilter === f ? '#00d18f' : undefined }}
            onClick={() => selectFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      {status && <p style={{ textAlign: 'center', marginBottom: '1rem' }}>{status}</p>}
      {/* Token Feed */}
      <div className="token-feed">
        {filteredTokens.map((token, idx) => {
          const timeAgo = timeSince(token.createdAt);
          const boughtReadable = (Number(token.bought) / 1e18).toFixed(2);
          const displayImage = token.imageURL && token.imageURL.trim() !== ""
            ? token.imageURL
            : "https://via.placeholder.com/64?text=No+Img";
          return (
            <div className="token-row" key={idx}>
              <img src={displayImage} alt="token" className="token-img" />
              <div className="token-info">
                <div className="token-name">{token.name} ({token.symbol})</div>
                <div className="token-desc">{token.description}</div>
                <div className="token-meta">Created {timeAgo} ago</div>
                <div className="token-meta">Initial Supply: {Number(token.initialSupply) / 1e18}</div>
                <div className="token-meta">Tokens Bought: {boughtReadable}</div>
                <div className="token-socials">
                  {token.telegram && (<a href={token.telegram} target="_blank" rel="noopener noreferrer">Telegram</a>)}
                  {token.xProfile && (<a href={token.xProfile} target="_blank" rel="noopener noreferrer">X</a>)}
                  {token.website && (<a href={token.website} target="_blank" rel="noopener noreferrer">Website</a>)}
                </div>
              </div>
              <div className="token-actions">
                <Link href={`/router/${token.routerAddress}`}>
                  <button className="trade-btn">Trade</button>
                </Link>
              </div>
            </div>
          );
        })}
        {filteredTokens.length === 0 && (
          <p style={{ textAlign: 'center', color: '#ccc' }}>
            No tokens match your search/filter.
          </p>
        )}
      </div>
    </div>
  );
}

// Helper function for "time ago" formatting
function timeSince(timestamp) {
  if (!timestamp) return "";
  const now = Date.now();
  const secondsPast = Math.floor((now - timestamp) / 1000);
  if (secondsPast < 60) return `${secondsPast}s`;
  if (secondsPast < 3600) return `${Math.floor(secondsPast / 60)}m`;
  if (secondsPast < 86400) return `${Math.floor(secondsPast / 3600)}h`;
  return `${Math.floor(secondsPast / 86400)}d`;
}

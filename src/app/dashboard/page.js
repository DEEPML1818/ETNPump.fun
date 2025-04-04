'use client';

import { useState, useEffect, useContext } from 'react';
import Web3 from 'web3';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import '../pumpfun-dashboard.css';
import { NetworkContext } from '../NetworkProvider';

// ----- Helper: Provider Fallback using selectedNetwork -----
function getWeb3Provider(selectedNetwork) {
  if (window.ethereum && window.ethereum.selectedAddress) {
    console.log("Using wallet provider:", window.ethereum);
    return new Web3(window.ethereum);
  }
  return new Web3(new Web3.providers.HttpProvider(selectedNetwork.rpc));
}

// ----- Your ABIs (fill these in with your actual ABIs) -----
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
  const [loading, setLoading] = useState(true);

  const factoryAddress = selectedNetwork.factoryAddress;

  useEffect(() => {
    async function init() {
      const web3 = getWeb3Provider(selectedNetwork);
      const isFallback = !(window.ethereum && window.ethereum.selectedAddress);
      try {
        const accounts = await web3.eth.requestAccounts().catch(() => []);
        if (accounts.length > 0) setAccount(accounts[0]);
        const factory = new web3.eth.Contract(factoryABI, factoryAddress);
        const creationEvents = await factory.getPastEvents("TokenAndRouterCreated", {
          fromBlock: 0,
          toBlock: "latest"
        });
        const tokenData = creationEvents.map(ev => {
          const { creator, tokenAddress, routerAddress, name, symbol, initialSupply, timestamp, description, telegram, xProfile, website, imageURL } = ev.returnValues;
          return { 
            creator, 
            tokenAddress, 
            routerAddress, 
            name, 
            symbol, 
            initialSupply, 
            createdAt: Number(timestamp) * 1000, 
            description, 
            telegram, 
            xProfile, 
            website, 
            imageURL 
          };
        });
        const enrichedPromises = tokenData.map(async (item) => {
          let boughtTotal = 0;
          try {
            if (item.routerAddress) {
              const router = new web3.eth.Contract([routerTradeEventABI], item.routerAddress);
              let tradeEvents;
              if (isFallback) {
                tradeEvents = await router.getPastEvents("Trade", { fromBlock: 0, toBlock: "latest" });
                tradeEvents = tradeEvents.filter(ev =>
                  ev.returnValues.tokenAddress.toLowerCase() === item.tokenAddress.toLowerCase()
                );
              } else {
                tradeEvents = await router.getPastEvents("Trade", {
                  filter: { tokenAddress: item.tokenAddress },
                  fromBlock: 0,
                  toBlock: "latest"
                });
              }
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
      setLoading(false);
    }
    init();
  }, [factoryAddress, selectedNetwork]);

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

  // Framer Motion variants for overall page and elements.
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.5 } },
    exit: { opacity: 0, transition: { duration: 0.3 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, delay: i * 0.1 }
    })
  };

  const buttonVariants = {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  };

  return (
    <motion.div
      className="dashboard-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Animated Ticker */}
      <motion.div className="ticker-container" whileHover={{ scale: 1.02 }}>
        <motion.div className="ticker-text" animate={{ x: ['100%', '-100%'] }} transition={{ duration: 20, ease: "linear", repeat: Infinity }}>
          Live feed: new tokens & trades will appear here...
        </motion.div>
      </motion.div>
      {/* Dashboard Header */}
      <motion.div className="dashboard-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1>[start a new coin]</h1>
        <p className="subtext">
          {account ? `Connected as ${account}` : 'Not connected'}
        </p>
      </motion.div>
      {/* Top Actions */}
      <motion.div className="top-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <Link href="/create-token" passHref>
          <motion.button
            className="start-coin-btn"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            start a new coin
          </motion.button>
        </Link>
        <motion.div className="search-box" variants={buttonVariants}>
          <input type="text" placeholder="search for token" value={searchTerm} onChange={handleSearch} />
        </motion.div>
      </motion.div>
      {/* Filter Buttons */}
      <motion.div className="filter-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        {filters.map((f, idx) => (
          <motion.button
            key={idx}
            className="filter-btn"
            style={{ backgroundColor: activeFilter === f ? '#00d18f' : undefined }}
            onClick={() => selectFilter(f)}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            {f}
          </motion.button>
        ))}
      </motion.div>
      {status && <motion.p style={{ textAlign: 'center', marginBottom: '1rem' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{status}</motion.p>}
      {/* Token Feed */}
      <motion.div className="token-feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <AnimatePresence>
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <motion.div
                className="token-card skeleton"
                key={idx}
                custom={idx}
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={cardVariants}
              >
                <div className="skeleton-img" style={{ width: 48, height: 48, borderRadius: '50%', background: '#444', marginBottom: '0.5rem' }}></div>
                <div className="skeleton-info" style={{ width: '80%', height: 10, background: '#444', marginBottom: '0.3rem' }}></div>
                <div className="skeleton-info" style={{ width: '60%', height: 8, background: '#444' }}></div>
              </motion.div>
            ))
          ) : (
            filteredTokens.map((token, idx) => {
              const displayImage = token.imageURL && token.imageURL.trim() !== ""
                ? token.imageURL
                : "https://via.placeholder.com/64?text=No+Img";
              return (
                <motion.div
                  className="token-card"
                  key={idx}
                  custom={idx}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={cardVariants}
                >
                  <img src={displayImage} alt="token" className="token-img" />
                  <div className="token-info">
                    <div className="token-name">
                      {token.name} ({token.symbol})
                    </div>
                    <div className="token-desc">{token.description}</div>
                    <div className="token-meta">Created {timeSince(token.createdAt)} ago</div>
                  </div>
                  <div className="token-actions">
                    <Link href={`/router/${token.routerAddress}`} passHref>
                      <motion.button
                        className="trade-btn"
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        Trade
                      </motion.button>
                    </Link>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
        {!loading && filteredTokens.length === 0 && (
          <motion.p style={{ textAlign: 'center', color: '#ccc' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            No tokens match your search/filter.
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}

// Helper for "time ago" formatting.
function timeSince(timestamp) {
  if (!timestamp) return "";
  const now = Date.now();
  const secondsPast = Math.floor((now - timestamp) / 1000);
  if (secondsPast < 60) return `${secondsPast}s`;
  if (secondsPast < 3600) return `${Math.floor(secondsPast / 60)}m`;
  if (secondsPast < 86400) return `${Math.floor(secondsPast / 3600)}h`;
  return `${Math.floor(secondsPast / 86400)}d`;
}

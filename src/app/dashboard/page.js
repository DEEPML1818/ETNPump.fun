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

// Minimal ABI for the router's live price method.
// Adjust this as needed.
const routerABI = [
  {
    "inputs": [],
    "name": "getCurrentBondingPrice",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// Minimal Transfer event ABI for token mints.
const tokenTransferEventABI = {
  "anonymous": false,
  "inputs": [
    { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
    { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
    { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
  ],
  "name": "Transfer",
  "type": "event"
};

// Framer Motion variants.
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

// --- TokenCard Component ---
// Fetches live price every 5 seconds and displays token info.
function TokenCard({ token, idx }) {
  const { selectedNetwork } = useContext(NetworkContext);
  const [livePrice, setLivePrice] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const displayImage =
    token.imageURL && token.imageURL.trim() !== ""
      ? token.imageURL
      : "https://via.placeholder.com/64?text=No+Img";

  useEffect(() => {
    async function fetchPrice() {
      try {
        const web3 = getWeb3Provider(selectedNetwork);
        const router = new web3.eth.Contract(routerABI, token.routerAddress);
        const rawPrice = await router.methods.getCurrentBondingPrice().call();
        const priceInNative = web3.utils.fromWei(rawPrice, "ether");
        setLivePrice(priceInNative);
      } catch (err) {
        console.error("Error fetching live price for token", token.tokenAddress, err);
      }
    }
    fetchPrice();
    const interval = setInterval(fetchPrice, 5000);
    return () => clearInterval(interval);
  }, [selectedNetwork, token.routerAddress, token.tokenAddress]);

  return (
    <>
      <motion.div
        className="token-card"
        custom={idx}
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={cardVariants}
        whileHover={{ scale: 1.1 }}
        style={{ position: 'relative', cursor: 'pointer' }}
        onClick={() => setShowModal(true)}
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
              onClick={(e) => e.stopPropagation()}
            >
              Trade
            </motion.button>
          </Link>
        </div>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000
            }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              transition={{ duration: 0.2 }}
              style={{
                background: '#fff',
                padding: '2rem',
                borderRadius: '8px',
                maxWidth: '500px',
                width: '90%',
                color: '#000'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <p><strong>Description:</strong> {token.description}</p>
              <p><strong>Live Price:</strong> {livePrice ? `${livePrice} ETH` : "Loading..."}</p>
              <p><strong>Bought Recently:</strong> {token.bought}</p>
              <p>
                <strong>Social:</strong>
                {token.telegram && (
                  <a href={token.telegram} target="_blank" rel="noopener noreferrer" style={{ color: '#00d18f', marginLeft: 5 }}>
                    Telegram
                  </a>
                )}
                {token.xProfile && (
                  <a href={token.xProfile} target="_blank" rel="noopener noreferrer" style={{ color: '#00d18f', marginLeft: 5 }}>
                    XProfile
                  </a>
                )}
                {token.website && (
                  <a href={token.website} target="_blank" rel="noopener noreferrer" style={{ color: '#00d18f', marginLeft: 5 }}>
                    Website
                  </a>
                )}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// --- DashboardPage Component ---
export default function DashboardPage() {
  const { selectedNetwork } = useContext(NetworkContext);
  const [account, setAccount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [tokens, setTokens] = useState([]);
  const [filters, setFilters] = useState(["meme", "nft", "stonks", "compression", "degen"]);
  const [activeFilter, setActiveFilter] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState("featured");

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
          const {
            creator, tokenAddress, routerAddress, name, symbol,
            initialSupply, timestamp, description, telegram, xProfile, website, imageURL
          } = ev.returnValues;
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
            imageURL,
            bought: 0,         // initialize bought count
            lastUpdatedBlock: 0  // for tracking event updates
          };
        });

        // Enrich tokens with total tokens bought from initial trade events.
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

  // --- Off-Chain Bought Update Effect ---
// This effect polls every 10 seconds to fetch new trade and mint events.
  useEffect(() => {
    if (!tokens.length) return;
    async function updateBought() {
      const web3 = getWeb3Provider(selectedNetwork);
      const latestBlock = await web3.eth.getBlockNumber();
      const updatedTokens = await Promise.all(tokens.map(async token => {
        let additionalBought = 0;
        try {
          // 1. Get new trade events from the router.
          const router = new web3.eth.Contract([routerTradeEventABI], token.routerAddress);
          const routerEvents = await router.getPastEvents("Trade", {
            filter: { tokenAddress: token.tokenAddress },
            fromBlock: token.lastUpdatedBlock || 0,
            toBlock: "latest"
          });
          routerEvents.forEach(ev => {
            if (ev.returnValues.isBuy) {
              additionalBought += Number(ev.returnValues.amount);
            }
          });

          // 2. Get new mint events from the token (Transfer from zero address).
          const tokenContract = new web3.eth.Contract([tokenTransferEventABI], token.tokenAddress);
          const transferEvents = await tokenContract.getPastEvents("Transfer", {
            filter: { from: "0x0000000000000000000000000000000000000000" },
            fromBlock: token.lastUpdatedBlock || 0,
            toBlock: "latest"
          });
          transferEvents.forEach(ev => {
            additionalBought += Number(ev.returnValues.value);
          });

          return { ...token, bought: token.bought + additionalBought, lastUpdatedBlock: latestBlock };
        } catch (err) {
          console.error("Error updating bought for token", token.tokenAddress, err);
          return token;
        }
      }));
      setTokens(updatedTokens);
    }
    const interval = setInterval(updateBought, 10000);
    return () => clearInterval(interval);
  }, [tokens, selectedNetwork]);

  // Filter tokens by search and filter criteria.
  let filteredTokens = tokens.filter(token => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      token.name.toLowerCase().includes(term) ||
      token.symbol.toLowerCase().includes(term) ||
      token.description.toLowerCase().includes(term);

    const matchesFilter = activeFilter
      ? token.description.toLowerCase().includes(activeFilter)
      : true;

    return matchesSearch && matchesFilter;
  });

  // Sort tokens based on the selected sort option.
  switch (sortOption) {
    case 'featured':
      break;
    case 'lastTrade':
      filteredTokens.sort((a, b) => b.bought - a.bought);
      break;
    case 'creationTime':
      filteredTokens.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case 'lastReply':
      filteredTokens.reverse();
      break;
    case 'marketCap':
      filteredTokens.sort((a, b) => b.initialSupply - a.initialSupply);
      break;
    default:
      break;
  }

  const handleSearch = (e) => setSearchTerm(e.target.value);
  const selectFilter = (filter) => setActiveFilter(filter === activeFilter ? "" : filter);
  const handleSortChange = (e) => setSortOption(e.target.value);

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
        <motion.div
          className="ticker-text"
          animate={{ x: ['100%', '-100%'] }}
          transition={{ duration: 20, ease: "linear", repeat: Infinity }}
        >
          Live feed: new tokens & trades will appear here...
        </motion.div>
      </motion.div>

      {/* Dashboard Header */}
      <motion.div
        className="dashboard-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>[start a new coin]</h1>
        <p className="subtext">
          {account ? `Connected as ${account}` : 'Not connected'}
        </p>
      </motion.div>

      {/* Top Actions */}
      <motion.div
        className="top-actions"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
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
          <input
            type="text"
            placeholder="search for token"
            value={searchTerm}
            onChange={handleSearch}
          />
        </motion.div>
        <motion.div className="sorter" style={{ marginLeft: '1rem' }}>
          <select value={sortOption} onChange={handleSortChange}>
            <option value="featured">sort: featured 🔥</option>
            <option value="lastTrade">sort: last trade</option>
            <option value="creationTime">sort: creation time</option>
            <option value="lastReply">sort: last reply</option>
            <option value="marketCap">sort: market cap</option>
          </select>
        </motion.div>
      </motion.div>

      {/* Filter Buttons */}
      <motion.div
        className="filter-row"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
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

      {status && (
        <motion.p
          style={{ textAlign: 'center', marginBottom: '1rem' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {status}
        </motion.p>
      )}

      {/* Token Feed */}
      <motion.div
        className="token-feed"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
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
                <div
                  className="skeleton-img"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#444',
                    marginBottom: '0.5rem'
                  }}
                ></div>
                <div
                  className="skeleton-info"
                  style={{
                    width: '80%',
                    height: 10,
                    background: '#444',
                    marginBottom: '0.3rem'
                  }}
                ></div>
                <div
                  className="skeleton-info"
                  style={{
                    width: '60%',
                    height: 8,
                    background: '#444'
                  }}
                ></div>
              </motion.div>
            ))
          ) : (
            filteredTokens.map((token, idx) => (
              <TokenCard key={idx} token={token} idx={idx} />
            ))
          )}
        </AnimatePresence>
        {!loading && filteredTokens.length === 0 && (
          <motion.p
            style={{ textAlign: 'center', color: '#ccc' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
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

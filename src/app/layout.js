'use client';

import { useState, useEffect, useContext, useCallback } from 'react';
import Link from 'next/link';
import Web3 from 'web3';
import Web3Modal from 'web3modal';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { NetworkContext, NETWORKS } from './NetworkProvider';

export default function RootLayout({ children }) {
  const { selectedNetwork, setSelectedNetwork } = useContext(NetworkContext);
  const [account, setAccount] = useState("");
  const [recentTxs, setRecentTxs] = useState([]);
  const [provider, setProvider] = useState(null);
  const [web3Modal, setWeb3Modal] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [web3Instance, setWeb3Instance] = useState(null);

  // Initialize Web3Modal on mount
  useEffect(() => {
    // For WalletConnect, we provide a decimal -> RPC mapping
    const rpcMapping = NETWORKS.reduce((acc, net) => {
      const chainIdDecimal = parseInt(net.chainId, 16); 
      acc[chainIdDecimal] = net.rpc;
      return acc;
    }, {});

    const providerOptions = {
      walletconnect: {
        package: WalletConnectProvider,
        options: { rpc: rpcMapping }
      }
    };

    const web3ModalInstance = new Web3Modal({
      cacheProvider: true,
      providerOptions
    });
    setWeb3Modal(web3ModalInstance);
  }, []);

  // Load a fallback Web3 provider if no wallet is connected
  const loadDefaultProvider = useCallback(() => {
    const defaultWeb3 = new Web3(new Web3.providers.HttpProvider(selectedNetwork.rpc));
    setWeb3Instance(defaultWeb3);
  }, [selectedNetwork]);

  /**
   * Attempt to switch to the selected chain. If MetaMask doesn't have it,
   * fallback to adding the chain as a custom network.
   */
  const switchOrAddChain = useCallback(async (externalProvider, network) => {
    const { chainId, rpc, nativeCurrency, blockExplorerUrls, name } = network;
    try {
      // Try switching
      await externalProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }]
      });
    } catch (switchError) {
      // If chain is missing, add it
      if (switchError.code === 4902) {
        try {
          await externalProvider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId,
              chainName: name,
              rpcUrls: [rpc],
              nativeCurrency,
              blockExplorerUrls
            }]
          });
        } catch (addError) {
          console.error("Failed to add chain:", addError);
        }
      } else {
        console.error("Failed to switch chain:", switchError);
      }
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!web3Modal) return;
    setConnecting(true);
    try {
      // Open Web3Modal
      const externalProvider = await web3Modal.connect();
      // Switch or add chain in MetaMask
      await switchOrAddChain(externalProvider, selectedNetwork);

      setProvider(externalProvider);
      const web3 = new Web3(externalProvider);
      setWeb3Instance(web3);

      // Retrieve accounts
      const accounts = await web3.eth.getAccounts();
      if (accounts.length > 0) setAccount(accounts[0]);

      // Listen for account or chain changes
      externalProvider.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) setAccount(accounts[0]);
        else setAccount("");
      });
      externalProvider.on('chainChanged', (chainId) => {
        // chainId is in hex, so find matching network
        const newNet = NETWORKS.find(n => n.chainId.toLowerCase() === chainId.toLowerCase());
        if (newNet) {
          console.log('Chain changed to:', newNet);
          setSelectedNetwork(newNet);
        } else {
          console.log('Unknown chain:', chainId);
        }
      });
    } catch (err) {
      console.error('Error connecting wallet:', err);
    } finally {
      setConnecting(false);
    }
  }, [web3Modal, selectedNetwork, setSelectedNetwork, switchOrAddChain]);

  const disconnectWallet = async () => {
    if (web3Modal) {
      await web3Modal.clearCachedProvider();
    }
    setProvider(null);
    setWeb3Instance(null);
    setAccount("");
    loadDefaultProvider();
  };

  // Auto-connect if there's a cached provider
  useEffect(() => {
    if (web3Modal && web3Modal.cachedProvider) {
      connectWallet();
    } else {
      loadDefaultProvider();
    }
  }, [web3Modal, connectWallet, loadDefaultProvider]);

  // If no provider, load the fallback
  useEffect(() => {
    if (!provider) {
      loadDefaultProvider();
    }
  }, [selectedNetwork, provider, loadDefaultProvider]);

  // Poll for recent TokenAndRouterCreated events (ticker)
  useEffect(() => {
    async function fetchRecentTxs() {
      if (!web3Instance) return;
      const FACTORY_ADDRESS = selectedNetwork.factoryAddress;
      const factoryABI = [
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
      const factory = new web3Instance.eth.Contract(factoryABI, FACTORY_ADDRESS);
      try {
        const currentBlock = Number(await web3Instance.eth.getBlockNumber());
        const fromBlock = currentBlock > 1000 ? currentBlock - 1000 : 0;
        const events = await factory.getPastEvents("TokenAndRouterCreated", {
          fromBlock,
          toBlock: currentBlock
        });
        const txs = events.map(ev => {
          const ts = Number(ev.returnValues.timestamp);
          const dateStr = new Date(ts * 1000).toLocaleTimeString();
          return `${ev.returnValues.name} created at ${dateStr}`;
        });
        setRecentTxs(txs);
      } catch (err) {
        console.error("Error fetching events:", err);
      }
    }
    fetchRecentTxs();
    const interval = setInterval(fetchRecentTxs, 10000);
    return () => clearInterval(interval);
  }, [web3Instance, selectedNetwork]);

  // Handle network change from dropdown
  const handleNetworkChange = (e) => {
    const newChainId = e.target.value; // e.g. '0xca3e'
    const newNet = NETWORKS.find(n => n.chainId.toLowerCase() === newChainId.toLowerCase());
    if (newNet) {
      console.log("Network updated to:", newNet);
      setSelectedNetwork(newNet);
    }
  };

  return (
    <html lang="en">
      <head>
        <style>{`
          html, body, #__next {
            margin: 0;
            padding: 0;
            height: 100%;
          }
        `}</style>
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <header style={layoutStyles.header}>
          <nav>
            <Link href="/create-token" style={layoutStyles.navLink}>Create Token</Link>
            <Link href="/dashboard" style={layoutStyles.navLink}>Dashboard</Link>
          </nav>
          <div style={layoutStyles.rightHeader}>
            <select
              value={selectedNetwork.chainId.toLowerCase()}
              onChange={handleNetworkChange}
              style={layoutStyles.networkSelect}
            >
              {NETWORKS.map(net => (
                <option key={net.chainId} value={net.chainId.toLowerCase()}>
                  {net.name}
                </option>
              ))}
            </select>
            {account ? (
              <>
                <span style={layoutStyles.accountText}>
                  {account.slice(0,6)}...{account.slice(-4)}
                </span>
                <button onClick={disconnectWallet} style={layoutStyles.disconnectBtn}>
                  Disconnect
                </button>
              </>
            ) : (
              <button onClick={connectWallet} style={layoutStyles.connectBtn} disabled={connecting}>
                {connecting ? "Connecting..." : "Connect ETn Wallet"}
              </button>
            )}
          </div>
        </header>
        <div style={layoutStyles.ticker}>
          {recentTxs.length > 0 ? recentTxs.join('   •   ') : "No recent transactions."}
        </div>
        <main>{children}</main>
        <footer style={layoutStyles.footer}>
          &copy; {new Date().getFullYear()} Welcome to ETNPump.fun
        </footer>
      </body>
    </html>
  );
}

const layoutStyles = {
  header: {
    background: '#222',
    color: '#fff',
    padding: '0.8rem 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  navLink: {
    marginRight: '1rem',
    color: 'inherit',
    textDecoration: 'none'
  },
  rightHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  accountText: {
    fontSize: '0.9rem'
  },
  connectBtn: {
    background: '#00d18f',
    border: 'none',
    color: '#fff',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  disconnectBtn: {
    background: '#ff1744',
    border: 'none',
    color: '#fff',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  networkSelect: {
    padding: '0.4rem',
    borderRadius: '4px',
    border: '1px solid #ccc'
  },
  ticker: {
    background: '#111',
    color: '#aaa',
    padding: '0.5rem 1rem',
    overflow: 'hidden',
    whiteSpace: 'nowrap'
  },
  footer: {
    background: '#222',
    color: '#ccc',
    textAlign: 'center',
    padding: '0.8rem 1rem'
  }
};

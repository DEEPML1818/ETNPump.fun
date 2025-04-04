'use client';

import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CustomButton from './components/CustomButton'; // adjust the import path accordingly

import Web3 from 'web3';
import Web3Modal from 'web3modal';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { motion, AnimatePresence } from 'framer-motion';

// Define your networks
export const NETWORKS = [
  {
    name: 'Electroneum Testnet',
    chainId: '0x4f5e0c', // (decimal 5201420 in hex)
    rpc: 'https://rpc.ankr.com/electroneum_testnet',
    factoryAddress: '0xf5fFE110c76cb856653e678265f7FD237f359327',
    nativeCurrency: { name: 'Electroneum Test', symbol: 'ETNt', decimals: 18 },
    blockExplorerUrls: ['https://electroneum-testnet-explorer.com']
  },
  {
    name: 'Electroneum Mainnet',
    chainId: '0xcb2e', // (decimal 52014 in hex)
    rpc: 'https://api.electroneum.com',
    factoryAddress: '0x51bB68D79a509B6d4E0022608B27A700f2dd3eAA',
    nativeCurrency: { name: 'Electroneum', symbol: 'ETN', decimals: 18 },
    blockExplorerUrls: ['https://electroneum-block-explorer.com']
  }
];

// Create the context
export const NetworkContext = createContext({
  selectedNetwork: NETWORKS[0],
  setSelectedNetwork: () => {}
});

// Wrap your app in the provider
function NetworkProvider({ children }) {
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS[0]);

  useEffect(() => {
    const stored = localStorage.getItem("selectedNetwork");
    if (stored) {
      const net = NETWORKS.find(n => n.chainId === stored);
      if (net) setSelectedNetwork(net);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("selectedNetwork", selectedNetwork.chainId);
  }, [selectedNetwork]);

  return (
    <NetworkContext.Provider value={{ selectedNetwork, setSelectedNetwork }}>
      {children}
    </NetworkContext.Provider>
  );
}

// Logo component with a logo image and a "BETA" badge.
function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <Image 
        src="/etnpumpfunlogo.png"  // now points to the file in public folder
        alt="ETNPump.fun Logo" 
        width={40} 
        height={40} 
        style={{ marginRight: '8px' }}
      />
      <span 
        style={{
          background: '#00d18f',
          padding: '0.2rem 0.5rem',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '0.9rem',
          fontWeight: 'bold'
        }}
      >
        BETA
      </span>
    </div>
  );
}

// Notification component for new transactions
function TransactionNotification({ tx, onDismiss }) {
  return (
    <motion.div
      className="tx-notification"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      style={{
        background: '#00d18f',
        color: '#fff',
        padding: '0.5rem 1rem',
        borderRadius: '4px',
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 1000
      }}
    >
      <div>New transaction: {tx}</div>
      <button onClick={onDismiss} style={{
        background: 'transparent',
        border: 'none',
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: '1rem',
        cursor: 'pointer'
      }}>
        X
      </button>
    </motion.div>
  );
}

// Now your main layout that also uses the network context
export default function RootLayout({ children }) {
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
        <NetworkProvider>
          <MainLayout>{children}</MainLayout>
        </NetworkProvider>
      </body>
    </html>
  );
}

// MainLayout component contains your header, select, and other logic.
function MainLayout({ children }) {
  const { selectedNetwork, setSelectedNetwork } = useContext(NetworkContext);
  const [account, setAccount] = useState("");
  const [recentTxs, setRecentTxs] = useState([]);
  const [provider, setProvider] = useState(null);
  const [web3Modal, setWeb3Modal] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [web3Instance, setWeb3Instance] = useState(null);

  // Initialize Web3Modal
  useEffect(() => {
    const rpcMapping = NETWORKS.reduce((acc, net) => {
      acc[parseInt(net.chainId, 16)] = net.rpc;
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

  const loadDefaultProvider = useCallback(() => {
    const defaultWeb3 = new Web3(new Web3.providers.HttpProvider(selectedNetwork.rpc));
    setWeb3Instance(defaultWeb3);
  }, [selectedNetwork]);

  const switchOrAddChain = useCallback(async (externalProvider, network) => {
    const { chainId, rpc, nativeCurrency, blockExplorerUrls, name } = network;
    try {
      await externalProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }]
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await externalProvider.request({
            method: 'wallet_addEthereumChain',
            params: [{ chainId, chainName: name, rpcUrls: [rpc], nativeCurrency, blockExplorerUrls }]
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
      const externalProvider = await web3Modal.connect();
      await switchOrAddChain(externalProvider, selectedNetwork);
      setProvider(externalProvider);
      const web3 = new Web3(externalProvider);
      setWeb3Instance(web3);

      const accounts = await web3.eth.getAccounts();
      if (accounts.length > 0) setAccount(accounts[0]);

      externalProvider.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) setAccount(accounts[0]);
        else setAccount("");
      });
      externalProvider.on('chainChanged', (chainId) => {
        const newNet = NETWORKS.find(n => n.chainId.toLowerCase() === chainId.toLowerCase());
        if (newNet) setSelectedNetwork(newNet);
      });

      // Simulate a new transaction notification after wallet connect.
      setRecentTxs(prev => [...prev, 'Wallet connected']);
    } catch (err) {
      console.error('Error connecting wallet:', err);
    } finally {
      setConnecting(false);
    }
  }, [web3Modal, selectedNetwork, setSelectedNetwork, switchOrAddChain]);

  const disconnectWallet = async () => {
    if (web3Modal) await web3Modal.clearCachedProvider();
    setProvider(null);
    setWeb3Instance(null);
    setAccount("");
    loadDefaultProvider();
  };

  useEffect(() => {
    if (web3Modal && web3Modal.cachedProvider) connectWallet();
    else loadDefaultProvider();
  }, [web3Modal, connectWallet, loadDefaultProvider]);

  useEffect(() => {
    if (!provider) loadDefaultProvider();
  }, [selectedNetwork, provider, loadDefaultProvider]);

  const handleNetworkChange = (e) => {
    const newChainId = e.target.value;
    const newNet = NETWORKS.find(n => n.chainId.toLowerCase() === newChainId.toLowerCase());
    if (newNet) setSelectedNetwork(newNet);
  };

  // Animation variants for header buttons and page elements.
  const buttonVariants = {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  };

  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.5 } },
    exit: { opacity: 0, transition: { duration: 0.3 } }
  };

  return (
    <>
      <motion.header
        style={{
          background: '#222',
          color: '#fff',
          padding: '0.8rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
        variants={pageVariants}
        initial="initial"
        animate="animate"
      >
        <motion.div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Logo />
          <nav>
            <Link href="/create-token" legacyBehavior>
              <motion.a
                style={{ marginRight: '1rem', color: 'inherit', textDecoration: 'none' }}
                variants={buttonVariants}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
              >
                Create Token
              </motion.a>
            </Link>
            <Link href="/dashboard" legacyBehavior>
              <motion.a
                style={{ marginRight: '1rem', color: 'inherit', textDecoration: 'none' }}
                variants={buttonVariants}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
              >
                Dashboard
              </motion.a>
            </Link>
          </nav>
        </motion.div>
        <motion.div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <motion.select
            value={selectedNetwork.chainId.toLowerCase()}
            onChange={handleNetworkChange}
            style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            {NETWORKS.map(net => (
              <option key={net.chainId} value={net.chainId.toLowerCase()}>
                {net.name}
              </option>
            ))}
          </motion.select>
          {account ? (
            <>
              <motion.span style={{ fontSize: '0.9rem' }}>
                {account.slice(0,6)}...{account.slice(-4)}
              </motion.span>
              <motion.button
                onClick={disconnectWallet}
                style={{
                  background: '#ff1744',
                  border: 'none',
                  color: '#fff',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                Disconnect
              </motion.button>
            </>
          ) : (
            <motion.button
              onClick={connectWallet}
              style={{
                background: '#00d18f',
                border: 'none',
                color: '#fff',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              disabled={connecting}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              {connecting ? "Connecting..." : "Connect ETn Wallet"}
            </motion.button>
          )}
        </motion.div>
      </motion.header>
      
      <motion.main variants={pageVariants} initial="initial" animate="animate">
        {children}
      </motion.main>
      
      <motion.footer
        style={{
          background: '#222',
          color: '#ccc',
          textAlign: 'center',
          padding: '0.8rem 1rem'
        }}
        variants={pageVariants}
        initial="initial"
        animate="animate"
      >
        &copy; {new Date().getFullYear()} Welcome to ETNPump.fun
      </motion.footer>

      {/* Transaction Notifications */}
      <AnimatePresence>
        {recentTxs.map((tx, index) => (
          <TransactionNotification
            key={index}
            tx={tx}
            onDismiss={() =>
              setRecentTxs(prev => prev.filter((_, i) => i !== index))
            }
          />
        ))}
      </AnimatePresence>
    </>
  );
}

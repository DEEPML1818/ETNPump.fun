// NetworkProvider.js
'use client';

import { createContext, useState, useEffect } from 'react';

// Define your networks with chainId, RPC and factory address.
export const NETWORKS = [
    {
        name: 'Electroneum Testnet',
        chainId: '0x4f5e0c', // (decimal 5201420 in hex)
        rpc: 'https://rpc.ankr.com/electroneum_testnet',
        factoryAddress: '0x0b64F3BF753646967baE5f508F4f14E99FB06ed4'
        nativeCurrency: {
          name: 'Electroneum Test',
          symbol: 'ETNt',
          decimals: 18
        },
        blockExplorerUrls: ['https://electroneum-testnet-explorer.com']
      },
    {
      name: 'Electroneum Mainnet',
      chainId: '0xcb2e', // (decimal 52014 in hex)
      rpc: 'https://api.electroneum.com',
      factoryAddress: '0x51bB68D79a509B6d4E0022608B27A700f2dd3eAA',
      nativeCurrency: {
        name: 'Electroneum',
        symbol: 'ETN',
        decimals: 18
      },
      blockExplorerUrls: ['https://electroneum-block-explorer.com']
    }
];
    
  

export const NetworkContext = createContext({
  selectedNetwork: NETWORKS[0],
  setSelectedNetwork: () => {}
});

export function NetworkProvider({ children }) {
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS[0]);

  // If you want, you can load the chosen network from localStorage on mount:
  useEffect(() => {
    const stored = localStorage.getItem("selectedNetwork");
    if (stored) {
      const net = NETWORKS.find(n => n.chainId === stored);
      if (net) {
        setSelectedNetwork(net);
      }
    }
  }, []);

  // When the network changes, save to localStorage (optional)
  useEffect(() => {
    localStorage.setItem("selectedNetwork", selectedNetwork.chainId);
  }, [selectedNetwork]);

  return (
    <NetworkContext.Provider value={{ selectedNetwork, setSelectedNetwork }}>
      {children}
    </NetworkContext.Provider>
  );
}

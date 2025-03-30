// scripts/spamTokensFactory.js
const { ethers } = require("hardhat");

async function main() {
  // Set your custom treasury address here (or supply via environment variable).
  const CUSTOM_TREASURY = process.env.TREASURY_ADDRESS || "";
  // Set your PumpFunFactory contract address here (or supply via environment variable).
  const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS || "0xc17625a5CABB51F6239dc865D91fd6e4eE6b7783";

  // Retrieve signers.
  const [deployer, user1, user2] = await ethers.getSigners();

  // Use the custom treasury if provided; otherwise, default to the deployer.
  const treasuryAddress = CUSTOM_TREASURY !== "" ? CUSTOM_TREASURY : deployer.address;

  console.log("Deployer:", deployer.address);
  console.log("Treasury:", treasuryAddress);
  console.log("User1:", user1.address);
  console.log("User2:", user2.address);
  console.log("Factory Address:", FACTORY_ADDRESS);

  // Define bonding parameters (example values)
  const TARGET_NATIVE = ethers.parseEther("1000000"); // e.g., target native reserve in wei
  // For initial supply, we use 1,000,000 tokens (with 18 decimals)
  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  // The factory will set targetToken equal to initialSupply.
  // The factory uses a default max sell amount as defined in the contract.

  // Get the PumpFunFactory contract instance.
  const PumpFunFactory = await ethers.getContractFactory("PumpFunFactory");
  const factory = PumpFunFactory.attach(FACTORY_ADDRESS);

  // Define token definitions (feel free to adjust names, symbols, descriptions, and use real image URLs)
  const tokenDefinitions = [
    { name: "Bitcoin", symbol: "BTC", description: "The original cryptocurrency.", image: "https://cryptologos.cc/logos/bitcoin-btc-logo.png?v=014" },
    { name: "Ethereum", symbol: "ETH", description: "Decentralized platform for smart contracts.", image: "https://cryptologos.cc/logos/ethereum-eth-logo.png?v=014" },
    { name: "Ripple", symbol: "XRP", description: "Digital payment protocol for fast cross-border transfers.", image: "https://cryptologos.cc/logos/xrp-xrp-logo.png?v=014" },
    { name: "Litecoin", symbol: "LTC", description: "A peer-to-peer cryptocurrency.", image: "https://cryptologos.cc/logos/litecoin-ltc-logo.png?v=014" },
    { name: "Cardano", symbol: "ADA", description: "A blockchain platform for changemakers.", image: "https://cryptologos.cc/logos/cardano-ada-logo.png?v=014" },
    { name: "Polkadot", symbol: "DOT", description: "Interoperability among blockchains.", image: "https://cryptologos.cc/logos/polkadot-new-dot-logo.png?v=014" },
    { name: "Binance Coin", symbol: "BNB", description: "Native coin of Binance exchange.", image: "https://cryptologos.cc/logos/binance-coin-bnb-logo.png?v=014" },
    { name: "Chainlink", symbol: "LINK", description: "Decentralized oracle network.", image: "https://cryptologos.cc/logos/chainlink-link-logo.png?v=014" },
    { name: "Stellar", symbol: "XLM", description: "Open network for storing and moving money.", image: "https://cryptologos.cc/logos/stellar-xlm-logo.png?v=014" },
    { name: "Dogecoin", symbol: "DOGE", description: "Meme-inspired cryptocurrency.", image: "https://cryptologos.cc/logos/dogecoin-doge-logo.png?v=014" },
    { name: "Solana", symbol: "SOL", description: "High-performance blockchain supporting builders.", image: "https://cryptologos.cc/logos/solana-sol-logo.png?v=014" },
    { name: "Uniswap", symbol: "UNI", description: "Decentralized trading protocol.", image: "https://cryptologos.cc/logos/uniswap-uni-logo.png?v=014" },
    { name: "Aave", symbol: "AAVE", description: "Decentralized lending system.", image: "https://cryptologos.cc/logos/aave-aave-logo.png?v=014" },
    { name: "VeChain", symbol: "VET", description: "Supply chain management solution.", image: "https://cryptologos.cc/logos/vechain-vet-logo.png?v=014" },
    { name: "Theta", symbol: "THETA", description: "Decentralized video delivery network.", image: "https://cryptologos.cc/logos/theta-theta-logo.png?v=014" },
    { name: "TRON", symbol: "TRX", description: "Blockchain-based operating system.", image: "https://cryptologos.cc/logos/tron-trx-logo.png?v=014" },
    { name: "EOS", symbol: "EOS", description: "Blockchain protocol powered by DPoS.", image: "https://cryptologos.cc/logos/eos-eos-logo.png?v=014" },
    { name: "Monero", symbol: "XMR", description: "Privacy-focused cryptocurrency.", image: "https://cryptologos.cc/logos/monero-xmr-logo.png?v=014" },
    { name: "IOTA", symbol: "MIOTA", description: "Designed for the Internet of Things.", image: "https://cryptologos.cc/logos/iota-miota-logo.png?v=014" },
    { name: "NEO", symbol: "NEO", description: "Smart economy platform.", image: "https://cryptologos.cc/logos/neo-neo-logo.png?v=014" },
    { name: "Tezos", symbol: "XTZ", description: "Self-amending cryptographic ledger.", image: "https://cryptologos.cc/logos/tezos-xtz-logo.png?v=014" },
    { name: "Cosmos", symbol: "ATOM", description: "The internet of blockchains.", image: "https://cryptologos.cc/logos/cosmos-atom-logo.png?v=014" },
    { name: "Algorand", symbol: "ALGO", description: "Scalable, secure blockchain.", image: "https://cryptologos.cc/logos/algorand-algo-logo.png?v=014" },
    { name: "Bitcoin Cash", symbol: "BCH", description: "Peer-to-peer electronic cash.", image: "https://cryptologos.cc/logos/bitcoin-cash-bch-logo.png?v=014" }
  ];

  // Arrays to store created token and router addresses for later stress testing.
  const deployedRouters = [];
  const deployedTokens = [];

  // Loop through each token definition, create the token and router via the factory,
  // and then attach the PumpFunRouter instance.
  for (const tokenDef of tokenDefinitions) {
    console.log(`\nCreating token: ${tokenDef.name} (${tokenDef.symbol})`);
    // Call the factory's createToken function.
    const tx = await factory.createToken(
      tokenDef.name,
      tokenDef.symbol,
      INITIAL_SUPPLY,
      tokenDef.description,
      tokenDef.image,
      TARGET_NATIVE
    );
    const receipt = await tx.wait();
    
    // Manually parse the logs for the TokenAndRouterCreated event.
    let tokenAddress, routerAddress;
    const iface = factory.interface;
    for (const log of receipt.logs) {
      try {
        const parsedLog = iface.parseLog(log);
        if (parsedLog.name === "TokenAndRouterCreated") {
          tokenAddress = parsedLog.args.tokenAddress;
          routerAddress = parsedLog.args.routerAddress;
          break;
        }
      } catch (err) {
        continue; // Skip logs that don't belong to our factory
      }
    }
    if (!tokenAddress || !routerAddress) {
      console.error("TokenAndRouterCreated event not found for", tokenDef.name);
      continue;
    }
    console.log(`${tokenDef.name} token deployed at: ${tokenAddress}`);
    console.log(`${tokenDef.name} router deployed at: ${routerAddress}`);

    deployedTokens.push(tokenAddress);
    deployedRouters.push(routerAddress);

    // Attach the PumpFunRouter contract for interactions.
    const PumpFunRouter = await ethers.getContractFactory("PumpFunRouter");
    const router = PumpFunRouter.attach(routerAddress);

    // ---- Stress Test the Router Functions ----
    console.log(`\n=== Stress Testing ${tokenDef.name} Router ===`);

    // Batch Buy: Perform 10 iterations (alternating between small and larger ETH amounts) by user1.
    for (let j = 0; j < 10; j++) {
      const buyAmount = (j % 2 === 0)
        ? ethers.parseEther("0.1")
        : ethers.parseEther("1");
      console.log(`Iteration ${j + 1}: User1 buying with ${buyAmount.toString()} wei`);
      const txBuy = await router.connect(user1).batchBuy([buyAmount], [0], { value: buyAmount });
      await txBuy.wait();
    }
    const priceHistory = await router.getPriceHistory();
    console.log(`Price history length after buys: ${priceHistory.length}`);

    // Batch Sell: Let user1 sell tokens in 5 iterations (selling one-fifth of their balance each time).
    const PumpFunToken = await ethers.getContractFactory("PumpFunToken");
    const tokenInstance = PumpFunToken.attach(tokenAddress);
    const user1TokenBalance = await tokenInstance.balanceOf(user1.address); // returns bigint in ethers v6
    if (user1TokenBalance > 0n) {
      for (let k = 0; k < 5; k++) {
        const sellAmount = user1TokenBalance / 5n;
        console.log(`Iteration ${k + 1}: User1 selling ${sellAmount.toString()} token wei`);
        try {
          const txSell = await router.connect(user1).batchSell([sellAmount]);
          await txSell.wait();
        } catch (error) {
          console.error("Sell failed (possibly due to max sell limit):", error.message);
        }
      }
    } else {
      console.log("User1 has no tokens to sell for", tokenDef.name);
    }

    // Skip the administrative updates (updateMaxSellAmount, pause/resume) if not available.
    // Additional Transactions: User2 performs 5 iterations of buys and sells.
    for (let m = 0; m < 5; m++) {
      const buyAmountUser2 = ethers.parseEther("0.05");
      console.log(`User2 iteration ${m + 1}: buying with ${buyAmountUser2.toString()} wei`);
      const txBuy2 = await router.connect(user2).batchBuy([buyAmountUser2], [0], { value: buyAmountUser2 });
      await txBuy2.wait();

      const user2TokenBalance = await tokenInstance.balanceOf(user2.address);
      if (user2TokenBalance > 0n) {
        const sellAmountUser2 = user2TokenBalance / 3n;
        console.log(`User2 iteration ${m + 1}: selling ${sellAmountUser2.toString()} token wei`);
        const txSell2 = await router.connect(user2).batchSell([sellAmountUser2]);
        await txSell2.wait();
      }
    }
  }

  console.log("\nStress testing complete. Deployed tokens and routers:");
  console.log("Tokens:", deployedTokens);
  console.log("Routers:", deployedRouters);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error during stress test:", error);
    process.exit(1);
  });

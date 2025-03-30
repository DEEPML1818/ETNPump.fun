const { expect } = require("chai");
const { ethers } = require("hardhat");

// Log a quick test to ensure ethers is defined
// console.log("1 ETH in wei:", ethers.utils.parseEther("1"));

describe("PumpFunRouter", function () {
  let pumpFunToken, pumpFunRouter;
  let owner, addr1, addr2, treasury;

  // Bonding curve parameters:
  // TARGET_NATIVE is set to 1,000,000 ETH (in wei) for this test example.
  const TARGET_NATIVE = ethers.utils.parseEther("1000000"); 
  // TARGET_TOKEN is an example token supply (in token wei).
  const TARGET_TOKEN = ethers.BigNumber.from("1000000000000000000000000"); 
  let initialPrice;

  beforeEach(async function () {
    // Get signers from Hardhat.
    [owner, addr1, addr2, treasury] = await ethers.getSigners();

    // Deploy the PumpFunToken contract.
    // This token must have mint, burn, totalSupply, balanceOf, name, and symbol functions.
    const PumpFunTokenFactory = await ethers.getContractFactory("PumpFunToken");
    pumpFunToken = await PumpFunTokenFactory.deploy("PumpFun Token", "PUMP", TARGET_TOKEN);
    await pumpFunToken.deployed();

    // Deploy the PumpFunRouter contract.
    const PumpFunRouterFactory = await ethers.getContractFactory("PumpFunRouter");
    pumpFunRouter = await PumpFunRouterFactory.deploy(
      pumpFunToken.address,
      TARGET_NATIVE,
      TARGET_TOKEN,
      treasury.address,
      // maxSellAmount (for example, 1e22 token wei)
      ethers.BigNumber.from("10000000000000000000000")
    );
    await pumpFunRouter.deployed();

    // Calculate the initial price: (TARGET_NATIVE * 1e18) / TARGET_TOKEN.
    initialPrice = TARGET_NATIVE.mul(ethers.BigNumber.from("1000000000000000000")).div(TARGET_TOKEN);
  });

  describe("Deployment and Initial State", function () {
    it("Should set the correct bonding curve parameters", async function () {
      expect(await pumpFunRouter.targetNative()).to.equal(TARGET_NATIVE);
      expect(await pumpFunRouter.targetToken()).to.equal(TARGET_TOKEN);
      expect(await pumpFunRouter.initialPrice()).to.equal(initialPrice);
      expect(await pumpFunRouter.treasury()).to.equal(treasury.address);
      expect(await pumpFunRouter.liquidityPool()).to.equal(pumpFunRouter.address);
    });

    it("Should return the correct current bonding price initially", async function () {
      // Initially, effectiveNative equals targetNative and effectiveToken equals targetToken.
      const price = await pumpFunRouter.getCurrentBondingPrice();
      expect(price).to.equal(initialPrice);
    });
  });

  describe("Buying Tokens", function () {
    it("Should let a user buy tokens and mint treasury fee correctly", async function () {
      // addr1 buys tokens via batchBuy with a single operation.
      const ethAmount = ethers.utils.parseEther("1"); // 1 ETH
      const minTokensOut = 0; // Set to zero for test simplicity.

      await expect(
        pumpFunRouter.connect(addr1).batchBuy([ethAmount], [minTokensOut], { value: ethAmount })
      ).to.emit(pumpFunRouter, "TokensPurchased");

      // Verify addr1 received tokens.
      const addr1TokenBalance = await pumpFunToken.balanceOf(addr1.address);
      expect(addr1TokenBalance).to.be.gt(0);

      // Verify treasury received its fee tokens.
      const treasuryTokenBalance = await pumpFunToken.balanceOf(treasury.address);
      expect(treasuryTokenBalance).to.be.gt(0);

      // Check that the price history was updated.
      const priceHistory = await pumpFunRouter.getPriceHistory();
      expect(priceHistory.length).to.equal(1);
    });

    it("Should perform batch buys in one transaction", async function () {
      // Simulate two buys in one batchBuy call.
      const amount1 = ethers.utils.parseEther("1");
      const amount2 = ethers.utils.parseEther("2");
      const totalEth = amount1.add(amount2);

      await pumpFunRouter.connect(addr1).batchBuy([amount1, amount2], [0, 0], { value: totalEth });
      
      // Expect two price snapshots.
      const priceHistory = await pumpFunRouter.getPriceHistory();
      expect(priceHistory.length).to.equal(2);
    });
  });

  describe("Selling Tokens", function () {
    beforeEach(async function () {
      // Let addr1 buy tokens first.
      const ethAmount = ethers.utils.parseEther("2");
      await pumpFunRouter.connect(addr1).batchBuy([ethAmount], [0], { value: ethAmount });
    });

    it("Should allow a user to sell tokens and receive native coin (after dynamic fee)", async function () {
      // Retrieve addr1's token balance.
      const tokenBalance = await pumpFunToken.balanceOf(addr1.address);
      expect(tokenBalance).to.be.gt(0);

      // Sell half of addr1's tokens.
      const sellAmount = tokenBalance.div(2);

      // Record addr1's native coin balance before selling.
      const initialEthBalance = await ethers.provider.getBalance(addr1.address);

      // Execute the sell via batchSell.
      const tx = await pumpFunRouter.connect(addr1).batchSell([sellAmount]);
      const receipt = await tx.wait();

      // Check that the TokensSold event was emitted.
      const soldEvent = receipt.events.find((e) => e.event === "TokensSold");
      expect(soldEvent).to.not.be.undefined;

      // Verify that addr1's token balance decreased.
      const postSellTokenBalance = await pumpFunToken.balanceOf(addr1.address);
      expect(postSellTokenBalance).to.be.lt(tokenBalance);

      // Ensure price history got an additional snapshot.
      const priceHistory = await pumpFunRouter.getPriceHistory();
      expect(priceHistory.length).to.be.greaterThan(1);
    });

    it("Should revert sell operations when sells are paused", async function () {
      // Pause sell operations.
      await pumpFunRouter.connect(owner).setSellPaused(true);

      // Expect the sell to revert.
      const tokenBalance = await pumpFunToken.balanceOf(addr1.address);
      await expect(
        pumpFunRouter.connect(addr1).batchSell([tokenBalance.div(10)])
      ).to.be.revertedWith("Sell operations are paused");
    });
  });

  describe("Dynamic Fee and Max Sell Amount", function () {
    it("Should allow the owner to update max sell amount", async function () {
      const newMaxSellAmount = ethers.BigNumber.from("5000000000000000000000");
      await expect(pumpFunRouter.connect(owner).updateMaxSellAmount(newMaxSellAmount))
        .to.emit(pumpFunRouter, "MaxSellAmountUpdated")
        .withArgs(newMaxSellAmount);
      expect(await pumpFunRouter.maxSellAmount()).to.equal(newMaxSellAmount);
    });
  });

  describe("Factory-like Deployment with Real-World Token Names", function () {
    it("Should deploy a router with a token named 'Bitcoin' and symbol 'BTC'", async function () {
      // Deploy a second token with real-world naming.
      const TokenFactory = await ethers.getContractFactory("PumpFunToken");
      const bitcoinToken = await TokenFactory.deploy("Bitcoin", "BTC", TARGET_TOKEN);
      await bitcoinToken.deployed();

      const RouterFactory = await ethers.getContractFactory("PumpFunRouter");
      const bitcoinRouter = await RouterFactory.deploy(
        bitcoinToken.address,
        TARGET_NATIVE,
        TARGET_TOKEN,
        treasury.address,
        ethers.BigNumber.from("10000000000000000000000")
      );
      await bitcoinRouter.deployed();

      // Verify token's name and symbol.
      expect(await bitcoinToken.name()).to.equal("Bitcoin");
      expect(await bitcoinToken.symbol()).to.equal("BTC");

      // Execute a simple batchBuy on the new router.
      const ethAmount = ethers.utils.parseEther("1");
      await bitcoinRouter.connect(addr2).batchBuy([ethAmount], [0], { value: ethAmount });
      const priceHistory = await bitcoinRouter.getPriceHistory();
      expect(priceHistory.length).to.equal(1);
    });
  });
});

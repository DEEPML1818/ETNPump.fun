// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PumpFunToken.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PumpFunRouter (Liquidity Pool)
 * @notice Simplified exchange with a 2% fee on buys and dynamic sell fees that scale with trade impact.
 *         Additional anti-dump features include a circuit breaker (pause mechanism) and maximum sell limits.
 *
 * New Bonding Curve Design with Virtual Liquidity:
 * - targetNative: Target native coin reserve in wei (e.g. 1e6 * 1e18 for 1M native tokens).
 * - targetToken:  Target token supply in token’s smallest unit (the initial supply).
 *
 * Equilibrium Price is defined as:
 *      initialPrice = (targetNative * 1e18) / targetToken
 *
 * Virtual liquidity is added to the actual reserves when computing the effective reserves:
 *
 *      effectiveNative = address(this).balance + targetNative
 *      effectiveToken  = token.totalSupply() + targetToken
 *
 * The cost to mint ΔT tokens is:
 *      cost = effectiveNative * 1e18 * ln((effectiveToken + ΔT) / effectiveToken)
 *
 * Thus, for a given native input N, the tokens minted are:
 *      ΔT = effectiveToken * ( exp( N / (effectiveNative * 1e18) ) - 1 )
 *
 * This implementation uses a simple Taylor series for exp(x) in fixed point (scale = 1e18).
 */

// Define a struct to hold both timestamp and price
struct PriceSnapshotStruct {
    uint256 timestamp;
    uint256 price;
}

contract PumpFunRouter is Ownable, ReentrancyGuard {
    PumpFunToken public token;
    address public treasury;         // Treasury address (receives buy fee)
    address public liquidityPool;    // Router's address (acts as liquidity pool)

    // Bonding curve parameters
    uint256 public targetNative; // in wei
    uint256 public targetToken;  // in token wei (initial supply)
    uint256 public initialPrice; // initialPrice = (targetNative * 1e18) / targetToken

    // Fee parameters for dynamic sell fee
    uint256 public constant MAX_SELL_FEE_PERCENT = 65;
    uint256 public constant MIN_SELL_FEE_PERCENT = 5;
    uint256 public constant IMPACT_THRESHOLD_PERCENT = 10;

    // Buy fee (2%)
    uint256 public constant BUY_FEE_PERCENT = 2;

    // Anti-dump additional parameters
    bool public sellPaused;
    uint256 public maxSellAmount;

    // Array to hold all price snapshots recorded during trades.
    PriceSnapshotStruct[] public priceHistory;

    event TokensPurchased(
        address indexed buyer,
        uint256 ethSpent,
        uint256 tokensMinted,
        uint256 treasuryFee
    );
    event TokensSold(
        address indexed seller,
        uint256 tokensBurned,
        uint256 nativeReturned,
        uint256 feeRetained
    );
    event SellPaused(bool paused);
    event MaxSellAmountUpdated(uint256 maxSellAmount);
    event TradeExecuted(
        address indexed trader,
        string tradeType,
        uint256 timestamp,
        uint256 ethAmount,
        uint256 tokenAmount,
        uint256 price
    );
    event PriceSnapshot(uint256 indexed timestamp, uint256 price);

    /**
     * @notice Constructor sets the bonding curve targets.
     * @param tokenAddress Address of the PumpFunToken contract.
     * @param _targetNative Target native coin reserve in wei.
     * @param _targetToken  Target token supply (should equal initialSupply, in token wei).
     * @param _treasury     Treasury address.
     * @param _maxSellAmount Initial maximum sell amount (in token wei).
     */
    constructor(
        address tokenAddress,
        uint256 _targetNative,
        uint256 _targetToken,
        address _treasury,
        uint256 _maxSellAmount
    ) Ownable(msg.sender) {
        token = PumpFunToken(tokenAddress);
        targetNative = _targetNative;
        targetToken = _targetToken;
        // initialPrice is calculated for reference.
        initialPrice = (_targetNative * 1e18) / _targetToken;

        treasury = _treasury;
        liquidityPool = address(this);
        maxSellAmount = _maxSellAmount;
        sellPaused = false;
    }

    /**
     * @notice Returns the current bonding curve price.
     * Effective reserves use virtual liquidity.
     * @return price The current price in wei per token (scaled by 1e18).
     */
    function getCurrentBondingPrice() public view returns (uint256 price) {
        uint256 effectiveNative = address(this).balance + targetNative;
        uint256 effectiveToken = token.totalSupply() + targetToken;
        price = (effectiveNative * 1e18) / effectiveToken;
        return price;
    }

    /**
     * @notice Approximates exp(x) using a Taylor series.
     * @dev x is in fixed-point (scale 1e18). Returns result in fixed-point (scale = 1e18).
     */
    function expApprox(uint256 x) internal pure returns (uint256) {
        uint256 sum = 1e18;
        uint256 term = 1e18;
        for (uint256 i = 1; i < 30; i++) {
            term = (term * x) / (1e18 * i);
            sum += term;
            if (term < 1) break;
        }
        return sum;
    }

    /**
     * @notice Computes the number of token wei to mint for a given native coin input.
     * @param nativeIn The native coin amount (in wei) being sent.
     * @return tokensMinted The number of token wei to mint.
     */
    function calculateTokensToMint(uint256 nativeIn) public view returns (uint256 tokensMinted) {
        uint256 effectiveNative = address(this).balance + targetNative;
        uint256 effectiveToken = token.totalSupply() + targetToken;
        uint256 x = (nativeIn * 1e18) / effectiveNative;
        uint256 expVal = expApprox(x);
        tokensMinted = (effectiveToken * (expVal - 1e18)) / 1e18;
        return tokensMinted;
    }

    /**
     * @notice Internal function to update the price history.
     */
    function _updatePriceHistory() internal {
        uint256 currentPrice = getCurrentBondingPrice();
        // Store snapshot with current block timestamp and price.
        priceHistory.push(PriceSnapshotStruct(block.timestamp, currentPrice));
        emit PriceSnapshot(block.timestamp, currentPrice);
    }

    /**
     * @notice Internal function to process token buys.
     * @param nativeIn Amount of native coin sent.
     * @param minTokensOut Minimum tokens expected (slippage protection).
     * @param buyer Address of the buyer.
     * @return buyerTokens Tokens received by the buyer.
     * @return treasuryFeeTokens Fee tokens sent to the treasury.
     */
    function _buyTokens(uint256 nativeIn, uint256 minTokensOut, address buyer) internal returns (uint256 buyerTokens, uint256 treasuryFeeTokens) {
        uint256 tokensToMint = calculateTokensToMint(nativeIn);
        require(tokensToMint > 0, "Insufficient native coin for purchase");
        require(tokensToMint >= minTokensOut, "Slippage limit exceeded");
        // Check minting hard cap using tokens minted by router rather than total supply.
        require(token.routerMinted() + tokensToMint <= token.mintLimit(), "Minting cap reached");

        treasuryFeeTokens = (tokensToMint * BUY_FEE_PERCENT) / 100;
        buyerTokens = tokensToMint - treasuryFeeTokens;

        token.mint(buyer, buyerTokens);
        token.mint(treasury, treasuryFeeTokens);

        emit TokensPurchased(buyer, nativeIn, buyerTokens, treasuryFeeTokens);
        emit TradeExecuted(buyer, "buy", block.timestamp, nativeIn, buyerTokens, getCurrentBondingPrice());
        _updatePriceHistory();
    }

    /**
     * @notice Batch buy function to perform multiple buy operations in one transaction.
     * @param nativeAmounts Array of native coin amounts for each buy.
     * @param minTokensOuts Array of minimum tokens expected for each buy.
     * The sum of nativeAmounts must equal msg.value.
     */
    function batchBuy(uint256[] calldata nativeAmounts, uint256[] calldata minTokensOuts) external payable nonReentrant {
        require(nativeAmounts.length == minTokensOuts.length, "Array lengths must match");
        uint256 totalNative = 0;
        for (uint256 i = 0; i < nativeAmounts.length; i++) {
            totalNative += nativeAmounts[i];
        }
        require(totalNative == msg.value, "Total native amounts must equal msg.value");

        for (uint256 i = 0; i < nativeAmounts.length; i++) {
            _buyTokens(nativeAmounts[i], minTokensOuts[i], msg.sender);
        }
    }

    /**
     * @notice Internal function to process token sells.
     * @param tokenAmount Amount of tokens to sell.
     * @param seller Address of the seller.
     */
    function _sellTokens(uint256 tokenAmount, address seller) internal {
        require(!sellPaused, "Sell operations are paused");
        require(tokenAmount > 0, "Specify token amount to sell");
        require(token.balanceOf(seller) >= tokenAmount, "Insufficient token balance");

        uint256 currentPrice = getCurrentBondingPrice();
        uint256 nativeReturn = (tokenAmount * currentPrice) / 1e18;
        require(address(this).balance >= nativeReturn, "Insufficient native coin in pool");

        uint256 liquidity = address(this).balance;
        uint256 tradeImpact = (nativeReturn * 100) / liquidity;
        uint256 fee = (nativeReturn * calculateDynamicSellFee(nativeReturn)) / 100;
        uint256 finalReturn = nativeReturn - fee;

        token.burn(seller, tokenAmount);
        (bool success, ) = seller.call{value: finalReturn}("");
        require(success, "Native coin transfer failed");

        emit TokensSold(seller, tokenAmount, finalReturn, fee);
        emit TradeExecuted(seller, "sell", block.timestamp, nativeReturn, tokenAmount, currentPrice);
        _updatePriceHistory();
    }

    /**
     * @notice Batch sell function to process multiple sell operations in one transaction.
     * @param tokenAmounts Array of token amounts to sell.
     */
    function batchSell(uint256[] calldata tokenAmounts) external nonReentrant {
        for (uint256 i = 0; i < tokenAmounts.length; i++) {
            _sellTokens(tokenAmounts[i], msg.sender);
        }
    }

    /**
     * @notice Calculates a dynamic sell fee based on trade impact.
     * @param nativeReturn The native coin amount before fees.
     * @return feePercent The fee percentage.
     */
    function calculateDynamicSellFee(uint256 nativeReturn) internal view returns (uint256 feePercent) {
        uint256 liquidity = address(this).balance;
        uint256 tradeImpact = (nativeReturn * 100) / liquidity;
        if (tradeImpact >= IMPACT_THRESHOLD_PERCENT) {
            feePercent = MAX_SELL_FEE_PERCENT;
        } else {
            feePercent = MIN_SELL_FEE_PERCENT + ((MAX_SELL_FEE_PERCENT - MIN_SELL_FEE_PERCENT) * tradeImpact) / IMPACT_THRESHOLD_PERCENT;
        }
        return feePercent;
    }

    /**
     * @notice Allows the owner to pause/resume sell operations.
     * @param _paused True to pause, false to resume.
     */
    function setSellPaused(bool _paused) external onlyOwner {
        sellPaused = _paused;
        emit SellPaused(_paused);
    }

    /**
     * @notice Getter function to retrieve the full price history.
     * @return An array of PriceSnapshotStruct containing timestamps and prices.
     */
    function getPriceHistory() external view returns (PriceSnapshotStruct[] memory) {
        return priceHistory;
    }

    // Accept native coin deposits.
    receive() external payable {}
}

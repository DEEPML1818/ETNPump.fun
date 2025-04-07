// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PumpFunToken.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PumpFunRouter (Liquidity Pool)
 * @notice Simplified exchange with a 2% fee on buys, a bonding curve for pricing, and enhanced sell logic.
 *         The sell logic applies a heavy penalty only for whale sales while leaving small traders unaffected.
 *         In case a whale sells out its entire balance, a liquidity restoration function kicks in.
 *
 * Bonding Curve Design with Virtual Liquidity:
 *  - targetNative: Target native coin reserve in wei.
 *  - targetToken:  Target token supply in token’s smallest unit.
 *
 * Equilibrium Price is defined as:
 *      initialPrice = (targetNative * 1e18) / targetToken
 *
 * Virtual liquidity is added to the actual reserves when computing effective reserves.
 */
contract PumpFunRouter is Ownable, ReentrancyGuard {
    PumpFunToken public token;
    address public treasury;         // Treasury address (receives buy fee)
    address public liquidityPool;    // Router's address (acts as liquidity pool)

    // Bonding curve parameters.
    uint256 public targetNative; // in wei, e.g. 1e6 * 1e18 for 1M native coins.
    uint256 public targetToken;  // in token wei (initial supply)
    uint256 public initialPrice; // initialPrice = (targetNative * 1e18) / targetToken

    // Fee parameters for dynamic sell fee (original dynamic fee logic remains here if needed).
    uint256 public constant MAX_SELL_FEE_PERCENT = 65;
    uint256 public constant MIN_SELL_FEE_PERCENT = 5;
    uint256 public constant IMPACT_THRESHOLD_PERCENT = 10;

    // Buy fee (2%).
    uint256 public constant BUY_FEE_PERCENT = 2;

    // Anti-dump and whale protection parameters.
    bool public sellPaused;
    uint256 public maxSellAmount;
    
    // --- NEW: Whale Protection & Liquidity Restoration Variables ---
    // Liquidity reserve funds pre-funded for emergency liquidity restoration.
    uint256 public liquidityReserve;
    // Whale threshold: minimum token amount that qualifies as a large (whale) sale.
    uint256 public whaleThreshold = 10000 * 1e18;
    // Constant: When restoring liquidity, 10% is given back as bonus.
    uint256 public constant RESTORE_PERCENTAGE = 10;

    // Array to hold all price snapshots recorded during trades.
    uint256[] public priceHistory;

    // --- Events ---
    event TokensPurchased(address indexed buyer, uint256 ethSpent, uint256 tokensMinted, uint256 treasuryFee);
    event TokensSold(address indexed seller, uint256 tokensBurned, uint256 nativeReturned, uint256 feeRetained);
    event TradeExecuted(address indexed trader, string tradeType, uint256 timestamp, uint256 ethAmount, uint256 tokenAmount, uint256 price);
    event PriceSnapshot(uint256 indexed timestamp, uint256 price);
    // NEW: Event to capture liquidity restoration details.
    event LiquidityRestored(address indexed seller, uint256 bonusReturned, uint256 amountAddedToPool);
    event SellPaused(bool paused);
    event MaxSellAmountUpdated(uint256 maxSellAmount);

    /**
     * @notice Constructor sets the bonding curve targets and initializes liquidity reserve.
     * @param tokenAddress Address of the PumpFunToken contract.
     * @param _targetNative Target native coin reserve in wei.
     * @param _targetToken  Target token supply (should equal initialSupply, in token wei).
     * @param _treasury     Treasury address.
     * @param _maxSellAmount Initial maximum sell amount (in token wei).
     * @param _liquidityReserve Initial liquidity reserve for restoration.
     */
    constructor(
        address tokenAddress,
        uint256 _targetNative,
        uint256 _targetToken,
        address _treasury,
        uint256 _maxSellAmount,
        uint256 _liquidityReserve
      ) Ownable(msg.sender) {  // Pass msg.sender to Ownable's constructor.
        token = PumpFunToken(tokenAddress);
        targetNative = _targetNative;
        targetToken = _targetToken;
        // Calculate the initial price for reference.
        initialPrice = (_targetNative * 1e18) / _targetToken; 

        treasury = _treasury;
        liquidityPool = address(this);
        maxSellAmount = _maxSellAmount;
        sellPaused = false;
        liquidityReserve = _liquidityReserve;
    }

    /**
     * @notice Returns the current bonding curve price using virtual liquidity.
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
     * @dev x is in fixed-point (scale 1e18). Returns result in fixed-point (scale 1e18).
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

    /////////////////////////////////
    // Price History Update Function
    /////////////////////////////////
    /**
     * @notice Internal function to update the price history.
     */
    function _updatePriceHistory() internal {
        uint256 currentPrice = getCurrentBondingPrice();
        priceHistory.push(currentPrice);
        emit PriceSnapshot(block.timestamp, currentPrice);
    }

    //////////////////////////
    // Internal Buy Function
    //////////////////////////
    function _buyTokens(uint256 nativeIn, uint256 minTokensOut, address buyer) internal returns (uint256 buyerTokens, uint256 treasuryFeeTokens) {
        uint256 tokensToMint = calculateTokensToMint(nativeIn);
        require(tokensToMint > 0, "Insufficient native coin for purchase");
        require(tokensToMint >= minTokensOut, "Slippage limit exceeded");

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

    ///////////////////////////
    // Internal Sell Function with Whale Protection & Liquidity Restoration
    ///////////////////////////
    function _sellTokens(uint256 tokenAmount, address seller) internal {
    // Ensure selling is enabled.
    require(!sellPaused, "Sell operations are paused");
    // Ensure the token amount is nonzero.
    require(tokenAmount > 0, "Specify token amount to sell");
    // Verify the seller has enough tokens.
    require(token.balanceOf(seller) >= tokenAmount, "Insufficient token balance");

    // Get the current price from the bonding curve.
    uint256 currentPrice = getCurrentBondingPrice();
    // Calculate the total native coin value for the tokens being sold.
    uint256 nativeReturn = (tokenAmount * currentPrice) / 1e18;
    // Ensure the contract has enough native coin for payout.
    require(address(this).balance >= nativeReturn, "Insufficient native coin in pool");

    // Determine if this sale qualifies as a whale transaction.
    bool isWhale = _isWhaleTransaction(tokenAmount, seller);

    // Check if the seller is selling out all tokens (whale sell-out case).
    if (isWhale && token.balanceOf(seller) == tokenAmount) {
        // In a whale sell-out, we split the payout:
        // - 90% is sent immediately as the base payout.
        // - 10% is sent immediately as a bonus from the liquidity reserve.
        uint256 basePayout = (nativeReturn * 90) / 100;
        uint256 bonusPayout = nativeReturn - basePayout; // This equals 10% of nativeReturn.

        // Burn the tokens being sold.
        token.burn(seller, tokenAmount);

        // Transfer the base payout (90%) directly to the seller.
        (bool baseSuccess, ) = seller.call{value: basePayout}("");
        require(baseSuccess, "Base payout transfer failed");

        // Ensure the liquidity reserve has enough funds for the bonus.
        require(liquidityReserve >= bonusPayout, "Insufficient liquidity reserve for bonus");
        // Transfer the bonus payout (10%) directly to the seller.
        (bool bonusSuccess, ) = seller.call{value: bonusPayout}("");
        require(bonusSuccess, "Bonus transfer failed");
        // Deduct the bonus amount from the liquidity reserve.
        liquidityReserve -= bonusPayout;

        // Emit events to log the sale and bonus.
        emit TokensSold(seller, tokenAmount, nativeReturn, 0);
        emit TradeExecuted(seller, "sell", block.timestamp, nativeReturn, tokenAmount, currentPrice);
        _updatePriceHistory();

        // Exit the function so no further processing occurs.
        return;
    } else {
        // For non-whale or partial sales, use the regular dynamic fee logic.
        uint256 fee;
        // Here, we use the dynamic fee calculation (or any standard fee logic you prefer).
        uint256 feePercent = calculateDynamicSellFee(nativeReturn);
        fee = (nativeReturn * feePercent) / 100;
        uint256 finalReturn = nativeReturn - fee;

        // Burn the sold tokens.
        token.burn(seller, tokenAmount);
        // Transfer the net native coin value to the seller.
        (bool success, ) = seller.call{value: finalReturn}("");
        require(success, "Native coin transfer failed");

        // Emit events to log the sale.
        emit TokensSold(seller, tokenAmount, finalReturn, fee);
        emit TradeExecuted(seller, "sell", block.timestamp, nativeReturn, tokenAmount, currentPrice);
        _updatePriceHistory();
    }
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
     * @notice Helper function to detect whale transactions.
     * @dev A sale is considered whale-like if:
     *      1. tokenAmount exceeds the fixed whaleThreshold, AND
     *      2. tokenAmount is at least 50% of the seller's original token balance.
     * @param tokenAmount The amount being sold.
     * @param seller The address selling tokens.
     * @return isWhale True if the sale is a whale transaction.
     */
    function _isWhaleTransaction(uint256 tokenAmount, address seller) internal view returns (bool) {
        uint256 sellerBalance = token.balanceOf(seller);
        uint256 originalBalance = sellerBalance + tokenAmount;
        if (tokenAmount > whaleThreshold && tokenAmount >= (originalBalance * 50) / 100) {
            return true;
        }
        return false;
    }

    /**
     * @notice Liquidity restoration function triggered by whale sales that deplete a seller's token balance.
     *         It restores liquidity from a pre-funded reserve, giving 10% of the restored liquidity back to the seller as a bonus.
     * @param seller The address to receive the bonus.
     */
    function _restoreLiquidity(address seller) internal {
        uint256 liquidityToRestore = calculateRestoreAmount();
        require(liquidityReserve >= liquidityToRestore, "Insufficient liquidity reserve");

        // Calculate the bonus: 10% of the liquidity to restore.
        uint256 sellerBonus = (liquidityToRestore * RESTORE_PERCENTAGE) / 100;
        // The remainder is added back to the pool (conceptually).
        uint256 poolAddition = liquidityToRestore - sellerBonus;

        // Transfer the bonus to the seller.
        (bool success, ) = seller.call{value: sellerBonus}("");
        require(success, "Liquidity bonus transfer failed");

        // Deduct the restored liquidity from the reserve.
        liquidityReserve -= liquidityToRestore;

        emit LiquidityRestored(seller, sellerBonus, poolAddition);
    }

    /**
     * @notice Calculates the liquidity restore amount.
     * @return restoreAmount The amount of native coin to restore (e.g., fixed at 50 ether).
     */
    function calculateRestoreAmount() internal view returns (uint256 restoreAmount) {
        uint256 fixedRestoreAmount = 50 ether;
        return fixedRestoreAmount;
    }

    /**
     * @notice Calculates a dynamic sell fee based on trade impact.
     * @param nativeReturn The native coin amount before fees.
     * @return feePercent The fee percentage.
     */
    function calculateDynamicSellFee(uint256 nativeReturn) internal view returns (uint256 feePercent) {
        uint256 liquidity = address(this).balance;
        if (liquidity == 0) return MAX_SELL_FEE_PERCENT;
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
     */
    function setSellPaused(bool _paused) external onlyOwner {
        sellPaused = _paused;
        emit SellPaused(_paused);
    }

    /**
     * @notice Allows the owner to update the maximum sell amount.
     * @param _maxSellAmount Maximum token wei allowed per sell.
     */
    function updateMaxSellAmount(uint256 _maxSellAmount) external onlyOwner {
        maxSellAmount = _maxSellAmount;
        emit MaxSellAmountUpdated(_maxSellAmount);
    }

    // Accept native coin deposits.
    receive() external payable {}

    /**
     * @notice Getter function to retrieve the full price history.
     * @return An array of prices recorded (each price is in wei per token scaled by 1e18).
     */
    function getPriceHistory() external view returns (uint256[] memory) {
        return priceHistory;
    }
}

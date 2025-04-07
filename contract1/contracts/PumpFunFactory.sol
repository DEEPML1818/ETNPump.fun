// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PumpFunToken.sol";
import "./PumpFunRouter.sol";

/**
 * @title PumpFunFactory
 * @notice Deploys PumpFunToken and its dedicated PumpFunRouter (which acts as the liquidity pool).
 *         The treasury address is provided at contract deployment time.
 *
 *         The initial token supply is also used as the target token supply for the bonding curve.
 *         Only a target native reserve parameter is required.
 */
contract PumpFunFactory {
    // Treasury contract address, set in constructor.
    address public treasuryAddress;

    address[] public deployedTokens;
    address[] public deployedRouters;

    // Default max sell amount (in token units with 18 decimals)
    uint256 public constant DEFAULT_MAX_SELL_AMOUNT = 1000 * 1e18;
    // Fixed liquidity reserve for the router (example: 50 ether).
    uint256 public constant DEFAULT_LIQUIDITY_RESERVE = 50 ether;

    event TokenAndRouterCreated(
        address indexed creator,
        address tokenAddress,
        address routerAddress,
        string name,
        string symbol,
        uint256 initialSupply,
        uint256 timestamp,
        string description,
        string telegram,
        string xProfile,
        string website,
        string imageURL
    );

    /**
     * @notice Constructor sets the treasury address at deployment.
     * @param _treasury The address where treasury fees will be sent.
     */
    constructor(address _treasury) {
        require(_treasury != address(0), "Invalid treasury address");
        treasuryAddress = _treasury;
    }

    /**
     * @notice Creates a new PumpFunToken and its dedicated PumpFunRouter (liquidity pool)
     *         with no social media fields (defaults to empty strings for those fields).
     *         The initialSupply will also be used as the target token supply.
     * @param name The token name.
     * @param symbol The token symbol.
     * @param initialSupply The initial supply (with 18 decimals), also used as target token supply.
     * @param description The token description.
     * @param imageURL The image URL (e.g. from Pinata).
     * @param targetNative Target native coin reserve for the bonding curve.
     * @return The addresses of the deployed token and router.
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        string memory description,
        string memory imageURL,
        uint256 targetNative
    ) external returns (address, address) {
        return _createTokenWithSocial(
            name,
            symbol,
            initialSupply,
            description,
            "", // telegram
            "", // xProfile
            "", // website
            imageURL,
            targetNative
        );
    }

    /**
     * @notice Creates a new PumpFunToken with social media info, plus a dedicated PumpFunRouter.
     *         The initialSupply will also be used as the target token supply.
     * @param name The token name.
     * @param symbol The token symbol.
     * @param initialSupply The initial supply (with 18 decimals), also used as target token supply.
     * @param description The token description.
     * @param telegram Telegram link (optional).
     * @param xProfile X (Twitter) profile link (optional). 
     * @param website Official website link (optional).
     * @param imageURL The image URL (e.g. from Pinata).
     * @param targetNative Target native coin reserve for the bonding curve.
     * @return The addresses of the deployed token and router.
     */
    function createTokenWithSocial(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        string memory description,
        string memory telegram,
        string memory xProfile,
        string memory website,
        string memory imageURL,
        uint256 targetNative
    ) external returns (address, address) {
        return _createTokenWithSocial(
            name,
            symbol,
            initialSupply,
            description,
            telegram,
            xProfile,
            website,
            imageURL,
            targetNative
        );
    }

    /**
     * @notice Internal function that deploys the token and router, then emits the event with optional social fields.
     * @param targetNative Target native coin reserve for the bonding curve.
     * The target token supply will be set to the initialSupply.
     */
    function _createTokenWithSocial(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        string memory description,
        string memory telegram,
        string memory xProfile,
        string memory website,
        string memory imageURL,
        uint256 targetNative
    ) internal returns (address, address) {
        // Deploy token (owner-free version)
        PumpFunToken token = new PumpFunToken(name, symbol, initialSupply, description);
        deployedTokens.push(address(token));

        // Deploy router (acts as liquidity pool) with the new dynamic bonding curve parameters.
        // targetToken is set to initialSupply.
        // NOTE: We now provide 6 arguments (the 6th being liquidity reserve) to match the PumpFunRouter constructor.
        PumpFunRouter router = new PumpFunRouter(
            address(token),
            targetNative,       // Target native coin reserve for the bonding curve.
            initialSupply,      // Target token supply is set to the initial supply.
            treasuryAddress,
            DEFAULT_MAX_SELL_AMOUNT,
            DEFAULT_LIQUIDITY_RESERVE  // Liquidity reserve (e.g., 50 ether)
        );
        deployedRouters.push(address(router));

        // Link router to token (router can be set only once in the owner-free token)
        token.setRouter(address(router));

        emit TokenAndRouterCreated(
            msg.sender,
            address(token),
            address(router),
            name,
            symbol,
            initialSupply,
            block.timestamp,
            description,
            telegram,
            xProfile,
            website,
            imageURL
        );

        return (address(token), address(router));
    }

    /**
     * @notice Returns all deployed token addresses.
     */
    function getDeployedTokens() external view returns (address[] memory) {
        return deployedTokens;
    }

    /**
     * @notice Returns all deployed router addresses.
     */
    function getDeployedRouters() external view returns (address[] memory) {
        return deployedRouters;
    }
}

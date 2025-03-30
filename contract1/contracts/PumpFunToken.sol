// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title PumpFunToken
 * @notice A standard ERC20 token with mint and burn capabilities,
 *         restricted so that only the designated router contract can call them.
 *         No owner. The router can be set exactly once to avoid exploits.
 */
contract PumpFunToken is ERC20 {
    // Address authorized to mint and burn tokens
    address public router;
    // Prevent re-setting the router
    bool public routerSet;
    // Token description
    string public tokenDescription;
    // Maximum tokens that can be minted by the router (set equal to initialSupply)
    uint256 public immutable mintLimit;
    // Total tokens minted by the router
    uint256 public routerMinted;

    /**
     * @notice Constructor that mints the initial supply and stores the description.
     * @param name The token name.
     * @param symbol The token symbol.
     * @param initialSupply The initial supply (with 18 decimals).
     * @param _description The token description.
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        string memory _description
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
        tokenDescription = _description;
        mintLimit = initialSupply;
    }

    /**
     * @notice Set the router address one time only.
     * @param _router The address of the router contract.
     */
    function setRouter(address _router) external {
        require(!routerSet, "Router already set");
        require(_router != address(0), "Invalid router address");
        router = _router;
        routerSet = true;
    }

    /**
     * @notice Mint tokens; only callable by the router.
     * Additional mints via the router are capped by the `mintLimit`.
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == router, "Only router can mint");
        require(routerMinted + amount <= mintLimit, "Mint limit reached");
        routerMinted += amount;
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens; only callable by the router.
     */
    function burn(address from, uint256 amount) external {
        require(msg.sender == router, "Only router can burn");
        _burn(from, amount);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FeeVault
 * @notice A simple vault contract to hold ETH and ERC20 tokens.
 *         The owner (or a designated multisig) can withdraw funds.
 */
contract FeeVault is Ownable {
    // Accept ETH via the receive function.
    constructor() Ownable(msg.sender) {}

    /**
     * @notice Withdraws a specified amount of ETH to the owner's address.
     * @param amount The amount of ETH to withdraw in wei.
     */
    function withdrawETN(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient ETH balance");
        payable(owner()).transfer(amount);
    }

    /**
     * @notice Withdraws a specified amount of an ERC20 token to the owner's address.
     * @param tokenAddress The address of the ERC20 token.
     * @param amount The amount of tokens to withdraw.
     */
    function withdrawToken(address tokenAddress, uint256 amount) external onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        require(token.balanceOf(address(this)) >= amount, "Insufficient token balance");
        require(token.transfer(owner(), amount), "Token transfer failed");
    }
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

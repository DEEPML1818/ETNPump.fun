# ETNPump.fun

# ETNPump.fun: Next-Generation Liquidity & Memecoin Pump Environment

Welcome to the ETNPump.fun project repository. This project represents an innovative approach to decentralized token issuance and liquidity management, specifically engineered to redefine the pump environment for ETN and memecoins. The system has been developed, audited, deployed, and is now live on the blockchain. This document provides an in-depth explanation of the functions, features, and technical details from a development perspective.

---

## Table of Contents

- [Introduction](#introduction)
- [Project Overview](#project-overview)
- [Key Components](#key-components)
  - [FeeVault](#feevault)
  - [PumpFunFactory](#pumpfunfactory)
  - [PumpFunToken](#pumpfuntoken)
  - [PumpFunRouter](#pumpfunrouter)
- [Innovative Features & Differentiators](#innovative-features--differentiators)
- [Technical Architecture](#technical-architecture)
- [Bonding Curve & Pricing Mechanism](#bonding-curve--pricing-mechanism)
- [Security & Liquidity Management](#security--liquidity-management)
- [Future Impact on Memecoin Trading](#future-impact-on-memecoin-trading)
- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [License](#license)

---

## Introduction

ETNPump.fun is a decentralized platform built on Electroneum that transforms token creation, liquidity provisioning, and trading dynamics. It combines a robust, factory-based deployment process with a sophisticated liquidity pool mechanism that leverages a unique bonding curve. Designed with a focus on sustainability and security, ETNPump.fun is set to change how memecoins are traded and how liquidity is managed in the market.

---

## Project Overview

ETNPump.fun consists of four major smart contract components that work together to provide:

- **Automated token creation:** Each token is deployed along with its dedicated liquidity pool.
- **Dynamic pricing via bonding curves:** A hybrid model integrating linear and sigmoid functions.
- **Robust treasury fee management:** Ensuring sustainable liquidity and funding for continuous development.
- **Enhanced security and anti-dump measures:** Including owner-only controls and sell cooldown periods.

This architecture not only simplifies the token launch process but also establishes a controlled pump environment that could redefine memecoin trading.

---

## Key Components

### FeeVault

- **Purpose:**  
  Secure storage for ETN and ERC20 tokens. Only the owner (or designated multisig) can withdraw funds.

- **Key Functions:**
  - `withdrawETN(uint256 amount)`: Withdraws ETN to the owner.
  - `withdrawToken(address tokenAddress, uint256 amount)`: Withdraws specified ERC20 tokens.

- **Highlights:**
  - Uses OpenZeppelin’s `Ownable` for access control.
  - Ensures fund safety with balance validations.

### PumpFunFactory

- **Purpose:**  
  Streamlines the deployment of new tokens and their associated liquidity pools.

- **Key Functions:**
  - `createToken(...)`: Deploys a new token with basic metadata.
  - `createTokenWithSocial(...)`: Deploys a token with additional social media and descriptive data.
  - Internal function `_createTokenWithSocial(...)` handles the deployment and linking of PumpFunToken and PumpFunRouter.

- **Highlights:**
  - Emits the `TokenAndRouterCreated` event to log deployment details.
  - Maintains arrays of deployed tokens and routers for registry and tracking.

### PumpFunToken

- **Purpose:**  
  Implements a standard ERC20 token with controlled minting and burning functionalities.

- **Key Functions:**
  - `setRouter(address _router)`: Sets the dedicated router (one-time only).
  - `mint(address to, uint256 amount)`: Mints tokens (only callable by the linked router).
  - `burn(address from, uint256 amount)`: Burns tokens (only callable by the linked router).

- **Highlights:**
  - Inherits from OpenZeppelin’s ERC20 implementation.
  - Designed to prevent unauthorized token manipulation through strict access controls.

### PumpFunRouter

- **Purpose:**  
  Acts as the liquidity pool and facilitates token purchase and sale operations using a bonding curve.

- **Key Functions:**
  - `getCurrentBondingPrice()`: Calculates the current token price using a hybrid bonding curve model.
  - `buyTokens(uint256 minTokensOut)`: Processes token purchase transactions, mints tokens, and handles treasury fee transfers.
  - `sellTokens(uint256 tokenAmount)`: Processes token sale transactions, burns tokens, and returns ETN to the seller.
  - Administrative functions to update bonding curve parameters and treasury fee percentage.

- **Highlights:**
  - Incorporates anti-dump measures (e.g., sell cooldown).
  - Uses OpenZeppelin’s `ReentrancyGuard` for secure transaction handling.
  - The liquidity pool is maintained directly within the router contract.

---

## Innovative Features & Differentiators

ETNPump.fun stands out in the crowded space of token launch and liquidity management projects due to its distinctive design and advanced functionalities:

- **Hybrid Bonding Curve Model:**  
  Combines a linear component with a sigmoid (S-curve) component to create a dynamic pricing mechanism that more accurately reflects market demand and supply conditions.

- **Integrated Factory Deployment:**  
  Each token is launched together with its dedicated liquidity pool, ensuring that every token comes pre-equipped with an environment that supports healthy trading and sustainable liquidity.

- **Treasury Fee Management:**  
  A built-in treasury fee system automatically allocates a portion of funds to support the project's long-term sustainability and future developments.

- **Enhanced Anti-Dump Mechanisms:**  
  Sell cooldowns and strict access control prevent rapid dumps, contributing to a more stable and controlled pump environment.

- **Future-Ready for Memecoin Trading:**  
  By rethinking liquidity management and token pricing, ETNPump.fun provides a revolutionary framework that can set a new standard in memecoin trading. This approach is designed to create a resilient pump environment on ETN, potentially changing the future landscape of the industry.

---

## Technical Architecture

ETNPump.fun is built using Solidity and leverages industry-standard libraries such as OpenZeppelin for security and reliability. The system architecture is modular, allowing each component to interact seamlessly:

- **Contract Interaction:**  
  The PumpFunFactory deploys and links PumpFunToken and PumpFunRouter, establishing a trustless environment where only the designated router can mint or burn tokens.

- **Bonding Curve Calculation:**  
  The PumpFunRouter calculates token prices using:
  - A **linear component:** based on the current token supply.
  - A **sigmoid component:** to provide a smooth transition and cap the price, ensuring a balanced pump mechanism.

- **Transaction Flow:**  
  Buyers interact with the PumpFunRouter to purchase tokens, where ETN is converted into tokens based on current prices. Sellers can redeem tokens for ETN, subject to cooldown restrictions to prevent market manipulation.

---

## Bonding Curve & Pricing Mechanism

The core innovation in ETNPump.fun lies in its pricing model:

1. **Linear Price Component:**

   \[
   \text{linearPrice} = \text{basePrice} + (\text{multiplier} \times \text{effectiveSupply})
   \]

   - Scales directly with the token supply.

2. **Sigmoid Price Component:**

   \[
   \text{sigmoidPrice} = \frac{\text{maxPrice} \times 1e18}{1e18 + k \times |\text{effectiveSupply} - \text{effectiveMidpoint}|}
   \]

   - Provides a capped price influenced by market dynamics.

3. **Final Price Calculation:**

   \[
   \text{currentPrice} = \frac{\text{linearPrice} + \text{sigmoidPrice}}{2}
   \]

   - This hybrid model ensures a fair and dynamically balanced pump environment, reducing volatility and encouraging sustainable growth.

---

## Security & Liquidity Management

- **Access Control:**  
  Uses OpenZeppelin's `Ownable` to restrict critical functions to authorized roles only.

- **Reentrancy Protections:**  
  The router incorporates `ReentrancyGuard` to secure financial transactions against common attack vectors.

- **Immutable Settings:**  
  The token router can be set only once, preventing unauthorized modifications and potential exploits.

- **Anti-Dump Measures:**  
  Enforced sell cooldowns help mitigate rapid token sell-offs, maintaining market stability.

---

## Future Impact on Memecoin Trading

ETNPump.fun is not just another liquidity pool project; it is poised to transform the way memecoins are traded:

- **Dynamic Pump Environment:**  
  The hybrid bonding curve creates a responsive market that adapts to trading volume, establishing a more controlled and sustainable pump scenario.

- **Revolutionary Liquidity Management:**  
  By integrating automatic treasury fee allocations and anti-dump safeguards, ETNPump.fun ensures continuous liquidity and long-term market health.

- **Industry Disruption:**  
  This approach challenges traditional memecoin models by addressing key issues such as volatility, liquidity shortages, and unsustainable price pumps—paving the way for a new era in decentralized trading.

---

## Getting Started

### Prerequisites

- **Node.js & npm**
- **Solidity Compiler (v0.8.0 or above)**
- **Truffle or Hardhat for deployment and testing**

### Installation

Clone the repository:

```bash
git clone https://github.com/your-org/pumpfun.git
cd pumpfun

Install dependencies:

```bash
npm install

# Deployment & Interaction

## Deployment

The contracts have already been deployed. For development or testing purposes, refer to the deployment scripts under the `/scripts` directory.

## Interacting with the Contracts

- Use the provided ABI and contract addresses (found in the `/deployments` folder) to interact with the contracts.
- A sample front-end and API documentation are provided in the `/docs` folder for further integration.

---

## Contributing

We welcome contributions from the community. Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute, submit pull requests, and report issues.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.


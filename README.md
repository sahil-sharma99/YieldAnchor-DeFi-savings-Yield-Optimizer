# 🚀 YieldAnchor: DeFi savings & Yield Optimizer

YieldAnchor is a premium decentralized yield optimization platform built on the Stellar network and Soroban smart contracts. It enables treasury managers to anchor their capital deposits and dynamically route liquidity into high-yield interest rate index vaults.

---

## 📁 Project Structure
The repository is organized into progressive levels:
- `level-1-white-belt/frontend/`: React + Vite frontend implementing wallet connection, balance retrieval, and basic asset deposits.
- `level-2-yellow-belt/`:
  - `contracts/`: Soroban Rust smart contracts routing and optimizing pool allocations.
  - `frontend/`: React + Vite control station and rebalancing dashboard.

---

## ⚙️ YieldAnchor Routing Protocol

```mermaid
graph TD
    A[Treasury Deposit] -->|Connect Freighter / MetaMask| B(YieldAnchor Console)
    B -->|Define Allocation Amount| C{Query Yield Oracles}
    C -->|Compute Best Yield Rate| D[Dynamically Route Capital]
    D -->|Deposit Pool 1| E[Soroban Liquidity Pool 1]
    D -->|Deposit Pool 2| F[Soroban Liquidity Pool 2]
    E -->|Interests Accrued| G[Rebalance & Update States]
    F -->|Interests Accrued| G
    G -->|Horizon Events Sync| H[Dashboard Balance Update]
```

---

## 🥋 Level 1: White Belt (MVP Foundation)

### 📝 Requirements & Features
- **Wallet Setup & Connection:** Secure integration using `@stellar/freighter-api` and `@creit.tech/stellar-wallets-kit` on Stellar Testnet.
- **Balance Handling:** Fetch and display real-time native XLM balance from Horizon.
- **Transaction Submission:** Submit signed XLM deposit allocations to lock value.
- **UI/UX:** Monospaced cyberpunk dark mode terminal with glowing emerald accent styling.

### 💻 How to Run Locally
1. Navigate to the Level 1 frontend folder:
   ```bash
   cd level-1-white-belt/frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```

### 📸 Submission Screenshots

#### Wallet Connection, Balance Display, & Successful Testnet Transaction
![Level 1 Submission Screenshot](./screenshots/level1_YieldAnchor.png)

---

## 🟡 Level 2: Yellow Belt (Smart Contracts & Event Sync)

### 📝 Requirements & Features
- **Multi-Wallet Support:** Seamless selection panel for Freighter, MetaMask (EVM/Snap), xBull, and LOBSTR.
- **Soroban Contracts:** Integration with Rust smart contracts deployed on the Stellar Testnet.
- **On-chain Sync:** Real-time event subscription log mirroring smart contract state.
- **Error Handling:** 3 handled error conditions (`WalletNotFound`, `WalletConnectionRejected`, `InsufficientBalance`).
- **Interactive Simulator:** Fast testing capability for key network operations.

### 💻 How to Run Locally
1. Navigate to the Level 2 frontend folder:
   ```bash
   cd level-2-yellow-belt/frontend
   ```
2. Install the necessary dependencies:
   ```bash
   npm install
   ```
3. Launch the development server:
   ```bash
   npm run dev
   ```

### ⚙️ Verification Details
Soroban contract ID - CC2UJP6YAUW5WXAYOM2227FUYHPY5S2IXMSMC65SVLF6ZHOAVFKVBTDH

Transaction Hash: fe5f7f7cbfccddfcafb7cb97835ab1202e2e7fff836c4300fca27523512de66a

### 📸 Submission Screenshots

#### Available Wallet Options & Pool Allocations
![Level 2 Available Wallets & Pool Allocations](./screenshots/level2_transaction_YieldAnchor.png)

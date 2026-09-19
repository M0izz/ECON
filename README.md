# ECON — The Economic Operating Layer for Autonomous Agents

> **"Don't just let agents spend money. Let them manage an economy."**  
> Built on **Monad**, **ERC-8004**, **x402 (v2)**, **Model Context Protocol (MCP)**, **Viem**, and **Foundry**.

[![Build Status](https://img.shields.io/badge/tests-30%20passed-brightgreen.svg)](#automated-testing)
[![Monad Testnet](https://img.shields.io/badge/Monad%20Testnet-Chain%20ID%2010143-836EF9.svg)](#monad-settlement-contracts)
[![ERC-8004](https://img.shields.io/badge/ERC--8004-AI%20Agent%20Identity%20%26%20Reputation-CFFF3D.svg)](#erc-8004-monad-registries)
[![x402 v2](https://img.shields.io/badge/x402-Machine%20Micropayment%20Protocol-FF8FA3.svg)](#x402-v2-machine-micropayments)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## Core Thesis & Architecture

AI agents provide intelligence; **ECON** provides the persistent economic operating layer in which that intelligence operates.

The core architectural invariant is:
$$\mathbf{AI\ Proposes} \longrightarrow \mathbf{ECON\ Policy\ Decides} \longrightarrow \mathbf{Smart\ Contracts\ Enforce} \longrightarrow \mathbf{Monad\ Settles} \longrightarrow \mathbf{UI\ Reflects\ Actual\ State}$$

The LLM is an untrusted planner that calls tools. It **never** receives private keys and **never** executes raw calldata directly. Every proposed transaction is strictly validated by the deterministic ECON Policy Engine before signing or settlement.

```
┌─────────────────┐       ┌──────────────────────┐       ┌────────────────────────┐
│  AI / MCP Tool  │ ───>  │  ECON Policy Engine  │ ───>  │ Smart Contract Escrow  │
│  (LLM Proposes) │       │   (Cap & Risk Gate)  │       │     & State Ledger     │
└─────────────────┘       └──────────────────────┘       └────────────────────────┘
                                                                     │
                                                                     ▼
                                                         ┌────────────────────────┐
                                                         │ Monad Testnet (10143)  │
                                                         │ 10,000 TPS Settlement  │
                                                         └────────────────────────┘
```

---

## The 5 Economic Pillars

1. **Persistent Economic Identity**: Real-time treasury balance in MON, active obligations, ERC-8004 reputation score, and programmable spending boundaries.
2. **Controlled Economic Authority & Policy**: Deterministic pre-flight checks enforcing per-transaction caps, daily spending limits, minimum retained reserves, and asset category whitelists.
3. **Programmable Economic Objects**: Stateful representations of GPU compute credits, API licenses, data subscriptions, and escrow claims with consumption telemetry.
4. **Economic Garbage Collection (GC) & Recovery**: Runtime memory-management applied to economics:
   $$\text{Object} \longrightarrow \text{Scanner} \longrightarrow \text{Detector} \longrightarrow \text{Policy Check} \longrightarrow \text{Expected Value (EV)} \longrightarrow \text{Recovery Settlement}$$
   Quantitatively calculates $EV(\text{Keep})$, $EV(\text{Sell})$, $EV(\text{Transfer})$, and $EV(\text{Refund})$ to liquidate stranded capital back into agent treasuries.
5. **Decoupled Settlement Layer**: Strict separation between deterministic `LOCAL SIMULATION` and live `MONAD TESTNET` (Chain ID 10143). Zero fake transactions or synthetic tickers.

---

## Autonomous Agent 13-Stage Master Loop

`ResearchAgent-42` executes the complete economic lifecycle through real typed tools:

```
[01 Bootstrap] ──> [02 Policy Check] ──> [03 Discovery] ──> [04 Quote & Select]
       │
       ▼
[05 Escrow Lock] ──> [06 Delivery] ──> [07 Verification] ──> [08 Settlement]
       │
       ▼
[09 Mint Object] ──> [10 Obligations] ──> [11 Stranded GC] ──> [12 Strategy EV] ──> [13 Recovery]
```

1. **Identity & Treasury Bootstrap**: Checks wallet balance (184 MON) and ERC-8004 trust reputation.
2. **Policy Verification**: Pre-flight validation against daily spending limits and category allowlists.
3. **Service Discovery**: Real-time discovery across registered providers.
4. **Multi-Attribute Selection**: Quotes, SLA scores, latency, and reputation evaluation.
5. **Conditional Escrow Lock**: Funds locked into on-chain escrow contract.
6. **Execution & Delivery**: Provider delivers cryptographic verification proof.
7. **Delivery Verification**: SLA and hash verification against condition hash.
8. **Escrow Release & Settlement**: 12 MON released to provider with EVM receipt.
9. **Economic Object Minting**: Dataset registered into agent's programmatic inventory.
10. **Obligation Tracking**: Active debtor liabilities recorded and monitored.
11. **Stranded Value Detection**: Garbage collector identifies expiring, underutilized assets.
12. **Recovery Strategy Formulation**: Algorithm evaluates Expected Value for peer transfer.
13. **Value Recovery Execution**: Capital reclaimed back into agent treasury (+11.04 MON).

---

## Project Structure

```
ECON/
├── contracts/                        # Monad EVM Solidity Smart Contracts
│   ├── ECONIdentityRegistry.sol     # On-chain identity controller mappings & hashes
│   ├── ECONEconomicObject.sol       # Stateful programmable economic object registry
│   └── ECONEscrow.sol               # High-throughput conditional payment escrow
│
├── src/
│   ├── sdk/                         # @econ/sdk Core Protocol
│   │   ├── types.ts                 # Canonical domain models (Agent, Object, Obligation, Escrow)
│   │   ├── store.ts                 # Normalized state store (Protocol vs Derived)
│   │   ├── policy.ts                # Deterministic Policy Engine pre-flight guard
│   │   ├── discovery.ts             # Service provider discovery & multi-attribute ranking
│   │   ├── engine.ts                # Atomic purchases, sales, and asset exchanges
│   │   ├── escrow.ts                # Escrow manager with cryptographic delivery verification
│   │   ├── garbageCollector.ts      # Multi-stage Expected Value GC scanner
│   │   ├── recovery.ts              # Algorithmic recovery execution (Sell, Transfer, Refund)
│   │   ├── events.ts                # Protocol EventBus & event streaming
│   │   ├── client.ts                # Unified ECON client entrypoint
│   │   └── agent/                   # Agent runtime & 13 canonical typed tools
│   │       ├── tools.ts             # 13 canonical agent tools
│   │       ├── runtime.ts           # Capability & policy checking dispatcher
│   │       └── capabilities.ts      # Granular economic & data permission flags
│   │
│   ├── blockchain/viem/             # Dedicated Viem Blockchain Layer
│   │   ├── client.ts                # Monad Testnet chain definition (Chain ID: 10143)
│   │   ├── publicClient.ts          # Public client with fallback transports
│   │   ├── walletClient.ts          # Wallet client helper with privateKeyToAccount
│   │   ├── contracts.ts             # ABIs and official Monad registry addresses
│   │   ├── reads.ts                 # Typed on-chain contract readers
│   │   ├── writes.ts                # Typed on-chain write transactions & receipts
│   │   ├── events.ts                # Contract event watchers
│   │   └── errors.ts                # EVM error decoding and formatting
│   │
│   ├── integrations/
│   │   ├── erc8004/                 # Monad ERC-8004 AI Identity & Reputation
│   │   ├── x402/                    # x402 (v2) Machine Micropayment Protocol
│   │   └── mcp/                     # Model Context Protocol (MCP) Server
│   │
│   ├── demo/                        # Seed data & autonomous agents
│   │   ├── seed.ts                  # Deterministic initial network state
│   │   ├── autonomousAgent.ts       # 13-stage autonomous agent execution loop
│   │   └── scenarios.ts             # Step-by-step interactive simulation runner
│   │
│   ├── design-system/               # Nebius-Grade Editorial Design System
│   │   ├── tokens.css               # Lime (#CFFF3D), Ink (#062A3B), Soft Pink (#FF8FA3)
│   │   ├── typography.css           # Instrument Sans, Space Grotesk, JetBrains Mono
│   │   └── cards.css / buttons.css  # Editorial components
│   │
│   └── components/                  # Public Editorial Site & Financial Operations Console
│       ├── landing/                 # 8-Act Editorial narrative with GPU canvas
│       └── console/                 # Sovereign agent operations & GC recovery engine
│
├── tests/                           # 13 Vitest Test Suites (30 passing tests)
│   ├── master-economic-loop.test.ts # 13-stage autonomous agent loop
│   ├── x402-payment-flow.test.ts    # 402 challenge & policy-gated micropayment
│   ├── mcp-server.test.ts           # MCP tool listing & tool calls
│   ├── viem-blockchain.test.ts      # Monad chain & contract ABIs
│   ├── identity.test.ts
│   ├── policy.test.ts
│   ├── discovery.test.ts
│   ├── engine.test.ts
│   ├── escrow.test.ts
│   ├── gc.test.ts
│   ├── recovery.test.ts
│   └── economic-loop.test.ts
│
└── package.json
```

---

## Integrations

### 1. Monad Settlement & Contracts (Chain ID: 10143)
- **RPC Endpoint**: `https://testnet-rpc.monad.xyz`
- **Block Explorer**: `https://testnet.monadexplorer.com`
- **Native Currency**: `MON` (18 decimals)
- **ERC-8004 Identity Registry**: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- **ERC-8004 Reputation Registry**: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
- **ECON Economic Object Registry**: `0x39F494E03d3f9b2A4C2a01D7aB4BFe5aDe71C802`
- **ECON Escrow Registry**: `0x62B9D90e964C108779951664c39832B6F9A27F03`

### 2. x402 (v2) Machine Micropayment Protocol
Implements a concrete paid HTTP endpoint (`GET /api/satellite/scene/:id`):
1. An unauthenticated agent request receives `402 Payment Required` with an `x402-v2` challenge payload (recipient, amount, nonce, proof).
2. The agent client routes the payment challenge through its `PolicyEngine` pre-flight check.
3. If approved, the agent executes settlement via ECON engine / Viem adapter.
4. The agent attaches the signed payment receipt in `Authorization: x402-v2 <receipt>` and retries.
5. The resource server verifies the payment and delivers the payload (`200 OK`).

### 3. Model Context Protocol (MCP) Server
Exposes 11 tools to AI agents over standard MCP protocols:
- **Read-Only**: `discover_provider`, `get_quote`, `check_balance`, `list_assets`, `list_obligations`, `get_reputation`, `get_transaction`.
- **Policy-Gated**: `buy_resource`, `sell_asset`, `create_escrow`, `request_recovery`.

Run the MCP stdio server:
```bash
npx tsx -e "import { runMcpStdio } from './src/integrations/mcp'; runMcpStdio();"
```

---

## Reproducibility & Running Locally

### 1. Prerequisites
- Node.js (v18+)
- npm or pnpm

### 2. Installation
```bash
git clone https://github.com/M0izz/ECON.git
cd ECON
npm install
```

### 3. Run Automated Tests
Execute all 13 test suites (30 tests covering unit, integration, x402, and MCP):
```bash
npm test
```

### 4. Build for Production
Validates TypeScript types and generates the optimized production bundle:
```bash
npm run build
```

### 5. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) to view:
- **Editorial Public Site**: Hero narrative with GPU-accelerated economic stream canvas (`prefers-reduced-motion` compliant).
- **Financial Operations Console**: Sovereign agent portfolio, real-time transaction ledger, GC recovery engine, and interactive 13-stage loop runner.

---

## Visual Design System
- **Primary Color**: ECON Lime (`#CFFF3D`)
- **Secondary Base**: Dark Slate Ink (`#062A3B`)
- **Tertiary Accent**: Soft Pink (`#FF8FA3`)
- **Flow Accent**: Muted Cyan (`#22D3EE`)
- **Typography**: Instrument Sans, Space Grotesk, JetBrains Mono

---

## License
MIT License. See [LICENSE](./LICENSE) for details.

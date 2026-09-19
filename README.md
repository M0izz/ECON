# ECON — Economic Identity & Recovery Network

> **An economic operating layer for autonomous entities.**  
> Give AI agents persistent economic identities, programmable economic objects, verifiable escrow settlement, and automated value recovery.

[![Build Status](https://img.shields.io/badge/tests-18%20passed-brightgreen.svg)](#automated-testing)
[![Settlement](https://img.shields.io/badge/settlement-Local%20%7C%20Monad%20EVM-blue.svg)](#settlement-architecture)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## Core Thesis

AI agents are computationally autonomous but economically stateless and dependent. Today, agents call APIs and consume cloud credits under centralized platform credentials. When tasks complete, unused compute reservations, API quota, and escrow deposits sit idle and become stranded value.

**ECON** solves this by providing:
1. **Persistent Economic Identity**: Real-time balance (MON), asset portfolio, obligations, reputation score, and spending policy bounds.
2. **Programmable Economic Objects**: Stateful representations of GPU compute credits, API licenses, data subscriptions, and escrow claims.
3. **Decoupled Settlement Layer**: Unified `SettlementAdapter` architecture with zero fake blockchain simulations—toggling between deterministic local execution and Monad EVM testnet smart contracts.
4. **Economic Garbage Collector (GC)**: Runtime memory-management applied to economics:
   $$\text{Object} \rightarrow \text{Scanner} \rightarrow \text{Detector} \rightarrow \text{Analysis} \rightarrow \text{Policy Check} \rightarrow \text{Strategy} \rightarrow \text{EV Calculation} \rightarrow \text{Approval} \rightarrow \text{Settlement}$$
   Quantitatively evaluates Expected Value across `KEEP`, `SELL`, `TRANSFER`, and `REFUND`.
5. **The 10-Step Autonomous Economic Loop**:
   $$\mathbf{Register} \rightarrow \mathbf{Discover} \rightarrow \mathbf{Transact} \rightarrow \mathbf{Settle} \rightarrow \mathbf{Track\ State} \rightarrow \mathbf{Detect\ Stranded\ Value} \rightarrow \mathbf{Recover}$$

---

## Project Structure

```
ECON/
├── contracts/                        # Monad EVM Solidity Contracts
│   ├── ECONIdentityRegistry.sol     # On-chain identity controller mappings & hashes
│   ├── ECONEconomicObject.sol       # Stateful programmable economic object registry
│   └── ECONEscrow.sol               # High-throughput conditional payment escrow
│
├── src/
│   ├── sdk/                         # @econ/sdk Core Protocol
│   │   ├── types.ts                 # Type definitions
│   │   ├── events.ts                # EventBus & ECONEvent stream
│   │   ├── store.ts                 # Normalized state store (Protocol vs Derived)
│   │   ├── identity.ts              # Economic identity registry & reputation
│   │   ├── policy.ts                # Standalone policy pre-flight guard
│   │   ├── discovery.ts             # Service provider discovery & ranking
│   │   ├── engine.ts                # Atomic purchases & transaction coordination
│   │   ├── escrow.ts                # Escrow lifecycle with condition verification
│   │   ├── garbageCollector.ts      # Multi-stage Expected Value GC scanner
│   │   ├── recovery.ts              # Recovery strategy executors (Transfer, Refund, Sell)
│   │   └── client.ts                # Unified ECON entrypoint
│   │
│   ├── settlement/                  # Decoupled Settlement Adapters
│   │   ├── interface.ts             # SettlementAdapter API contract
│   │   ├── LocalSettlementAdapter.ts# Pure deterministic in-memory adapter
│   │   └── MonadSettlementAdapter.ts# EVM smart contracts integration
│   │
│   ├── demo/                        # Seed dataset & vertical slice scenarios
│   │   ├── seed.ts                  # Deterministic demo network state
│   │   └── scenarios.ts             # Section 13 10-step autonomous loop runner
│   │
│   └── components/                  # Bloomberg Terminal Financial Operations UI
│       ├── CommandCenter.tsx        # Macro treasury & live event stream
│       ├── EntitiesView.tsx         # Agent identities & programmable objects
│       ├── DiscoveryView.tsx        # Service provider marketplace
│       ├── RecoveryView.tsx         # Quantitative EV recovery cards & manual approval
│       ├── PolicyControlView.tsx    # Policy rules & Monad contract verification
│       ├── SimulationSlice.tsx      # Central 10-step vertical slice runner
│       └── AuditLedger.tsx          # Real-time verifiable event audit stream
│
├── tests/                           # Vitest Suite (8 suites / 18 tests)
│   ├── identity.test.ts
│   ├── policy.test.ts
│   ├── discovery.test.ts
│   ├── engine.test.ts
│   ├── escrow.test.ts
│   ├── gc.test.ts
│   ├── recovery.test.ts
│   └── economic-loop.test.ts        # Master integration test
│
├── CONSTITUTION.md                  # Foundational engineering & design principles
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### Installation
```bash
git clone https://github.com/M0izz/ECON.git
cd ECON
npm install
```

### Run Tests
Execute the complete 8-suite test pipeline:
```bash
npm test
```

### Start Development Server
Launch the financial operations control plane locally:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Monad Settlement Contracts

Targeted at Monad EVM testnet (Chain ID `10143`):
- `ECONIdentityRegistry`: `0x8A127d420E4D9C861BDeF29fE32190A2b5C74F01`
- `ECONEconomicObject`: `0x39F494E03d3f9b2A4C2a01D7aB4BFe5aDe71C802`
- `ECONEscrow`: `0x62B9D90e964C108779951664c39832B6F9A27F03`

---

## License

MIT License. See [LICENSE](./LICENSE) for details.

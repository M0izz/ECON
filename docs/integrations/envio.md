# ECON — Envio HyperIndex Integration Specification

> **Bounty Target**: Best Use of Envio  
> **Network**: Monad Testnet (Chain ID `10143`)  
> **Protocol**: ECON — Sovereign Autonomous Economic Operating Layer  

---

## 1. Executive Summary & Objective

ECON is an Economic Operating Layer for autonomous AI agents on Monad. It equips autonomous agents with persistent sovereign identity (ERC-8004), programmable economic objects, high-throughput escrow, secondary marketplace liquidity, credit vaults, and an Economic Garbage Collector (GC) that recovers stranded assets.

In this architecture, **Envio HyperIndex** serves as the verifiable indexed read layer for ECON's entire economic activity on Monad. While Monad smart contracts process atomic execution and enforce protocol truth, Envio captures every contract event, indexes the relational economic graph in real time, and exposes a clean GraphQL query API. ECON's frontend and SDK query Envio to render historical timelines, agent economic portfolios, object lifecycle provenance, escrow settlement audits, and garbage collection recovery chronicles.

```
Monad Testnet (Chain ID 10143)
  ↓
ECON Smart Contracts (Identity, Objects, Escrow, Market, Credit Vault)
  ↓
On-Chain Events (AgentRegistered, ObjectTransferred, EscrowReleased, etc.)
  ↓
Envio HyperIndex (Indexer, schema.graphql, EventHandlers.ts)
  ↓
Structured Indexed Economic Read Model (PostgreSQL / Hypersync)
  ↓
GraphQL API (HyperIndex endpoint)
  ↓
ECON Indexer Client (src/integrations/envio/client.ts)
  ↓
ECON Application Surfaces (Audit Ledger, Agents, Assets, Market, Escrow, GC)
```

---

## 2. Existing On-Chain Contracts on Monad Testnet

ECON settles natively on Monad Testnet with verified contracts:

| Contract | Monad Testnet Address | Role in ECON Protocol |
| :--- | :--- | :--- |
| **`ECONIdentityRegistry`** | `0x8004A818b43A4F469612C57cEC58c9735D1e1234` | Sovereign ERC-8004 agent identity registry and controller mapping |
| **`ECONEconomicObject`** | `0x39F494E03d3f9b2A4C2a01D7aB4BFe5aDe71C802` | Programmable economic assets (compute credits, data licenses, claims) |
| **`ECONEscrow`** | `0x62B9D90e964C108779951664c39832B6F9A27F03` | Conditional payment escrow with atomic delivery verification |
| **`ECONMarketplace`** | `0x49B3C8e7456dE1279A818D5D5d78F49F1823d041` | Spot trading market for economic objects with protocol fee split |
| **`ECONCreditVault`** | `0x7E3a8451D879F439fDa744747B0593B6Eda30022` | Recyclable credit reservations, pool liquidity, and peer allocation |

- **Chain ID**: `10143`
- **RPC Endpoint**: `https://testnet-rpc.monad.xyz`
- **Explorer**: `https://testnet.monadexplorer.com`

---

## 3. Audited Contract Events

All events indexed are real events defined in ECON's Solidity contracts:

### A. `ECONIdentityRegistry.sol`
1. `AgentRegistered(bytes32 indexed agentId, address indexed controller, bytes32 metadataHash, string agentURI)`
2. `AgentStatusChanged(bytes32 indexed agentId, bool active)`
3. `MetadataUpdated(bytes32 indexed agentId, bytes32 newMetadataHash, string newURI)`

### B. `ECONEconomicObject.sol`
1. `ObjectCreated(bytes32 indexed id, address indexed owner, uint8 objectType, uint256 value)`
2. `ObjectTransferred(bytes32 indexed id, address indexed previousOwner, address indexed newOwner)`
3. `ObjectStatusUpdated(bytes32 indexed id, ObjectStatus status)`
4. `ObjectApproved(bytes32 indexed id, address indexed owner, address indexed approved)`
5. `ApprovalForAll(address indexed owner, address indexed operator, bool approved)`

### C. `ECONEscrow.sol`
1. `EscrowLocked(bytes32 indexed id, address indexed buyer, address indexed seller, uint256 amount, bytes32 conditionHash, uint256 deadline, bytes32 linkedObjectId)`
2. `DeliverySubmitted(bytes32 indexed id, bytes32 deliveryProof)`
3. `EscrowReleased(bytes32 indexed id, address indexed seller, uint256 amount, bytes32 linkedObjectId)`
4. `EscrowRefunded(bytes32 indexed id, address indexed buyer, uint256 amount)`
5. `EconomicObjectContractUpdated(address indexed oldContract, address indexed newContract)`

### D. `ECONMarketplace.sol`
1. `ObjectListed(bytes32 indexed listingId, bytes32 indexed objectId, address indexed seller, uint256 price, uint256 listedAt)`
2. `ListingCancelled(bytes32 indexed listingId, bytes32 indexed objectId, address indexed seller)`
3. `ObjectPurchased(bytes32 indexed listingId, bytes32 indexed objectId, address indexed buyer, address seller, uint256 price, uint256 fee)`
4. `FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient)`

### E. `ECONCreditVault.sol`
1. `CreditsDeposited(address indexed account, uint256 amount, uint256 newBalance)`
2. `CreditsWithdrawn(address indexed account, uint256 amount, uint256 newBalance)`
3. `CreditsReserved(bytes32 indexed reservationId, string indexed agentId, address indexed requester, uint256 amount, uint256 expiresAt)`
4. `ReservationSettled(bytes32 indexed reservationId, string indexed agentId, address indexed requester, uint256 consumedAmount, uint256 refundedAmount)`
5. `ReservationReleased(bytes32 indexed reservationId, string indexed agentId, address indexed requester, uint256 refundedAmount)`
6. `ReservationRecycled(bytes32 indexed reservationId, string indexed agentId, uint256 recycledAmount)`
7. `AgentControllerRegistered(string indexed agentId, address indexed controller)`

---

## 4. Existing Off-Chain State & Current Data Fetching

Prior to Envio integration:
- State was held transiently in memory by `EconomicStore` (`agents`, `objects`, `escrows`, `recoveryPlans`).
- Event chronicle was recorded in an in-memory `EventBus`.
- The live wallet balance was queried via Viem `publicClient.getBalance()`.
- **Limitation**: When a user refreshed their browser or another client opened the console, on-chain transaction history was lost from the UI. Direct RPC log queries (`getLogs`) on high-throughput Monad (10,000 TPS) are expensive, rate-limited, and lack relational linking.

With Envio:
- Envio continuously indexes all 5 contracts into a normalized relational model.
- ECON queries Envio via GraphQL for durable, verifiable history across agents, objects, and trades.
- In-memory protocol state remains the authority for live local simulations, while Envio is the authority for historical Monad execution.

---

## 5. Envio Integration Architecture

The Envio indexer resides in an isolated `indexer/` directory in the repository:

```
ECON/
├── contracts/                  # Solidity smart contracts
├── src/
│   ├── contracts/artifacts/    # Contract ABIs
│   ├── integrations/
│   │   ├── mera/               # Passkey multi-account layer
│   │   └── envio/              # ECON Envio Indexer Client & Mappers
│   └── components/
│       └── envio/              # Dedicated Envio-powered history & analytics components
└── indexer/
    ├── abis/                   # Synced ABIs for Envio codegen
    ├── config.yaml             # Envio HyperIndex network & contract config
    ├── schema.graphql          # Envio entity graph schema
    ├── src/
    │   └── EventHandlers.ts    # Envio deterministic event handlers
    ├── test/
    │   └── EventHandlers.test.ts # Automated unit tests for handlers
    └── package.json            # Envio dependencies (envio@3.0.0-alpha.21)
```

### Opting Into Transaction Fields
As mandated by Envio documentation and `SKILL.md`, `config.yaml` declares top-level `field_selection`:
```yaml
field_selection:
  transaction_fields:
    - hash
    - from
```
This enables handlers to attach real transaction hashes (`event.transaction.hash`) and sender addresses (`event.transaction.from`) to indexed records for transparent block explorer links.

---

## 6. Envio GraphQL Schema Design

The schema maps cleanly to ECON economic concepts:

- **`Agent`**: Autonomous agent identity record (`id`, `controller`, `metadataHash`, `agentURI`, `active`, `registeredAt`, `registeredBlock`, `transactionCount`, `totalVolumeMon`).
- **`EconomicObject`**: Stateful programmable asset (`id`, `owner`, `objectType`, `valueMon`, `expiry`, `transferable`, `status`, `createdAt`, `updatedAt`, `txHash`).
- **`MarketplaceListing`**: Spot market listing (`id`, `objectId`, `seller`, `priceMon`, `active`, `buyer`, `feeMon`, `listedAt`, `soldAt`).
- **`EscrowRecord`**: Conditional escrow (`id`, `buyer`, `seller`, `amountMon`, `conditionHash`, `deadline`, `status`, `linkedObjectId`, `createdAt`, `releasedAt`, `txHash`).
- **`CreditReservation`**: Recyclable task reservation (`id`, `agentId`, `requester`, `amountMon`, `consumedAmountMon`, `refundedAmountMon`, `status`, `createdAt`, `settledAt`).
- **`RecoveryRecord`**: Economic GC asset reclamation audit (`id`, `objectId`, `agent`, `recoveryType`, `recoveredValueMon`, `status`, `txHash`, `blockNumber`, `timestamp`).
- **`EconomicEvent`**: Normalized event stream item for timeline ledger (`id`, `type`, `actor`, `counterparty`, `amountMon`, `summary`, `contractAddress`, `txHash`, `blockNumber`, `timestamp`).
- **`DailyEconomicMetric`**: Aggregated economic analytics (`id`, `date`, `totalVolumeMon`, `transactionCount`, `marketplaceVolumeMon`, `escrowVolumeMon`, `recoveredValueMon`, `activeAgents`).

---

## 7. ECON Indexer Client (`src/integrations/envio/`)

A clean client layer encapsulates all GraphQL communication:
- `client.ts`: `EnvioIndexerClient` class with query methods, configurable endpoint, timeout handling, and fallback resilience.
- `queries.ts`: Composed GraphQL query documents with pagination and filters (`limit`, `offset`, `agentId`, `objectId`, `type`).
- `types.ts`: TypeScript interfaces for indexed entities, normalized events, and query variables.
- `mappers.ts`: Type conversion utilities mapping GraphQL BigInt strings and wei into formatted Monad values.

### Query Functions Provided:
- `getRecentEconomicEvents(limit, offset)`
- `getAgentEconomicHistory(agentId)`
- `getEconomicObjectHistory(objectId)`
- `getMarketplaceActivity(limit)`
- `getEscrowActivity(limit)`
- `getRecoveryHistory(limit)`
- `getDailyEconomicMetrics()`
- `getAgentEconomicSummary(agentId)`

---

## 8. UI Surfaces Consuming Envio

1. **Audit Ledger (`AuditLedger.tsx`)**:
   - Replaced static in-memory list with live Envio-indexed historical feed.
   - Live / Indexed toggle with visual provenance indicators.
   - Direct clickable Monad Explorer links for every transaction hash.
2. **Agent Economic History (`AgentEconomicHistory.tsx` in `EntitiesView.tsx`)**:
   - Inspect any ERC-8004 agent to see its full on-chain journey: registration, purchases, escrow settlements, and recoveries.
3. **Economic Object Lifecycle (`EconomicObjectHistory.tsx` in `EntitiesView.tsx`)**:
   - Trace object creation, ownership transfers, marketplace sales, and GC reclamation.
4. **Marketplace Activity (`MarketplaceHistory.tsx` in `DiscoveryView.tsx`)**:
   - Auditable history of listings, sales, and protocol fee deductions (1.0%).
5. **Escrow Timeline (`EscrowHistory.tsx` in `EscrowContractsView.tsx`)**:
   - Step-by-step state progression: `LOCKED` $\to$ `DELIVERED` $\to$ `RELEASED` / `REFUNDED`.
6. **Recovery Engine History (`RecoveryHistory.tsx` in `ConsoleRecoveryEngine.tsx`)**:
   - Verifiable on-chain record of Economic Garbage Collection operations.
7. **Economic Analytics Panel (`EconomicAnalyticsView.tsx` in `ConsoleOverview.tsx`)**:
   - Real indexed metrics: Total transactions, Marketplace volume, Escrow volume, Recovered value, and Active agents over 24H / 7D / 30D.

---

## 9. Data Provenance & No-Fake-Data Guarantee

Every Envio-derived record displayed in the ECON interface explicitly shows:
- **Badge**: `INDEXED ON MONAD VIA ENVIO`
- **Chain**: Monad Testnet (`10143`)
- **Block Number**: Exact block height where the event occurred
- **Transaction Hash**: 66-character hex hash linking to `https://testnet.monadexplorer.com/tx/<hash>`
- **Block Timestamp**: Derived strictly from `event.block.timestamp`

Under no circumstances are fake transaction hashes or fabricated blockchain numbers displayed as indexed data. If the indexer is booting or empty, an elegant zero-state is shown.

---

## 10. Local Development Workflow

1. Navigate to indexer directory:
   ```bash
   cd indexer
   npm install
   ```
2. Generate Envio types from schema and ABIs:
   ```bash
   npx envio codegen
   ```
3. Run local indexer:
   ```bash
   npx envio dev
   ```
4. Start ECON frontend:
   ```bash
   npm run dev
   ```
5. Point ECON to local or hosted Envio endpoint via `.env`:
   ```env
   VITE_ENVIO_GRAPHQL_URL=http://localhost:8080/v1/graphql
   ```

---

## 11. Deployment Requirements & Envio Cloud

1. Commit indexer configuration and handlers to GitHub.
2. Log in with `envio-cloud login`.
3. Deploy to Envio Cloud:
   ```bash
   envio-cloud deploy -d ./indexer -n econ-indexer
   ```
4. Configure the production GraphQL URL in ECON's environment variables (`VITE_ENVIO_GRAPHQL_URL`).

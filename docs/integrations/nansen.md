# ECON — Nansen Integration Architecture & Audit
## Bounty: Best Use of Nansen

This document defines the architecture, security model, and implementation plan for integrating **Nansen** into ECON as an **On-Chain Intelligence Layer** on **Monad**.

---

## 1. Executive Summary & Purpose

ECON is an Economic Operating Layer for autonomous agents on Monad. While **Envio HyperIndex** indexes internal protocol event logs ("What happened on ECON?"), **Nansen** provides external macro on-chain intelligence ("Who are we dealing with, what is their on-chain behavior, and what relevant economic intelligence exists around this address?").

### Strict Architectural Boundaries
- **Nansen is READ / INTELLIGENCE ONLY**: It provides situational context for autonomous agents, marketplace counterparties, and the Recovery Engine.
- **Nansen NEVER executes transactions**: Transactions are authorized strictly by the **ECON Policy Engine** and signed by the controller (**Category Labs Mera** passkey, **Dynamic** embedded EVM wallet, or external Web3 wallet).
- **Envio is NOT replaced**: Envio indexes smart contract events (ERC-8004 identity registration, escrow locks/releases, credit grants, marketplace purchases). Nansen profiles external counterparties and agents across Monad.
- **Zero Fake Data**: If Nansen returns 404 or empty data, or if `NANSEN_API_KEY` is unconfigured, the UI clearly displays "Insufficient Nansen data" or "Nansen service unavailable" without simulating fake labels or balances.

---

## 2. System Flow

```
                      EXTERNAL MONAD ON-CHAIN DATA
                                  ↓
                        NANSEN PROFILER API
               (Labels, Balances, Counterparties, Txs)
                                  ↓
                     ECON SERVER PROXY (/api/nansen)
               [Server-Side Secret: NANSEN_API_KEY, Cache]
                                  ↓
                     ECON INTELLIGENCE ADAPTER
               (src/integrations/nansen/nansenService.ts)
                                  ↓
        ┌─────────────────────────┼─────────────────────────┐
        ↓                         ↓                         ↓
   MARKETPLACE              RECOVERY ENGINE            AGENT PROFILER
(Counterparty Eval)     (Stranded Asset Buyer)      (Self-Identity Audit)
        └─────────────────────────┬─────────────────────────┘
                                  ↓
                         ECON POLICY ENGINE
             (Validates caps, reserve floors, allowlists)
                                  ↓
                   CONTROLLER SIGNER (Mera / Dynamic)
                                  ↓
                           MONAD TESTNET
                                  ↓
                        ENVIO HYPERINDEX
                    (Records economic history)
```

---

## 3. Security Model: Server-Side Secret Isolation

Nansen API keys are paid subscription credentials. In strict accordance with security requirements:
1. **Zero Client-Side Exposure**: `NANSEN_API_KEY` is NEVER exposed in client-side bundles, `VITE_*` variables, React state, browser `localStorage`, or query strings.
2. **Backend Proxy Layer**: All Nansen API calls route through the Express backend proxy (`backend/src/routes/nansen.ts`) and Vite dev server proxy middleware (`/api/nansen/*`).
3. **Server Header Injection**: The proxy server attaches the `apikey: process.env.NANSEN_API_KEY` header before forwarding requests to `https://api.nansen.ai/api/v1/profiler/...`.
4. **CORS & Rate Limiting**: The proxy adheres to ECON backend CORS policies and rate limits requests to conserve Nansen API credits.

---

## 4. Current Repository Audit & Integration Points

| ECON Component | Current State | Nansen Integration Point |
| :--- | :--- | :--- |
| **Backend Express App** (`backend/src/`) | Runs on port 3000/3001 with `/health`, `/metadata`, `/run` | Add `/nansen/*` routes with server-side API key and in-memory TTL caching |
| **Vite Dev Server** (`vite.config.ts`) | Port 5173 | Add `/api/nansen` proxy to forward requests to backend |
| **Discovery / Marketplace** (`DiscoveryView.tsx`) | Displays provider services, capabilities, prices | Add `[View Intelligence]` button to open counterparty profile (labels, balances, counterparties) |
| **Recovery Engine** (`ConsoleRecoveryEngine.tsx`, `RecoveryView.tsx`) | Proposes buyers for stranded compute/API credits | Add buyer counterparty intelligence analysis before operator policy approval |
| **Agent Runtime & Identity** (`EntitiesView.tsx`, `Agent.ts`) | Displays agent wallet, model, balance, obligations | Add On-Chain Intelligence card showing Nansen labels, balances, recent Monad txs |
| **Policy Engine** (`src/sdk/policy.ts`) | Authorizes transactions against spending caps, velocity limits | Receives structured `EconomicIntelligence` context in validation pipeline |
| **Envio HyperIndex** (`src/integrations/envio/`) | Captures and serves ECON contract events | Coexists in parallel: Envio provides internal audit trail, Nansen provides external wallet intelligence |
| **Mera Passkey** (`src/integrations/mera/`) | WebAuthn PRF seedless account derivation | Compatible: Mera operating address can be profiled by Nansen |
| **Dynamic Onboarding** (`src/integrations/dynamic/`) | EVM & embedded wallet onboarding | Compatible: Dynamic controller address can be profiled by Nansen |

---

## 5. Official Nansen Profiler API Endpoints (Monad)

All requests use HTTP `POST` to `https://api.nansen.ai/api/v1/profiler/` with `Content-Type: application/json` and `apikey: <SECRET>`:

1. **Address Labels**:
   - Endpoint: `POST /api/v1/profiler/address/labels`
   - Payload: `{ "address": "0x..." }`
   - Returns: Entity names, behavioral tags (Smart Money, DEX Trader, CEX Deposit, etc.)

2. **Address Current Balance**:
   - Endpoint: `POST /api/v1/profiler/address/current-balance`
   - Payload: `{ "address": "0x...", "chain": "monad", "hide_spam_token": true }`
   - Returns: Native MON and ERC-20 token holdings, USD valuations.

3. **Address Transactions**:
   - Endpoint: `POST /api/v1/profiler/address/transactions`
   - Payload: `{ "address": "0x...", "chain": "monad" }`
   - Returns: Recent on-chain transfers, contract calls, timestamps, status.

4. **Address Counterparties**:
   - Endpoint: `POST /api/v1/profiler/address/counterparties`
   - Payload: `{ "address": "0x...", "chain": "monad" }`
   - Returns: Top interacting addresses, transaction frequency, volume.

5. **Related Wallets**:
   - Derived from cluster patterns and counterparties lookup to identify affiliated agent/treasury addresses.

---

## 6. Credit Cost Control & Caching Strategy

Nansen requests consume subscription credits. To prevent credit exhaustion:
- **Minimum Essential Initial Calls**: For any address, fetch only `labels` and `current-balance` by default.
- **On-Demand Expansion**: Transactions and Counterparties are fetched only when the user/agent explicitly requests "View Full Intelligence".
- **In-Memory TTL Caching**: Both backend and frontend clients cache results for 5 minutes (`300_000 ms`). Subsequent queries for the same address within the TTL window resolve instantly with zero Nansen credit usage.

---

## 7. Graceful Degradation & Error Handling

| HTTP Status | Interpretation | ECON Behavior |
| :--- | :--- | :--- |
| `401 Unauthorized` | Invalid/missing `NANSEN_API_KEY` | Display "Nansen unconfigured / Set API key on server"; allow ECON transactions |
| `402 Payment Required` | Exhausted Nansen credits | Display "Nansen API credits exhausted"; fallback to standard ECON checks |
| `404 Not Found` | No data recorded for address | Display "No on-chain activity recorded by Nansen for this address" |
| `429 Too Many Requests`| Rate limit reached | Display "Nansen rate limit reached — retry shortly"; serve cached data if available |
| `500 Server Error` | Nansen service unavailable | Display "Nansen service unavailable"; core ECON transactions proceed unimpeded |

---

## 8. Files to Create and Modify

### Backend Files
- `backend/src/routes/nansen.ts`: Proxy router for Nansen Profiler API with caching and error handling.
- `backend/src/server.ts`: Register `/nansen` router in Express app.
- `backend/src/config.ts`: Add optional `nansenApiKey` to `AgentConfig`.
- `.env.example`: Document `NANSEN_API_KEY`.

### Frontend / SDK Integration
- `src/integrations/nansen/nansenTypes.ts`: Normalized `EconomicIntelligence` models.
- `src/integrations/nansen/nansenClient.ts`: HTTP client talking to backend proxy with client-side TTL cache.
- `src/integrations/nansen/nansenMapper.ts`: Mapper transforming Nansen JSON into clean `EconomicIntelligence`.
- `src/integrations/nansen/nansenService.ts`: High-level intelligence queries.
- `src/integrations/nansen/index.ts`: Barrel export.

### Frontend UI Components
- `src/components/nansen/CounterpartyIntelligenceModal.tsx`: Visual drawer/modal showing Nansen labels, balances, counterparties, and transactions.
- `src/components/nansen/NansenBadge.tsx`: Quick inline badge showing top Nansen label (e.g., "Smart Trader", "CEX", "Contract").
- `src/components/DiscoveryView.tsx`: Add counterparty intelligence trigger on provider cards.
- `src/components/console/ConsoleRecoveryEngine.tsx`: Add buyer intelligence review in recovery workflow.
- `src/components/EntitiesView.tsx`: Add on-chain intelligence drawer to inspect active agents.

### Tests
- `tests/nansen-types-mapper.test.ts`: Verify normalization and mapping of Nansen responses.
- `tests/nansen-cache-error.test.ts`: Test client caching, TTL expiry, and graceful error handling.
- `tests/nansen-policy.test.ts`: Test that Nansen context enters Policy Engine without executing transactions.
- `backend/tests/unit/NansenRoute.test.ts`: Backend proxy unit tests.

# ECON Baseline Audit Report
**Date:** October 13, 2026  
**Auditor:** Senior Protocol & Systems Engineering Lead  
**Repository:** `https://github.com/M0izz/ECON` (Branch: `main`)  
**Scope:** Phase 0 Baseline Discovery & Architectural Verification  

---

## 1. Executive Summary

ECON is an Economic Operating Layer designed for autonomous agents operating on Monad. This baseline audit assesses the actual state of the repository before making enhancements to the Economic Garbage Collector (EGC) and subsystem integrations.

### Key Baseline Findings:
1. **Frontend & Contracts:** The Vite + React frontend builds cleanly (`tsc && vite build`). All 5 smart contracts (`ECONIdentityRegistry`, `ECONEconomicObject`, `ECONEscrow`, `ECONMarketplace`, `ECONCreditVault`) compile with solc without warnings.
2. **Backend Services:** The Express/Node backend (`backend/`) passes 58 unit and integration tests (`npm --prefix backend run test`), but fails production TypeScript compilation (`npm --prefix backend run build`) due to type mismatches in `metamaskAgentWallet.ts` (ethers v6 `HDNodeWallet` vs `Wallet`) and untyped JSON in `qwen.ts`.
3. **Vitest Full Test Suite:** Ran root `npm test` covering 43 test suites and 252 tests. 249 passed, 3 failed due to remote RPC network timeout (5000ms threshold) during concurrent test suite execution against live `https://testnet-rpc.monad.xyz`. When isolated, both tests pass.
4. **Economic Garbage Collector (EGC):** The existing EGC implementation (`src/sdk/garbageCollector.ts` and `src/sdk/recovery.ts`) contains foundational heuristics but lacks:
   - Defensible distinctions between *Unused*, *Surplus*, *Stranded*, *Recoverable*, and *Executable*.
   - Rigorous tri-state transferability, refundability, and sellability (`YES`, `NO`, `UNKNOWN`).
   - Deterministic reason codes (e.g., `ELIGIBLE_FOR_TRANSFER`, `TRANSFERABILITY_UNKNOWN`, `OBJECT_EXPIRED`, `ACTIVE_OBLIGATION`).
   - Real execution adapters (currently fakes refunds and sales by updating store status/balance without executing real marketplace, transfer, or refund transactions).
   - Concurrency, replay, and idempotency protection on recovery executions.
5. **Environment & Secrets:** No `.env` or `backend/.env` files exist on disk. No private keys, RPC keys, Nansen keys, or Qwen API keys are provisioned in the environment. All tests operate against deterministic simulation or fallback mock adapters.

---

## 2. Architecture & Monorepo Structure

| Component | Path | Technology / Stack | Status |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | `src/`, `index.html` | React 18, Vite 5, TypeScript 5, Viem 2, Wagmi 2, Tailwind/Vanilla CSS | Compiles & builds to `dist/` (1m 21s) |
| **Smart Contracts** | `contracts/` | Solidity 0.8.20, solc, Hardhat | 5 contracts compile cleanly; artifacts in `src/contracts/artifacts/` |
| **Backend Agent Service**| `backend/` | Node 20+, Express 5, Ethers 6, Zod, Pino | Tests pass (58/58); build has 5 TS type errors |
| **SDK & Core Logic** | `src/sdk/` | TypeScript, Viem, Ethers | Identity, Store, Policy, Fee, Escrow, Engine, GC |
| **Chainlink CRE** | `integrations/chainlink-cre/` | TypeScript, CRE SDK simulation | Workflow runner and simulation tests present |
| **Envio Indexer** | `indexer/` | Envio HyperIndex, GraphQL, YAML | Config and schema present for Monad Testnet (Chain ID 10143) |
| **Agent Ecosystem** | `agent_ecosystem/` | Python, Web3.py | Complementary multi-agent simulation scripts |

---

## 3. Baseline Commands & Execution Results

### 3.1 Git Status
- Branch: `main`, clean working tree, up to date with `origin/main`.

### 3.2 Contract Compilation
```bash
node scripts/compile.js
```
- **Outcome:** **SUCCESS (0 errors)**
- Compiled:
  - `ECONIdentityRegistry` (bytecode length: 6,314 bytes)
  - `ECONEconomicObject` (bytecode length: 6,228 bytes)
  - `ECONEscrow` (bytecode length: 8,118 bytes)
  - `ECONMarketplace` (bytecode length: 9,408 bytes)
  - `ECONCreditVault` (bytecode length: 14,544 bytes)

### 3.3 Typechecks
```bash
npx tsc --noEmit
```
- **Outcome:** **SUCCESS (0 errors)** across root frontend & SDK.

```bash
npm --prefix backend run build
```
- **Outcome:** **FAILED (Exit code 1)**
- Errors:
  - `src/routes/metamaskAgentWallet.ts(25,7)`: Type `'HDNodeWallet'` is not assignable to type `'Wallet'`.
  - `src/routes/metamaskAgentWallet.ts(26,29)`: `'serverWallet'` is possibly `'null'`.
  - `src/routes/qwen.ts(126,23)`: `'json'` is of type `'unknown'`.
  - `src/routes/qwen.ts(129,16)`: `'json'` is of type `'unknown'`.
  - `src/routes/qwen.ts(130,20)`: `'json'` is of type `'unknown'`.

### 3.4 Root Vitest Suite
```bash
npm test
```
- **Total Test Files:** 43 (41 passed, 2 failed due to remote RPC timeout under concurrent load)
- **Total Tests:** 252 (249 passed, 3 failed)
- **Failures:**
  - `tests/mera-integration.test.ts > 1. Mera-derived address can query Monad balance through public client`: Timed out at 5000ms.
  - `tests/metamask-agent-wallet.test.ts > 1. initializes wallet in server-wallet or byok mode with doctor report`: Timed out at 5000ms.
  - `tests/metamask-agent-wallet.test.ts > 3. retrieves Monad balance in MON`: Timed out at 5000ms.
- **Isolated Run Verification:**
  - `npx vitest run tests/mera-integration.test.ts`: **PASS** (4/4 passed in 2,900ms)
  - `npx vitest run tests/metamask-agent-wallet.test.ts`: **PASS** (15/15 passed in 2,615ms)
  - Root cause: Network contention on public RPC `https://testnet-rpc.monad.xyz` when 43 test files run in parallel.

### 3.5 Backend Vitest Suite
```bash
npm --prefix backend run test
```
- **Total Test Files:** 10 passed (100%)
- **Total Tests:** 58 passed (100%)

---

## 4. Environment Variables Inventory

| Variable | Scope | Found On Disk | Purpose |
| :--- | :--- | :--- | :--- |
| `DEPLOYER_PRIVATE_KEY` | Root / Contracts | Missing | Deploys contracts to Monad Testnet |
| `MONAD_RPC_URL` | Root / Backend | Fallback default (`https://testnet-rpc.monad.xyz`) | Monad JSON-RPC endpoint |
| `MONAD_CHAIN_ID` | Root / Backend | Fallback default (`10143`) | Monad Testnet Chain ID |
| `AGENT_SIGNER_PRIVATE_KEY` | Backend | Missing | CreditVault settlement signer |
| `NANSEN_API_KEY` | Root / Backend | Missing | Monad counterparty & wallet analytics |
| `QWEN_API_KEY` | Root / Backend | Missing | Qwen 3.8 Max AI reasoning model |
| `VITE_DYNAMIC_ENVIRONMENT_ID` | Frontend | Missing | Dynamic wallet embedded/social modal |
| `ECON_FRONTEND_ORIGIN` | Backend | Missing (default `https://app.econ.xyz`) | CORS whitelist |

---

## 5. Deployed vs. Undeployed Smart Contracts

Contract addresses configured in `src/contracts/addresses.ts`:
- **Network:** Monad Testnet (Chain ID `10143`)
- **Explorer:** `https://testnet.monadexplorer.com`
- **Configured Addresses:**
  - `ECONIdentityRegistry`: `0x8004A818b43A4F469612C57cEC58c9735D1e1234`
  - `ECONEconomicObject`: `0x39F494E03d3f9b2A4C2a01D7aB4BFe5aDe71C802`
  - `ECONEscrow`: `0x62B9D90e964C108779951664c39832B6F9A27F03`
  - `ECONMarketplace`: `0x49B3C8e7456dE1279A818D5D5d78F49F1823d041`
  - `ECONCreditVault`: `0x7E3a8451D879F439fDa744747B0593B6Eda30022`

Note: In the absence of a live deployer private key with MON balance in the local environment, test suites safely utilize Viem/Ethers simulation and local contract mocks.

---

## 6. Detailed Trace: Current Economic Garbage Collector (EGC)

### Path Trace:
`UI (RecoveryView.tsx) -> SDK (EconomicGarbageCollector.ts) -> Plan -> Execution (RecoveryEngine.ts) -> Local Store Status`

### Critical Defects Identified:
1. **Semantic Conflation:**
   - Any object with `remainingUnits > projectedRequirement` is tagged as `STRANDED` if expiry < 48 hours, without verifying whether it has genuine resale, transfer, or refund support.
   - Non-transferable credits or objects with unknown transferability are assumed to have peer transfer EV.
2. **Fake Execution:**
   - In `RecoveryEngine.ts`, `plan.recommendedStrategy === 'SELL'` simply calls:
     ```typescript
     this.store.updateAgentBalance(plan.ownerId, recoveredAmount);
     this.store.updateObjectStatus(obj.id, 'LIQUIDATED');
     ```
     This bypasses the real `ECONMarketplace` contract listing and purchase workflow.
   - `plan.recommendedStrategy === 'REFUND'` simply adds balance locally without a verifying refund authority.
3. **Lack of Lifecycle Rigor:**
   - Jumps directly from `PROPOSED` to `EXECUTING` to `EXECUTED`. Lacks explicit state machine: `DETECTED` -> `EVALUATED` -> `ELIGIBLE` -> `RECOMMENDED` -> `POLICY_APPROVED` -> `EXECUTING` -> `SETTLED` (or `INELIGIBLE`, `REVIEW_REQUIRED`, `REJECTED`, `FAILED`, `CANCELLED`).
4. **No Idempotency Protection:**
   - Duplicate scans or triggers can re-plan or re-execute the same object.
5. **No AI/Deterministic Boundary:**
   - Qwen recommendations and deterministic checks are not cleanly decoupled with fallback.

---

## 7. Immediate Remediation Roadmap

1. **Phase 1:** Formalize EGC semantics and lifecycle in `docs/economic-garbage-collector.md`.
2. **Phase 2 & 3:** Refactor EGC into modular engines:
   - `EconomicObjectRepository`
   - `RecoveryEligibilityEngine`
   - `StrandedValueDetector`
   - `RecoverabilityAnalyzer`
   - `RecoveryValuationEngine`
   - `RecoveryStrategyEngine`
   - `RecoveryExecutionService` (with genuine marketplace listings, peer transfers, and verified refunds).
3. **Phase 4:** Deep integration with `ECONMarketplace` contract/adapter for secondary market listings.
4. **Phase 5-11:** Subsystem audits for Qwen, Chainlink CRE, Envio, Nansen, Wallets (Mera, Dynamic, MetaMask), Monad contracts, Policy & Backend.
5. **Phase 12-18:** Wire real UI, test fixtures (`OBJ-GPU-82`), complete end-to-end test suite, golden-path demo, and integration matrix.

# Integration #6: Chainlink Runtime Environment (CRE) in ECON

## Automation + Verifiable Workflow Layer

Chainlink Runtime Environment (CRE) serves as the **decentralized orchestration and verifiable automation layer** for the ECON Autonomous Economic Operating System.

CRE guarantees that economic maintenance jobs—such as the **Automated Economic Garbage Collector (GC) Recovery Scan**—execute trustlessly, deterministically, and with cryptographically verifiable proofs across decentralized oracle networks without introducing centralized points of failure.

---

### Core Execution Invariant

```
CRE orchestrates.
Qwen reasons.
ECON Policy decides.
Smart contracts enforce.
Monad settles.
```

1. **CRE Orchestrates**: Schedules workflows (Cron trigger), monitors on-chain events (`EVMClient`), fetches verifiable external state (`HTTPClient`), and coordinates execution steps.
2. **Qwen Reasons**: Evaluates multi-dimensional trade-offs (`KEEP`, `SELL`, `TRANSFER`, `REFUND`) under quantitative Expected Value ($EV$).
3. **ECON Policy Decides**: The authoritative gatekeeper that validates constraints, velocity caps, spending thresholds, and non-transferability invariants (`ALLOW`, `REVIEW_REQUIRED`, `BLOCK`).
4. **Smart Contracts Enforce**: `ECONEconomicObject.sol` and `ECONIdentityRegistry.sol` enforce state transitions, transfer rights, and permissions.
5. **Monad Settles**: Executes transactions at sub-second finality with parallel EVM throughput on Monad Testnet (Chain ID `10143`).
6. **Envio Indexes**: Automatically ingests on-chain events into the HyperIndex GraphQL chronicle for continuous observability.

---

### System Architecture Flow

```
           ECON Economic State
                    ↓
        Chainlink CRE Orchestrator
        (Cron Trigger / EVM Log)
                    ↓
       Bounded Economic Context
     (Envio history + Nansen intel)
                    ↓
            Qwen 3.8 Max
     (Economic Reasoning Engine)
                    ↓
          ECON Policy Engine
       [AUTHORITATIVE BOUNDARY]
                    ↓
       ┌────────────┼────────────┐
    [ALLOW]     [REVIEW]     [BLOCK]
       │            │            │
       │       Escrow for   Safe Halt
       │       Operator     (No Tx)
       │       Sign-off
       ↓
  ECON Contract
(ECONEconomicObject)
       ↓
 Monad Parallel EVM
   (Chain 10143)
       ↓
 Envio HyperIndex
(Real-time chronicle)
```

---

### Why ECON Uses Chainlink CRE

Autonomous economic agents generate secondary residuals: unused compute allocations, idle SaaS licenses, stranded subscription credits, and locked collateral. Without autonomous workflows, these assets rot into zero-value dead loss.

Traditional approaches rely on centralized Web2 cron servers with custodial hot wallets. Chainlink CRE replaces this with:
- **Decentralized Execution**: Workflows run across Chainlink's Decentralized Oracle Network (DON), eliminating single points of failure.
- **Verifiable Computation**: Workflows compile to deterministic WASM modules with cryptographic consensus.
- **Strict Boundary Preservation**: CRE cannot execute arbitrary calls; it coordinates inputs and submits recommendations directly to the smart-contract-backed ECON Policy Engine.

---

### Trigger Mechanisms

ECON's CRE workflow supports two production triggers:

1. **Periodic Cron Trigger (`CronCapability`)**:
   - Schedule: `*/5 * * * *` (Every 5 minutes).
   - Scans the state store for stranded objects whose idle excess exceeds current consumption trajectories.
2. **On-Chain EVM Log Trigger (`EVMClient`)**:
   - Listens to `ObjectStatusUpdated(bytes32 indexed id, ObjectStatus status)` emitted by `ECONEconomicObject.sol`.
   - Reacts immediately when an object is marked as `STRANDED` or `EXPIRED`.

---

### Bounded Economic Context

CRE constructs a strictly bounded context to guarantee deterministic, injection-resistant reasoning:

```typescript
Economic Object:
- objectId: 'OBJ-GPU-82'
- owner: 'ResearchAgent-42'
- type: 'GPU_COMPUTE_CREDIT'
- remainingUnits: 82
- projectedRequirement: 17
- nominalValueMon: 16.4
- expiryTimestamp: 1791078600000 (18h)
- transferable: true
- status: 'STRANDED'

Economic State:
- treasury: 184.00 MON
- active obligations: 0
- policy constraints: maxPerTransaction 50 MON, minRetainedBalance 10 MON

External Intelligence:
- Nansen: Target recipient 0x7772...47A7 labeled 'DataAgent-7 (Verified Sentinel)', risk: LOW
- Envio: Recent recovery volume 4.6 MON settled
```

*Security Invariant*: Arbitrary marketplace text or untrusted prompts are strictly stripped from the reasoning context.

---

### Critical Policy Boundary

**CRE and Qwen NEVER bypass the ECON Policy Engine.**

- **Incorrect**: `CRE → Qwen → Monad Transaction` (Centralized or prompt-injection vulnerability)
- **Correct**: `CRE → Bounded Context → Qwen Proposal → ECON Policy Engine → Monad Settlement`

The Policy Engine checks:
1. `autoRecoveryEnabled`: Agent policy must explicitly allow autonomous sweep routines.
2. `transferable`: Soulbound or non-transferable assets are strictly forbidden from secondary transfer.
3. `maxAutonomousCapMon`: Operations exceeding threshold (e.g. 50 MON) require operator multi-sig review (`REVIEW_REQUIRED`).
4. `minRetainedBalance`: Agent treasury must maintain minimum reserve floor.

---

### Deterministic Bounty Demo Scenario: OBJ-GPU-82

The codebase includes an interactive and testable deterministic demonstration:

- **Target Object**: `OBJ-GPU-82`
- **Asset Type**: High-performance GPU Compute Credits
- **Remaining**: 82 GPU credits
- **Projected Requirement**: 17 GPU credits
- **Transferable**: `YES`
- **Workflow Execution**:
  1. CRE identifies 65 idle excess units.
  2. Nansen profiles potential counterparty `DataAgent-7` (High compute demand, low risk).
  3. Qwen 3.8 Max recommends `SELL` on ECON Marketplace at +12.8 MON expected yield.
  4. ECON Policy Engine verifies transferability and spend cap → **`APPROVED (ALLOWED)`**.
  5. Settlement recorded on Monad Testnet (Chain ID `10143`).
  6. Envio indexes the transaction and updates agent telemetry.

---

### Local Simulation & Verification

The isolated workflow module is located at `integrations/chainlink-cre/`.

#### Running the CRE Simulation CLI:
```bash
cd integrations/chainlink-cre
npm run simulate
```

#### Running the Simulation Test Suite:
```bash
npx vitest run tests/cre-workflow-simulation.test.ts
```

The test suite validates all 8 mandatory simulation conditions:
1. `stranded object → detected as recovery candidate`
2. `Qwen recommends SELL → policy allows → execution confirmed`
3. `Qwen recommends TRANSFER → policy blocks → transfer denied`
4. `non-transferable object → no transfer permitted (soulbound guard)`
5. `expired object → correct handling and exclusion from active transfer`
6. `policy requires review → no automatic settlement`
7. `CRE/API failure → safe failure with zero state corruption`
8. `duplicate trigger → idempotent behavior without double-spend`

---

### Security Model & Limitations

- **Zero Private Keys in Frontend**: Settlement signatures are handled via Monad EVM accounts or MPC derivation; no private keys exist in UI code.
- **Idempotency**: Processed object IDs are tracked per execution window to prevent double-spends.
- **Graceful Fault Recovery**: If upstream RPC or LLM APIs fail, the workflow immediately triggers a fail-safe halt without mutating on-chain state.
- **Environment Status**: Clearly labeled as `SIMULATED RUNTIME (CRE v1.23.0)` in non-DON environments; live on-chain DON deployment requires Chainlink CRE production enclave registration.

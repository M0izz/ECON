# Economic Garbage Collector (EGC) Specification & Semantic Architecture
**Version:** 2.0.0  
**Status:** Authoritative Protocol Standard  
**Target Platform:** ECON Operating Layer for Autonomous Agents (Monad Testnet / Mainnet)  

---

## 1. Core Principles & Semantic Distinctions

Autonomous agents continuously purchase, allocate, and hold economic resources (e.g. GPU minutes, LLM inference tokens, vector storage blocks, API rate-limit quotas, RPC compute credits). In traditional software, idle memory is garbage collected by reclaiming unreferenced heap addresses. In an economic network, **unconsumed value is not automatically reclaimable**. An agent's unused credit does not vanish into thin air, nor can it be trivially resold without legal, contractual, and technical entitlement.

To prevent destructive or hallucinatory capital actions, EGC strictly distinguishes five distinct resource states:

```
┌─────────────┐     Estimate Demand     ┌─────────────┐     Time Decay / Expiry     ┌─────────────┐
│   UNUSED    │  ────────────────────>  │   SURPLUS   │  ────────────────────────>  │   STRANDED  │
│ Not in use  │                         │ > Need      │                             │ At Risk     │
└─────────────┘                         └─────────────┘                             └─────────────┘
                                                                                           │
                                                                   Legal & Tech Rights     │
                                                                 ─────────────────────────┼──
                                                                                           ▼
                                        ┌─────────────┐     Policy Authorization    ┌─────────────┐
                                        │ EXECUTABLE  │  <────────────────────────  │ RECOVERABLE │
                                        │ Authorized  │                             │ Entitled    │
                                        └─────────────┘                             └─────────────┘
```

1. **Unused:** The resource is currently idle or not actively being consumed in the current execution window.
2. **Surplus:** The remaining quantity exceeds a defensible, evidence-backed estimate of the agent's projected requirements prior to expiry.
3. **Stranded:** The surplus is mathematically or temporally unlikely to be utilized before its hard deadline, service expiration, or contractual forfeiture.
4. **Recoverable:** Stranded value that is supported by verified ownership, unambiguous contractual rights (transferability, sellability, or refundability), and an active settlement mechanism.
5. **Executable:** Recoverable value whose proposed recovery plan has satisfied deterministic constraints and been explicitly granted authorization by the ECON Policy Engine (or operator signature).

---

## 2. Economic Object Schema & Entitlement Tri-State

Every economic object in ECON carries verifiable provenance and explicit rights metadata. Entitlement flags are modeled as strict tri-state enums: **`YES`**, **`NO`**, or **`UNKNOWN`**.

> **CRITICAL RULE:** The engine **never infers `YES` from `UNKNOWN`**. If transferability or refundability is `UNKNOWN`, automated transfer or refund is strictly prohibited, and the resource must be categorized as `VALUATION_UNAVAILABLE` or `REVIEW_REQUIRED`.

### 2.1 Complete Object Model
- **`id` (ObjectId):** Globally unique, stable object identifier.
- **`owner` (AgentId):** Registered Economic Identity of the current owner.
- **`type` (ResourceType):** E.g., `GPU_COMPUTE_CREDIT`, `API_LICENSE`, `DATA_SUBSCRIPTION`, `STORAGE_CREDIT`.
- **`denomination`:** Human/unit descriptor (e.g., `GPU-minutes`, `API-calls`, `GB-months`).
- **`quantity`:** Original allocated units.
- **`consumedQuantity`:** Verifiably consumed units.
- **`remainingQuantity`:** `Math.max(0, quantity - consumedQuantity)`.
- **`valueMon`:** Acquisition or nominal baseline value denominated in MON.
- **`expiryTimestamp`:** Unix timestamp in ms after which rights or access expire.
- **`transferability`:** `YES | NO | UNKNOWN` (whether protocol allows ownership reassignment).
- **`refundability`:** `YES | NO | UNKNOWN` (whether service issuer provides a verified redemption endpoint).
- **`sellability`:** `YES | NO | UNKNOWN` (whether transferable onto the ECON secondary marketplace).
- **`activeObligations`:** Count of active collateralized escrows or locked commitments binding this object.
- **`status`:** `ACTIVE | STRANDED | LISTED | RECOVERING | RECOVERED | LIQUIDATED | EXPIRED | DISPUTED`.
- **`usageHistory`:** Historical usage data points enabling rate regression.
- **`provenance`:** Issuer contract, reservation receipt, or on-chain transaction hash.

---

## 3. Deterministic Eligibility Reason Codes

Eligibility evaluation produces deterministic outcomes accompanied by explicit machine-readable reason codes:

| Reason Code | Definition | Action Permitted |
| :--- | :--- | :--- |
| `ELIGIBLE_FOR_MARKETPLACE` | Object is transferable, market quotes exist, no blocking obligations. | List on `ECONMarketplace` |
| `ELIGIBLE_FOR_PEER_TRANSFER` | Object is transferable, target peer consumer with valid need identified. | Direct P2P transfer settlement |
| `ELIGIBLE_FOR_REFUND` | Object is refundable, verified issuer refund adapter available. | Issuer refund settlement |
| `TRANSFERABILITY_UNKNOWN` | Object transferability is not verified (`UNKNOWN`). | Review required / No auto-transfer |
| `NON_TRANSFERABLE` | Object is explicitly non-transferable (`NO`). | Transfer/Sale forbidden; check refund |
| `NON_REFUNDABLE` | Service issuer does not support refund redemption (`NO`). | Refund forbidden |
| `OBJECT_EXPIRED` | Expiry timestamp has passed (`now >= expiryTimestamp`). | Terminal: Cannot sell or recover |
| `CONSUMED_RESOURCE` | Zero unconsumed units remain (`remainingQuantity <= 0`). | No recoverable surplus |
| `ACTIVE_OBLIGATION` | Object is currently committed as collateral or in escrow. | Locked: Cannot touch until released |
| `OWNERSHIP_MISMATCH` | Agent attempting recovery is not the verified owner. | Rejection / Policy Block |
| `INSUFFICIENT_USAGE_DATA` | Usage history is insufficient for defensible burn-rate forecast. | Flag uncertainty; request human/agent review |
| `VALUATION_UNAVAILABLE` | No secondary bids, issuer quote, or verified fixture pricing available. | Retain (`KEEP`) / No action |
| `ALREADY_RECOVERED` | Object lifecycle status is already `RECOVERED` or `LIQUIDATED`. | Terminal / Idempotent bypass |
| `POLICY_REVIEW_REQUIRED` | Recovery value exceeds auto-threshold; requires operator approval. | Hold for approval |
| `POLICY_BLOCKED` | Agent policy rules (e.g. `autoRecoveryEnabled == false`) reject action. | Terminate plan |

---

## 4. Quantitative Valuation & Strategy EV Formulation

For any candidate with surplus, EGC evaluates all four mutually exclusive economic paths:

$$\text{Strategy} \in \{\text{KEEP}, \text{SELL}, \text{TRANSFER}, \text{REFUND}\}$$

### 4.1 Expected Value (EV) Formulas

1. **KEEP:**
   $$\text{EV}_{\text{KEEP}} = \text{NominalValue} \times P(\text{FutureUtilization})$$
   - $P(\text{FutureUtilization}) = \min\left(1.0, \frac{\text{ProjectedNeed}}{\text{RemainingUnits}}\right)$
   - If internal demand exceeds remaining units, $\text{EV}_{\text{KEEP}} = \text{NominalValue}$ (no economic loss in retaining).

2. **SELL (Secondary Marketplace):**
   Supported **only** if `transferability === 'YES'` AND `sellability === 'YES'`.
   $$\text{EV}_{\text{SELL}} = (\text{MarketBid} \times \text{SurplusQuantity}) - \text{MarketFee}_{\text{ECON}} - \text{GasCost}$$
   - Where $\text{MarketFee}_{\text{ECON}} = 2.5\%$ (250 bps per protocol rule).
   - If market demand is thin or expiry is within 12 hours, haircut increases.

3. **TRANSFER (Direct P2P Peer Buyout):**
   Supported **only** if `transferability === 'YES'`.
   $$\text{EV}_{\text{TRANSFER}} = (\text{AgreedPrice} \times \text{SurplusQuantity}) - \text{NetworkFriction} - \text{RecoveryFee}_{\text{ECON}}$$
   - Where $\text{RecoveryFee}_{\text{ECON}} = 5.0\%$ of net recovered amount.

4. **REFUND (Issuer SLA Redemption):**
   Supported **only** if `refundability === 'YES'` AND issuer adapter exists.
   $$\text{EV}_{\text{REFUND}} = (\text{RefundRate} \times \text{SurplusNominal}) - \text{IssuerPenalty} - \text{RecoveryFee}_{\text{ECON}}$$

5. **Optimal Recommendation:**
   $$\text{Strategy}^* = \arg\max_{s} \{\text{EV}_{s}\} \quad \text{subject to } \text{Eligibility}(s) == \text{TRUE}$$
   If all recovery strategies yield $\le \text{EV}_{\text{KEEP}}$ or are ineligible, the system outputs `NO_ACTION` / `KEEP`.

---

## 5. Strict Lifecycle State Transitions

A recovery operation strictly navigates sequential states. **No state jumping is permitted.**

```
   ┌───────────┐
   │ DETECTED  │  (Stranded value detected via scan)
   └─────┬─────┘
         ▼
   ┌───────────┐
   │ EVALUATED │  (Surplus quantified & usage forecast verified)
   └─────┬─────┘
         ▼
   ┌───────────┐
   │ ELIGIBLE  │  (Entitlements & reason codes verified)
   └─────┬─────┘
         ▼
   ┌─────────────┐
   │ RECOMMENDED │  (Valuation engine selects max EV strategy)
   └─────┬───────┘
         ▼
   ┌─────────────────┐
   │ POLICY_APPROVED │  (ECON Policy Engine grants execution token)
   └─────┬───────────┘
         ▼
   ┌───────────┐
   │ EXECUTING │  (Adapter submits on-chain or marketplace action)
   └─────┬─────┘
         ▼
   ┌───────────┐
   │  SETTLED  │  (Receipt verified & state reconciled)
   └───────────┘
```

**Alternative Valid Terminal & Intermediate States:**
- `INELIGIBLE`: Object lacks rights or surplus.
- `REVIEW_REQUIRED`: Requires operator sign-off.
- `POLICY_BLOCKED`: Denied by agent spending or recovery policy.
- `REJECTED`: Target counterparty or marketplace rejected listing.
- `FAILED`: Settlement transaction reverted on-chain.
- `CANCELLED`: Operator manually aborted prior to execution.
- `EXPIRED`: Resource reached deadline during evaluation.

---

## 6. Execution Safety & Concurrency Guarantees

1. **Idempotency Keys:** Every recovery proposal generates a deterministic hash:
   $$\text{IdempotencyKey} = \text{keccak256}(\text{ObjectId} \parallel \text{OwnerId} \parallel \text{Strategy} \parallel \text{Quantity} \parallel \text{TimestampWindow})$$
2. **Double-Spend Prevention:** Once an object transitions to `EXECUTING` or `LISTED`, it is locked in the `EconomicStore` and cannot be included in any concurrent recovery scan or secondary proposal.
3. **Fail-Closed Default:** Any unexpected exception, timeout, or ambiguous contract receipt leaves the object in `REVIEW_REQUIRED`, never marked as settled or recovered.

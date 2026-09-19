# ECON Constitution & Design Principles

## Article I: Foundational Truth
ECON is not a dashboard pretending to be an economic network. The interface must be a projection of a functioning economic engine. Every displayed balance, transaction, asset, recovery opportunity, and simulation result must originate from actual application state.

AI may analyze, recommend, and plan. Policy logic authorizes. Smart contracts enforce critical on-chain rules. Settlement adapters execute. The UI only represents the resulting state.

---

## Article II: Decoupled Settlement Architecture
1. The economic engine does not know or care whether settlement occurs locally or on Monad.
2. All financial settlements and asset state transfers must route through the `SettlementAdapter` interface.
3. In-memory execution must never be disguised as a blockchain. It is explicitly identified as `LocalSettlementAdapter`.
4. Monad EVM integration must use real smart contracts (`ECONIdentityRegistry`, `ECONEconomicObject`, `ECONEscrow`) and real EVM interactions when active.

---

## Article III: Programmable Economic Objects
1. Value in ECON is not merely tokens moving between wallets.
2. The core economic unit is the **Economic Object** (Compute reservations, API licenses, storage capacity, escrow claims, data access rights).
3. Economic objects carry strict metadata: Owner, Type, Value/Denomination, Expiry, Transferability, Conditions, and Lifecycle Status.

---

## Article IV: Quantitative Economic Garbage Collection
1. Garbage collection is an economic discipline, not a naive boolean flag.
2. Recovery must follow a rigorous, observable pipeline:
   $$\text{Object} \rightarrow \text{Scanner} \rightarrow \text{Detector} \rightarrow \text{Analysis} \rightarrow \text{Policy Check} \rightarrow \text{Strategy} \rightarrow \text{EV Calculation} \rightarrow \text{Approval} \rightarrow \text{Settlement}$$
3. The GC engine recommends quantitative Expected Values across `KEEP`, `SELL`, `TRANSFER`, and `REFUND`. It does not perform unapproved destructive actions unless permitted by explicit policy.

---

## Article V: Policy Pre-Flight Enforcement
1. No transaction, escrow lock, or recovery action shall execute without passing the `PolicyEngine`.
2. Agent spending caps, category restrictions, daily limits, and minimum liquidity reserves are hard constraints enforced before reaching the settlement layer.

---

## Article VI: Interface Integrity
1. Visual aesthetic: **Financial Operations Platform & Bloomberg Terminal Control Plane**.
2. Avoid generic gimmicks: No neon glows, no synthetic particle animations, no fake random tickers.
3. Every metric (Treasury, Active Agents, Objects, Stranded Value, Recovered Value) is mathematically derived from the normalized state ledger.

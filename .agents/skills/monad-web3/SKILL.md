---
name: monad-web3
description: 'Build, integrate, debug, or review Monad EVM Web3 features in ECON. Use for Monad testnet settlement, viem clients, Solidity contracts, wallet and RPC integration, ERC-8004 identity, escrow, economic objects, on-chain verification, or questions about whether a flow is genuinely on-chain versus local simulation.'
argument-hint: '[feature, contract, or failing flow]'
user-invocable: true
disable-model-invocation: false
---

# Monad Web3 for ECON

## Purpose

Use this skill to make Monad-compatible changes that remain truthful about execution. ECON has a decoupled `SettlementAdapter` boundary, policy pre-flight checks, normalized economic state, and Solidity contracts. Preserve those boundaries while connecting real EVM behavior.

## When to Use

- Add or change Monad testnet settlement, transfers, escrow, or economic-object flows.
- Integrate wallets, RPC calls, contract reads/writes, transaction receipts, or event logs.
- Add or review viem clients, ABI definitions, contract addresses, chain configuration, or network switching.
- Work on ERC-8004 identity or reputation integration.
- Investigate a mismatch between UI state, local adapters, and on-chain state.
- Review a Web3 change for false claims, missing policy enforcement, unsafe authorization, or weak tests.

## Operating Rules

1. Start from the narrowest owning surface: the relevant SDK method, `SettlementAdapter`, contract function, or failing test.
2. Read nearby types, callers, and tests before editing. State one falsifiable hypothesis and identify the cheapest check that could disprove it.
3. Keep settlement logic behind `src/settlement/interface.ts`. Do not make the economic engine depend directly on Monad, wallet APIs, or a specific RPC client.
4. Route every transaction, escrow lock, and recovery action through `PolicyEngine` before settlement. Do not bypass spending caps, categories, daily limits, or liquidity reserves.
5. Treat local execution and Monad execution as different modes. Never label an in-memory balance update, generated hash, or fabricated block number as a real blockchain transaction.
6. For live execution, use a configured chain, account, public client, wallet client, contract ABI, and receipt confirmation. Surface the actual transaction hash, block number, status, and revert reason.
7. Never hard-code private keys, seed phrases, API keys, or user signatures. Use injected accounts or wallet clients and environment configuration for non-secret endpoints.
8. Use integer-safe units for EVM values. Convert MON to wei at the boundary and avoid floating-point arithmetic for amounts, fees, limits, and comparisons.
9. Validate addresses, chain ID, contract code presence, and configured network before sending a transaction. Fail closed on a mismatch.
10. Preserve ECON invariants: state originates from the ledger or verified chain data, economic objects retain lifecycle metadata, and destructive recovery requires explicit approval unless policy explicitly permits it.

## Procedure

### 1. Identify the execution mode

- Find the caller and the controlling method.
- Determine whether the path uses `LocalSettlementAdapter`, `MonadSettlementAdapter`, or a shared interface.
- Check whether the current implementation mutates `EconomicStore` directly or actually submits an EVM transaction.
- Record the intended truth in the change: local deterministic simulation, read-only chain integration, or signed live settlement.

### 2. Verify the network and contracts

- Confirm the target chain ID, RPC URL, native currency, and environment name from configuration rather than assumptions.
- Confirm each contract address for the target network and verify deployed bytecode with a public client before relying on it.
- Read the Solidity contract and its events, access control, payable behavior, units, and revert conditions.
- Keep ABI definitions close to the integration surface and type the function arguments and results.
- Do not silently reuse addresses from another network or infer deployment success from a non-empty address.

### 3. Design at the adapter boundary

- Extend `SettlementAdapter` only when the capability is genuinely settlement-specific.
- Keep policy checks, identity lookup, economic-object lifecycle, and derived metrics in the SDK layer.
- Let the Monad adapter translate SDK values to contract values and translate receipts/events back into `SettlementResult` and ECON events.
- Make state transitions occur after confirmed success. On failure, leave balances, escrow status, and object ownership unchanged.
- Make repeated calls safe where the contract and business operation require idempotency; use stable operation IDs or inspect existing state before retrying.

### 4. Implement the EVM path

- Create the appropriate viem public client for reads and wallet client for writes.
- Use the configured Monad chain explicitly and reject a connected wallet on the wrong chain.
- Encode amounts with `parseEther` or the token's decimals and decode with `formatEther` only for presentation.
- Submit contract writes with the least authority required, then wait for the receipt.
- Check `receipt.status`, emitted event logs, and returned contract state before publishing success to the store or UI.
- Preserve the real hash and block number. Do not generate placeholder hashes or increment local block counters in a live path.
- Normalize RPC, wallet rejection, timeout, revert, and receipt failures into actionable `SettlementResult` errors without exposing secrets.

### 5. Integrate identity and authorization

- Resolve the ECON agent to an authorized controller or wallet before sending funds.
- Verify ownership and caller permissions against the contract, not only local metadata.
- Keep identity and reputation writes explicit and auditable; do not treat a local agent ID as proof of an on-chain identity.
- For escrow, verify buyer, seller, amount, deadline, condition, and contract state before release or refund.

### 6. Update UI and observability

- Present network, chain ID, contract, transaction hash, block, confirmation status, and error state distinctly.
- Label local mode as local and simulated; label Monad mode as Monad only after a verified chain result.
- Emit structured ECON events for submitted, confirmed, reverted, and rejected operations.
- Avoid fake live indicators, random activity, or optimistic financial metrics that are not derived from confirmed state.

### 7. Test the smallest risky slice

Add or update focused tests for:

- Wrong chain, missing contract code, invalid address, and unavailable RPC.
- Policy rejection before any wallet or contract call.
- Amount conversion and insufficient funds.
- Successful receipt handling and event/state reconciliation.
- Revert, wallet rejection, timeout, and malformed receipt handling.
- Escrow lifecycle and protection against double release or refund.
- Local adapter behavior remaining deterministic and clearly separate from Monad behavior.

Use mocks for deterministic unit tests and a clearly opt-in integration test for a real Monad testnet RPC. Never require a private key for the default test suite.

## Completion Checklist

- [ ] The owning code path and execution mode are documented by behavior, not naming.
- [ ] Policy checks run before every settlement or destructive recovery action.
- [ ] No live transaction is represented by a fabricated hash, block number, or local-only balance mutation.
- [ ] Chain ID, RPC, addresses, ABI, authorization, and contract bytecode are validated.
- [ ] EVM amounts use integer-safe units and no floating-point accounting crosses the boundary.
- [ ] Store state changes happen only after confirmed success and are reconciled with receipt data.
- [ ] Errors preserve enough context to debug without leaking secrets.
- [ ] Focused tests cover success, rejection, revert, wrong-network, and lifecycle edge cases.
- [ ] `npm test` and `npm run build` pass, or any unrelated existing failure is reported clearly.
- [ ] UI labels and documentation distinguish local execution from real Monad settlement.

## Useful Repository References

- Settlement contract: [`src/settlement/interface.ts`](../../../src/settlement/interface.ts)
- Monad adapter: [`src/settlement/MonadSettlementAdapter.ts`](../../../src/settlement/MonadSettlementAdapter.ts)
- Local adapter: [`src/settlement/LocalSettlementAdapter.ts`](../../../src/settlement/LocalSettlementAdapter.ts)
- SDK policy: [`src/sdk/policy.ts`](../../../src/sdk/policy.ts)
- SDK types and results: [`src/sdk/types.ts`](../../../src/sdk/types.ts)
- Monad contracts: [`contracts/`](../../../contracts/)
- Tests: [`tests/`](../../../tests/)

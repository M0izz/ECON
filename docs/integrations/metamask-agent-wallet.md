# MetaMask Agent Wallet Integration in ECON Protocol

## Executive Summary

ECON integrates the **MetaMask Agent Wallet** (`@metamask/agent-wallet` / `@metamask/agent-sdk` v7.0.0, `mm` CLI) as the **Programmatic Wallet Control Layer for AI Agents**.

> **Core Architectural Principle:**
> *"MetaMask Agent Wallet provides wallet control. ECON Policy Engine provides economic authorization."*

MetaMask Agent Wallet does **not** replace Mera Passkeys, Dynamic Embedded Wallets, or Monad settlement. Instead, it completes the programmatic execution stack, allowing autonomous AI agents (such as `ResearchAgent-42`) to hold dedicated operational wallets, simulate transactions, protect against MEV and malicious counterparties, and settle verified actions on Monad EVM.

---

## 1. Why ECON Uses MetaMask Agent Wallet

AI agents operating autonomously in decentralized machine economies need self-custodial on-chain execution capabilities without human interaction for every signature. However, giving an LLM direct, unconstrained access to a private key is an existential security flaw.

MetaMask Agent Wallet solves the **wallet control layer** by providing:
1. **Dedicated Agent Custody:** Separation of human operational wallets from agent operational wallets using Trusted Execution Environments (server-wallet TEE mode) or Bring-Your-Own-Key (BYOK mode).
2. **Three-Tier Security Pipeline:** Built-in transaction pre-simulation, Blockaid-powered threat scanning, and MEV protection prior to broadcasting.
3. **Agentic Tooling:** Scriptable and CLI-driven execution (`mm transfer`, `mm wallet send-transaction`, `mm doctor`).

ECON solves the **economic governance layer** by ensuring that **no wallet operation can occur without prior authorization from the ECON Policy Engine**.

---

## 2. Core Architecture

```
                 AI Model / Agent Reasoning (e.g. Qwen / ResearchAgent-42)
                                             ↓
                      [Proposes Structured Economic Action]
                                             ↓
                                  ECON Economic Identity
                                (Sovereign Entity / Reputation)
                                             ↓
                                   MetaMask Agent Wallet
                           (Programmatic Control Layer / Signer)
                                             ↓
                                    ECON Policy Engine
                        (Spending Floor, Caps, Category Allowlist)
                                   /                   \
                            [ALLOW]                     [BLOCK / REVIEW]
                               ↓                               ↓
               MetaMask Security Pipeline                Halt Execution
              1. Transaction Pre-Simulation           (No signature / submit)
              2. Blockaid Threat Scanner
              3. MEV Protection
                               ↓
                   Monad Settlement Adapter
                       (Chain ID 10143)
                               ↓
                        Envio HyperIndex
                 (Real-time Event Ingestion)
                               ↓
                       ECON State Update
```

### Invariant: Never Give LLMs Raw Wallet Access
- **Forbidden:** LLM → `sendRawTransaction` → Chain.
- **Enforced:** LLM → Structured Intent (`executeEconomicTransaction`) → ECON Policy Check (`validateTransaction`) → MetaMask Simulation & Threat Scan → Signed Monad Transaction.

---

## 3. Economic Identity vs. Wallet Binding

ECON maintains an explicit architectural distinction across four tiers:

| Tier | Component | Role | Example |
| :--- | :--- | :--- | :--- |
| **1. Identity** | Economic Identity | Sovereign economic entity, legal/social identity, reputation | `ResearchAgent-42` (`ERC-8004 #42`) |
| **2. Control** | MetaMask Agent Wallet | Programmatic wallet control mechanism, signing engine | `MetaMaskAgentWalletAdapter` (server-wallet TEE) |
| **3. Policy** | ECON Policy Engine | Quantitative boundaries, daily caps, approval thresholds | `Max: 5 MON`, `Daily: 20 MON` |
| **4. Settlement**| Monad EVM | Underlying execution account & parallel consensus | `0x1842B6792A645c110E663B514571A15C198547A1` (10143) |

The explicit binding is registered in `EconomicIdentityWalletBindingRegistry`:
```typescript
const binding = bindingRegistry.bind({
  agentId: 'ResearchAgent-42',
  walletMode: 'server-wallet',
  walletAddress: '0x1842B6792A645c110E663B514571A15C198547A1',
  monadAddress: '0x1842B6792A645c110E663B514571A15C198547A1',
});
```

---

## 4. Setup & Environment Variables

MetaMask Agent Wallet is configured via standard environment variables:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `MM_WALLET_TYPE` | Wallet mode: `server-wallet` or `byok` | `server-wallet` |
| `MM_MODE` | Trading policy mode: `guard` or `beast` | `guard` |
| `MM_MNEMONIC` | BIP-39 mnemonic seed phrase (used in BYOK mode) | `twelve word seed phrase ...` |
| `MM_PASSWORD` | Password for local encryption at rest | `your-secure-password` |
| `MM_RPC_URL` | Monad RPC URL | `https://testnet-rpc.monad.xyz` |
| `MM_CLI_PATH` | Path to `mm` executable on server | `mm` |
| `MONAD_RPC_URL`| Monad RPC endpoint | `https://testnet-rpc.monad.xyz` |

---

## 5. Policy Engine Boundary

Every transaction initiated through MetaMask Agent Wallet is pre-flighted by `executeMetaMaskGatedTransaction`:

```typescript
// 1. Policy check executes FIRST
const policyCheck = policyEngine.validateTransaction(agentId, amountMon, category);

if (!policyCheck.allowed) {
  // BLOCKED: nothing is signed or submitted
  return { success: false, status: 'BLOCKED_BY_POLICY', reason: policyCheck.reason };
}

if (policyCheck.requiresManualApproval) {
  // REVIEW: halts automatic execution, escalates to operator review
  return { success: false, status: 'REQUIRES_REVIEW' };
}

// 2. ONLY upon ALLOW does MetaMask Agent Wallet sign and submit
const walletResult = await walletAdapter.signAndSubmitAuthorizedTransaction(intent);
```

### Policy Decisions Matrix:
* **ALLOW:** Transaction complies with `maxPerTransaction`, `dailySpendingLimit`, `minRetainedBalance`, and `allowedCategories`. Wallet signs and broadcasts.
* **BLOCK:** Transaction violates any quantitative or categorical constraint. Operation immediately terminates; zero network calls.
* **REVIEW:** Transaction exceeds `requireApprovalAbove` or flags suspicious counterparty intelligence via Nansen. Never silently executed.

---

## 6. Agent Tool: `executeEconomicTransaction`

AI agents in ECON interact with the wallet through a strictly typed, schema-validated tool exposed on `AgentRuntime`:

```typescript
const result = await runtime.executeEconomicTransaction({
  type: 'BUY',
  recipient: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  amountMon: 2.0,
  category: 'API_LICENSE',
  economicIdentity: 'ResearchAgent-42',
  memo: 'Acquisition of Research API license',
});
```

Arbitrary `sendRawTransaction` or unconstrained contract calls are completely blocked.

---

## 7. Golden Path Demo (`ResearchAgent-42`)

The complete end-to-end golden path demonstrator works as follows:

1. **Entity:** `ResearchAgent-42` with Economic Identity `RESEARCH-42`.
2. **Treasury:** `20.0 MON`.
3. **Policy:** Max single transaction: `5.0 MON`, Daily cap: `20.0 MON`.
4. **Discovery:** Agent discovers Research API provided by `GeoVision Provider` priced at `2.0 MON`.
5. **Proposal:** Agent generates structured intent `BUY API` for `2.0 MON`.
6. **Policy Engine Evaluation:** `2.0 MON <= 5.0 MON` cap, category `API_LICENSE` allowed → **ALLOW**.
7. **MetaMask Agent Wallet Execution:**
   - Step 1: Pre-simulation validates state diffs (`-2.0 MON` from agent, `+2.0 MON` to provider).
   - Step 2: Blockaid scans provider address → Risk: `LOW`.
   - Step 3: Transaction signed and submitted to Monad Testnet (Chain ID 10143).
8. **Monad Settlement:** Receipt confirmed (`txHash: 0x...`).
9. **Envio HyperIndex:** Ingests `SETTLEMENT_COMPLETED` event in real time.
10. **ECON State Update:** Treasury updated to `18.0 MON`, economic object added to registry.

---

## 8. Recovery Integration (Economic Garbage Collector)

When stranded economic objects (e.g. idle compute allocations, unconsumed data credits) are identified:
1. Economic Garbage Collector computes expected value (EV) across `KEEP`, `SELL`, `TRANSFER`, `REFUND`.
2. Qwen generates economic recommendation.
3. ECON Policy validates recovery strategy.
4. Chainlink CRE orchestrator initiates workflow.
5. MetaMask Agent Wallet executes the authorized recovery transfer on Monad.
6. Envio indexes the recovery event, crediting the agent treasury.

---

## 9. Security Model Summary

1. **Server-Side Protection:** Secret keys and mnemonics are stored exclusively server-side in environment variables or TEEs.
2. **Never in Frontend:** Client cards only receive public addresses, live balances, and transaction hashes.
3. **Pre-flight Enforcement:** Policy Engine checks are synchronous, idempotent, and non-bypassable.
4. **Provable Auditability:** Every transaction yields an immutable hash indexed by Envio and recorded on the Monad testnet explorer.

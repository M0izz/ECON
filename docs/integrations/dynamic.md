# ECON — Dynamic Integration Specification

> **Bounty Target**: Best Use of Dynamic  
> **Network**: Monad Testnet (Chain ID `10143`)  
> **Protocol**: ECON — Sovereign Autonomous Economic Operating Layer  
> **Package Target**: `@dynamic-labs/sdk-react-core` & `@dynamic-labs/ethereum` (v5.9.x)

---

## 1. Executive Summary & Objective

ECON is an Economic Operating Layer for autonomous AI agents on Monad. It equips autonomous agents with persistent sovereign identity (ERC-8004), programmable economic objects, high-throughput escrow, secondary marketplace liquidity, credit vaults, and an Economic Garbage Collector (GC) that recovers stranded assets.

In this architecture, **Dynamic** provides an enterprise-grade onboarding and wallet infrastructure layer for human operators, developers, and autonomous agent instances. Dynamic enables:
- Frictionless email, social, and embedded EVM wallet creation on Monad Testnet without requiring pre-installed browser extensions.
- External wallet connection (MetaMask, Rabby, Coinbase, Rainbow) via Dynamic's unified interface.
- Programmatic Viem `WalletClient` exposure for live on-chain execution on Monad Testnet.
- Clean coexistence with **Category Labs' Mera** (biometric passkey PRF multi-account system) and standard AppKit/Wagmi wallets.

```
                              USER / DEVELOPER
                                     │
                     ┌───────────────┼───────────────┐
                     ↓               ↓               ↓
                Dynamic SDK     Mera Passkey    External Wallet
             (Embedded/Social)   (Biometric)    (MetaMask/Rabby)
                     │               │               │
                     └───────────────┼───────────────┘
                                     ↓
                          ECON Economic Identity
                                     ↓
                             ECON Policy Engine
                        (Spend caps, velocity limit)
                                     ↓
                          Monad Parallel EVM (10143)
```

---

## 2. Codebase Audit Findings

### A. Existing Wallet & Chain Infrastructure
1. **Reown AppKit & Wagmi (`src/config/wagmi.ts`, `src/main.tsx`)**:
   - Chain defined: `monadTestnet` (Chain ID `10143`, native currency `MON`, decimals 18, RPC `https://testnet-rpc.monad.xyz`).
   - Shared `QueryClient` and `WagmiAdapter` wrapped in `src/main.tsx`.
   - Used for traditional external wallet connections.
2. **Category Labs' Mera (`src/integrations/mera/`)**:
   - Seedless WebAuthn PRF root deriving 4 specialized role accounts (`operating`, `treasury`, `escrow`, `recovery`).
   - Exposes local Viem `Account` instances directly to `MonadSettlementAdapter`.
   - Complementary: Dynamic serves users seeking embedded EVM wallets, social onboarding, or unified wallet connectors, while Mera serves pure biometric passkey derivation.
3. **Monad Settlement Adapter (`src/settlement/MonadSettlementAdapter.ts`)**:
   - Accepts either injected browser signers via `setWalletClient()` or Mera accounts via `setMeraAccount()`.
   - All contract calls (`transfer`, `lockEscrow`, `releaseEscrow`, `transferEconomicObject`, `buyObject`) execute via Viem `WalletClient` and wait for `publicClient.waitForTransactionReceipt`.
   - Enforces valid 20-byte EVM addresses and logs events to `EventBus` for Envio indexing.

### B. Economic Identity & Policy Engine
1. **Economic Identity Registry (`src/sdk/identity.ts`, `contracts/ECONIdentityRegistry.sol`)**:
   - An Economic Identity maps a controller address to a sovereign agent record with credit ratings, spending policies, and passport metadata (ERC-8004).
   - **Crucial Distinction**: Dynamic is a wallet/control mechanism; it is *not* the Economic Identity itself. A Dynamic wallet controls one or more ECON Economic Identities.
2. **Policy Engine (`src/sdk/policy.ts`)**:
   - Authorizes or vetoes transactions *before* any cryptographic signing.
   - Enforces:
     - `maxPerTransaction`: hard spending cap per execution.
     - `dailySpendingLimit`: rolling 24-hour volume cap.
     - `minRetainedBalance`: reserve floor that cannot be drained.
     - `allowedCategories`: whitelist of programmable asset types.
   - **Rule**: If an economic action is blocked by policy, the Dynamic wallet is never asked to sign.

### C. Agent Creation Flow (`src/components/AgentBuilder.tsx`)
- Currently supports two control paths: `PASSKEY` (Mera PRF) and `EXTERNAL_WALLET` (Wagmi).
- Needs integration of a 3rd first-class control method: `[ Dynamic ]`.
- When selected, Dynamic's onboarding/embedded wallet authenticates the operator, returns the EVM address, registers the agent identity on Monad, and attaches policy guards.

---

## 3. Dynamic Integration Architecture

The integration is cleanly encapsulated in `src/integrations/dynamic/`:

```
src/integrations/dynamic/
├── dynamicConfig.ts     # Monad Testnet EVM network override & Dynamic settings
├── dynamicTypes.ts      # TypeScript interfaces for Dynamic wallet state & mapping
├── dynamicMapper.ts     # Mapping Dynamic wallets to ECON controller credentials
├── dynamicWallet.ts     # Client adapter providing getWalletClient, signMessage, sendTx
└── index.ts             # Clean public barrel export
```

### Application Boundary Provider
`DynamicContextProvider` wraps the app in `src/main.tsx` (coexisting with `WagmiProvider` and `QueryClientProvider`).
- Configured via `VITE_DYNAMIC_ENVIRONMENT_ID`.
- If the environment ID is not set in `.env`, the provider initializes in disabled/safe mode with clear console warnings, ensuring ECON never crashes or hangs for developers without a Dynamic account.

---

## 4. Monad Testnet Configuration for Dynamic

Dynamic uses custom EVM network overrides matching ECON's verified network parameters:

```typescript
export const monadTestnetDynamicNetwork = {
  blockExplorerUrls: ['https://testnet.monadexplorer.com'],
  chainId: 10143,
  chainName: 'Monad Testnet',
  iconUrls: ['https://avatars.githubusercontent.com/u/179229932'],
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  networkId: 10143,
  rpcUrls: ['https://testnet-rpc.monad.xyz'],
  vanityName: 'Monad Testnet',
};
```

---

## 5. Economic Identity Mapping & Security Contract

When a Dynamic wallet connects:
1. **Safe Storage**: ECON stores only public, verifiable attributes:
   - Controller Address (`0x...`)
   - Provider: `'DYNAMIC'`
   - Wallet Type (e.g., `'embedded'`, `'metamask'`, `'turnkey'`)
   - Network: Monad Testnet (`10143`)
   - Associated Agent Identity ID (`bytes32` / string)
2. **Zero Secret Leakage**: Private keys, seed phrases, session tokens, and Dynamic internal API secrets are **never** logged, stored in `localStorage`, or exposed to the UI.
3. **Explicit Control Handover**: If an agent is already registered under an existing controller address, connecting a new Dynamic wallet does not silently reassign identity ownership without on-chain signature authorization.

---

## 6. Real Monad Transaction Flow with Policy Pre-Check

```
1. Agent triggers action (e.g. Purchase Compute Object for 10 MON)
   ↓
2. ECON Policy Engine evaluates action against agent policy:
   - Amount <= maxPerTransaction (20 MON) -> PASS
   - Daily total + 10 MON <= dailySpendingLimit (100 MON) -> PASS
   - Balance - 10 MON >= minRetainedBalance (25 MON) -> PASS
   [IF FAILED: Throw PolicyViolationError; Dynamic is never invoked]
   ↓
3. MonadSettlementAdapter receives approval
   ↓
4. Dynamic WalletClient signs transaction
   ↓
5. Monad Parallel EVM processes transaction & emits contract events
   ↓
6. Viem client receives receipt (block #, tx hash, gas used)
   ↓
7. Envio HyperIndex captures on-chain events
   ↓
8. ECON Audit Ledger updates with Envio & Monad provenance badges
```

---

## 7. Wallet Switching Matrix

| Current State | Desired State | Action Taken |
| :--- | :--- | :--- |
| **External (AppKit)** | **Dynamic** | Disconnect Wagmi session, set active control provider to Dynamic, route Viem `WalletClient` from Dynamic primary wallet into settlement adapter. |
| **Dynamic** | **Mera (Passkey)** | Unset Dynamic active session, load Mera PRF derived accounts, route operating Viem account into settlement adapter. |
| **Mera (Passkey)** | **Dynamic** | Disconnect Mera session, activate Dynamic wallet, verify network is Monad (10143). |

---

## 8. Testing & Validation Plan

1. **Configuration**: Test fallback behavior when `VITE_DYNAMIC_ENVIRONMENT_ID` is unset.
2. **Wallet Adapter**: Test address mapping, provider detection, network validation, and `WalletClient` generation.
3. **Policy Gate**: Test that transactions exceeding spend caps are blocked *before* reaching the Dynamic signer.
4. **Agent Creation**: Test agent registration flow using Dynamic wallet as controller credential.
5. **Mera & External Coexistence**: Test that activating Dynamic does not corrupt or overwrite Mera identities or AppKit configurations.

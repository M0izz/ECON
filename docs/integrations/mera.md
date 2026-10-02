# ECON — Mera Passkey Integration Specification & Architecture

## 1. Why ECON Uses Mera

Autonomous agents are rapidly evolving into sovereign economic actors that purchase compute, lease inference models, exchange datasets, and settle obligations. However, traditional blockchain key management creates a stark dilemma for autonomous systems:
- **Seed phrases and raw private keys** create severe security liabilities, accidental leaks, and custody nightmares.
- **Hosted, custodial, or third-party web2 auth solutions** introduce centralized attack vectors and custodial counterparty risk.

**Category Labs' Mera** provides the ideal cryptographic foundation for ECON:
1. **Biometric, Non-Custodial Control**: Humans and autonomous operators can create and control an ECON Economic Identity using hardware-secured passkeys (Face ID, Touch ID, Windows Hello, YubiKey) without managing or exposing seed phrases.
2. **WebAuthn PRF (Pseudo-Random Function) Extension**: Enables deterministic derivation of real EVM signing keys locally in client memory from the passkey's PRF root.
3. **One Passkey, Many Keys**: A single master biometric ceremony deterministically derives distinct, purpose-specific accounts (`operating`, `treasury`, `escrow`, `recovery`), enforcing strict role isolation.
4. **Native Monad Parallel EVM Compatibility**: Derived accounts are standard `secp256k1` Ethereum Virtual Machine accounts fully compatible with Monad Testnet (Chain ID `10143`), Viem, and existing smart contracts.

---

## 2. Conceptual & Technical Architecture

```text
                                USER PASSKEY
                    (Face ID / Touch ID / YubiKey / Windows Hello)
                                      ↓
                         MERA WEBAUTHN PRF CEREMONY
                                      ↓
                           32-BYTE PRF ROOT SECRET
                                      ↓
                     ECON DETERMINISTIC HKDF DERIVATION
       ┌──────────────────────┬──────────────────────┬──────────────────────┐
       ↓                      ↓                      ↓                      ↓
  Operating Key          Treasury Key           Escrow Key             Recovery Key
  (HKDF Info: 0)         (HKDF Info: 1)         (HKDF Info: 2)         (HKDF Info: 3)
       ↓                      ↓                      ↓                      ↓
  Mera Secp256k1         Mera Secp256k1         Mera Secp256k1         Mera Secp256k1
  Signing Session        Signing Session        Signing Session        Signing Session
       ↓                      ↓                      ↓                      ↓
  Viem LocalAccount      Viem LocalAccount      Viem LocalAccount      Viem LocalAccount
  (Source: "mera")       (Source: "mera")       (Source: "mera")       (Source: "mera")
       │                      │                      │                      │
       └──────────────────────┼──────────────────────┴──────────────────────┘
                              ↓
                ECON ECONOMIC IDENTITY (ResearchAgent-42)
                ├── Economic Identity ID: econ_mera_researchagent_42_...
                ├── Controller: Passkey (Credential ID)
                ├── Operating Address: 0x938c17F8057A4A4431D3a55C40a9DC992a6ce416
                ├── Treasury Address: 0x469aCC5597d553F5d7bF080e1e032b4758a5db6c
                ├── Escrow Address: 0x525831e47883A99c78098bb3aa1f4FC221C69883
                ├── Recovery Address: 0x4D6A6a56829ACb4D9371ef60943aD8f1834a93F5
                └── Configured Policy Constraints
                              ↓
                      ECON POLICY ENGINE
                (Deterministic Pre-Execution Checks:
                 Spend Caps / Daily Velocity / Reserve Floor)
                              ↓ [Allowed Only]
                      SETTLEMENT ADAPTER
                              ↓
                     MONAD TESTNET (10143)
```

---

## 3. Passkey Lifecycle & Session Management

1. **Creation Flow (`createEconomicIdentity`)**:
   - The user selects **Create with Passkey**.
   - Mera invokes `createPasskeyWithPrfOutput` using the browser's `navigator.credentials.create()`.
   - The platform prompts the user for biometric or security key verification.
   - The WebAuthn PRF extension evaluates the salt `sha256("econ.mera.prf.salt.v1")` and produces a 32-byte PRF root.
   - ECON derives the 4 purpose-specific signing sessions and registers the Economic Identity.
2. **Active Signing Session (`MeraSessionManager`)**:
   - Live signing sessions (`Secp256k1SigningSession`) reside strictly in-memory.
   - The sessions back Viem `LocalAccount` signers that power transaction execution on Monad.
3. **Session Termination (`disconnect`)**:
   - Calling `disconnect()` iterates across all 4 account sessions and calls `session.end()`.
   - `session.end()` immediately zeroes out the internal private key scalar buffer in memory.
   - Subsequent signing calls fail deterministically with `MeraError` (`SESSION_ENDED`).
   - Active identity references are unmounted from memory.
4. **Inactivity & Tab Lifecycle**:
   - Refreshing or closing the tab clears memory. Returning users simply click **Sign in with Passkey** to instantly restore the identical accounts.

---

## 4. Account Derivation Model: "One Passkey, Many Keys"

All ECON accounts derive deterministically from the single Mera PRF output using **HKDF-SHA256 (RFC 5869)**.

### Derivation Formulas:
- **Salt**: `UTF-8("ECON_MERA_DERIVATION_V1")`
- **Purpose Info Strings**:
  - `operating`: `UTF-8("ECON_OPERATING_ACCOUNT_V1")` (Account index 0)
  - `treasury`:  `UTF-8("ECON_TREASURY_ACCOUNT_V1")` (Account index 1)
  - `escrow`:    `UTF-8("ECON_ESCROW_ACCOUNT_V1")` (Account index 2)
  - `recovery`:  `UTF-8("ECON_RECOVERY_ACCOUNT_V1")` (Account index 3)

$$\text{PRK} = \text{HMAC-SHA256}(\text{salt}, \text{prfOutput})$$
$$\text{privateKey}_{role} = \text{HKDF-Expand}(\text{PRK}, \text{info}_{role}, 32)$$

### Invariants:
- **Deterministic**: The same passkey evaluated against the same salt produces the exact same PRF root and the exact same EVM addresses.
- **Domain-Separated**: Unique `info` tags prevent cross-role key collision.
- **Collision-Resistant**: Cryptographic security relies on SHA-256 and secp256k1 curve parameters.
- **Scalar Validation**: Derivation checks that the scalar $k$ satisfies $1 \le k < n_{\text{secp256k1}}$.

---

## 5. Economic Identity Relationship

Mera accounts are **not** the Economic Identity. They represent the **cryptographic control and signing layer**.

| Layer | Responsibility | Persistence |
| :--- | :--- | :--- |
| **Mera** | Ephemeral in-memory signing sessions, ECDSA signatures, PRF evaluation | Ephemeral / Zeroed on end |
| **ECON Identity** | Sovereign economic entity: name, policy, capabilities, balance sheet | Persistent in Economic Store |
| **ERC-8004** | Agent passport, on-chain discovery, public provenance on Monad | On-chain contract registry |

An ECON Economic Identity contains:
- `id`: Unique identifier (e.g. `econ_mera_researchagent_42_...`)
- `controllerType`: `'PASSKEY_MERA'`
- `passkeyCredentialId`: Unpadded base64url credential identifier
- `passkeyAccounts`: Addresses for `operating`, `treasury`, `escrow`, `recovery`
- `policy`: Spending limits, velocity limits, reserve floors

---

## 6. Account Roles & Purposes

1. **OPERATING ACCOUNT (`operating`)**:
   - Routine agent economic commerce: purchasing compute, API credits, data subscriptions, and marketplace trade.
   - Serves as the default signer for day-to-day interactions.
2. **TREASURY ACCOUNT (`treasury`)**:
   - High-value reserve holdings and capital custody.
   - Subject to strict approval thresholds and reserve floor guarantees.
3. **ESCROW ACCOUNT (`escrow`)**:
   - Counterparty value locking for conditional agreements and delivery SLAs.
   - Interacts directly with `ECONEscrow.sol` on Monad Testnet.
4. **RECOVERY ACCOUNT (`recovery`)**:
   - Recipient for the Economic Garbage Collector (GC).
   - Collects salvaged capital from expired or stranded economic objects.

---

## 7. Session Security & Zero-Leakage Policy

The implementation guarantees:
- **NO Private Key Persistence**: PRF output, private keys, and intermediate HKDF seed buffers are **NEVER** written to `localStorage`, `sessionStorage`, `IndexedDB`, cookies, URL parameters, logs, analytics, or serialized React state.
- **Immediate Zeroing**: After creating a Mera `Secp256k1SigningSession`, intermediate key byte arrays are wiped with `.fill(0)`.
- **Public Metadata Separation**: The `ECONPasskeyPublicMetadata` interface exposes only safe public metadata: `credentialId`, public EVM addresses, and transports.

---

## 8. Monad Testnet Integration

- **Chain ID**: `10143`
- **RPC URL**: `https://testnet-rpc.monad.xyz`
- **Explorer**: `https://testnet.monadexplorer.com` / `https://testnet.monadscan.com`
- **Viem Integration**: Mera accounts implement Viem's `LocalAccount<'mera'>` and connect directly to Viem `createWalletClient` and `createPublicClient` via `MonadSettlementAdapter`.
- **Real Settlements**: All on-chain transactions query live RPC balances and wait for genuine Monad transaction receipts.

---

## 9. Policy Engine Integration

Mera signers **CANNOT** bypass the ECON Policy Engine.

```text
Autonomous Agent Intent
           ↓
   ECON Policy Engine
  ├── 1. Minimum Retained Reserve Check (Floor Protection)
  ├── 2. Max Single Transaction Cap Check
  ├── 3. Daily Spending Aggregation (Velocity Cap)
  ├── 4. Category Allowlist Verification
  └── 5. Manual Approval Threshold Check
           ↓
  [ ALLOWED ]  ───────────────┐
           ↓                  ↓ [ BLOCKED ]
   Mera Signing Session    Mera is NEVER Invoked
           ↓               Event: POLICY_BLOCKED
    Monad Execution        Transaction Cancelled
```

Unit test `tests/mera-policy.test.ts` proves that a blocked transaction never reaches the Mera signer.

---

## 10. Economic Garbage Collector & Recovery Integration

The Economic Garbage Collector (GC) scans balance sheets for stranded assets (underutilized API licenses, expired compute credits). When a recovery opportunity is identified:
1. GC computes mathematical Expected Value (EV).
2. Proposes a `RecoveryPlan` targeting the `recovery` account.
3. Policy engine validates `autoRecoveryEnabled`.
4. Upon approval, value sweeps into the Mera-derived recovery address on Monad Testnet.

---

## 11. Cross-Device & Returning-User Flow

Mera enables frictionless cross-device recovery:
1. Returning user clicks **Sign In with Passkey**.
2. Authenticator performs assertion ceremony with the PRF extension.
3. Evaluates the fixed salt `sha256("econ.mera.prf.salt.v1")`.
4. The exact same 32-byte PRF root is returned.
5. HKDF re-derives the exact same 4 accounts (`operating`, `treasury`, `escrow`, `recovery`).
6. Verified by `tests/mera-derivation.test.ts` (Test 3) and `tests/mera-client-ui.test.ts` (Test 5).

---

## 12. Browser & Provider Limitations

- **Secure Context Required**: WebAuthn PRF requires HTTPS or `localhost`.
- **PRF Support**: Supported natively in Chromium-based browsers (Google Chrome, Brave, Edge), 1Password passkey vault, and hardware authenticators (YubiKey 5 Series).
- **Graceful Fallbacks**: If PRF is unavailable on a client browser, ECON maps `PRF_UNAVAILABLE` into a clear, actionable guide advising the user or offering the external wallet path.

---

## 13. Local Development Setup

```bash
# Clone and enter directory
git clone https://github.com/M0izz/ECON.git
cd ECON

# Install dependencies including @category-labs/mera
npm install

# Start Vite dev server on localhost (Secure Context)
npm run dev
```

---

## 14. Environment Variables

No private keys or sensitive credentials are required. Optional configuration in `.env`:

```env
# Optional custom Reown Project ID (defaults to built-in fallback)
VITE_REOWN_PROJECT_ID=b56e18d47c72ab683b10814fe9495694

# Monad Testnet RPC endpoint
VITE_MONAD_RPC_URL=https://testnet-rpc.monad.xyz

# ERC-8004 Identity Registry Contract Address
VITE_MONAD_IDENTITY_REGISTRY_ADDRESS=0x8004A818BFB912233c491871b3d84c89A494BD9e
```

---

## 15. Testing Suite

The dedicated test suite covers derivation, sessions, policy enforcement, client ceremonies, and Monad settlement:

```bash
# Run the full Vitest suite (115 tests across 23 test suites)
npx vitest run
```

Test breakdown:
- `tests/mera-derivation.test.ts` (9 tests): Deterministic derivation, domain separation, 4-role uniqueness.
- `tests/mera-session.test.ts` (5 tests): Signing, session termination, memory zeroing.
- `tests/mera-policy.test.ts` (5 tests): Policy gating, spending caps, reserve floors.
- `tests/mera-client-ui.test.ts` (5 tests): Error normalization, mock WebAuthn client ceremonies.
- `tests/mera-integration.test.ts` (4 tests): Monad Testnet public client queries, Viem signer integration, event emission.

---

## 16. Reproducible Demo Instructions

1. **Launch Local Application**:
   - Run `npm run dev` and open `http://localhost:5173`.
2. **Landing Page**:
   - Click **Passkey Identity** in the navbar or **Start building**.
3. **Agent Builder**:
   - Select Archetype: `ResearchAgent-42`.
   - In Section 3 ("Economic Control Authority"), choose **Biometric Passkey (Mera)**.
   - Click **Generate Passkey Accounts** to trigger the WebAuthn passkey prompt.
   - Observe the live derived 4 purpose-specific accounts in `OnePasskeyManyKeysVisual`.
   - Click **Deploy & Activate Native Agent**.
4. **Console Headquarters**:
   - Click **SHOWCASE ↗ / OS CONSOLE** to view the console.
   - Observe the active **PASSKEY CONTROLLER ACTIVE (MERA PRF)** credential badge.
   - Observe the 4 derived accounts (Operating, Treasury, Escrow, Recovery) and live Monad Testnet telemetry.
5. **Testing Spend & Policy**:
   - Perform an allowed transaction ($\le 20$ MON); transaction signs via Mera operating account.
   - Attempt an action $> 20$ MON; policy blocks it before invoking Mera.
6. **Sign Out & Restore**:
   - Click **Disconnect Passkey** to end sessions and zero memory.
   - Click **Sign In (Passkey)**; authenticate to verify that the identical 4 accounts are restored.

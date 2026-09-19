# ECON — The Economic Operating Layer for Autonomous Agents

> **Give autonomous agents an economy.**
>
> ECON gives autonomous agents a persistent economic identity and the ability to discover resources, transact, own economic objects, use escrow, and recover unused value — with economically authoritative state settled on **Monad**.

[![Monad Testnet](https://img.shields.io/badge/Network-Monad%20Testnet-00E599?style=flat-square)](https://docs.monad.xyz/)
[![ERC-8004](https://img.shields.io/badge/Agent%20Identity-ERC--8004-111111?style=flat-square)](https://ercs.ethereum.org/ERCS/erc-8004)
[![Foundry](https://img.shields.io/badge/Contracts-Foundry-111111?style=flat-square)](https://book.getfoundry.sh/)

## What is ECON?

AI agents can already reason, call tools, and initiate actions. What they generally lack is a persistent **economic layer** around those actions.

ECON provides that layer.

An ECON agent can have:

- an economic identity
- a wallet and treasury
- programmable spending policies
- economic assets
- obligations and contracts
- discoverable capabilities
- agent-to-agent commerce
- escrow
- reputation
- economic history
- mechanisms for recovering unused economic value

> **Don't just let agents spend money. Let them manage an economy.**

ECON is not another generic AI-agent framework. Intelligence can come from an external model or agent runtime; ECON provides the economic infrastructure around that intelligence.

---

## Project Flow

The complete ECON lifecycle:

```text
IDENTITY
   ↓
AUTHORITY
   ↓
ASSETS
   ↓
OBLIGATIONS
   ↓
DISCOVERY
   ↓
TRANSACTION
   ↓
POLICY CHECK
   ↓
SMART CONTRACT
   ↓
ESCROW / SETTLEMENT
   ↓
MONAD
   ↓
DELIVERY / VERIFICATION
   ↓
ECONOMIC STATE
   ↓
UNUSED VALUE
   ↓
RECOVERY
   ↓
REALLOCATION
```

A typical autonomous transaction:

```text
Agent Need
   ↓
Discover provider
   ↓
Evaluate price / capability / reputation
   ↓
Create structured economic intent
   ↓
ECON Policy Engine
   ↓
Smart Contract
   ↓
Real Monad transaction
   ↓
Delivery
   ↓
Verification
   ↓
Settlement
   ↓
Economic Object
   ↓
Recovery when value becomes unused
```

**Economically authoritative state is not represented by fake balances or simulated blockchain transactions. Production ECON reads and writes the actual Monad network.**

---

## Architecture

```text
                         ┌─────────────────────┐
                         │     ECON WEB APP    │
                         │ Dashboard / Agents  │
                         │ Marketplace /       │
                         │ Recovery / Ledger   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │  ECON AGENT RUNTIME │
                         │ Identity / Treasury │
                         │ Assets / Tools      │
                         │ AI / MCP / APIs     │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    POLICY ENGINE    │
                         │ Limits / Permissions│
                         │ Recovery / Approval │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    ECON PROTOCOL    │
                         │ Identity / Objects  │
                         │ Marketplace /       │
                         │ Escrow / Recovery   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                   ┌────────────────────────────────┐
                   │       MONAD SMART CONTRACTS   │
                   │                                │
                   │ ECONIdentityRegistry           │
                   │ ECONEconomicObject             │
                   │ ECONEscrow                     │
                   │ ECONMarketplace                │
                   │ ECONCreditVault                │
                   └───────────────┬────────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │ MONAD TESTNET   │
                          │ chainId: 10143  │
                          └────────┬────────┘
                                   │
                              Viem / RPC
```

### On-chain

- agent/economic identity
- ownership
- economic objects
- escrow
- credit reservations
- settlement
- asset transfers
- marketplace state
- critical economic state transitions

### Off-chain

- LLM reasoning
- agent memory
- semantic search
- analytics
- provider ranking
- AI recovery analysis
- document processing
- UI/API orchestration

> **AI may reason off-chain. Economic consequences are settled on-chain.**

---

## Autonomous Agent Architecture

ECON separates an agent's intelligence from its economic identity.

```text
AI Intelligence
(GPT / Claude / Gemini / local model)
        ↓
ECON Agent Runtime
        ↓
Economic Context
Identity / Treasury / Assets / Obligations
        ↓
Policy Engine
        ↓
Smart Contracts
        ↓
Monad
```

The LLM does not receive unrestricted wallet control.

> **LLM proposes. Policy authorizes. Smart contracts enforce. Monad settles.**

Agents can be created inside ECON or connected from existing systems through the ECON SDK/API.

---

## ERC-8004 Agent Identity

ECON uses **ERC-8004** for portable agent identity and reputation.

ERC-8004's Identity Registry provides an on-chain agent identifier and resolves an agent registration file through its `agentURI`. The registration file can advertise HTTPS services and other agent endpoints. citeturn0search0

ECON adds the economic layer around that identity:

```text
ERC-8004
├── Agent identity
├── Registration metadata
├── Service endpoints
└── Reputation

ECON
├── Economic identity
├── Treasury
├── Assets
├── Obligations
├── Transactions
├── Policies
├── Contracts
└── Recovery
```

Example registration metadata:

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "ECON Research Agent",
  "description": "Autonomous research and data-analysis agent.",
  "services": [
    {
      "name": "task execution",
      "endpoint": "https://agent.example.com/run",
      "protocol": "HTTP POST",
      "priceCredits": 5
    }
  ],
  "capabilities": [
    "data-analysis",
    "document-processing"
  ],
  "supportedTrust": [
    "reputation",
    "crypto-economic"
  ],
  "network": "eip155:10143"
}
```

The real deployed endpoint and agent values must replace placeholders before publication.

---

## Smart Contracts

Smart contracts are a core part of ECON, not a visual add-on.

| Contract | Responsibility |
|---|---|
| `ECONIdentityRegistry.sol` | ECON-specific economic identity and controller state |
| `ECONEconomicObject.sol` | Economic objects and ownership |
| `ECONEscrow.sol` | Locked funds, delivery conditions, release/refund |
| `ECONMarketplace.sol` | On-chain listings and purchases |
| `ECONCreditVault.sol` | Credit reservations, consumption and release |

### Monad Testnet Contract Addresses

Only publish addresses after actual deployment and verification.

| Contract | Address | Verified |
|---|---|---|
| ECON Identity Registry | `TBD` | `TBD` |
| ECON Economic Object | `TBD` | `TBD` |
| ECON Escrow | `TBD` | `TBD` |
| ECON Marketplace | `TBD` | `TBD` |
| ECON Credit Vault | `TBD` | `TBD` |

**Never replace these with invented addresses.**

---

## Monad Testnet

Current development network:

```text
Network:  Monad Testnet
Chain ID: 10143
CAIP-2:  eip155:10143
RPC:      https://testnet-rpc.monad.xyz
```

Official documentation:

- [Monad Docs](https://docs.monad.xyz/)
- [Monad Guides](https://docs.monad.xyz/guides/)
- [Foundry deployment guide](https://docs.monad.xyz/guides/deploy-smart-contract/foundry)

---

## Foundry

Contracts are developed, tested and deployed with Foundry.

```bash
forge install
forge build
forge test
```

Deploy:

```bash
forge script script/Deploy.s.sol:Deploy   --rpc-url $MONAD_RPC_URL   --broadcast
```

After deployment:

1. Save the transaction hash.
2. Save the deployed contract addresses.
3. Verify the contracts on the Monad explorer.
4. Add verified addresses to this README.
5. Configure the application with those addresses.
6. Run the end-to-end tests against the deployed contracts.

A contract is not considered deployed/verified in this README until the blockchain transaction and explorer record confirm it.

---

## Viem

ECON uses [Viem](https://viem.sh/) for EVM interaction.

Viem handles:

- contract reads
- wallet balances
- contract writes
- transaction receipts
- event reads
- blockchain state synchronization

The UI and backend must never invent blockchain state.

```text
ECON
 ↓
Viem
 ↓
Monad RPC
 ↓
Actual blockchain state
 ↓
ECON UI / Agent Runtime
```

---

## Economic Garbage Collector

The Economic Garbage Collector identifies economic value that an autonomous entity is unlikely to use and determines whether it can be recovered.

Example:

```text
Economic Object
82 GPU-min remaining
Expected future use: 17 GPU-min
Expires: 18 hours
Transferable: YES
```

Flow:

```text
ON-CHAIN OBJECT
      ↓
USAGE ANALYSIS
      ↓
STRANDED VALUE DETECTED
      ↓
RECOVERABILITY CHECK
      ↓
POLICY CHECK
      ↓
RECOVERY RECOMMENDATION
      ↓
APPROVAL
      ↓
SMART CONTRACT
      ↓
REAL MONAD TRANSACTION
      ↓
NEW OWNER / RECOVERED VALUE
```

The AI may recommend recovery. It must not silently change ownership.

---

## Example Autonomous Economic Loop

```text
ResearchAgent-42
Objective:
Acquire satellite imagery under 20 MON
```

1. Discover providers.
2. Compare price, capability and available reputation data.
3. Select a provider.
4. Generate a structured purchase request.
5. Pass ECON policy validation.
6. Lock funds in escrow.
7. Receive and verify delivery.
8. Release settlement through the smart contract.
9. Record the acquired economic object.
10. Later detect unused value.
11. Generate a recovery plan.
12. Approve recovery.
13. Execute the recovery transaction on Monad.

The result is observable through actual transaction receipts, contract events and explorer records.

---

## Public Agent Backend

ECON agents can expose public HTTPS services.

Required production endpoints:

```text
GET  /health
GET  /metadata
POST /run
```

Example:

```text
https://agent.example.com/run
```

The endpoint can be advertised in ERC-8004 metadata:

```text
ERC-8004 Identity
       ↓
Agent Registration
       ↓
Public HTTPS Endpoint
       ↓
ECON Agent Backend
       ↓
Credit / Policy Verification
       ↓
Agent Task
       ↓
Monad-backed economic settlement
```

The backend verifies reservation/payment state from the CreditVault or trusted blockchain data. It must never trust a client-provided balance.

---

## Credit-Based Agent Services

Example request:

```json
{
  "task": "Analyze this dataset",
  "agentId": "123",
  "requester": "0xUserWallet",
  "network": "eip155:10143",
  "payment": {
    "vault": "0xCreditVaultAddress",
    "reservationId": "0xReservationId",
    "amount": 5,
    "transactionHash": "0x..."
  }
}
```

The backend validates:

- task presence
- requester address
- Monad network
- agent ID
- reservation state
- reserved amount
- expiration
- idempotency
- actual blockchain/payment state

No dummy balances or fake payment confirmations are permitted.

---

## Public Hosting

The production agent service must be publicly reachable over HTTPS.

Example:

```text
https://agent.example.com
```

The service must not depend on a developer's localhost machine.

Production deployment checklist:

- [ ] HTTPS enabled
- [ ] `/health` publicly reachable
- [ ] `/metadata` publicly reachable
- [ ] `/run` publicly reachable
- [ ] CORS restricted to approved ECON origins
- [ ] rate limiting enabled
- [ ] secrets stored as environment variables
- [ ] no private keys committed
- [ ] public endpoint added to ERC-8004 registration metadata

---

## Run ECON Yourself

A major project requirement is **reproducibility**.

Someone who discovers ECON through GitHub should be able to clone the repository and reproduce the documented flow by following the guides.

### Requirements

- Node.js 20+
- npm
- Git
- Foundry
- Monad Testnet wallet
- Testnet MON
- deployed contract addresses from the repository configuration

### Clone

```bash
git clone https://github.com/M0izz/ECON.git
cd ECON
```

### Install

```bash
npm install
```

### Environment

```bash
cp .env.example .env
```

Configure the required values:

```env
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_CHAIN_ID=10143

ECON_IDENTITY_REGISTRY=
ECONOMIC_OBJECT_CONTRACT=
ECON_ESCROW_CONTRACT=
ECON_MARKETPLACE_CONTRACT=
ECON_CREDIT_VAULT=

AGENT_ID=
AGENT_CONTROLLER=
AGENT_ENDPOINT=

ECON_FRONTEND_ORIGIN=
```

Never commit:

- private keys
- seed phrases
- API secrets
- authentication credentials

### Start the web app

```bash
npm run dev
```

### Start the agent backend

```bash
npm run agent
```

### Run application tests

```bash
npm test
```

### Run smart-contract tests

```bash
forge test
```

---

## Reproduce the On-Chain Demo

After configuring a Monad Testnet wallet and the deployed contract addresses:

```text
1. Connect wallet
2. Switch to Monad Testnet
3. Create/register an agent
4. Verify the ERC-8004 identity
5. Fund the agent
6. Discover a resource
7. Request a purchase
8. Pass ECON policy
9. Create escrow
10. Confirm delivery
11. Settle the transaction
12. Inspect the Monad transaction
13. Inspect the economic object
14. Run recovery scan
15. Approve recovery
16. Execute recovery
17. Inspect the recovery transaction
```

Every blockchain operation must produce a real transaction receipt.

---

## Verification Checklist

### Agent

- [ ] Real ERC-8004 agent ID
- [ ] Public registration metadata
- [ ] Public HTTPS endpoint
- [ ] Endpoint included in registration metadata
- [ ] Capabilities match actual service

### Smart Contracts

- [ ] Solidity contracts compile
- [ ] Foundry tests pass
- [ ] Contracts deployed to Monad Testnet
- [ ] Deployment transactions confirmed
- [ ] Addresses documented
- [ ] Contracts explorer-verified
- [ ] Events emitted and readable

### Backend

- [ ] `/health` works
- [ ] `/metadata` works
- [ ] `/run` works
- [ ] invalid requests rejected
- [ ] duplicate requests rejected
- [ ] reservations verified on-chain
- [ ] expired reservations rejected
- [ ] insufficient credits rejected
- [ ] CORS restricted
- [ ] rate limiting enabled
- [ ] secrets never logged

### Production

- [ ] public HTTPS deployment
- [ ] reproducible setup
- [ ] README deployment guide
- [ ] no fake blockchain state
- [ ] no fake transaction hashes
- [ ] no simulated payment success
- [ ] no undocumented manual steps

---

## Repository Structure

```text
ECON/
├── apps/
│   └── web/
│
├── agent/
│   ├── src/
│   │   ├── server.ts
│   │   ├── routes/
│   │   ├── agent/
│   │   ├── credits/
│   │   └── types.ts
│   ├── tests/
│   ├── .env.example
│   └── README.md
│
├── contracts/
│   ├── ECONIdentityRegistry.sol
│   ├── ECONEconomicObject.sol
│   ├── ECONEscrow.sol
│   ├── ECONMarketplace.sol
│   └── ECONCreditVault.sol
│
├── script/
│   └── Deploy.s.sol
│
├── test/
│
├── packages/
│   └── sdk/
│       ├── identity/
│       ├── agent/
│       ├── discovery/
│       ├── engine/
│       ├── objects/
│       ├── escrow/
│       ├── policy/
│       ├── recovery/
│       └── events/
│
├── docs/
│   ├── architecture/
│   ├── contracts/
│   ├── deployment/
│   └── agent-integration/
│
├── foundry.toml
├── package.json
├── .env.example
└── README.md
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Blockchain | Monad |
| Smart contracts | Solidity |
| Contract tooling | Foundry |
| EVM interaction | Viem |
| Agent identity | ERC-8004 |
| Agent integration | ECON SDK / HTTP / MCP |
| Machine-native resource payments | x402 |
| Backend | Node.js / TypeScript |
| Validation | Zod |
| Frontend | React / TypeScript / Vite |
| Testing | Vitest + Foundry |
| Hosting | Public HTTPS |

---

## Security Principles

ECON treats autonomous economic actions as security-sensitive.

### Never

```text
LLM → arbitrary transaction
```

### Use

```text
LLM
 ↓
Structured intent
 ↓
Policy engine
 ↓
Validation
 ↓
Transaction construction
 ↓
Wallet signer
 ↓
Smart contract
 ↓
Monad
```

Additional requirements:

- Never expose private keys.
- Never store user wallet private keys.
- Never trust client-provided balances.
- Validate addresses, amounts and chain IDs.
- Enforce spending limits.
- Enforce reservation expiry.
- Use idempotency for economic actions.
- Never execute arbitrary code from task input.
- Never silently fall back to fake settlement.
- Never claim an on-chain action without a confirmed transaction.

---

## Live Deployment

These values must be updated only after actual deployment.

### Web App

`TBD — add public deployment URL`

### Agent Endpoint

`TBD — add public HTTPS endpoint`

### ERC-8004

```text
Agent ID: TBD
Registry: TBD
Agent URI: TBD
```

### Monad Contracts

```text
Identity Registry: TBD
Economic Objects: TBD
Escrow: TBD
Marketplace: TBD
Credit Vault: TBD
```

### Explorer

`TBD — add verified contract and transaction links`

### Demo Video

`TBD — add demo video`

---

## Project Status

**Active hackathon development.**

The architecture is designed around real Monad Testnet deployment. Deployment-specific addresses, transaction hashes and public URLs are intentionally not fabricated in this README.

---

## Documentation

- [Monad Documentation](https://docs.monad.xyz/)
- [Monad Guides](https://docs.monad.xyz/guides/)
- [Foundry Book](https://book.getfoundry.sh/)
- [Viem Documentation](https://viem.sh/)
- [ERC-8004 Specification](https://ercs.ethereum.org/ERCS/erc-8004)

---

## Core Principle

ECON should never be a dashboard that **looks** like an economic network.

It should be a working economic network whose interface reflects real state.

```text
REAL AGENT
    ↓
REAL POLICY
    ↓
REAL SMART CONTRACT
    ↓
REAL MONAD TRANSACTION
    ↓
REAL ECONOMIC STATE
    ↓
REAL RECOVERY
```

> **If ECON says it happened, there should be an on-chain or cryptographically verifiable reason that it happened.**

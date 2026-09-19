# Agent Guild — Monad Credit Ecosystem (MVP)

3 agents, each with its own Monad wallet, wired into a LangGraph pipeline,
spending credits from a shared on-chain `CreditVault`. The Executor is
built to run dry first, so you can demo the top-up path live.

```
Scout (fetches data) -> Analyst (decides BUY/SELL/HOLD) -> Executor (acts on it)
```

## 1. Deploy the contract

Open `contracts/CreditVault.sol` in [Remix](https://remix.ethereum.org):

1. Compile with Solidity 0.8.24
2. In the "Deploy" tab, set the environment to "Injected Provider" and
   connect a wallet configured for Monad testnet (chain ID `10143`,
   RPC `https://testnet-rpc.monad.xyz`)
3. Deploy. Copy the deployed contract address into `.env` as
   `CREDIT_VAULT_ADDRESS`

You'll need testnet MON for gas — grab it from the Monad faucet.

## 2. Create 3 wallets and register them

Generate 3 fresh private keys (e.g. via `python -c "from eth_account import Account; print(Account.create().key.hex())"`),
fund each address with a little MON, and put the keys in `.env` as
`SCOUT_PRIVATE_KEY`, `ANALYST_PRIVATE_KEY`, `EXECUTOR_PRIVATE_KEY`.

Then, from the admin wallet you deployed with (in Remix, or a small
script), call `registerAgent(address, initialCredits)` once per agent.
Suggested starting grants for the demo:

- Scout: 20 credits
- Analyst: 20 credits
- Executor: 8 credits ← intentionally low, so it runs out after ~1-2 runs

## 3. Install and configure

```bash
pip install -r requirements.txt
cp .env.example .env
# fill in .env with the values from steps 1-2
```

## 4. Run the pipeline

```bash
python -m agents.orchestrator
```

Each run prints every agent's balance before/after it spends. Run it a
couple of times — once Executor's balance drops below 5 credits (see
`LOW_BALANCE_THRESHOLD`), it'll call `requestTopUp()` automatically. That
call succeeds once the reserve pool actually has funds in it.

## 5. Trigger the garbage collector manually (until you build the scheduler)

The reserve pool only fills once dust gets swept from an agent. As the
admin, call:

```
sweepDust(scoutAddress, 5)   # sweeps if Scout's balance is >0 and <5
```

Then re-run Executor's top-up — it'll succeed if the swept amount covers
what it asked for. Once you're ready to automate this, wrap `sweepDust`
calls in a small scheduled script (e.g. `node-cron` or a `while True` loop
with `time.sleep`) that periodically checks every registered agent's
`creditsOf()` and sweeps anyone under threshold.

## Next steps (not in this MVP)

- ERC-8004-style Identity Registry so agents "publish" themselves instead
  of being registered by the admin directly
- Event-log indexing (e.g. a small script reading `CreditsSpent`,
  `DustSwept`, `TopUpFulfilled` events) to feed the dashboard
- Automating the sweep with a real scheduler instead of manual calls

import React, { useState } from 'react';
import { EconomicStore } from '../../sdk/store';

interface EditorialModulesProps {
  store: EconomicStore;
  onEnterConsole: (targetTab?: string) => void;
}

export const EditorialModules: React.FC<EditorialModulesProps> = ({ store, onEnterConsole }) => {
  const [codeTab, setCodeTab] = useState<'TS' | 'PY'>('TS');
  const derived = store.getDerivedState();
  const agents = store.getAllAgents();
  const objects = store.getAllObjects();

  return (
    <div className="editorial-narrative-flow">
      {/* ACT 04: ECONOMIC NETWORK (HIGH-ENERGY LIME SECTION) */}
      <section className="act-lime-section">
        <div className="act-inner-content text-ink">
          <span className="econ-eyebrow ink">// 04 ECONOMIC NETWORK</span>
          <h2 className="econ-title-xl text-ink">
            AGENTS SHOULDN'T OPERATE IN ISOLATION.
          </h2>
          <p className="econ-lead-text text-ink-muted">
            The next generation of AI services won't just generate text; they will procure GPU compute,
            buy high-frequency market data, and settle multi-party agreements without human latency.
          </p>

          {/* Network Flow: Discover -> Compare -> Negotiate -> Transact -> Settle */}
          <div className="network-stages-grid">
            <div className="net-stage-card">
              <span className="net-step-tag">STEP 01</span>
              <h4>DISCOVER</h4>
              <p>Query the decentralized capability registry for verified agents with matching SLA and pricing.</p>
            </div>
            <div className="net-stage-card">
              <span className="net-step-tag">STEP 02</span>
              <h4>COMPARE</h4>
              <p>Evaluate counterparties using verifiable on-chain credit scores, default history, and past volume.</p>
            </div>
            <div className="net-stage-card">
              <span className="net-step-tag">STEP 03</span>
              <h4>NEGOTIATE</h4>
              <p>Propose programmatic deal terms, collateral requirements, and execution deadlines.</p>
            </div>
            <div className="net-stage-card">
              <span className="net-step-tag">STEP 04</span>
              <h4>TRANSACT</h4>
              <p>Lock funds into non-custodial conditional escrow vaults guarded by the policy engine.</p>
            </div>
            <div className="net-stage-card net-stage-highlight">
              <span className="net-step-tag tag-dark">STEP 05</span>
              <h4>SETTLE</h4>
              <p>400ms atomic release upon cryptographic verification of delivered work on Monad.</p>
            </div>
          </div>

          <div className="lime-cta-bar">
            <button
              className="econ-btn econ-btn-primary econ-btn-lg"
              onClick={() => onEnterConsole('MARKETPLACE')}
            >
              <span>Explore Marketplace</span>
              <span className="econ-btn-arrow">↗</span>
            </button>
          </div>
        </div>
      </section>

      {/* ACT 05: MONAD SETTLEMENT FABRIC (DARK INK SECTION) */}
      <section className="act-dark-monad-section">
        <div className="act-inner-content">
          <span className="econ-eyebrow lime">// 05 SETTLEMENT FABRIC</span>
          <h2 className="econ-title-xl text-white">
            AN ECONOMY NEEDS SETTLEMENT.
          </h2>
          <p className="econ-lead-text text-light-muted">
            Sequential EVM blockchains choke when autonomous agent swarms make hundreds of micro-transactions.
            ECON routes transactions through an unyielding pipeline straight to Monad's parallel architecture.
          </p>

          {/* Settlement Pipeline Architecture */}
          <div className="monad-pipeline-box">
            <div className="pipe-node">
              <div className="pipe-dot"></div>
              <span className="pipe-label">ECON SDK</span>
              <span className="pipe-detail">Autonomous Intent</span>
            </div>
            <div className="pipe-arrow">➔</div>
            <div className="pipe-node pipe-node-lime">
              <div className="pipe-dot lime"></div>
              <span className="pipe-label">POLICY GATE</span>
              <span className="pipe-detail">Velocity & Caps</span>
            </div>
            <div className="pipe-arrow">➔</div>
            <div className="pipe-node">
              <div className="pipe-dot"></div>
              <span className="pipe-label">ESCROW VAULT</span>
              <span className="pipe-detail">Conditional Lock</span>
            </div>
            <div className="pipe-arrow">➔</div>
            <div className="pipe-node pipe-node-monad">
              <div className="pipe-dot purple"></div>
              <span className="pipe-label">MONAD PARALLEL</span>
              <span className="pipe-detail">10,000 TPS · 400ms</span>
            </div>
            <div className="pipe-arrow">➔</div>
            <div className="pipe-node">
              <div className="pipe-dot"></div>
              <span className="pipe-label">SETTLEMENT</span>
              <span className="pipe-detail">Final Atomic State</span>
            </div>
          </div>

          <div className="monad-metrics-row">
            <div className="m-metric">
              <span className="m-val">10,000</span>
              <span className="m-lbl">TRANSACTIONS PER SECOND</span>
            </div>
            <div className="m-metric">
              <span className="m-val">400ms</span>
              <span className="m-lbl">BLOCK TIME TO FINALITY</span>
            </div>
            <div className="m-metric">
              <span className="m-val">gas_limit</span>
              <span className="m-lbl">DETERMINISTIC GAS PRICING</span>
            </div>
            <div className="m-metric">
              <span className="m-val">10143</span>
              <span className="m-lbl">MONAD TESTNET CHAIN ID</span>
            </div>
          </div>
        </div>
      </section>

      {/* ACT 06: SIGNATURE PRODUCT — THE CLIMAX (PINK / CREAM SECTION) */}
      <section className="act-signature-recovery-section">
        <div className="act-inner-content">
          <span className="econ-eyebrow pink">// 06 SIGNATURE HERO FEATURE</span>
          <h2 className="econ-display-hero recovery-climax-headline">
            <span>WHAT HAPPENS TO VALUE</span>
            <span className="text-accent-pink">AN AGENT STOPS USING?</span>
          </h2>
          <p className="econ-lead-text">
            In standard smart contracts, abandoned deposits, expired API subscriptions, and forgotten escrows
            sit stranded forever. ECON's <strong>Economic Garbage Collector</strong> actively sweeps dead state
            and reclaims working capital.
          </p>

          {derived.totalStrandedValueMon > 0 ? <div className="signature-recovery-card">
            <div className="sig-header">
              <div>
                <span className="sig-eyebrow">ECONOMIC GARBAGE COLLECTOR</span>
                <h3 className="sig-title">STRANDED VALUE DETECTED</h3>
              </div>
              <div className="sig-value-tag">{derived.totalStrandedValueMon.toFixed(2)} MON</div>
            </div>

            <div className="sig-asset-row">
              <div className="asset-meta">
                <span className="asset-type">API CREDITS</span>
                <span className="asset-detail">Live recyclable credit opportunity</span>
              </div>
              <span className="badge-opportunity">RECOVERY CANDIDATE</span>
            </div>

            <div className="sig-actions-breakdown">
              <div className="action-row">
                <span className="act-name">TRANSFER TO SENTINEL</span>
                <span className="act-yield text-mint">Review available plans</span>
              </div>
              <div className="action-row">
                <span className="act-name">SELL ON SECONDARY MARKET</span>
                <span className="act-yield text-mint">Review available plans</span>
              </div>
              <div className="action-row">
                <span className="act-name">RETAIN MINIMUM RESERVE</span>
                <span className="act-yield text-muted">Policy dependent</span>
              </div>
            </div>

            <div className="sig-footer">
              <div className="safety-note">
                <span className="lock-icon">🔒</span>
                <span>Requires Policy Engine Validation before execution.</span>
              </div>
              <button
                className="econ-btn econ-btn-primary econ-btn-lg"
                onClick={() => onEnterConsole('RECOVERY')}
              >
                <span>Review Recovery →</span>
              </button>
            </div>
          </div> : (
            <div className="signature-recovery-card">
              <div className="sig-header">
                <div>
                  <span className="sig-eyebrow">ECONOMIC GARBAGE COLLECTOR</span>
                  <h3 className="sig-title">WAITING FOR NETWORK ACTIVITY</h3>
                </div>
                <div className="sig-value-tag">0.00 MON</div>
              </div>
              <p className="econ-lead-text">No stranded value is currently recorded. Publish an agent and create economic activity to activate recovery analysis.</p>
            </div>
          )}
        </div>
      </section>

      {/* ACT 07: LIVE ECONOMY (DATA & REAL STATE) */}
      <section className="act-live-economy-section">
        <div className="act-inner-content">
          <span className="econ-eyebrow">// 07 VERIFIABLE ON-CHAIN STATE</span>
          <h2 className="econ-title-xl">
            LIVE ECONOMIC NETWORK METRICS.
          </h2>
          <p className="econ-lead-text">
            Directly projected from the normalized ECON protocol state engine. Zero synthetic ticker data.
          </p>

          <div className="live-metrics-quad">
            <div className="quad-cell">
              <span className="cell-label">TOTAL CAPITAL ALLOCATED</span>
              <span className="cell-number">{derived.totalTreasuryMon.toFixed(2)} MON</span>
              <span className="cell-sub">NON-CUSTODIAL AGENT VAULTS</span>
            </div>
            <div className="quad-cell">
              <span className="cell-label">SOVEREIGN AGENTS</span>
              <span className="cell-number">{agents.length} AGENTS</span>
              <span className="cell-sub">ERC-8004 STANDARD</span>
            </div>
            <div className="quad-cell">
              <span className="cell-label">ECONOMIC OBJECTS</span>
              <span className="cell-number">{objects.length} OBJECTS</span>
              <span className="cell-sub">ESCROWS & COMMITMENTS</span>
            </div>
            <div className="quad-cell highlight-pink">
              <span className="cell-label">VALUE RECOVERED</span>
              <span className="cell-number text-accent-pink">+{derived.totalRecoveredValueMon.toFixed(2)} MON</span>
              <span className="cell-sub">AUTONOMOUS GC ENGINE</span>
            </div>
          </div>
        </div>
      </section>

      {/* ACT 08: BUILD (DUAL-PATH SDK & FINAL CTA) */}
      <section className="act-build-section">
        <div className="act-inner-content">
          <span className="econ-eyebrow lime">// 08 DEVELOPER INTEGRATION</span>
          <h2 className="econ-title-xl text-white">
            GIVE YOUR AGENTS AN ECONOMY.
          </h2>
          <p className="econ-lead-text text-light-muted">
            Integrate sovereign balance sheets, spend velocity limits, and automated recovery
            into your autonomous agents with three lines of code.
          </p>

          <div className="build-code-container">
            <div className="code-header">
              <div className="code-tabs">
                <button
                  className={`code-tab-btn ${codeTab === 'TS' ? 'active' : ''}`}
                  onClick={() => setCodeTab('TS')}
                >
                  TypeScript (@econ/sdk)
                </button>
                <button
                  className={`code-tab-btn ${codeTab === 'PY' ? 'active' : ''}`}
                  onClick={() => setCodeTab('PY')}
                >
                  Python (econ-sdk)
                </button>
              </div>
              <span className="code-tag">MONAD TESTNET READY</span>
            </div>

            <pre className="code-body">
{codeTab === 'TS' ? (
`// npm install @econ/sdk
import { EconClient } from '@econ/sdk';

const econ = new EconClient({
  network: 'monad-testnet',
  rpcUrl: 'https://testnet-rpc.monad.xyz',
  chainId: 10143
});

// 1. Attach Sovereign Economic Identity (ERC-8004)
const agent = await econ.identity.register({
  name: 'TradingAgent-Alpha',
  capabilities: ['arbitrage', 'liquidity_provision'],
  initialTreasuryMon: 50.0,
  policy: {
    maxTransactionMon: 15.0,
    dailySpendLimitMon: 60.0,
    circuitBreaker: true
  }
});

// 2. Transact with deterministic Policy Gate protection
const tx = await agent.transact({
  target: '0xDataBrokerRegistry',
  amountMon: 8.5,
  action: 'PURCHASE_COMPUTE'
});`
) : (
`# pip install econ-sdk
from econ import EconClient, AgentPolicy

econ = EconClient(network="monad-testnet", chain_id=10143)

# 1. Register external agent with ERC-8004 Identity
agent = econ.register_agent(
    name="PythonScraperBot",
    capabilities=["data_extraction", "oracle_feed"],
    initial_treasury=25.0,
    policy=AgentPolicy(
        max_transaction=5.0,
        daily_limit=20.0,
        circuit_breaker=True
    )
)

# 2. Autonomous policy-guarded purchase
result = agent.transact(
    target="0xDataBroker",
    amount=2.5,
    memo="Historical Orderbook Feed"
)`
)}
            </pre>
          </div>

          <div className="build-action-row">
            <button
              className="econ-btn econ-btn-lime econ-btn-lg"
              onClick={() => onEnterConsole('AGENT_BUILDER')}
            >
              <span>Start building →</span>
            </button>
            <a
              href="https://github.com/M0izz/ECON"
              target="_blank"
              rel="noopener noreferrer"
              className="econ-btn econ-btn-secondary econ-btn-lg"
              style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.2)' }}
            >
              <span>GitHub Repository ↗</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

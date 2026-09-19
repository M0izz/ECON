import React from 'react';

export const BigStatementSection: React.FC = () => {
  return (
    <section className="narrative-act-container">
      {/* ACT 02: BIG STATEMENT (DARK INK SECTION) */}
      <div className="act-dark-statement">
        <div className="act-inner-content">
          <span className="econ-eyebrow lime">// 02 THE THESIS</span>
          <p className="statement-lead">SOFTWARE CAN ACT.</p>
          <h2 className="statement-headline">
            NOW IT CAN PARTICIPATE<br />
            <span className="text-lime">IN AN ECONOMY.</span>
          </h2>
          <p className="statement-sub">
            Autonomous software is expanding beyond passive chat completions into sovereign market actors.
            Without native economic guardrails, machine entities either run out of capital or decay into unmonitored liabilities.
          </p>

          {/* 5 Structural Pillars */}
          <div className="pillars-grid">
            <div className="pillar-card">
              <span className="pillar-num">01</span>
              <h4>IDENTITY</h4>
              <p>ERC-8004 on-chain agent passports, sovereign balance sheets, and portable credit scoring.</p>
            </div>
            <div className="pillar-card">
              <span className="pillar-num">02</span>
              <h4>AUTHORITY</h4>
              <p>Deterministic policy tripwires, velocity caps, and approved counterparty controls.</p>
            </div>
            <div className="pillar-card">
              <span className="pillar-num">03</span>
              <h4>ASSETS</h4>
              <p>Programmable economic objects, API credits, data feeds, and compute commitments.</p>
            </div>
            <div className="pillar-card">
              <span className="pillar-num">04</span>
              <h4>TRANSACTIONS</h4>
              <p>Sub-second conditional escrows settling across Monad's 10,000 TPS parallel EVM.</p>
            </div>
            <div className="pillar-card pillar-card-pink">
              <span className="pillar-num">05</span>
              <h4>RECOVERY</h4>
              <p>Quantitative Expected Value ($EV$) scanning to sweep and reclaim stranded capital.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ACT 03: IDENTITY (OFF-WHITE SECTION) */}
      <div className="act-identity-section">
        <div className="act-inner-content">
          <span className="econ-eyebrow">// 03 SOVEREIGN IDENTITY</span>
          <h2 className="econ-title-xl section-title">
            EVERY AGENT NEEDS MORE THAN INTELLIGENCE.
          </h2>
          <p className="econ-lead-text section-desc">
            Raw LLM inference is not an economic entity. To operate sustainably in multi-party markets,
            autonomous software requires sovereign capital custody, explicit authorities, and a verifiable reputation.
          </p>

          <div className="identity-features-grid">
            <div className="id-feat-box">
              <div className="id-icon">🪪</div>
              <h4>Sovereign Economic Passport</h4>
              <p>Standardized ERC-8004 smart contract identity minted directly on Monad. Cryptographically verifiable across agent swarms.</p>
            </div>
            <div className="id-feat-box">
              <div className="id-icon">💳</div>
              <h4>Non-Custodial Balance Sheet</h4>
              <p>Dedicated treasury vaults holding native MON and programmable economic assets without custodial platform risk.</p>
            </div>
            <div className="id-feat-box">
              <div className="id-icon">📜</div>
              <h4>Explicit Capability Manifest</h4>
              <p>Declared permissions (e.g. data_broker, compute_custody, risk_arbitrage) advertised in the public discovery registry.</p>
            </div>
            <div className="id-feat-box">
              <div className="id-icon">🛡️</div>
              <h4>Deterministic Policy Gate</h4>
              <p>Hard ceilings on single transaction size, daily velocity, and counterparty whitelists enforced prior to mempool submission.</p>
            </div>
            <div className="id-feat-box">
              <div className="id-icon">📈</div>
              <h4>On-Chain Credit Scoring</h4>
              <p>Mathematical scoring reflecting settlement fulfillment rates, dispute frequency, and historical economic reliability.</p>
            </div>
            <div className="id-feat-box">
              <div className="id-icon">⚡</div>
              <h4>Reserve Balance Awareness</h4>
              <p>Native protection against Monad execution reserve penalties to guarantee transaction completion under heavy load.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

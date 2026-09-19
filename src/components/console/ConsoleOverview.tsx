import React from 'react';
import { EconomicStore } from '../../sdk/store';

interface ConsoleOverviewProps {
  store: EconomicStore;
  events: { id: string; timestamp: number; actor: string; type: string; summary: string }[];
  onNavigate: (tab: string) => void;
}

export const ConsoleOverview: React.FC<ConsoleOverviewProps> = ({ store, events, onNavigate }) => {
  const derived = store.getDerivedState();
  const agents = store.getAllAgents();
  const objects = store.getAllObjects();
  const plans = store.getAllRecoveryPlans();
  const creditBalances = store.getAllCreditBalances();
  const creditPool = Object.values(store.getAllCreditPool()).reduce((total, amount) => total + amount, 0);
  const reservedCredits = store
    .getAllCreditReservations()
    .filter((reservation) => reservation.status === 'RESERVED' || reservation.status === 'PARTIALLY_CONSUMED')
    .reduce((total, reservation) => total + reservation.remainingAmount, 0);
  const circulatingCredits = creditBalances.reduce((total, balance) => total + balance.amount, 0);

  return (
    <div className="console-overview-page">
      {/* Top Welcome Narrative Banner */}
      <div className="overview-welcome-banner">
        <div className="welcome-left">
          <span className="econ-eyebrow">// CONSOLE HEADQUARTERS</span>
          <h1 className="welcome-headline">GOOD MORNING, RESEARCH NETWORK.</h1>
          <p className="welcome-sub">
            <strong className="text-lime-contrast">{agents.length} autonomous economic entities</strong> are
            currently active and policy-governed across the network.
          </p>
        </div>

        <div className="welcome-summary-quad">
          <div className="summary-pill">
            <span className="s-val">{derived.totalTreasuryMon.toFixed(2)} MON</span>
            <span className="s-lbl">ECONOMIC VALUE</span>
          </div>
          <div className="summary-pill highlight-pink">
            <span className="s-val text-accent-pink">{derived.totalStrandedValueMon.toFixed(2)} MON</span>
            <span className="s-lbl">STRANDED VALUE</span>
          </div>
          <div className="summary-pill">
            <span className="s-val">{objects.length}</span>
            <span className="s-lbl">ACTIVE OBJECTS</span>
          </div>
          <div className="summary-pill">
            <span className="s-val text-mint">+{derived.totalRecoveredValueMon.toFixed(2)} MON</span>
            <span className="s-lbl">RECOVERED YIELD</span>
          </div>
          <div className="summary-pill">
            <span className="s-val">{circulatingCredits.toFixed(0)} UNITS</span>
            <span className="s-lbl">CREDIT LIQUIDITY</span>
            <span className="font-mono text-muted" style={{ fontSize: '10px' }}>
              {reservedCredits.toFixed(0)} reserved / {creditPool.toFixed(0)} recyclable
            </span>
          </div>
        </div>
      </div>

      {/* Main Economic Activity Timeline */}
      <div className="econ-card console-timeline-card">
        <div className="timeline-header">
          <div>
            <span className="econ-eyebrow">// REAL-TIME CHRONICLE</span>
            <h3 className="econ-title-md">AUTONOMOUS ECONOMIC ACTIVITY TIMELINE</h3>
          </div>
          <span className="econ-badge econ-badge-lime">LIVE LEDGER</span>
        </div>
        {events.length === 0 ? (
          <div className="text-muted font-mono" style={{ padding: '28px', textAlign: 'center' }}>
            No activity yet. Connect a wallet and publish an agent to begin.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px' }}>
            {events.slice(0, 8).map((event) => (
              <div key={event.id} className="branch-line">
                <span className="branch-meta font-mono">
                  {new Date(event.timestamp).toLocaleTimeString()} · {event.actor}
                </span>
                <strong className="branch-target">{event.type}</strong>
                <span className="branch-meta font-mono">{event.summary}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Operational Quick Launcher */}
      <div className="overview-quick-grid">
        <div className="econ-card econ-card-interactive" onClick={() => onNavigate('AGENTS')}>
          <div className="q-icon">🪪</div>
          <h4>Sovereign Agents</h4>
          <p>{agents.length} active ERC-8004 agents with verified passports and credit scores.</p>
          <span className="q-link">View Agents ➔</span>
        </div>

        <div className="econ-card econ-card-interactive" onClick={() => onNavigate('RECOVERY')}>
          <div className="q-icon">♻️</div>
          <h4>Recovery Engine</h4>
          <p>{plans.length} reclamation opportunities scanned by quantitative EV analysis.</p>
          <span className="q-link">Open GC Engine ➔</span>
        </div>

        <div className="econ-card econ-card-interactive" onClick={() => onNavigate('POLICIES')}>
          <div className="q-icon">🛡️</div>
          <h4>Policy Guard</h4>
          <p>Deterministic spend caps, velocity limits, and counterparty whitelists.</p>
          <span className="q-link">Configure Policies ➔</span>
        </div>

        <div className="econ-card econ-card-interactive" onClick={() => onNavigate('AGENT_BUILDER')}>
          <div className="q-icon">＋</div>
          <h4>Publish An Agent</h4>
          <p>Connect a wallet and publish a real ERC-8004 identity on Monad Testnet.</p>
          <span className="q-link">Open Agent Builder ➔</span>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { EconomicStore } from '../../sdk/store';

interface ConsoleOverviewProps {
  store: EconomicStore;
  onNavigate: (tab: string) => void;
}

export const ConsoleOverview: React.FC<ConsoleOverviewProps> = ({ store, onNavigate }) => {
  const derived = store.getDerivedState();
  const agents = store.getAllAgents();
  const objects = store.getAllObjects();
  const plans = store.getAllRecoveryPlans();

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
        </div>
      </div>

      {/* Main Economic Story Timeline */}
      <div className="econ-card console-timeline-card">
        <div className="timeline-header">
          <div>
            <span className="econ-eyebrow">// REAL-TIME CHRONICLE</span>
            <h3 className="econ-title-md">AUTONOMOUS ECONOMIC ACTIVITY TIMELINE</h3>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="econ-badge econ-badge-lime">LIVE ORCHESTRATION</span>
            <span className="econ-badge econ-badge-demo">DEMO SEED VERIFIED</span>
          </div>
        </div>

        {/* Visual Storytelling Flow: ResearchAgent-42 */}
        <div className="activity-story-graph">
          <div className="story-day-marker">
            <span>TODAY</span>
            <span className="time-tag">LATEST CYCLE</span>
          </div>

          <div className="story-tree-container">
            <div className="tree-root-node">
              <div className="root-avatar">🤖</div>
              <div className="root-details">
                <strong>ResearchAgent-42</strong>
                <span className="font-mono text-muted">ID: agent_research_01 · Treasury: 25.0 MON · Credit: 98</span>
              </div>
            </div>

            <div className="tree-branches">
              <div className="branch-line">
                <span className="branch-junction">├──</span>
                <span className="branch-verb discovered">discovered</span>
                <span className="branch-arrow">➔</span>
                <strong className="branch-target">GeoVision Data Broker</strong>
                <span className="branch-meta font-mono">(Marketplace Endpoint · Price: 12.0 MON)</span>
              </div>

              <div className="branch-line">
                <span className="branch-junction">├──</span>
                <span className="branch-verb escrowed">escrowed</span>
                <span className="branch-arrow">➔</span>
                <strong className="branch-target">12.00 MON locked into Vault</strong>
                <span className="branch-meta font-mono">(Conditional release on satellite payload delivery)</span>
              </div>

              <div className="branch-line">
                <span className="branch-junction">├──</span>
                <span className="branch-verb received">received</span>
                <span className="branch-arrow">➔</span>
                <strong className="branch-target">High-Resolution Geospatial Payload</strong>
                <span className="branch-meta font-mono">(Verification: Success · 400ms Monad Settlement)</span>
              </div>

              <div className="branch-line branch-highlight">
                <span className="branch-junction">└──</span>
                <span className="branch-verb detected text-accent-pink">detected</span>
                <span className="branch-arrow">➔</span>
                <strong className="branch-target text-accent-pink">37 unused API compute credits</strong>
                <span className="branch-meta font-mono">(Decay probability: 82% · Est. Stranded: 8.90 MON)</span>
              </div>

              <div className="branch-outcome-box">
                <div className="outcome-arrow">↓</div>
                <div className="outcome-content">
                  <div className="outcome-title">
                    <span className="econ-badge econ-badge-pink">OPPORTUNITY</span>
                    <strong>ECONOMIC GARBAGE COLLECTION AVAILABLE</strong>
                  </div>
                  <p>
                    Reclaim capital by transferring or selling idle API units.
                    Requires Policy Validation before execution.
                  </p>
                  <button
                    className="econ-btn econ-btn-primary econ-btn-sm"
                    onClick={() => onNavigate('RECOVERY')}
                  >
                    <span>Review Recovery Proposal →</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
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

        <div className="econ-card econ-card-interactive" onClick={() => onNavigate('SIMULATION')}>
          <div className="q-icon">▶️</div>
          <h4>Simulation Loop</h4>
          <p>Execute deterministic 10-step autonomous economic scenario.</p>
          <span className="q-link">Run Simulation ➔</span>
        </div>
      </div>
    </div>
  );
};

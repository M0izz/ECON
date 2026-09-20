import React from 'react';
import { EconomicStore } from '../../sdk/store';

interface ConsoleOverviewProps {
  store: EconomicStore;
  events: { id: string; timestamp: number; actor: string; type: string; summary: string }[];
  onNavigate: (tab: string) => void;
  walletAddress?: string;
  walletBalance?: string;
  isConnected?: boolean;
  isWrongNetwork?: boolean;
  onConnectWallet?: () => void;
  onSwitchNetwork?: () => void;
  onOpenAccount?: () => void;
}

export const ConsoleOverview: React.FC<ConsoleOverviewProps> = ({
  store,
  events,
  onNavigate,
  walletAddress,
  walletBalance,
  isConnected,
  isWrongNetwork,
  onConnectWallet,
  onSwitchNetwork,
  onOpenAccount,
}) => {
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
            <span className="s-val">{walletBalance || `${derived.totalTreasuryMon.toFixed(2)} MON`}</span>
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

      {/* Economic Controller Credential & Treasury Card */}
      <div
        className="econ-card"
        style={{
          padding: '20px',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(4, 27, 38, 0.95), rgba(10, 42, 59, 0.85))',
          border: '1px solid rgba(0, 229, 153, 0.25)',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="econ-eyebrow" style={{ color: '#00E599' }}>// ECONOMIC CONTROLLER CREDENTIAL</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: isConnected
                    ? isWrongNetwork
                      ? 'rgba(229, 165, 0, 0.2)'
                      : 'rgba(0, 229, 153, 0.15)'
                    : 'rgba(255, 255, 255, 0.08)',
                  color: isConnected ? (isWrongNetwork ? '#FFD000' : '#00E599') : 'rgba(255, 255, 255, 0.5)',
                  border: isConnected
                    ? isWrongNetwork
                      ? '1px solid #FFD000'
                      : '1px solid #00E599'
                    : '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                {isConnected
                  ? isWrongNetwork
                    ? 'WRONG NETWORK'
                    : 'AUTHENTICATED CONTROLLER'
                  : 'NO WALLET CONNECTED'}
              </span>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFF', margin: '8px 0 4px 0' }}>
              {isConnected ? 'Active Cryptographic Controller' : 'Non-Custodial Controller Authority'}
            </h3>
            <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.65)', margin: 0, maxWidth: '640px' }}>
              Your non-custodial wallet provides cryptographic authority. ECON operates the persistent economic environment, sovereign identities, policy enforcement, and autonomous treasury settlement on Monad.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {isConnected ? (
              <>
                {isWrongNetwork ? (
                  <button
                    onClick={onSwitchNetwork}
                    style={{
                      background: '#E5A500',
                      color: '#041B26',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 18px',
                      fontWeight: 800,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Switch to Monad Testnet (10143)
                  </button>
                ) : (
                  <button
                    onClick={onOpenAccount}
                    style={{
                      background: 'rgba(0, 229, 153, 0.12)',
                      color: '#00E599',
                      border: '1px solid #00E599',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Manage Controller ↗
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={onConnectWallet}
                style={{
                  background: '#00E599',
                  color: '#041B26',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0, 229, 153, 0.3)',
                }}
              >
                Connect Wallet (AppKit)
              </button>
            )}
          </div>
        </div>

        {/* Real Live Metrics Strip */}
        {isConnected && !isWrongNetwork && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px 14px', borderRadius: '8px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                CONTROLLER CREDENTIAL
              </span>
              <a
                href={`https://testnet.monadexplorer.com/address/${walletAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#FFF', fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}
              >
                {walletAddress ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}` : '—'} ↗
              </a>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px 14px', borderRadius: '8px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                LIVE TREASURY BALANCE (MONAD)
              </span>
              <span style={{ color: '#00E599', fontFamily: 'monospace', fontWeight: 800, fontSize: '15px' }}>
                {walletBalance || '0.0000 MON'}
              </span>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px 14px', borderRadius: '8px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                SETTLEMENT FABRIC
              </span>
              <span style={{ color: '#836EF9', fontFamily: 'monospace', fontWeight: 700, fontSize: '13px' }}>
                MONAD TESTNET (10143)
              </span>
            </div>
          </div>
        )}
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

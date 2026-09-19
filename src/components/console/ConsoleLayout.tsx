import React from 'react';
import { EconomicStore } from '../../sdk/store';

export type ConsoleTab =
  | 'OVERVIEW'
  | 'AGENTS'
  | 'ASSETS'
  | 'MARKETPLACE'
  | 'TRANSACTIONS'
  | 'CONTRACTS'
  | 'ESCROW'
  | 'RECOVERY'
  | 'RECOVERY_HISTORY'
  | 'POLICIES'
  | 'PERMISSIONS'
  | 'API_SDK'
  | 'AGENT_BUILDER';

interface ConsoleLayoutProps {
  store: EconomicStore;
  currentTab: ConsoleTab;
  onSelectTab: (tab: ConsoleTab) => void;
  onSwitchToLanding: () => void;
  walletAddress?: string;
  walletError?: string;
  onConnectWallet: () => void;
  children: React.ReactNode;
}

export const ConsoleLayout: React.FC<ConsoleLayoutProps> = ({
  store,
  currentTab,
  onSelectTab,
  onSwitchToLanding,
  walletAddress,
  walletError,
  onConnectWallet,
  children,
}) => {
  const derived = store.getDerivedState();
  const isMonad = true;

  return (
    <div className="console-app-root">
      {/* Top Header Bar */}
      <header className="console-top-header">
        <div className="c-header-left">
          {/* Brand Mark */}
          <div className="econ-brand-link" onClick={onSwitchToLanding} title="Return to Public Website">
            <div className="econ-brand-mark">
              <span className="econ-brand-symbol">∞</span>
              <span>ECON</span>
            </div>
            <span className="econ-brand-title">CONSOLE</span>
          </div>

          {/* View Mode Switcher */}
          <div className="console-view-switcher">
            <button className="c-view-btn" onClick={onSwitchToLanding}>
              SHOWCASE ↗
            </button>
            <button className="c-view-btn active">
              OS CONSOLE
            </button>
          </div>

          {/* Key Normalized Telemetry */}
          <div className="c-telemetry-strip">
            <div className="c-pill">
              <span className="c-lbl">TREASURY</span>
              <span className="c-val">{derived.totalTreasuryMon.toFixed(1)} MON</span>
            </div>
            <div className="c-pill">
              <span className="c-lbl">STRANDED</span>
              <span className="c-val text-accent-pink">{derived.totalStrandedValueMon.toFixed(1)} MON</span>
            </div>
            <div className="c-pill">
              <span className="c-lbl">RECOVERED</span>
              <span className="c-val text-mint">+{derived.totalRecoveredValueMon.toFixed(1)} MON</span>
            </div>
          </div>
        </div>

        {/* Real Monad vs Local Simulation State Indicator */}
        <div className="c-header-right">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
            <button
              className={`settlement-btn ${walletAddress ? 'active' : ''}`}
              onClick={onConnectWallet}
              title="Connect your non-custodial browser wallet"
            >
              {walletAddress
                ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                : 'CONNECT WALLET'}
            </button>
            {walletError && (
              <span className="font-mono" style={{ color: 'var(--signal-pink)', fontSize: '9px', maxWidth: '220px' }}>
                {walletError}
              </span>
            )}
          </div>
          <div className="runtime-network-card">
            <div className="network-status-indicator">
              <span className={`status-dot ${isMonad ? 'monad-purple' : 'sim-blue'}`}></span>
              <span className="network-name">
                {isMonad ? 'MONAD TESTNET' : 'LOCAL SIMULATION'}
              </span>
              {isMonad && <span className="chain-badge font-mono">10143</span>}
            </div>

            {isMonad && (
              <div className="monad-contract-preview">
                <span className="font-mono">ERC-8004: 0x8004A818...</span>
                <a
                  href="https://testnet.monadexplorer.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link"
                >
                  Explorer ↗
                </a>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Main Console Workspace: Sidebar + Content */}
      <div className="console-workspace-layout">
        {/* Restructured Sidebar */}
        <aside className="console-sidebar">
          {/* Overview */}
          <div className="sidebar-group">
            <button
              className={`sidebar-link ${currentTab === 'OVERVIEW' ? 'active' : ''}`}
              onClick={() => onSelectTab('OVERVIEW')}
            >
              <span className="s-icon">📊</span>
              <span>Overview</span>
            </button>
          </div>

          {/* Economy */}
          <div className="sidebar-group">
            <div className="sidebar-group-title">ECONOMY</div>
            <button
              className={`sidebar-link ${currentTab === 'AGENTS' ? 'active' : ''}`}
              onClick={() => onSelectTab('AGENTS')}
            >
              <span className="s-icon">🪪</span>
              <span>Agents & Passports</span>
            </button>
            <button
              className={`sidebar-link ${currentTab === 'AGENT_BUILDER' ? 'active' : ''}`}
              onClick={() => onSelectTab('AGENT_BUILDER')}
            >
              <span className="s-icon">⚙️</span>
              <span>Agent Builder</span>
            </button>
            <button
              className={`sidebar-link ${currentTab === 'ASSETS' ? 'active' : ''}`}
              onClick={() => onSelectTab('ASSETS')}
            >
              <span className="s-icon">💎</span>
              <span>Economic Objects</span>
            </button>
            <button
              className={`sidebar-link ${currentTab === 'MARKETPLACE' ? 'active' : ''}`}
              onClick={() => onSelectTab('MARKETPLACE')}
            >
              <span className="s-icon">🌐</span>
              <span>Discovery Market</span>
            </button>
          </div>

          <div className="sidebar-group">
            <div className="sidebar-group-title">CORE ECONOMY</div>
            <div className="font-mono text-muted" style={{ padding: '8px 12px', fontSize: '10px', lineHeight: 1.5 }}>
              Publish identities on Monad, discover the public network, and prepare credit allocation.
            </div>
          </div>
        </aside>

        {/* Content Viewport */}
        <main className="console-main-viewport">
          {children}
        </main>
      </div>
    </div>
  );
};

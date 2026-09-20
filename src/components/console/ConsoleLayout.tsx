import React from 'react';
import { SettlementMode } from '../../sdk/types';
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
  onToggleSettlement: (mode: SettlementMode) => void;
  walletAddress?: string;
  walletBalance?: string;
  isWrongNetwork?: boolean;
  onSwitchToMonad?: () => void;
  onOpenAccount?: () => void;
  onConnectWallet: () => void;
  children: React.ReactNode;
}

export const ConsoleLayout: React.FC<ConsoleLayoutProps> = ({
  store,
  currentTab,
  onSelectTab,
  onSwitchToLanding,
  onToggleSettlement,
  walletAddress,
  walletBalance,
  isWrongNetwork,
  onSwitchToMonad,
  onOpenAccount,
  onConnectWallet,
  children,
}) => {
  const derived = store.getDerivedState();
  const currentMode = store.getSettlementMode();
  const isMonad = currentMode === 'MONAD_TESTNET';

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
              <span className="c-val">{walletBalance || `${derived.totalTreasuryMon.toFixed(1)} MON`}</span>
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
            {isWrongNetwork ? (
              <button
                className="settlement-btn"
                style={{ background: '#E5A500', color: '#041B26', fontWeight: 800, border: '1px solid #FFD000' }}
                onClick={onSwitchToMonad}
                title="Your wallet is on another network. Click to switch to Monad Testnet."
              >
                SWITCH TO MONAD
              </button>
            ) : walletAddress ? (
              <button
                className="settlement-btn active"
                onClick={onOpenAccount}
                title="Manage connected controller wallet via AppKit"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00E599', display: 'inline-block' }}></span>
                <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                {walletBalance && (
                  <span style={{ background: 'rgba(0, 229, 153, 0.15)', color: '#00E599', padding: '1px 5px', borderRadius: '4px', fontSize: '10px' }}>
                    {walletBalance}
                  </span>
                )}
              </button>
            ) : (
              <button
                className="settlement-btn"
                onClick={onConnectWallet}
                title="Connect your non-custodial browser or mobile wallet via Reown AppKit"
              >
                CONNECT WALLET
              </button>
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

          {/* Settlement Mode Selector Toggle */}
          <div className="settlement-selector-group">
            <button
              className={`settlement-btn ${!isMonad ? 'active' : ''}`}
              onClick={() => onToggleSettlement('LOCAL_SIMULATION')}
            >
              SIMULATOR
            </button>
            <button
              className={`settlement-btn ${isMonad ? 'active' : ''}`}
              onClick={() => onToggleSettlement('MONAD_TESTNET')}
            >
              MONAD 10143
            </button>
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

          {/* Activity */}
          <div className="sidebar-group">
            <div className="sidebar-group-title">ACTIVITY</div>
            <button
              className={`sidebar-link ${currentTab === 'TRANSACTIONS' ? 'active' : ''}`}
              onClick={() => onSelectTab('TRANSACTIONS')}
            >
              <span className="s-icon">📜</span>
              <span>Audit Ledger</span>
            </button>
            <button
              className={`sidebar-link ${currentTab === 'ESCROW' ? 'active' : ''}`}
              onClick={() => onSelectTab('ESCROW')}
            >
              <span className="s-icon">🔒</span>
              <span>Escrow Contracts</span>
            </button>
          </div>

          {/* Recovery - Signature Feature */}
          <div className="sidebar-group highlight-recovery-group">
            <div className="sidebar-group-title text-accent-pink">RECOVERY</div>
            <button
              className={`sidebar-link recovery-link ${currentTab === 'RECOVERY' ? 'active' : ''}`}
              onClick={() => onSelectTab('RECOVERY')}
            >
              <span className="s-icon">♻️</span>
              <span>Economic GC</span>
              <span className="sidebar-pill-badge">{derived.totalStrandedValueMon.toFixed(1)}M</span>
            </button>
          </div>

          {/* Control */}
          <div className="sidebar-group">
            <div className="sidebar-group-title">CONTROL</div>
            <button
              className={`sidebar-link ${currentTab === 'POLICIES' ? 'active' : ''}`}
              onClick={() => onSelectTab('POLICIES')}
            >
              <span className="s-icon">🛡️</span>
              <span>Policies & Caps</span>
            </button>
          </div>

          {/* Developers */}
          <div className="sidebar-group">
            <div className="sidebar-group-title">DEVELOPERS</div>
            <button
              className={`sidebar-link ${currentTab === 'API_SDK' ? 'active' : ''}`}
              onClick={() => onSelectTab('API_SDK')}
            >
              <span className="s-icon">💻</span>
              <span>API & SDK Specs</span>
            </button>
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

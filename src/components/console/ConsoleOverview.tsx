import React, { useState, useEffect } from 'react';
import { EconomicStore } from '../../sdk/store';
import { TRANSACTION_FEE_BPS, MARKETPLACE_FEE_BPS, RECOVERY_FEE_BPS, AGENT_PLANS } from '../../sdk/fee';
import {
  KeyRound,
  LogIn,
  Wallet,
  LogOut,
  Database,
  Layers,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Users,
  Boxes,
  Compass,
  FileText,
  Lock,
  Play,
  Scale,
  Activity,
  ArrowUpRight,
  Plus,
  Coins,
  ShieldCheck,
  PlusCircle,
} from 'lucide-react';
import { ECONPasskeyPublicMetadata } from '../../integrations/mera/meraTypes';
import { OnePasskeyManyKeysVisual } from '../mera/OnePasskeyManyKeysVisual';
import { EnvioProvenanceBadge } from '../envio/EnvioProvenanceBadge';
import { DynamicWalletDetails } from '../../integrations/dynamic';
import { DynamicControlCard } from '../dynamic/DynamicControlCard';
import { DynamicAuthButton } from '../dynamic/DynamicAuthButton';
import { globalEnvioClient } from '../../integrations/envio/client';
import { FormattedEconomicEvent, EnvioDataSourceStatus } from '../../integrations/envio/types';
import { getExplorerTxUrl, formatHash } from '../../integrations/envio/mappers';

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
  onOpenPasskeyModal?: (mode?: 'CREATE' | 'SIGNIN') => void;
  passkeyMetadata?: ECONPasskeyPublicMetadata | null;
  onDisconnectPasskey?: () => void;
  dynamicWallet?: DynamicWalletDetails | null;
  onDisconnectDynamic?: () => void;
  onSwitchControl?: () => void;
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
  onOpenPasskeyModal,
  passkeyMetadata,
  onDisconnectPasskey,
  dynamicWallet,
  onDisconnectDynamic,
  onSwitchControl,
}) => {
  const [timelineSource, setTimelineSource] = useState<'ENVIO_INDEXED' | 'LOCAL_STREAM'>('ENVIO_INDEXED');
  const [envioEvents, setEnvioEvents] = useState<FormattedEconomicEvent[]>([]);
  const [envioStatus, setEnvioStatus] = useState<EnvioDataSourceStatus>('INDEXING');
  const [loadingEnvio, setLoadingEnvio] = useState(false);

  const fetchEnvioData = async () => {
    setLoadingEnvio(true);
    try {
      const res = await globalEnvioClient.getRecentEconomicEvents({ limit: 12 });
      if (res && res.events.length > 0) {
        setEnvioEvents(res.events);
        setEnvioStatus(res.isLive ? 'LIVE' : 'SIMULATION');
      } else {
        setEnvioEvents([]);
        setEnvioStatus('NO_DATA');
      }
    } catch {
      setEnvioStatus('NO_DATA');
    } finally {
      setLoadingEnvio(false);
    }
  };

  useEffect(() => {
    fetchEnvioData();

    const unsub = globalEnvioClient.subscribeToEconomicEvents((newEvent) => {
      setEnvioEvents((prev) => [newEvent, ...prev.filter((e) => e.id !== newEvent.id)].slice(0, 12));
      setEnvioStatus(newEvent.isEnvioIndexed ? 'LIVE' : 'SIMULATION');
    });

    return () => unsub();
  }, []);

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
      {/* Executive Command Center Header */}
      <div className="overview-header-bar">
        <div className="overview-header-titles">
          <div className="overview-status-pill">
            <span className="live-pulse-dot" />
            <span>AUTONOMOUS NETWORK ACTIVE</span>
          </div>
          <h1 className="overview-title">Economic Command Center</h1>
          <p className="overview-subtitle">
            Monad parallel execution layer for autonomous agent identity, deterministic spend guardrails, and continuous value reclamation.
          </p>
        </div>

        <div className="overview-header-actions">
          <button
            className="btn-econ btn-header-action"
            onClick={() => onNavigate('AGENT_BUILDER')}
            title="Deploy new ERC-8004 Agent"
          >
            <Plus size={14} />
            <span>Deploy Agent</span>
          </button>
          <button
            className="btn-econ btn-econ-primary btn-header-action"
            onClick={() => onNavigate('RECOVERY')}
            title="Execute Garbage Collection & Recovery"
          >
            <RefreshCw size={14} />
            <span>Scan Recovery</span>
          </button>
        </div>
      </div>

      {/* 5-Metric Telemetry Cards Grid */}
      <div className="overview-metrics-grid">
        {/* Treasury */}
        <div
          className="metric-card interactive"
          onClick={() => onNavigate('AGENTS')}
          role="button"
          tabIndex={0}
          title="Inspect Agent Treasuries"
        >
          <div className="metric-card-top">
            <span className="metric-card-label">PROTOCOL TREASURY</span>
            <div className="metric-card-icon-badge">
              <Coins size={14} />
            </div>
          </div>
          <div className="metric-card-val">
            {walletBalance || `${derived.totalTreasuryMon.toFixed(2)} MON`}
          </div>
          <div className="metric-card-footer">
            <span className="text-secondary font-mono">Live settlement balance</span>
            <ArrowUpRight size={13} className="metric-card-arrow" />
          </div>
        </div>

        {/* Stranded Capital */}
        <div
          className="metric-card interactive metric-card-pink"
          onClick={() => onNavigate('RECOVERY')}
          role="button"
          tabIndex={0}
          title="Inspect Stranded Value"
        >
          <div className="metric-card-top">
            <span className="metric-card-label text-accent-pink">STRANDED CAPITAL</span>
            <div className="metric-card-icon-badge icon-badge-pink">
              <AlertTriangle size={14} />
            </div>
          </div>
          <div className="metric-card-val text-accent-pink">
            {derived.totalStrandedValueMon.toFixed(2)} MON
          </div>
          <div className="metric-card-footer">
            <span className="text-accent-pink font-mono">{plans.length} GC Candidates</span>
            <ArrowUpRight size={13} className="metric-card-arrow" />
          </div>
        </div>

        {/* Recovered Value */}
        <div
          className="metric-card interactive metric-card-mint"
          onClick={() => onNavigate('RECOVERY')}
          role="button"
          tabIndex={0}
          title="Inspect Reclaimed Yield"
        >
          <div className="metric-card-top">
            <span className="metric-card-label text-mint">RECOVERED YIELD</span>
            <div className="metric-card-icon-badge icon-badge-mint">
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="metric-card-val text-mint">
            +{derived.totalRecoveredValueMon.toFixed(2)} MON
          </div>
          <div className="metric-card-footer">
            <span className="text-mint font-mono">Reclaimed on-chain</span>
            <ArrowUpRight size={13} className="metric-card-arrow" />
          </div>
        </div>

        {/* Active Agents */}
        <div
          className="metric-card interactive"
          onClick={() => onNavigate('AGENTS')}
          role="button"
          tabIndex={0}
          title="View Sovereign Agents"
        >
          <div className="metric-card-top">
            <span className="metric-card-label">SOVEREIGN IDENTITIES</span>
            <div className="metric-card-icon-badge">
              <Users size={14} />
            </div>
          </div>
          <div className="metric-card-val">
            {agents.length} <span className="metric-val-unit">ENTITIES</span>
          </div>
          <div className="metric-card-footer">
            <span className="text-secondary font-mono">ERC-8004 Registered</span>
            <ArrowUpRight size={13} className="metric-card-arrow" />
          </div>
        </div>

        {/* Circulating Objects */}
        <div
          className="metric-card interactive"
          onClick={() => onNavigate('ASSETS')}
          role="button"
          tabIndex={0}
          title="Inspect Assets & Escrows"
        >
          <div className="metric-card-top">
            <span className="metric-card-label">ECONOMIC OBJECTS</span>
            <div className="metric-card-icon-badge">
              <Boxes size={14} />
            </div>
          </div>
          <div className="metric-card-val">
            {objects.length} <span className="metric-val-unit">OBJECTS</span>
          </div>
          <div className="metric-card-footer">
            <span className="text-secondary font-mono">{circulatingCredits.toFixed(0)} Liquidity units</span>
            <ArrowUpRight size={13} className="metric-card-arrow" />
          </div>
        </div>
      </div>

      {/* Dynamic Economic Control Section (when Dynamic is active/connected) */}
      {dynamicWallet && (
        <DynamicControlCard
          walletAddress={dynamicWallet.address}
          networkChainId={dynamicWallet.networkChainId}
          connectionStatus={dynamicWallet.networkChainId === 10143 ? 'Connected' : 'Wrong Network'}
          economicIdentityName={
            agents.find((a) => a.controllerType === 'DYNAMIC')?.name ||
            (agents[0]?.name ?? 'ResearchAgent-42')
          }
          isEmbedded={dynamicWallet.isEmbedded}
          connectorName={dynamicWallet.connectorName}
          maxPerTransaction={
            agents.find((a) => a.controllerType === 'DYNAMIC')?.policy?.maxPerTransaction || 20
          }
          dailySpendingLimit={
            agents.find((a) => a.controllerType === 'DYNAMIC')?.policy?.dailySpendingLimit || 60
          }
          onViewEconomicIdentity={() => onNavigate('AGENTS')}
          onSwitchControl={onSwitchControl}
          onDisconnect={onDisconnectDynamic}
          onSwitchNetwork={onSwitchNetwork}
        />
      )}

      {/* Controller Credential Authority Card */}
      <div className="controller-authority-card">
        <div className="controller-card-header">
          <div className="controller-card-info">
            <div className="controller-card-tag-row">
              <span className="controller-tag-eyebrow">CONTROLLER CREDENTIAL</span>
              <span className={`controller-status-chip ${passkeyMetadata || isConnected ? 'active' : ''}`}>
                {passkeyMetadata
                  ? 'PASSKEY CONTROLLER ACTIVE (MERA PRF)'
                  : isConnected
                  ? isWrongNetwork
                    ? 'WRONG NETWORK'
                    : 'AUTHENTICATED WALLET CONTROLLER'
                  : 'NO CONTROLLER CONNECTED'}
              </span>
            </div>
            <h3 className="controller-card-title">
              {passkeyMetadata
                ? 'Biometric Passkey Authority (Mera Dual-Key)'
                : isConnected
                ? 'Active Cryptographic Controller'
                : 'Non-Custodial Controller Authority'}
            </h3>
            <p className="controller-card-desc">
              {passkeyMetadata
                ? 'Your biometric passkey deterministically derives 4 purpose-specific accounts (operating, treasury, escrow, recovery) via Mera PRF on Monad Testnet without seed phrases.'
                : 'Your non-custodial wallet or biometric passkey provides cryptographic authority. ECON operates the persistent economic environment, sovereign identities, policy enforcement, and autonomous treasury settlement on Monad.'}
            </p>
          </div>

          <div className="controller-card-actions">
            {passkeyMetadata ? (
              <button
                className="btn-econ btn-disconnect"
                onClick={onDisconnectPasskey}
              >
                <LogOut size={13} />
                <span>Disconnect Passkey</span>
              </button>
            ) : isConnected ? (
              <>
                {isWrongNetwork ? (
                  <button
                    className="btn-econ btn-warn"
                    onClick={onSwitchNetwork}
                  >
                    Switch to Monad Testnet (10143)
                  </button>
                ) : (
                  <button
                    className="btn-econ btn-mint"
                    onClick={onOpenAccount}
                  >
                    <span>Manage Controller</span>
                    <ArrowUpRight size={13} />
                  </button>
                )}
              </>
            ) : (
              <div className="controller-button-cluster">
                <button
                  className="btn-econ btn-passkey-primary"
                  onClick={() => onOpenPasskeyModal && onOpenPasskeyModal('CREATE')}
                >
                  <KeyRound size={14} />
                  <span>Create Passkey</span>
                </button>

                <button
                  className="btn-econ btn-passkey-secondary"
                  onClick={() => onOpenPasskeyModal && onOpenPasskeyModal('SIGNIN')}
                >
                  <LogIn size={14} />
                  <span>Sign In</span>
                </button>

                <DynamicAuthButton variant="secondary" />

                <button
                  className="btn-econ btn-wallet-connect"
                  onClick={onConnectWallet}
                >
                  <Wallet size={14} />
                  <span>Connect Wallet</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Passkey Derived Accounts Strip or External Wallet Strip */}
        {passkeyMetadata ? (
          <div className="controller-accounts-strip">
            <OnePasskeyManyKeysVisual
              accounts={passkeyMetadata.addresses}
              credentialId={passkeyMetadata.credentialId}
              compact={true}
            />
          </div>
        ) : isConnected && !isWrongNetwork ? (
          <div className="controller-telemetry-strip">
            <div className="telemetry-block">
              <span className="telemetry-label">CONTROLLER CREDENTIAL</span>
              <a
                href={`https://testnet.monadexplorer.com/address/${walletAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="telemetry-link"
              >
                <span>{walletAddress ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}` : '—'}</span>
                <ExternalLink size={11} />
              </a>
            </div>

            <div className="telemetry-block">
              <span className="telemetry-label">LIVE TREASURY BALANCE (MONAD)</span>
              <span className="telemetry-val text-mint">
                {walletBalance || '0.0000 MON'}
              </span>
            </div>

            <div className="telemetry-block">
              <span className="telemetry-label">SETTLEMENT FABRIC</span>
              <span className="telemetry-val text-purple">
                MONAD TESTNET (10143)
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Main Economic Activity Timeline */}
      <div className="econ-card console-timeline-card">
        <div className="timeline-header">
          <div className="timeline-title-area">
            <div className="timeline-tag-area">
              <Activity size={13} className="text-secondary" />
              <span className="timeline-eyebrow">LIVE EVENT CHRONICLE</span>
              {envioStatus === 'LIVE' ? (
                <span className="envio-badge live">
                  <span className="pulse-dot" />
                  LIVE (ENVIO HYPERINDEX)
                </span>
              ) : envioStatus === 'INDEXING' ? (
                <span className="envio-badge indexing">
                  <RefreshCw size={10} className="animate-spin" />
                  INDEXING
                </span>
              ) : envioStatus === 'SIMULATION' ? (
                <span className="envio-badge simulation">
                  SIMULATION
                </span>
              ) : (
                <span className="envio-badge nodata">
                  NO DATA
                </span>
              )}
            </div>
            <h3 className="timeline-heading">Autonomous Economic Activity Timeline</h3>
          </div>

          <div className="timeline-controls">
            <div className="timeline-source-toggle">
              <button
                className={`timeline-toggle-btn ${timelineSource === 'ENVIO_INDEXED' ? 'active' : ''}`}
                onClick={() => setTimelineSource('ENVIO_INDEXED')}
              >
                <Database size={11} />
                <span>ENVIO INDEXED</span>
              </button>
              <button
                className={`timeline-toggle-btn ${timelineSource === 'LOCAL_STREAM' ? 'active' : ''}`}
                onClick={() => setTimelineSource('LOCAL_STREAM')}
              >
                <Layers size={11} />
                <span>STREAM</span>
              </button>
            </div>

            {timelineSource === 'ENVIO_INDEXED' && (
              <button
                onClick={fetchEnvioData}
                disabled={loadingEnvio}
                className="btn-econ btn-sync"
                title="Sync from Envio"
              >
                <RefreshCw size={12} className={loadingEnvio ? 'animate-spin' : ''} />
              </button>
            )}

            <EnvioProvenanceBadge compact />
          </div>
        </div>

        {timelineSource === 'ENVIO_INDEXED' ? (
          envioEvents.length === 0 ? (
            <div className="timeline-empty-state">
              <p>NO INDEXED ECONOMIC EVENTS FOUND ON MONAD TESTNET</p>
              <span>Events will appear here in real-time as transactions settle on Monad (Chain ID 10143).</span>
            </div>
          ) : (
            <div className="timeline-events-list">
              {envioEvents.slice(0, 8).map((event) => (
                <div key={event.id} className="timeline-event-row">
                  <div className="event-row-left">
                    <span className="event-time font-mono">{event.exactTime}</span>
                    <span className="event-type-badge">{event.type.replace(/_/g, ' ')}</span>
                    <span className="event-summary">{event.summary}</span>
                  </div>

                  <a
                    href={getExplorerTxUrl(event.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="event-tx-link font-mono"
                    title={event.txHash}
                  >
                    <span>Tx: {formatHash(event.txHash, 6, 4)}</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              ))}
            </div>
          )
        ) : events.length === 0 ? (
          <div className="timeline-empty-state">
            <p>No activity recorded yet in current session.</p>
            <span>Publish an agent or execute a transaction to stream live state transitions.</span>
          </div>
        ) : (
          <div className="timeline-events-list">
            {events.slice(0, 8).map((event) => (
              <div key={event.id} className="timeline-event-row">
                <div className="event-row-left">
                  <span className="event-time font-mono">
                    {new Date(event.timestamp).toLocaleTimeString()} · {event.actor}
                  </span>
                  <span className="event-type-badge">{event.type}</span>
                  <span className="event-summary">{event.summary}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Operational Quick Launcher (7 Modules) */}
      <div className="overview-quick-grid">
        <div className="launcher-card" onClick={() => onNavigate('AGENTS')} role="button" tabIndex={0}>
          <div className="launcher-icon-box">
            <Users size={18} />
          </div>
          <h4>Sovereign Agents</h4>
          <p>{agents.length} active ERC-8004 agents with verified passports and credit scores.</p>
          <span className="launcher-link">
            <span>View Agents</span>
            <ArrowUpRight size={13} className="launcher-arrow" />
          </span>
        </div>

        <div className="launcher-card" onClick={() => onNavigate('RECOVERY')} role="button" tabIndex={0}>
          <div className="launcher-icon-box icon-pink">
            <RefreshCw size={18} />
          </div>
          <h4>Recovery Engine</h4>
          <p>{plans.length} reclamation opportunities scanned by quantitative EV analysis.</p>
          <span className="launcher-link text-accent-pink">
            <span>Open GC Engine</span>
            <ArrowUpRight size={13} className="launcher-arrow" />
          </span>
        </div>

        <div className="launcher-card" onClick={() => onNavigate('POLICIES')} role="button" tabIndex={0}>
          <div className="launcher-icon-box icon-blue">
            <ShieldCheck size={18} />
          </div>
          <h4>Policy Guard</h4>
          <p>Deterministic spend caps, velocity limits, and counterparty whitelists.</p>
          <span className="launcher-link">
            <span>Configure Policies</span>
            <ArrowUpRight size={13} className="launcher-arrow" />
          </span>
        </div>

        <div className="launcher-card" onClick={() => onNavigate('AGENT_BUILDER')} role="button" tabIndex={0}>
          <div className="launcher-icon-box icon-mint">
            <PlusCircle size={18} />
          </div>
          <h4>Publish An Agent</h4>
          <p>Connect a wallet and publish a real ERC-8004 identity on Monad Testnet.</p>
          <span className="launcher-link text-mint">
            <span>Open Builder</span>
            <ArrowUpRight size={13} className="launcher-arrow" />
          </span>
        </div>

        <div className="launcher-card" onClick={() => onNavigate('ESCROW')} role="button" tabIndex={0}>
          <div className="launcher-icon-box icon-purple">
            <Lock size={18} />
          </div>
          <h4>Conditional Escrow</h4>
          <p>Trustless milestone-based value locks with automated SLA and proof validation.</p>
          <span className="launcher-link">
            <span>Manage Escrows</span>
            <ArrowUpRight size={13} className="launcher-arrow" />
          </span>
        </div>

        <div className="launcher-card" onClick={() => onNavigate('MARKETPLACE')} role="button" tabIndex={0}>
          <div className="launcher-icon-box icon-cyan">
            <Compass size={18} />
          </div>
          <h4>Service Marketplace</h4>
          <p>Decentralized AI services, GPU compute, and satellite feeds evaluated by Qwen.</p>
          <span className="launcher-link">
            <span>Discover Services</span>
            <ArrowUpRight size={13} className="launcher-arrow" />
          </span>
        </div>

        <div className="launcher-card" onClick={() => onNavigate('SIMULATION_SLICE')} role="button" tabIndex={0}>
          <div className="launcher-icon-box icon-gold">
            <Play size={18} />
          </div>
          <h4>10-Step Simulation</h4>
          <p>Step-by-step verification of autonomous economic loop from discovery to value reclamation.</p>
          <span className="launcher-link text-gold">
            <span>Run Simulation</span>
            <ArrowUpRight size={13} className="launcher-arrow" />
          </span>
        </div>
      </div>

      {/* Protocol Revenue Architecture Panel */}
      <div className="econ-card revenue-panel-card">
        <div className="revenue-panel-header">
          <div>
            <div className="revenue-eyebrow-row">
              <Coins size={13} className="text-mint" />
              <span className="revenue-eyebrow">PROTOCOL REVENUE ARCHITECTURE</span>
            </div>
            <h3 className="revenue-title">ECON Revenue Streams</h3>
            <p className="revenue-desc">
              ECON captures protocol fees only when creating verifiable economic utility — through settlement, commerce, infrastructure, and recovered value.
            </p>
          </div>
          <span className="revenue-active-badge">4 STREAMS ACTIVE</span>
        </div>

        <div className="revenue-streams-grid">
          {/* Transaction Fee */}
          <div className="revenue-stream-card stream-mint">
            <div className="stream-top">
              <span className="stream-name">TRANSACTION FEE</span>
              <span className="stream-rate">{(TRANSACTION_FEE_BPS / 100).toFixed(2)}%</span>
            </div>
            <p className="stream-desc">On eligible ECON-settled agent transactions</p>
            <div className="stream-example">
              10 MON → {(10 * TRANSACTION_FEE_BPS / 10000).toFixed(3)} fee → {(10 - 10 * TRANSACTION_FEE_BPS / 10000).toFixed(3)} net
            </div>
          </div>

          {/* Marketplace Fee */}
          <div className="revenue-stream-card stream-purple">
            <div className="stream-top">
              <span className="stream-name">MARKETPLACE FEE</span>
              <span className="stream-rate">{(MARKETPLACE_FEE_BPS / 100).toFixed(2)}%</span>
            </div>
            <p className="stream-desc">On economic object and service purchases</p>
            <div className="stream-example">
              10 MON → {(10 * MARKETPLACE_FEE_BPS / 10000).toFixed(3)} fee → {(10 - 10 * MARKETPLACE_FEE_BPS / 10000).toFixed(3)} net
            </div>
          </div>

          {/* Recovery Fee */}
          <div className="revenue-stream-card stream-pink">
            <div className="stream-top">
              <span className="stream-name">RECOVERY FEE</span>
              <span className="stream-rate">{(RECOVERY_FEE_BPS / 100).toFixed(2)}%</span>
            </div>
            <p className="stream-desc">Of successfully reclaimed stranded protocol value</p>
            <div className="stream-example">
              4 MON → {(4 * RECOVERY_FEE_BPS / 10000).toFixed(3)} fee → {(4 - 4 * RECOVERY_FEE_BPS / 10000).toFixed(3)} net
            </div>
          </div>

          {/* Agent Plans */}
          <div className="revenue-stream-card stream-gold">
            <div className="stream-top">
              <span className="stream-name">AGENT PLANS</span>
              <span className="stream-rate">SaaS</span>
            </div>
            <p className="stream-desc">Recurring enterprise infrastructure subscriptions</p>
            <div className="stream-plan-list">
              {(['FREE', 'BUILDER', 'ENTERPRISE'] as const).map((tier) => (
                <div key={tier} className="stream-plan-row">
                  <span className="plan-label">{AGENT_PLANS[tier].label}</span>
                  <span className="plan-cost">
                    {tier === 'FREE' ? 'FREE' : tier === 'ENTERPRISE' ? 'CUSTOM' : `${AGENT_PLANS[tier].monthlyMon} MON/mo`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="revenue-rule-strip">
          <Scale size={14} className="text-secondary" />
          <span>
            <strong>Deterministic fee routing rule:</strong> Transaction and marketplace fees are mutually exclusive — the fee engine routes each execution to exactly one stream. Recovery fees never stack with execution fees.
          </span>
        </div>
      </div>
    </div>
  );
};

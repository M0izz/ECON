import { EconomicStore } from '../../sdk/store';
import { TRANSACTION_FEE_BPS, MARKETPLACE_FEE_BPS, RECOVERY_FEE_BPS, AGENT_PLANS } from '../../sdk/fee';
import { Key, Shield, LogOut } from 'lucide-react';
import { ECONPasskeyPublicMetadata } from '../../integrations/mera/meraTypes';
import { OnePasskeyManyKeysVisual } from '../mera/OnePasskeyManyKeysVisual';
import { EnvioProvenanceBadge } from '../envio/EnvioProvenanceBadge';
import { DynamicWalletDetails } from '../../integrations/dynamic';
import { DynamicControlCard } from '../dynamic/DynamicControlCard';
import { DynamicAuthButton } from '../dynamic/DynamicAuthButton';

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
                  background: passkeyMetadata
                    ? 'rgba(0, 229, 153, 0.15)'
                    : isConnected
                    ? isWrongNetwork
                      ? 'rgba(229, 165, 0, 0.2)'
                      : 'rgba(0, 229, 153, 0.15)'
                    : 'rgba(255, 255, 255, 0.08)',
                  color: passkeyMetadata
                    ? '#00E599'
                    : isConnected
                    ? (isWrongNetwork ? '#FFD000' : '#00E599')
                    : 'rgba(255, 255, 255, 0.5)',
                  border: passkeyMetadata
                    ? '1px solid #00E599'
                    : isConnected
                    ? isWrongNetwork
                      ? '1px solid #FFD000'
                      : '1px solid #00E599'
                    : '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                {passkeyMetadata
                  ? 'PASSKEY CONTROLLER ACTIVE (MERA PRF)'
                  : isConnected
                  ? isWrongNetwork
                    ? 'WRONG NETWORK'
                    : 'AUTHENTICATED CONTROLLER (WALLET)'
                  : 'NO CONTROLLER CONNECTED'}
              </span>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFF', margin: '8px 0 4px 0' }}>
              {passkeyMetadata
                ? 'Biometric Passkey Authority (Mera)'
                : isConnected
                ? 'Active Cryptographic Controller'
                : 'Non-Custodial Controller Authority'}
            </h3>
            <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.65)', margin: 0, maxWidth: '640px' }}>
              {passkeyMetadata
                ? 'Your biometric passkey deterministically derives 4 purpose-specific accounts (operating, treasury, escrow, recovery) via Mera PRF on Monad Testnet without seed phrases.'
                : 'Your non-custodial wallet or biometric passkey provides cryptographic authority. ECON operates the persistent economic environment, sovereign identities, policy enforcement, and autonomous treasury settlement on Monad.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {passkeyMetadata ? (
              <button
                onClick={onDisconnectPasskey}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#F87171',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <LogOut size={13} />
                <span>Disconnect Passkey</span>
              </button>
            ) : isConnected ? (
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
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => onOpenPasskeyModal && onOpenPasskeyModal('CREATE')}
                  style={{
                    background: '#00E599',
                    color: '#041B26',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 229, 153, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Key size={14} />
                  <span>Create with Passkey</span>
                </button>

                <button
                  onClick={() => onOpenPasskeyModal && onOpenPasskeyModal('SIGNIN')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#FFF',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Sign In (Passkey)
                </button>

                <DynamicAuthButton variant="secondary" />

                <button
                  onClick={onConnectWallet}
                  style={{
                    background: 'transparent',
                    color: 'rgba(255, 255, 255, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Connect Wallet (AppKit)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Passkey Derived Accounts Strip or External Wallet Strip */}
        {passkeyMetadata ? (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <OnePasskeyManyKeysVisual
              accounts={passkeyMetadata.addresses}
              credentialId={passkeyMetadata.credentialId}
              compact={true}
            />
          </div>
        ) : isConnected && !isWrongNetwork ? (
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
        ) : null}
      </div>

      {/* Main Economic Activity Timeline */}
      <div className="econ-card console-timeline-card">
        <div className="timeline-header">
          <div>
            <span className="econ-eyebrow">// REAL-TIME CHRONICLE</span>
            <h3 className="econ-title-md">AUTONOMOUS ECONOMIC ACTIVITY TIMELINE</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EnvioProvenanceBadge compact />
            <span className="econ-badge econ-badge-lime">LIVE LEDGER</span>
          </div>
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

      {/* Revenue Model Panel */}
      <div className="econ-card" style={{ marginTop: '20px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span className="econ-eyebrow" style={{ color: '#00E599' }}>// PROTOCOL REVENUE MODEL</span>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', margin: '6px 0 4px 0' }}>ECON REVENUE STREAMS</h3>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              ECON earns when it creates or facilitates economic value — through settlement, commerce, infrastructure, and recovered value.
            </p>
          </div>
          <span className="econ-badge econ-badge-lime">4 STREAMS ACTIVE</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {/* Transaction Fee */}
          <div style={{ background: 'rgba(0,229,153,0.07)', border: '1px solid rgba(0,229,153,0.18)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: '#00E599' }}>TRANSACTION FEE</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', color: '#00E599' }}>{TRANSACTION_FEE_BPS / 100}%</span>
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: '0 0 10px 0', lineHeight: 1.5 }}>On eligible ECON-settled transactions</p>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.8 }}>
              10 MON → {(10 * TRANSACTION_FEE_BPS / 10000).toFixed(3)} fee → {(10 - 10 * TRANSACTION_FEE_BPS / 10000).toFixed(3)} net
            </div>
          </div>

          {/* Marketplace Fee */}
          <div style={{ background: 'rgba(131,110,249,0.07)', border: '1px solid rgba(131,110,249,0.2)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: '#836EF9' }}>MARKETPLACE FEE</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', color: '#836EF9' }}>{MARKETPLACE_FEE_BPS / 100}%</span>
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: '0 0 10px 0', lineHeight: 1.5 }}>On economic object marketplace purchases</p>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.8 }}>
              10 MON → {(10 * MARKETPLACE_FEE_BPS / 10000).toFixed(3)} fee → {(10 - 10 * MARKETPLACE_FEE_BPS / 10000).toFixed(3)} net
            </div>
          </div>

          {/* Recovery Fee */}
          <div style={{ background: 'rgba(255,94,120,0.07)', border: '1px solid rgba(255,94,120,0.2)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: '#FF5E78' }}>RECOVERY FEE</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', color: '#FF5E78' }}>{RECOVERY_FEE_BPS / 100}%</span>
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: '0 0 10px 0', lineHeight: 1.5 }}>Of successfully recovered stranded value</p>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.8 }}>
              4 MON → {(4 * RECOVERY_FEE_BPS / 10000).toFixed(3)} fee → {(4 - 4 * RECOVERY_FEE_BPS / 10000).toFixed(3)} net
            </div>
          </div>

          {/* Agent Plans */}
          <div style={{ background: 'rgba(255,208,0,0.06)', border: '1px solid rgba(255,208,0,0.18)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: '#FFD000' }}>AGENT PLANS</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', color: '#FFD000' }}>SaaS</span>
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: '0 0 10px 0', lineHeight: 1.5 }}>Recurring infrastructure subscriptions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {(['FREE', 'BUILDER', 'ENTERPRISE'] as const).map((tier) => (
                <div key={tier} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: '10px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.45)' }}>{AGENT_PLANS[tier].label}</span>
                  <span style={{ color: '#FFD000', fontWeight: 700 }}>
                    {tier === 'FREE' ? 'FREE' : tier === 'ENTERPRISE' ? 'CUSTOM' : `${AGENT_PLANS[tier].monthlyMon} MON/mo`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '14px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px' }}>⚖️</span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
            <strong style={{ color: 'rgba(255,255,255,0.75)' }}>Fee engine rule:</strong> Transaction and marketplace fees are mutually exclusive — the fee engine routes each transaction to exactly one stream. Recovery fees never stack with other fees.
          </span>
        </div>
      </div>
    </div>
  );
};

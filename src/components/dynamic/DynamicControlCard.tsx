import React from 'react';
import { Sparkles, Shield, LogOut, RefreshCw, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';
import { MONAD_TESTNET_CONFIG } from '../../settlement/MonadSettlementAdapter';
import { MONAD_EXPLORER_BASE } from '../../contracts/addresses';

export interface DynamicControlCardProps {
  walletAddress?: `0x${string}` | string;
  networkChainId?: number;
  connectionStatus: 'Connected' | 'Connecting' | 'Disconnected' | 'Wrong Network';
  economicIdentityName?: string;
  isEmbedded?: boolean;
  connectorName?: string;
  maxPerTransaction?: number;
  dailySpendingLimit?: number;
  onViewEconomicIdentity?: () => void;
  onSwitchControl?: () => void;
  onDisconnect?: () => void;
  onSwitchNetwork?: () => void;
}

export const DynamicControlCard: React.FC<DynamicControlCardProps> = ({
  walletAddress,
  networkChainId = 10143,
  connectionStatus,
  economicIdentityName = 'ResearchAgent-42',
  isEmbedded = false,
  connectorName = 'Dynamic EVM',
  maxPerTransaction = 20,
  dailySpendingLimit = 60,
  onViewEconomicIdentity,
  onSwitchControl,
  onDisconnect,
  onSwitchNetwork,
}) => {
  const isMonad = networkChainId === 10143;
  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`
    : 'Not Connected';

  return (
    <div
      className="econ-card"
      style={{
        padding: '20px',
        marginBottom: '20px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
        border: '1px solid rgba(59, 130, 246, 0.35)',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              className="econ-eyebrow"
              style={{ color: '#60A5FA', letterSpacing: '0.08em', fontWeight: 700 }}
            >
              // ECONOMIC CONTROL
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'monospace',
                padding: '2px 8px',
                borderRadius: '8px',
                background:
                  connectionStatus === 'Connected'
                    ? 'rgba(0, 229, 153, 0.15)'
                    : connectionStatus === 'Wrong Network'
                    ? 'rgba(234, 179, 8, 0.15)'
                    : 'rgba(255, 255, 255, 0.08)',
                color:
                  connectionStatus === 'Connected'
                    ? '#00E599'
                    : connectionStatus === 'Wrong Network'
                    ? '#FACC15'
                    : 'var(--text-secondary)',
                border:
                  connectionStatus === 'Connected'
                    ? '1px solid #00E599'
                    : connectionStatus === 'Wrong Network'
                    ? '1px solid #FACC15'
                    : '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              {connectionStatus.toUpperCase()}
            </span>
            {isEmbedded && (
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: 'rgba(147, 51, 234, 0.18)',
                  color: '#C084FC',
                  border: '1px solid rgba(147, 51, 234, 0.4)',
                }}
              >
                EMBEDDED EVM
              </span>
            )}
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            Dynamic Control Authority
          </h3>
          <p
            style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.65)',
              margin: '4px 0 0 0',
              maxWidth: '680px',
            }}
          >
            Dynamic serves as the non-custodial signing and control mechanism. ECON enforces sovereign
            economic identity and transaction authorization policies on Monad Testnet before any signature occurs.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {onViewEconomicIdentity && (
            <button
              onClick={onViewEconomicIdentity}
              className="btn-econ"
              style={{
                fontSize: '12px',
                padding: '7px 12px',
                background: 'rgba(59, 130, 246, 0.12)',
                color: '#93C5FD',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <ExternalLink size={12} />
              <span>View Economic Identity</span>
            </button>
          )}

          {onSwitchControl && (
            <button
              onClick={onSwitchControl}
              className="btn-econ"
              style={{
                fontSize: '12px',
                padding: '7px 12px',
                background: 'rgba(255, 255, 255, 0.06)',
                color: 'var(--text-primary)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <RefreshCw size={12} />
              <span>Switch Control</span>
            </button>
          )}

          {onDisconnect && (
            <button
              onClick={onDisconnect}
              className="btn-econ"
              style={{
                fontSize: '12px',
                padding: '7px 12px',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#F87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <LogOut size={12} />
              <span>Disconnect</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Key State Info (Requirements 14 & 18) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          background: 'rgba(0, 0, 0, 0.25)',
          padding: '14px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div>
          <div className="font-mono text-muted" style={{ fontSize: '10px' }}>
            CONTROL METHOD
          </div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#60A5FA',
              marginTop: '3px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={13} />
            <span>Dynamic ({connectorName})</span>
          </div>
        </div>

        <div>
          <div className="font-mono text-muted" style={{ fontSize: '10px' }}>
            WALLET ADDRESS
          </div>
          <div
            style={{
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#FFFFFF',
              marginTop: '3px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{shortAddr}</span>
            {walletAddress && (
              <a
                href={`${MONAD_EXPLORER_BASE}/address/${walletAddress}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#60A5FA', display: 'inline-flex' }}
                title="View on Monad Explorer"
              >
                <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>

        <div>
          <div className="font-mono text-muted" style={{ fontSize: '10px' }}>
            NETWORK
          </div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: isMonad ? '#00E599' : '#FACC15',
              marginTop: '3px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isMonad ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            <span>{isMonad ? 'Monad Testnet (10143)' : `Chain ID ${networkChainId}`}</span>
            {!isMonad && onSwitchNetwork && (
              <button
                onClick={onSwitchNetwork}
                className="btn-econ"
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  background: '#FACC15',
                  color: '#000',
                  border: 'none',
                  marginLeft: '4px',
                }}
              >
                Switch
              </button>
            )}
          </div>
        </div>

        <div>
          <div className="font-mono text-muted" style={{ fontSize: '10px' }}>
            ECONOMIC IDENTITY
          </div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#FFFFFF',
              marginTop: '3px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Shield size={13} style={{ color: '#00E599' }} />
            <span>{economicIdentityName}</span>
          </div>
        </div>
      </div>

      {/* Policies Footer (Requirement 14) */}
      <div
        style={{
          marginTop: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          fontFamily: 'monospace',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          paddingTop: '10px',
        }}
      >
        <span>
          <strong style={{ color: '#FFFFFF' }}>ACTIVE POLICIES:</strong>
        </span>
        <span>
          Max Transaction: <strong style={{ color: '#60A5FA' }}>{maxPerTransaction} MON</strong>
        </span>
        <span>
          Daily Limit: <strong style={{ color: '#60A5FA' }}>{dailySpendingLimit} MON</strong>
        </span>
        <span>
          Enforcement: <strong style={{ color: '#00E599' }}>ECON Pre-Flight Authoritative</strong>
        </span>
      </div>
    </div>
  );
};

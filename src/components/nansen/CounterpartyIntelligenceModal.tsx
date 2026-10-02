import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Shield,
  Tag,
  Wallet,
  ArrowRightLeft,
  Users,
  AlertCircle,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { EconomicIntelligence } from '../../integrations/nansen/nansenTypes';
import { defaultNansenClient } from '../../integrations/nansen/nansenClient';
import { MONAD_EXPLORER_BASE } from '../../contracts/addresses';

export interface CounterpartyIntelligenceModalProps {
  isOpen?: boolean;
  onClose: () => void;
  address?: string;
  entityName?: string;
  title?: string;
  chain?: string;
  role?: 'SELLER' | 'BUYER' | 'AGENT' | 'RECOVERY_TARGET' | 'GENERAL';
  initialIntelligence?: EconomicIntelligence | null;
}

export const CounterpartyIntelligenceModal: React.FC<CounterpartyIntelligenceModalProps> = ({
  isOpen = true,
  onClose,
  address,
  entityName,
  title,
  role = 'SELLER',
  initialIntelligence,
}) => {
  const displayEntityName = entityName || title;
  const [intelligence, setIntelligence] = useState<EconomicIntelligence | null>(
    initialIntelligence || null
  );
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'BALANCES' | 'TRANSACTIONS' | 'COUNTERPARTIES'>('OVERVIEW');

  useEffect(() => {
    if (!isOpen || !address) return;

    let isMounted = true;
    const fetchIntelligence = async () => {
      setLoading(true);
      try {
        const data = await defaultNansenClient.getAddressProfile(address, 'monad');
        if (isMounted) {
          setIntelligence(data);
        }
      } catch (err) {
        console.error('[Nansen UI] Failed to load intelligence:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchIntelligence();
    return () => {
      isMounted = false;
    };
  }, [isOpen, address]);

  if (!isOpen) return null;

  const shortAddr = address ? `${address.slice(0, 8)}...${address.slice(-6)}` : 'Unknown Address';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(2, 6, 23, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="econ-card"
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0F172A',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          borderRadius: '12px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="econ-eyebrow" style={{ color: '#60A5FA', letterSpacing: '0.08em' }}>
                // ON-CHAIN INTELLIGENCE
              </span>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#60A5FA',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                }}
              >
                {role}
              </span>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(0, 229, 153, 0.15)',
                  color: '#00E599',
                  border: '1px solid rgba(0, 229, 153, 0.3)',
                }}
              >
                MONAD (10143)
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFF', margin: '4px 0 0 0' }}>
              {displayEntityName || entityName || shortAddr}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                {address}
              </span>
              {address && (
                <a
                  href={`${MONAD_EXPLORER_BASE}/address/${address}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#60A5FA', display: 'inline-flex', alignItems: 'center' }}
                  title="View on Monad Explorer"
                >
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0 24px',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          {(['OVERVIEW', 'BALANCES', 'TRANSACTIONS', 'COUNTERPARTIES'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #3B82F6' : '2px solid transparent',
                padding: '12px 16px',
                color: activeTab === tab ? '#60A5FA' : 'var(--text-secondary)',
                fontWeight: activeTab === tab ? 700 : 500,
                fontSize: '11.5px',
                fontFamily: 'monospace',
                cursor: 'pointer',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#60A5FA' }} />
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFF' }}>
                Querying Nansen Profiler API on Monad...
              </div>
              <p style={{ fontSize: '11px', marginTop: '4px', maxWidth: '360px', margin: '4px auto 0 auto' }}>
                Fetching on-chain entity labels, token balances, recent transactions, and counterparties.
              </p>
            </div>
          ) : !intelligence?.available ? (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px dashed rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <AlertCircle size={24} style={{ color: '#F87171', margin: '0 auto 8px auto' }} />
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>
                Nansen Intelligence Temporarily Unavailable
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', margin: '4px 0 12px 0' }}>
                {intelligence?.error || 'NANSEN_API_KEY is not configured on the server, or the endpoint rate limit was exceeded.'}
              </p>
              <div
                style={{
                  fontSize: '10.5px',
                  fontFamily: 'monospace',
                  color: '#00E599',
                  background: 'rgba(0, 229, 153, 0.1)',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  display: 'inline-block',
                }}
              >
                ✓ Core ECON protocol and policy validation remain fully operational.
              </div>
            </div>
          ) : (
            <div>
              {/* TAB: OVERVIEW */}
              {activeTab === 'OVERVIEW' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Labels Section */}
                  <div>
                    <div className="font-mono text-muted" style={{ fontSize: '10px', marginBottom: '6px' }}>
                      NANSEN IDENTIFIED LABELS
                    </div>
                    {intelligence.labels.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {intelligence.labels.map((l, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: 'rgba(59, 130, 246, 0.15)',
                              color: '#93C5FD',
                              border: '1px solid rgba(59, 130, 246, 0.35)',
                              borderRadius: '6px',
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <Tag size={10} />
                            <span>{l.label}</span>
                            {l.category && (
                              <span style={{ fontSize: '9px', opacity: 0.7 }}>({l.category})</span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        No specific entity or behavioral labels currently indexed by Nansen for this address.
                      </div>
                    )}
                  </div>

                  {/* Summary Metric Strip */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '10px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div>
                      <div className="font-mono text-muted" style={{ fontSize: '10px' }}>MON BALANCE</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#00E599', marginTop: '2px' }}>
                        {intelligence.balances.find((b) => b.tokenSymbol.toUpperCase() === 'MON')?.balanceFormatted.toFixed(3) || '0.000'} MON
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-muted" style={{ fontSize: '10px' }}>RECORDED TXS</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFF', marginTop: '2px' }}>
                        {intelligence.recentTransactions.length}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-muted" style={{ fontSize: '10px' }}>COUNTERPARTIES</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#60A5FA', marginTop: '2px' }}>
                        {intelligence.counterparties.length}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-muted" style={{ fontSize: '10px' }}>RELATED WALLETS</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#A78BFA', marginTop: '2px' }}>
                        {intelligence.relatedWallets.length}
                      </div>
                    </div>
                  </div>

                  {/* Related Wallets Cluster */}
                  <div>
                    <div className="font-mono text-muted" style={{ fontSize: '10px', marginBottom: '6px' }}>
                      AFFILIATED & RELATED WALLETS
                    </div>
                    {intelligence.relatedWallets.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {intelligence.relatedWallets.map((rw, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: 'rgba(255, 255, 255, 0.03)',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                            }}
                          >
                            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#FFF' }}>
                              {rw.address.slice(0, 10)}...{rw.address.slice(-8)}
                            </span>
                            <span style={{ fontSize: '10px', color: '#A78BFA', fontFamily: 'monospace' }}>
                              {rw.relationshipType}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        No direct cluster-affiliated wallets identified.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: BALANCES */}
              {activeTab === 'BALANCES' && (
                <div>
                  <div className="font-mono text-muted" style={{ fontSize: '10px', marginBottom: '8px' }}>
                    CURRENT HOLDINGS (MONAD CHAIN)
                  </div>
                  {intelligence.balances.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {intelligence.balances.map((b, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '10px 14px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 700, color: '#FFF', fontSize: '12px' }}>
                              {b.tokenSymbol}
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                              {b.tokenName}
                            </span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'monospace', color: '#00E599', fontWeight: 700, fontSize: '12px' }}>
                              {b.balanceFormatted.toFixed(4)}
                            </div>
                            {b.balanceUsd !== undefined && (
                              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                ≈ ${b.balanceUsd.toFixed(2)} USD
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No token balances indexed for this address on Monad.
                    </div>
                  )}
                </div>
              )}

              {/* TAB: TRANSACTIONS */}
              {activeTab === 'TRANSACTIONS' && (
                <div>
                  <div className="font-mono text-muted" style={{ fontSize: '10px', marginBottom: '8px' }}>
                    RECENT TRANSACTIONS (NANSEN PROFILER)
                  </div>
                  {intelligence.recentTransactions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {intelligence.recentTransactions.map((tx, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '10px 14px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  fontFamily: 'monospace',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  background: tx.status === 'SUCCESS' ? 'rgba(0, 229, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                  color: tx.status === 'SUCCESS' ? '#00E599' : '#F87171',
                                }}
                              >
                                {tx.status}
                              </span>
                              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#FFF' }}>
                                {tx.txHash ? `${tx.txHash.slice(0, 10)}...` : '0x...'}
                              </span>
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {new Date(tx.timestamp).toLocaleString()} {tx.method ? `• ${tx.method}` : ''}
                            </div>
                          </div>
                          {tx.valueMon !== undefined && (
                            <div style={{ fontFamily: 'monospace', color: '#60A5FA', fontSize: '11px', fontWeight: 600 }}>
                              {tx.valueMon.toFixed(3)} MON
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No recent transaction history recorded by Nansen for this address.
                    </div>
                  )}
                </div>
              )}

              {/* TAB: COUNTERPARTIES */}
              {activeTab === 'COUNTERPARTIES' && (
                <div>
                  <div className="font-mono text-muted" style={{ fontSize: '10px', marginBottom: '8px' }}>
                    FREQUENT ON-CHAIN COUNTERPARTIES
                  </div>
                  {intelligence.counterparties.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {intelligence.counterparties.map((cp, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '10px 14px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#FFF', fontWeight: 600 }}>
                                {cp.address.slice(0, 8)}...{cp.address.slice(-6)}
                              </span>
                              {cp.label && (
                                <span style={{ fontSize: '9px', color: '#60A5FA', background: 'rgba(59, 130, 246, 0.15)', padding: '1px 5px', borderRadius: '3px' }}>
                                  {cp.label}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#FFF', fontWeight: 700 }}>
                              {cp.interactionCount} interactions
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No counterparty interactions indexed on Monad for this address.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={12} style={{ color: '#60A5FA' }} />
            <span>Data Source: Nansen Profiler API • Read-Only Context for ECON</span>
          </div>
          <button
            onClick={onClose}
            className="btn-econ"
            style={{ fontSize: '11px', padding: '5px 12px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

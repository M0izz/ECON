import React, { useState, useEffect } from 'react';
import { ECONEvent } from '../sdk/types';
import { EnvioIndexerClient, globalEnvioClient } from '../integrations/envio/client';
import { FormattedEconomicEvent } from '../integrations/envio/types';
import { EnvioProvenanceBadge } from './envio/EnvioProvenanceBadge';
import { MarketplaceHistory } from './envio/MarketplaceHistory';
import { EscrowHistory } from './envio/EscrowHistory';
import { RecoveryHistory } from './envio/RecoveryHistory';
import { EconomicAnalyticsView } from './envio/EconomicAnalyticsView';
import { getExplorerTxUrl, getExplorerAddressUrl, formatHash } from '../integrations/envio/mappers';
import { ScrollText, Search, Filter, RefreshCw, ExternalLink, Database, Layers, BarChart3 } from 'lucide-react';

interface AuditLedgerProps {
  events: ECONEvent[];
  client?: EnvioIndexerClient;
}

type LedgerSubTab = 'ALL_EVENTS' | 'MARKETPLACE' | 'ESCROW' | 'RECOVERY' | 'ANALYTICS';
type SourceMode = 'ENVIO_INDEXED' | 'LOCAL_STREAM';

export const AuditLedger: React.FC<AuditLedgerProps> = ({
  events: localEvents,
  client = globalEnvioClient,
}) => {
  const [sourceMode, setSourceMode] = useState<SourceMode>('ENVIO_INDEXED');
  const [subTab, setSubTab] = useState<LedgerSubTab>('ALL_EVENTS');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeModalEvent, setActiveModalEvent] = useState<FormattedEconomicEvent | ECONEvent | null>(null);

  // Envio live state
  const [envioEvents, setEnvioEvents] = useState<FormattedEconomicEvent[]>([]);
  const [loadingEnvio, setLoadingEnvio] = useState(false);
  const [isLiveEnvio, setIsLiveEnvio] = useState(false);

  const fetchEnvioEvents = async () => {
    setLoadingEnvio(true);
    try {
      const res = await client.getRecentEconomicEvents({
        limit: 100,
        type: filterType === 'ALL' ? undefined : filterType,
        actor: searchTerm || undefined,
      });
      setEnvioEvents(res.events);
      setIsLiveEnvio(res.isLive);
    } catch (err) {
      console.warn('Failed to query Envio events:', err);
    } finally {
      setLoadingEnvio(false);
    }
  };

  useEffect(() => {
    if (sourceMode === 'ENVIO_INDEXED') {
      fetchEnvioEvents();
    }
  }, [sourceMode, filterType]);

  // Local events filter
  const filteredLocal = localEvents.filter((e) => {
    const matchesType = filterType === 'ALL' || e.type === filterType;
    const matchesSearch =
      e.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.actor.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const filteredEnvio = envioEvents.filter((e) => {
    const matchesType = filterType === 'ALL' || e.type === filterType;
    const matchesSearch =
      e.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.actor.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Header Card */}
      <div className="panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ScrollText size={16} className="text-mint" />
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#FFF' }}>
                ECONOMIC HISTORY & AUDIT LEDGER
              </h2>
            </div>
            <p className="text-secondary" style={{ fontSize: '12px', margin: '4px 0 0 0' }}>
              Deterministic event stream indexed from Monad Parallel EVM (Chain ID 10143) via Envio HyperIndex.
            </p>
          </div>

          {/* Source Toggle: Envio vs Local In-Memory */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '3px',
              }}
            >
              <button
                className={`btn-econ ${sourceMode === 'ENVIO_INDEXED' ? 'active' : ''}`}
                style={{
                  background: sourceMode === 'ENVIO_INDEXED' ? '#836EF9' : 'transparent',
                  color: sourceMode === 'ENVIO_INDEXED' ? '#FFF' : 'rgba(255,255,255,0.6)',
                  border: 'none',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                }}
                onClick={() => setSourceMode('ENVIO_INDEXED')}
              >
                <Database size={12} />
                ENVIO INDEXED (MONAD)
              </button>
              <button
                className={`btn-econ ${sourceMode === 'LOCAL_STREAM' ? 'active' : ''}`}
                style={{
                  background: sourceMode === 'LOCAL_STREAM' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: sourceMode === 'LOCAL_STREAM' ? '#FFF' : 'rgba(255,255,255,0.6)',
                  border: 'none',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                }}
                onClick={() => setSourceMode('LOCAL_STREAM')}
              >
                <Layers size={12} />
                IN-MEMORY STREAM
              </button>
            </div>

            {sourceMode === 'ENVIO_INDEXED' && (
              <button
                onClick={fetchEnvioEvents}
                className="btn-econ"
                style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Refresh Envio HyperIndex Query"
              >
                <RefreshCw size={12} className={loadingEnvio ? 'animate-spin' : ''} />
                Sync
              </button>
            )}
          </div>
        </div>

        {/* Provenance & Sub-Navigation Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setSubTab('ALL_EVENTS')}
              style={{
                background: subTab === 'ALL_EVENTS' ? 'rgba(0, 229, 153, 0.15)' : 'transparent',
                color: subTab === 'ALL_EVENTS' ? '#00E599' : 'rgba(255,255,255,0.6)',
                border: subTab === 'ALL_EVENTS' ? '1px solid #00E599' : '1px solid transparent',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              All Events ({sourceMode === 'ENVIO_INDEXED' ? filteredEnvio.length : filteredLocal.length})
            </button>
            <button
              onClick={() => setSubTab('MARKETPLACE')}
              style={{
                background: subTab === 'MARKETPLACE' ? 'rgba(131, 110, 249, 0.15)' : 'transparent',
                color: subTab === 'MARKETPLACE' ? '#836EF9' : 'rgba(255,255,255,0.6)',
                border: subTab === 'MARKETPLACE' ? '1px solid #836EF9' : '1px solid transparent',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Marketplace History
            </button>
            <button
              onClick={() => setSubTab('ESCROW')}
              style={{
                background: subTab === 'ESCROW' ? 'rgba(0, 229, 153, 0.15)' : 'transparent',
                color: subTab === 'ESCROW' ? '#00E599' : 'rgba(255,255,255,0.6)',
                border: subTab === 'ESCROW' ? '1px solid #00E599' : '1px solid transparent',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Escrow Timeline
            </button>
            <button
              onClick={() => setSubTab('RECOVERY')}
              style={{
                background: subTab === 'RECOVERY' ? 'rgba(255, 94, 120, 0.15)' : 'transparent',
                color: subTab === 'RECOVERY' ? '#FF5E78' : 'rgba(255,255,255,0.6)',
                border: subTab === 'RECOVERY' ? '1px solid #FF5E78' : '1px solid transparent',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Recovery History
            </button>
            <button
              onClick={() => setSubTab('ANALYTICS')}
              style={{
                background: subTab === 'ANALYTICS' ? 'rgba(255, 208, 0, 0.15)' : 'transparent',
                color: subTab === 'ANALYTICS' ? '#FFD000' : 'rgba(255,255,255,0.6)',
                border: subTab === 'ANALYTICS' ? '1px solid #FFD000' : '1px solid transparent',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <BarChart3 size={11} />
              Analytics
            </button>
          </div>

          <div>
            {sourceMode === 'ENVIO_INDEXED' ? (
              <EnvioProvenanceBadge />
            ) : (
              <span
                style={{
                  fontSize: '10.5px',
                  fontFamily: 'var(--font-mono)',
                  color: 'rgba(255,255,255,0.4)',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                }}
              >
                // LOCAL IN-MEMORY DEMO DATA (UNINDEXED)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Render Sub Tabs */}
      {subTab === 'MARKETPLACE' && <MarketplaceHistory client={client} />}
      {subTab === 'ESCROW' && <EscrowHistory client={client} />}
      {subTab === 'RECOVERY' && <RecoveryHistory client={client} />}
      {subTab === 'ANALYTICS' && <EconomicAnalyticsView client={client} />}

      {subTab === 'ALL_EVENTS' && (
        <>
          {/* Search & Filter Bar */}
          <div className="panel" style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search
                  size={13}
                  style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-muted)' }}
                />
                <input
                  type="text"
                  placeholder="Search event summary or actor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '2px',
                    padding: '7px 10px 7px 32px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11.5px',
                    outline: 'none',
                  }}
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '2px',
                  padding: '7px 12px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11.5px',
                  outline: 'none',
                }}
              >
                <option value="ALL">All Event Types</option>
                <option value="AGENT_REGISTERED">AGENT_REGISTERED</option>
                <option value="ECONOMIC_OBJECT_CREATED">ECONOMIC_OBJECT_CREATED</option>
                <option value="OBJECT_TRANSFERRED">OBJECT_TRANSFERRED</option>
                <option value="OBJECT_LISTED">OBJECT_LISTED</option>
                <option value="OBJECT_PURCHASED">OBJECT_PURCHASED</option>
                <option value="ESCROW_LOCKED">ESCROW_LOCKED</option>
                <option value="ESCROW_RELEASED">ESCROW_RELEASED</option>
                <option value="RECOVERY_EXECUTED">RECOVERY_EXECUTED</option>
                <option value="CREDITS_RESERVED">CREDITS_RESERVED</option>
                <option value="SETTLEMENT_COMPLETED">SETTLEMENT_COMPLETED</option>
                <option value="POLICY_BLOCKED">POLICY_BLOCKED</option>
              </select>
            </div>
          </div>

          {/* Events Table */}
          <div className="panel">
            {sourceMode === 'ENVIO_INDEXED' ? (
              loadingEnvio ? (
                <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>
                  Loading indexed events from Envio HyperIndex...
                </div>
              ) : filteredEnvio.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center' }}>
                  <p className="font-mono text-muted" style={{ fontSize: '12px', margin: 0 }}>
                    No indexed on-chain events found on Monad Testnet matching filters.
                  </p>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px', display: 'block' }}>
                    Connect a wallet or register an agent to generate real on-chain events.
                  </span>
                </div>
              ) : (
                <table className="econ-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Type</th>
                      <th>Actor</th>
                      <th>Payload Summary</th>
                      <th>Tx Hash</th>
                      <th>Block</th>
                      <th>Provenance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEnvio.map((e) => (
                      <tr key={e.id}>
                        <td className="font-mono text-muted" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                          {e.exactTime}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              e.type.includes('BLOCKED')
                                ? 'badge-pink'
                                : e.type.includes('SETTLEMENT') || e.type.includes('RELEASED') || e.type.includes('PURCHASED')
                                ? 'badge-mint'
                                : e.type.includes('RECOVERY')
                                ? 'badge-pink'
                                : e.type.includes('LISTED')
                                ? 'badge-purple'
                                : 'badge-muted'
                            }`}
                          >
                            {e.type}
                          </span>
                        </td>
                        <td className="font-mono text-secondary">
                          <a href={getExplorerAddressUrl(e.actor)} target="_blank" rel="noopener noreferrer" style={{ color: '#00E599' }}>
                            {e.actorShort}
                          </a>
                        </td>
                        <td className="font-mono" style={{ fontSize: '11.5px' }}>
                          {e.summary}
                        </td>
                        <td>
                          <a
                            href={e.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono"
                            style={{ color: '#836EF9', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                          >
                            {e.txHashShort}
                            <ExternalLink size={9} />
                          </a>
                        </td>
                        <td className="font-mono text-muted">#{e.blockNumber}</td>
                        <td>
                          <button
                            className="btn-econ"
                            style={{ padding: '2px 8px', fontSize: '10px' }}
                            onClick={() => setActiveModalEvent(e)}
                          >
                            Verify ↗
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              /* Local In-Memory Fallback View */
              <table className="econ-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Type</th>
                    <th>Actor</th>
                    <th>Description / Payload Summary</th>
                    <th>Inspect</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLocal.map((e) => (
                    <tr key={e.id}>
                      <td className="font-mono text-muted" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {new Date(e.timestamp).toLocaleTimeString()}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            e.type.includes('BLOCKED')
                              ? 'badge-pink'
                              : e.type.includes('SETTLEMENT') || e.type.includes('RECOVERY')
                              ? 'badge-mint'
                              : 'badge-muted'
                          }`}
                        >
                          {e.type}
                        </span>
                      </td>
                      <td className="font-mono text-secondary">{e.actor}</td>
                      <td className="font-mono" style={{ fontSize: '11.5px' }}>
                        {e.summary}
                      </td>
                      <td>
                        <button
                          className="btn-econ"
                          style={{ padding: '2px 8px', fontSize: '10px' }}
                          onClick={() => setActiveModalEvent(e)}
                        >
                          Payload
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Detail / Verification Modal */}
      {activeModalEvent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setActiveModalEvent(null)}
        >
          <div
            className="panel"
            style={{ width: '680px', maxHeight: '85vh', overflowY: 'auto', border: '1px solid rgba(131, 110, 249, 0.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={14} className="text-mint" />
                <span>On-Chain Provenance Verification — {activeModalEvent.type}</span>
              </div>
              <button className="btn-econ" onClick={() => setActiveModalEvent(null)}>
                Close
              </button>
            </div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Provenance Card */}
              <div style={{ padding: '12px', background: 'rgba(131, 110, 249, 0.08)', border: '1px solid rgba(131, 110, 249, 0.25)', borderRadius: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '10px' }}>NETWORK</span>
                    <span style={{ color: '#836EF9', fontWeight: 700 }}>Monad Testnet (10143)</span>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '10px' }}>INDEXED BY</span>
                    <span style={{ color: '#00E599', fontWeight: 700 }}>Envio HyperIndex</span>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '10px' }}>BLOCK NUMBER</span>
                    <span style={{ color: '#FFF' }}>
                      {(activeModalEvent as any).blockNumber ? `#${(activeModalEvent as any).blockNumber}` : 'Local'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '10px' }}>TRANSACTION</span>
                    {(activeModalEvent as any).txHash ? (
                      <a
                        href={getExplorerTxUrl((activeModalEvent as any).txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#836EF9', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        {formatHash((activeModalEvent as any).txHash, 8, 6)}
                        <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Unsettled</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Event Payload */}
              <div>
                <span className="font-mono text-muted" style={{ fontSize: '11px', display: 'block', marginBottom: '6px' }}>
                  Raw Event Payload:
                </span>
                <pre className="terminal-window" style={{ maxHeight: '360px', overflowX: 'auto', fontSize: '11px' }}>
                  {JSON.stringify(activeModalEvent, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Agent, EconomicObject } from '../sdk/types';
import { User, Cpu, Shield, ExternalLink, History, Eye, Database, RefreshCw, Clock } from 'lucide-react';
import { AgentEconomicHistory } from './envio/AgentEconomicHistory';
import { AgentEconomicTimeline } from './envio/AgentEconomicTimeline';
import { EconomicObjectHistory } from './envio/EconomicObjectHistory';
import { MONAD_EXPLORER_BASE, CONTRACT_ADDRESSES } from '../contracts/addresses';
import { CounterpartyIntelligenceModal } from './nansen/CounterpartyIntelligenceModal';
import { globalEnvioClient } from '../integrations/envio/client';
import { IndexedEconomicObject, EnvioDataSourceStatus } from '../integrations/envio/types';
import { formatWeiToMon } from '../integrations/envio/mappers';

interface EntitiesViewProps {
  agents: Agent[];
  objects: EconomicObject[];
}

export const EntitiesView: React.FC<EntitiesViewProps> = ({ agents, objects: localObjects }) => {
  const [activeTab, setActiveTab] = useState<'AGENTS' | 'OBJECTS'>('AGENTS');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentModalTab, setAgentModalTab] = useState<'DOSSIER' | 'TIMELINE'>('TIMELINE');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedIntelTarget, setSelectedIntelTarget] = useState<{
    address: string;
    name: string;
    role: 'SELLER' | 'BUYER' | 'AGENT' | 'RECOVERY_TARGET' | 'GENERAL';
  } | null>(null);

  // Envio objects state
  const [objectSource, setObjectSource] = useState<'ENVIO_INDEXED' | 'SIMULATION'>('ENVIO_INDEXED');
  const [envioObjects, setEnvioObjects] = useState<IndexedEconomicObject[]>([]);
  const [loadingEnvioObjects, setLoadingEnvioObjects] = useState(false);
  const [envioStatus, setEnvioStatus] = useState<EnvioDataSourceStatus>('INDEXING');

  const fetchEnvioObjects = async () => {
    setLoadingEnvioObjects(true);
    try {
      const items = await globalEnvioClient.getEconomicObjects();
      setEnvioObjects(items);
      if (items.length > 0) {
        setEnvioStatus('LIVE');
      } else {
        const isHealthy = await globalEnvioClient.checkHealth();
        setEnvioStatus(isHealthy ? 'NO_DATA' : 'NO_DATA');
      }
    } catch {
      setEnvioStatus('NO_DATA');
    } finally {
      setLoadingEnvioObjects(false);
    }
  };

  useEffect(() => {
    if (objectSource === 'ENVIO_INDEXED') {
      fetchEnvioObjects();
    }
  }, [objectSource]);

  // Real-time subscription to EconomicObject updates
  useEffect(() => {
    const unsub = globalEnvioClient.subscribeToEconomicEvents((evt) => {
      if (evt.type.includes('OBJECT') || evt.type.includes('RECOVERY') || evt.type.includes('ESCROW')) {
        if (objectSource === 'ENVIO_INDEXED') {
          fetchEnvioObjects();
        }
      }
    });
    return () => unsub();
  }, [objectSource]);

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Sub-header Tab bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn-econ ${activeTab === 'AGENTS' ? 'btn-econ-primary' : ''}`}
            onClick={() => setActiveTab('AGENTS')}
          >
            <User size={13} />
            <span>Autonomous Agents ({agents.length})</span>
          </button>
          <button
            className={`btn-econ ${activeTab === 'OBJECTS' ? 'btn-econ-primary' : ''}`}
            onClick={() => setActiveTab('OBJECTS')}
          >
            <Cpu size={13} />
            <span>Economic Objects ({objectSource === 'ENVIO_INDEXED' ? envioObjects.length : localObjects.length})</span>
          </button>
        </div>

        {activeTab === 'OBJECTS' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '2px',
              }}
            >
              <button
                className={`btn-econ ${objectSource === 'ENVIO_INDEXED' ? 'btn-econ-primary' : ''}`}
                style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setObjectSource('ENVIO_INDEXED')}
              >
                <Database size={11} />
                <span>ENVIO INDEXED</span>
                <span
                  style={{
                    fontSize: '9px',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    background:
                      envioStatus === 'LIVE'
                        ? 'rgba(34, 197, 94, 0.2)'
                        : envioStatus === 'INDEXING'
                        ? 'rgba(59, 130, 246, 0.2)'
                        : 'rgba(148, 163, 184, 0.2)',
                    color:
                      envioStatus === 'LIVE'
                        ? '#4ade80'
                        : envioStatus === 'INDEXING'
                        ? '#60a5fa'
                        : '#94a3b8',
                    fontWeight: 700,
                  }}
                >
                  {envioStatus}
                </span>
              </button>
              <button
                className={`btn-econ ${objectSource === 'SIMULATION' ? 'btn-econ-primary' : ''}`}
                style={{ fontSize: '11px', padding: '3px 8px' }}
                onClick={() => setObjectSource('SIMULATION')}
              >
                <span>SIMULATION</span>
              </button>
            </div>
            {objectSource === 'ENVIO_INDEXED' && (
              <button
                className="btn-econ"
                style={{ padding: '4px 8px', fontSize: '11px' }}
                onClick={fetchEnvioObjects}
                title="Refresh Envio Index"
              >
                <RefreshCw size={11} className={loadingEnvioObjects ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
        )}
      </div>

      {activeTab === 'AGENTS' && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <User size={14} className="text-mint" />
              <span>Economic Agent Registry</span>
            </div>
            <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
              Persistent Economic Identities with Spending Policies & Envio Audit
            </span>
          </div>
          <table className="econ-table">
            <thead>
              <tr>
                <th>Agent Identity</th>
                <th>Wallet Controller</th>
                <th>Treasury Balance</th>
                <th>Reputation</th>
                <th>Max / Tx</th>
                <th>Daily Limit</th>
                <th>Min Reserve</th>
                <th>Auto-GC</th>
                <th>Envio History</th>
                <th>On-Chain Intel</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    <div className="font-mono text-muted" style={{ fontSize: '10px' }}>{a.id}</div>
                    {a.onChainAgentId && (
                      <div className="font-mono text-mint" style={{ fontSize: '10px', marginTop: '3px' }}>
                        ERC-8004 #{a.onChainAgentId}
                      </div>
                    )}
                    {a.onChainTxHash && (
                      <a
                        className="font-mono"
                        href={`${MONAD_EXPLORER_BASE}/tx/${a.onChainTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '10px', color: 'var(--accent-blue)' }}
                      >
                        View Monad receipt ↗
                      </a>
                    )}
                  </td>
                  <td>
                    <span className="font-mono text-secondary" style={{ fontSize: '11px' }}>
                      {a.walletAddress}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontWeight: 600 }}>
                      {a.balanceMon.toFixed(2)} MON
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-mint font-mono">{a.reputationScore.toFixed(1)}%</span>
                  </td>
                  <td>
                    <span className="font-mono text-secondary">{a.policy.maxPerTransaction} MON</span>
                  </td>
                  <td>
                    <span className="font-mono text-secondary">{a.policy.dailySpendingLimit} MON</span>
                  </td>
                  <td>
                    <span className="font-mono text-secondary">{a.policy.minRetainedBalance} MON</span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        a.policy.autoRecoveryEnabled ? 'badge-mint' : 'badge-muted'
                      }`}
                    >
                      {a.policy.autoRecoveryEnabled ? 'ENABLED' : 'MANUAL'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-econ"
                      style={{ padding: '2px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}
                      onClick={() => setSelectedAgentId(a.id)}
                    >
                      <History size={10} />
                      Audit
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn-econ"
                      style={{
                        padding: '2px 8px',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        color: '#818cf8',
                        borderColor: 'rgba(99, 102, 241, 0.4)',
                        background: 'rgba(99, 102, 241, 0.08)',
                      }}
                      onClick={() =>
                        setSelectedIntelTarget({
                          address: a.controller || a.walletAddress,
                          name: a.name,
                          role: 'AGENT',
                        })
                      }
                    >
                      <Eye size={10} />
                      Nansen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'OBJECTS' && (
        <div className="panel">
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="panel-title">
              <Cpu size={14} className="text-blue" />
              <span>Stateful Programmable Economic Objects</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: objectSource === 'ENVIO_INDEXED' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                  color: objectSource === 'ENVIO_INDEXED' ? '#60a5fa' : '#facc15',
                  border: `1px solid ${objectSource === 'ENVIO_INDEXED' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                }}
              >
                {objectSource === 'ENVIO_INDEXED' ? 'ENVIO INDEXED (MONAD 10143)' : 'SIMULATION DATA'}
              </span>
            </div>
            <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
              Contract: {CONTRACT_ADDRESSES.ECONEconomicObject.slice(0, 10)}...
            </span>
          </div>

          {objectSource === 'ENVIO_INDEXED' && envioObjects.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                NO DATA INDEXED FROM MONAD
              </div>
              <p style={{ fontSize: '11px', maxWidth: '520px', margin: '0 auto 14px auto', lineHeight: '1.5' }}>
                The Envio HyperIndex indexer has not recorded any Economic Objects minted on Monad contract{' '}
                <a
                  href={`${MONAD_EXPLORER_BASE}/address/${CONTRACT_ADDRESSES.ECONEconomicObject}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#60a5fa', textDecoration: 'underline' }}
                >
                  {CONTRACT_ADDRESSES.ECONEconomicObject}
                </a>
                . No fake fallback numbers are fabricated.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10px', padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                <span className="badge badge-muted font-mono">{envioStatus}</span>
                <span>Switch to SIMULATION to inspect mock economic state.</span>
              </div>
            </div>
          ) : (
            <table className="econ-table">
              <thead>
                <tr>
                  <th>Object ID</th>
                  <th>Type</th>
                  <th>Current Owner</th>
                  <th>Quota / Denomination</th>
                  <th>Estimated Value</th>
                  <th>Time To Expiry</th>
                  <th>Transferable</th>
                  <th>Status</th>
                  <th>Provenance</th>
                </tr>
              </thead>
              <tbody>
                {(objectSource === 'ENVIO_INDEXED'
                  ? envioObjects.map((eo) => ({
                      id: eo.id,
                      metadataHash: eo.txHash || eo.id,\r\n                      type: String(eo.objectType),\r\n                      owner: eo.owner,\r\n                      quantity: 100,\r\n                      consumedQuantity: 0,\r\n                      denomination: 'UNITS',\r\n                      valueMon: formatWeiToMon(eo.value),\r\n                      expiryTimestamp: Number(eo.expiry) * 1000,\r\n                      transferable: eo.transferable,\r\n                      status: eo.status,\r\n                      txHash: eo.txHash,
                    }))
                  : localObjects
                ).map((o: any) => {
                  const now = Date.now();
                  const hoursLeft = Math.max(0, (o.expiryTimestamp - now) / 3600000);

                  let statusBadge = 'badge-muted';
                  if (o.status === 'ACTIVE') statusBadge = 'badge-mint';
                  if (o.status === 'STRANDED') statusBadge = 'badge-pink';
                  if (o.status === 'IN_ESCROW') statusBadge = 'badge-amber';
                  if (o.status === 'RECOVERED') statusBadge = 'badge-blue';

                  return (
                    <tr key={o.id}>
                      <td>
                        <div className="font-mono" style={{ fontWeight: 600 }}>{o.id}</div>
                        {o.txHash ? (
                          <a
                            href={`${MONAD_EXPLORER_BASE}/tx/${o.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-muted"
                            style={{ fontSize: '10px', color: '#60a5fa' }}
                          >
                            tx: {o.txHash.slice(0, 10)}... ↗
                          </a>
                        ) : (
                          <div className="font-mono text-muted" style={{ fontSize: '10px' }}>
                            Hash: {o.metadataHash?.substring(0, 10)}...
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-muted" style={{ fontSize: '10px' }}>
                          {o.type}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                          {o.owner}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono">
                          {o.quantity - (o.consumedQuantity || 0)} / {o.quantity} {o.denomination}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontWeight: 600 }}>
                          {Number(o.valueMon).toFixed(2)} MON
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-secondary">
                          {hoursLeft > 24
                            ? `${(hoursLeft / 24).toFixed(1)} days`
                            : `${hoursLeft.toFixed(1)} hrs`}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-muted">
                          {o.transferable ? 'YES' : 'NO'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statusBadge}`}>{o.status}</span>
                      </td>
                      <td>
                        <button
                          className="btn-econ"
                          style={{ padding: '2px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}
                          onClick={() => setSelectedObjectId(o.id)}
                        >
                          <History size={10} />
                          Audit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Agent Economic History / Timeline Modal */}
      {selectedAgentId && (
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
          onClick={() => setSelectedAgentId(null)}
        >
          <div
            className="panel"
            style={{ width: '760px', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="panel-title">Agent Envio Audit: {selectedAgentId}</span>
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: '4px' }}>
                  <button
                    className={`btn-econ ${agentModalTab === 'TIMELINE' ? 'btn-econ-primary' : ''}`}
                    style={{ fontSize: '10px', padding: '2px 8px' }}
                    onClick={() => setAgentModalTab('TIMELINE')}
                  >
                    <Clock size={10} style={{ marginRight: '3px' }} />
                    Timeline
                  </button>
                  <button
                    className={`btn-econ ${agentModalTab === 'DOSSIER' ? 'btn-econ-primary' : ''}`}
                    style={{ fontSize: '10px', padding: '2px 8px' }}
                    onClick={() => setAgentModalTab('DOSSIER')}
                  >
                    <Database size={10} style={{ marginRight: '3px' }} />
                    Dossier
                  </button>
                </div>
              </div>
              <button className="btn-econ" onClick={() => setSelectedAgentId(null)}>Close</button>
            </div>
            <div style={{ padding: '16px' }}>
              {agentModalTab === 'TIMELINE' ? (
                <AgentEconomicTimeline agentId={selectedAgentId} />
              ) : (
                <AgentEconomicHistory agentId={selectedAgentId} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Economic Object History Modal */}
      {selectedObjectId && (
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
          onClick={() => setSelectedObjectId(null)}
        >
          <div
            className="panel"
            style={{ width: '720px', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="panel-title">Object Envio Lifecycle Provenance</span>
              <button className="btn-econ" onClick={() => setSelectedObjectId(null)}>Close</button>
            </div>
            <div style={{ padding: '16px' }}>
              <EconomicObjectHistory objectId={selectedObjectId} onClose={() => setSelectedObjectId(null)} />
            </div>
          </div>
        </div>
      )}

      {selectedIntelTarget && (
        <CounterpartyIntelligenceModal
          address={selectedIntelTarget.address}
          title={selectedIntelTarget.name}
          role={selectedIntelTarget.role}
          chain="monad"
          onClose={() => setSelectedIntelTarget(null)}
        />
      )}
    </div>
  );
};

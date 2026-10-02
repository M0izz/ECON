import React, { useState, useEffect } from 'react';
import { EnvioIndexerClient, globalEnvioClient } from '../../integrations/envio/client';
import { FormattedEconomicEvent, IndexedAgent } from '../../integrations/envio/types';
import { formatHash, getExplorerTxUrl, getExplorerAddressUrl } from '../../integrations/envio/mappers';
import { EnvioProvenanceBadge } from './EnvioProvenanceBadge';
import { Shield, Clock, ExternalLink, Activity, Coins, RefreshCw } from 'lucide-react';

interface AgentEconomicHistoryProps {
  agentId: string;
  client?: EnvioIndexerClient;
}

export const AgentEconomicHistory: React.FC<AgentEconomicHistoryProps> = ({
  agentId,
  client = globalEnvioClient,
}) => {
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<IndexedAgent | null>(null);
  const [events, setEvents] = useState<FormattedEconomicEvent[]>([]);
  const [isLive, setIsLive] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await client.getAgentHistory(agentId);
      setAgent(res.agent);
      setEvents(res.events);
      setIsLive(res.isLive);
    } catch (err) {
      console.warn('Failed to load agent history from Envio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [agentId]);

  return (
    <div className="panel" style={{ padding: '16px', background: 'var(--bg-panel)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={16} className="text-mint" />
          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#FFF' }}>
            AGENT ECONOMIC HISTORY — {agentId}
          </h4>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <EnvioProvenanceBadge compact />
          <button
            onClick={fetchHistory}
            className="btn-econ"
            style={{ padding: '2px 6px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Refresh from Envio HyperIndex"
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            Sync
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          Querying Envio HyperIndex GraphQL...
        </div>
      ) : events.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
          <p className="font-mono text-muted" style={{ fontSize: '11.5px', margin: 0 }}>
            No indexed on-chain events found for agent <strong style={{ color: '#FFF' }}>{agentId}</strong>.
          </p>
          <span style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', display: 'block' }}>
            Events appear once on-chain transactions settle on Monad Testnet and are indexed by Envio.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {agent && (
            <div style={{ padding: '10px', background: 'rgba(131, 110, 249, 0.06)', border: '1px solid rgba(131, 110, 249, 0.2)', borderRadius: '6px', marginBottom: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '10px' }}>CONTROLLER</span>
                  <a href={getExplorerAddressUrl(agent.controller)} target="_blank" rel="noopener noreferrer" style={{ color: '#00E599' }}>
                    {formatHash(agent.controller)} ↗
                  </a>
                </div>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '10px' }}>REGISTERED BLOCK</span>
                  <span style={{ color: '#FFF' }}>#{agent.registeredBlock}</span>
                </div>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '10px' }}>STATUS</span>
                  <span style={{ color: agent.active ? '#00E599' : '#FF5E78', fontWeight: 700 }}>
                    {agent.active ? 'ACTIVE SOVEREIGN' : 'INACTIVE'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="econ-table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table className="econ-table" style={{ fontSize: '11px' }}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Summary</th>
                  <th>Tx Hash</th>
                  <th>Block</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td className="font-mono text-muted" style={{ whiteSpace: 'nowrap' }}>
                      {e.exactTime}
                    </td>
                    <td>
                      <span className="badge badge-mint font-mono" style={{ fontSize: '9.5px' }}>
                        {e.type}
                      </span>
                    </td>
                    <td className="font-mono">{e.summary}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { EnvioIndexerClient, globalEnvioClient } from '../../integrations/envio/client';
import { IndexedRecoveryRecord, FormattedEconomicEvent } from '../../integrations/envio/types';
import { formatHash, formatWeiToMon, getExplorerTxUrl } from '../../integrations/envio/mappers';
import { EnvioProvenanceBadge } from './EnvioProvenanceBadge';
import { Recycle, ExternalLink, RefreshCw, TrendingUp } from 'lucide-react';

interface RecoveryHistoryProps {
  client?: EnvioIndexerClient;
}

export const RecoveryHistory: React.FC<RecoveryHistoryProps> = ({
  client = globalEnvioClient,
}) => {
  const [loading, setLoading] = useState(true);
  const [recoveries, setRecoveries] = useState<IndexedRecoveryRecord[]>([]);
  const [events, setEvents] = useState<FormattedEconomicEvent[]>([]);
  const [totalRecoveredMon, setTotalRecoveredMon] = useState(0);

  const fetchRecoveryHistory = async () => {
    setLoading(true);
    try {
      const res = await client.getRecoveryHistory(20);
      setRecoveries(res.recoveries);
      setEvents(res.events);
      setTotalRecoveredMon(res.totalRecoveredMon);
    } catch (err) {
      console.warn('Failed to load recovery history from Envio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecoveryHistory();
  }, []);

  return (
    <div className="panel" style={{ padding: '16px', background: 'var(--bg-panel)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Recycle size={16} className="text-accent-pink" />
          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#FFF' }}>
            ECONOMIC GARBAGE COLLECTOR RECOVERY CHRONICLE
          </h4>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <EnvioProvenanceBadge compact />
          <button
            onClick={fetchRecoveryHistory}
            className="btn-econ"
            style={{ padding: '2px 6px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            Sync
          </button>
        </div>
      </div>

      <div style={{ padding: '12px 16px', background: 'rgba(255, 94, 120, 0.05)', border: '1px solid rgba(255, 94, 120, 0.2)', borderRadius: '6px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              VERIFIED ON-CHAIN RECOVERED VALUE
            </span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#FF5E78', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              +{totalRecoveredMon.toFixed(3)} MON
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', maxWidth: '320px', textAlign: 'right' }}>
            Auditable on-chain proof of stranded assets and unallocated credit pool capacity reclaimed by ECON GC.
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          Querying Envio HyperIndex for recovery logs...
        </div>
      ) : recoveries.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: '4px' }}>
          <p className="font-mono text-muted" style={{ fontSize: '11px', margin: 0 }}>
            No recovery transactions recorded yet on Monad Testnet.
          </p>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', display: 'block' }}>
            When the GC executes an on-chain reclamation or credit recycling transaction, Envio captures and indexes the event.
          </span>
        </div>
      ) : (
        <div className="econ-table-container">
          <table className="econ-table" style={{ fontSize: '11px' }}>
            <thead>
              <tr>
                <th>Object / Reservation</th>
                <th>Agent</th>
                <th>Type</th>
                <th>Recovered MON</th>
                <th>Block</th>
                <th>Transaction</th>
              </tr>
            </thead>
            <tbody>
              {recoveries.map((rec) => (
                <tr key={rec.id}>
                  <td className="font-mono text-mint">{formatHash(rec.objectId, 8, 6)}</td>
                  <td className="font-mono text-secondary">{formatHash(rec.agent)}</td>
                  <td>
                    <span className="badge badge-pink font-mono" style={{ fontSize: '9px' }}>
                      {rec.recoveryType}
                    </span>
                  </td>
                  <td className="font-mono" style={{ color: '#00E599', fontWeight: 700 }}>
                    +{formatWeiToMon(rec.recoveredValue).toFixed(3)} MON
                  </td>
                  <td className="font-mono text-muted">#{rec.blockNumber}</td>
                  <td>
                    <a
                      href={getExplorerTxUrl(rec.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono"
                      style={{ color: '#836EF9', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      {formatHash(rec.txHash, 8, 6)}
                      <ExternalLink size={9} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

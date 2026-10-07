import React, { useState, useEffect } from 'react';
import { EnvioIndexerClient, globalEnvioClient } from '../../integrations/envio/client';
import { IndexedEscrowRecord, FormattedEconomicEvent } from '../../integrations/envio/types';
import { formatHash, formatWeiToMon, getExplorerTxUrl, getExplorerAddressUrl } from '../../integrations/envio/mappers';
import { EnvioProvenanceBadge } from './EnvioProvenanceBadge';
import { Lock, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react';

interface EscrowHistoryProps {
  client?: EnvioIndexerClient;
}

export const EscrowHistory: React.FC<EscrowHistoryProps> = ({
  client = globalEnvioClient,
}) => {
  const [loading, setLoading] = useState(true);
  const [escrows, setEscrows] = useState<IndexedEscrowRecord[]>([]);
  const [events, setEvents] = useState<FormattedEconomicEvent[]>([]);
  const [totalLockedMon, setTotalLockedMon] = useState(0);
  const [totalSettledMon, setTotalSettledMon] = useState(0);

  const fetchEscrowHistory = async () => {
    setLoading(true);
    try {
      const res = await client.getEscrowActivity(25);
      setEscrows(res.escrows);
      setEvents(res.events);
      setTotalLockedMon(res.totalLockedMon);
      setTotalSettledMon(res.totalSettledMon);
    } catch (err) {
      console.warn('Failed to load escrow history from Envio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscrowHistory();
  }, []);

  return (
    <div className="panel" style={{ padding: '16px', background: 'var(--bg-panel)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={16} className="text-mint" />
          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#FFF' }}>
            ESCROW SETTLEMENT TIMELINE
          </h4>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <EnvioProvenanceBadge compact />
          <button
            onClick={fetchEscrowHistory}
            className="btn-econ"
            style={{ padding: '2px 6px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            Sync
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div style={{ padding: '10px 14px', background: 'rgba(0, 229, 153, 0.05)', border: '1px solid rgba(0, 229, 153, 0.15)', borderRadius: '6px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            HISTORICAL SETTLED ESCROWS
          </span>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#00E599', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            {totalSettledMon.toFixed(3)} MON
          </div>
        </div>
        <div style={{ padding: '10px 14px', background: 'rgba(131, 110, 249, 0.05)', border: '1px solid rgba(131, 110, 249, 0.2)', borderRadius: '6px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            CURRENTLY LOCKED / DELIVERED
          </span>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#836EF9', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            {totalLockedMon.toFixed(3)} MON
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          Querying Envio HyperIndex for escrow records...
        </div>
      ) : escrows.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: '4px' }}>
          <p className="font-mono text-muted" style={{ fontSize: '11px', margin: 0 }}>
            No escrow contracts indexed yet on Monad Testnet.
          </p>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', display: 'block' }}>
            Conditional escrows locked with ECONEscrow appear here in real time.
          </span>
        </div>
      ) : (
        <div className="econ-table-container">
          <table className="econ-table" style={{ fontSize: '11px' }}>
            <thead>
              <tr>
                <th>Escrow ID</th>
                <th>Status</th>
                <th>Buyer</th>
                <th>Seller</th>
                <th>Amount</th>
                <th>Block</th>
                <th>Transaction</th>
              </tr>
            </thead>
            <tbody>
              {escrows.map((esc) => (
                <tr key={esc.id}>
                  <td className="font-mono text-mint">{formatHash(esc.id, 8, 6)}</td>
                  <td>
                    <span
                      className={`badge ${
                        esc.status === 'RELEASED'
                          ? 'badge-mint'
                          : esc.status === 'LOCKED'
                          ? 'badge-purple'
                          : esc.status === 'REFUNDED'
                          ? 'badge-pink'
                          : 'badge-muted'
                      }`}
                      style={{ fontSize: '9px' }}
                    >
                      {esc.status}
                    </span>
                  </td>
                  <td className="font-mono">
                    <a href={getExplorerAddressUrl(esc.buyer)} target="_blank" rel="noopener noreferrer" style={{ color: '#FFF' }}>
                      {formatHash(esc.buyer)}
                    </a>
                  </td>
                  <td className="font-mono">
                    <a href={getExplorerAddressUrl(esc.seller)} target="_blank" rel="noopener noreferrer" style={{ color: '#00E599' }}>
                      {formatHash(esc.seller)}
                    </a>
                  </td>
                  <td className="font-mono" style={{ color: '#00E599', fontWeight: 700 }}>
                    {formatWeiToMon(esc.amount || '0').toFixed(2)} MON
                  </td>
                  <td className="font-mono text-muted">#{esc.blockNumber}</td>
                  <td>
                    <a
                      href={getExplorerTxUrl(esc.txHash || '')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono"
                      style={{ color: '#836EF9', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      {formatHash(esc.txHash || '', 8, 6)}
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

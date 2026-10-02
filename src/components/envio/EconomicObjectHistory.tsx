import React, { useState, useEffect } from 'react';
import { EnvioIndexerClient, globalEnvioClient } from '../../integrations/envio/client';
import {
  FormattedEconomicEvent,
  IndexedEconomicObject,
  IndexedMarketplaceListing,
  IndexedEscrowRecord,
  IndexedRecoveryRecord,
} from '../../integrations/envio/types';
import { formatHash, formatWeiToMon, getExplorerTxUrl, getExplorerAddressUrl } from '../../integrations/envio/mappers';
import { EnvioProvenanceBadge } from './EnvioProvenanceBadge';
import { Box, ExternalLink, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface EconomicObjectHistoryProps {
  objectId: string;
  client?: EnvioIndexerClient;
  onClose?: () => void;
}

export const EconomicObjectHistory: React.FC<EconomicObjectHistoryProps> = ({
  objectId,
  client = globalEnvioClient,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [object, setObject] = useState<IndexedEconomicObject | null>(null);
  const [events, setEvents] = useState<FormattedEconomicEvent[]>([]);
  const [listings, setListings] = useState<IndexedMarketplaceListing[]>([]);
  const [escrows, setEscrows] = useState<IndexedEscrowRecord[]>([]);
  const [recoveries, setRecoveries] = useState<IndexedRecoveryRecord[]>([]);

  const fetchObjectHistory = async () => {
    setLoading(true);
    try {
      const res = await client.getEconomicObjectHistory(objectId);
      setObject(res.object);
      setEvents(res.events);
      setListings(res.listings);
      setEscrows(res.escrows);
      setRecoveries(res.recoveries);
    } catch (err) {
      console.warn('Failed to load object history from Envio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObjectHistory();
  }, [objectId]);

  return (
    <div className="panel" style={{ padding: '18px', background: 'var(--bg-panel)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Box size={16} className="text-mint" />
          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#FFF' }}>
            ECONOMIC OBJECT LIFECYCLE — {formatHash(objectId, 10, 8)}
          </h4>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <EnvioProvenanceBadge compact />
          <button
            onClick={fetchObjectHistory}
            className="btn-econ"
            style={{ padding: '2px 6px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            Sync
          </button>
          {onClose && (
            <button onClick={onClose} className="btn-econ" style={{ padding: '2px 8px', fontSize: '10px' }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          Querying Envio HyperIndex for object lifecycle...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Object Header Attributes */}
          <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '10px' }}>CURRENT OWNER</span>
                <a
                  href={getExplorerAddressUrl(object?.owner || '')}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#00E599', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                >
                  {object?.owner ? formatHash(object.owner) : 'Unassigned'} ↗
                </a>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '10px' }}>ECONOMIC VALUE</span>
                <span style={{ color: '#FFF', fontWeight: 700 }}>
                  {object ? `${formatWeiToMon(object.value).toFixed(2)} MON` : '—'}
                </span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '10px' }}>LIFECYCLE STATUS</span>
                <span
                  className={`badge ${
                    object?.status === 'RECOVERED'
                      ? 'badge-mint'
                      : object?.status === 'STRANDED'
                      ? 'badge-pink'
                      : 'badge-muted'
                  }`}
                  style={{ fontSize: '9px' }}
                >
                  {object?.status || 'ACTIVE'}
                </span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '10px' }}>ORIGIN BLOCK</span>
                <span style={{ color: '#FFF' }}>#{object?.blockNumber || '—'}</span>
              </div>
            </div>
          </div>

          {/* Timeline of events from Envio */}
          <div>
            <h5 style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.7)', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Chronological Audit Trail ({events.length} Events)
            </h5>
            {events.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: '4px' }}>
                <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
                  No indexed on-chain events for this object yet.
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {events.map((e, idx) => (
                  <div
                    key={e.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'rgba(255,255,255,0.02)',
                      borderLeft: '2px solid #836EF9',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>{e.exactTime}</span>
                      <span className="badge badge-mint" style={{ fontSize: '9px' }}>{e.type}</span>
                      <span style={{ color: '#FFF' }}>{e.summary}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>#{e.blockNumber}</span>
                      <a href={e.explorerUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#836EF9' }}>
                        {e.txHashShort} ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

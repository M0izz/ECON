import React, { useState, useEffect } from 'react';
import { EnvioIndexerClient, globalEnvioClient } from '../../integrations/envio/client';
import { IndexedMarketplaceListing, FormattedEconomicEvent } from '../../integrations/envio/types';
import { formatHash, formatWeiToMon, getExplorerTxUrl, getExplorerAddressUrl } from '../../integrations/envio/mappers';
import { EnvioProvenanceBadge } from './EnvioProvenanceBadge';
import { ShoppingCart, ExternalLink, RefreshCw, DollarSign } from 'lucide-react';

interface MarketplaceHistoryProps {
  client?: EnvioIndexerClient;
}

export const MarketplaceHistory: React.FC<MarketplaceHistoryProps> = ({
  client = globalEnvioClient,
}) => {
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<IndexedMarketplaceListing[]>([]);
  const [events, setEvents] = useState<FormattedEconomicEvent[]>([]);
  const [totalVolumeMon, setTotalVolumeMon] = useState(0);
  const [totalFeesMon, setTotalFeesMon] = useState(0);

  const fetchMarketHistory = async () => {
    setLoading(true);
    try {
      const res = await client.getMarketplaceActivity(20);
      setListings(res.listings);
      setEvents(res.events);
      setTotalVolumeMon(res.totalVolumeMon);
      setTotalFeesMon(res.totalFeesMon);
    } catch (err) {
      console.warn('Failed to load marketplace history from Envio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketHistory();
  }, []);

  return (
    <div className="panel" style={{ padding: '16px', background: 'var(--bg-panel)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingCart size={16} className="text-mint" />
          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#FFF' }}>
            SECONDARY MARKETPLACE ACTIVITY
          </h4>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <EnvioProvenanceBadge compact />
          <button
            onClick={fetchMarketHistory}
            className="btn-econ"
            style={{ padding: '2px 6px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            Sync
          </button>
        </div>
      </div>

      {/* Aggregate Volume & Protocol Fee Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div style={{ padding: '10px 14px', background: 'rgba(0, 229, 153, 0.05)', border: '1px solid rgba(0, 229, 153, 0.15)', borderRadius: '6px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            INDEXED MARKETPLACE VOLUME
          </span>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#00E599', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            {totalVolumeMon.toFixed(3)} MON
          </div>
        </div>
        <div style={{ padding: '10px 14px', background: 'rgba(131, 110, 249, 0.05)', border: '1px solid rgba(131, 110, 249, 0.2)', borderRadius: '6px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            PROTOCOL 1.0% FEES ACCRUED
          </span>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#836EF9', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            {totalFeesMon.toFixed(4)} MON
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          Querying Envio HyperIndex for marketplace activity...
        </div>
      ) : events.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: '4px' }}>
          <p className="font-mono text-muted" style={{ fontSize: '11px', margin: 0 }}>
            No marketplace activity indexed yet on Monad Testnet.
          </p>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', display: 'block' }}>
            Items listed or purchased via ECONMarketplace contract appear here in real time.
          </span>
        </div>
      ) : (
        <div className="econ-table-container">
          <table className="econ-table" style={{ fontSize: '11px' }}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Actor / Counterparty</th>
                <th>Amount</th>
                <th>Transaction</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td className="font-mono text-muted">{e.exactTime}</td>
                  <td>
                    <span
                      className={`badge ${
                        e.type === 'OBJECT_PURCHASED'
                          ? 'badge-mint'
                          : e.type === 'OBJECT_LISTED'
                          ? 'badge-purple'
                          : 'badge-muted'
                      }`}
                      style={{ fontSize: '9px' }}
                    >
                      {e.type}
                    </span>
                  </td>
                  <td className="font-mono">
                    <a href={getExplorerAddressUrl(e.actor)} target="_blank" rel="noopener noreferrer" style={{ color: '#FFF' }}>
                      {e.actorShort}
                    </a>
                    {e.counterparty && (
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {' → '}
                        <a href={getExplorerAddressUrl(e.counterparty)} target="_blank" rel="noopener noreferrer" style={{ color: '#00E599' }}>
                          {e.counterpartyShort}
                        </a>
                      </span>
                    )}
                  </td>
                  <td className="font-mono" style={{ color: '#00E599', fontWeight: 700 }}>
                    {e.amountMon > 0 ? `${e.amountMon.toFixed(3)} MON` : '—'}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

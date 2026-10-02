import React, { useState, useEffect } from 'react';
import { EnvioIndexerClient, globalEnvioClient } from '../../integrations/envio/client';
import { IndexedDailyMetric, FormattedEconomicEvent } from '../../integrations/envio/types';
import { formatWeiToMon } from '../../integrations/envio/mappers';
import { EnvioProvenanceBadge } from './EnvioProvenanceBadge';
import { BarChart3, TrendingUp, Users, Box, ShoppingCart, Lock, Recycle, RefreshCw } from 'lucide-react';

interface EconomicAnalyticsViewProps {
  client?: EnvioIndexerClient;
}

export const EconomicAnalyticsView: React.FC<EconomicAnalyticsViewProps> = ({
  client = globalEnvioClient,
}) => {
  const [timeRange, setTimeRange] = useState<'24H' | '7D' | '30D'>('7D');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<IndexedDailyMetric[]>([]);
  const [events, setEvents] = useState<FormattedEconomicEvent[]>([]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [metricsRes, eventsRes] = await Promise.all([
        client.getDailyEconomicMetrics(30),
        client.getRecentEconomicEvents({ limit: 100 }),
      ]);
      setMetrics(metricsRes.metrics);
      setEvents(eventsRes.events);
    } catch (err) {
      console.warn('Failed to load analytics from Envio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Compute metrics from real indexed events
  const totalEvents = events.length;
  let totalVolumeMon = 0;
  let marketplaceVolumeMon = 0;
  let escrowVolumeMon = 0;
  let recoveredVolumeMon = 0;
  let objectsCreated = 0;
  const activeActors = new Set<string>();

  const cutoffMs =
    timeRange === '24H'
      ? Date.now() - 24 * 3600 * 1000
      : timeRange === '7D'
      ? Date.now() - 7 * 24 * 3600 * 1000
      : Date.now() - 30 * 24 * 3600 * 1000;

  for (const e of events) {
    if (e.timestamp >= cutoffMs) {
      activeActors.add(e.actor);
      if (e.type === 'OBJECT_PURCHASED') {
        marketplaceVolumeMon += e.amountMon;
        totalVolumeMon += e.amountMon;
      } else if (e.type === 'ESCROW_LOCKED' || e.type === 'ESCROW_RELEASED') {
        escrowVolumeMon += e.amountMon;
        totalVolumeMon += e.amountMon;
      } else if (e.type === 'RECOVERY_EXECUTED') {
        recoveredVolumeMon += e.amountMon;
      } else if (e.type === 'ECONOMIC_OBJECT_CREATED') {
        objectsCreated++;
      }
    }
  }

  return (
    <div className="panel" style={{ padding: '18px', background: 'var(--bg-panel)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={16} className="text-mint" />
          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#FFF' }}>
            ON-CHAIN ECONOMIC ACTIVITY ANALYTICS
          </h4>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Time range selector */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', padding: '2px', border: '1px solid var(--border-color)' }}>
            {(['24H', '7D', '30D'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                style={{
                  background: timeRange === r ? '#00E599' : 'transparent',
                  color: timeRange === r ? '#000' : 'rgba(255,255,255,0.6)',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '3px 8px',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {r}
              </button>
            ))}
          </div>

          <EnvioProvenanceBadge compact />
          <button
            onClick={fetchAnalytics}
            className="btn-econ"
            style={{ padding: '2px 6px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            Sync
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          Aggregating on-chain analytics from Envio HyperIndex...
        </div>
      ) : events.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
          <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
            No indexed on-chain events found for time window {timeRange}.
          </span>
          <p style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', margin: 0 }}>
            Metrics are computed strictly from real Monad Testnet blocks indexed by Envio HyperIndex without simulation.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Key Metric Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', display: 'block' }}>
                INDEXED TRANSACTIONS
              </span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFF', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                {totalEvents}
              </div>
            </div>

            <div style={{ padding: '12px', background: 'rgba(131, 110, 249, 0.05)', border: '1px solid rgba(131, 110, 249, 0.2)', borderRadius: '6px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', display: 'block' }}>
                MARKETPLACE VOLUME
              </span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#836EF9', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                {marketplaceVolumeMon.toFixed(2)} MON
              </div>
            </div>

            <div style={{ padding: '12px', background: 'rgba(0, 229, 153, 0.05)', border: '1px solid rgba(0, 229, 153, 0.2)', borderRadius: '6px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', display: 'block' }}>
                ESCROW SETTLEMENTS
              </span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#00E599', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                {escrowVolumeMon.toFixed(2)} MON
              </div>
            </div>

            <div style={{ padding: '12px', background: 'rgba(255, 94, 120, 0.05)', border: '1px solid rgba(255, 94, 120, 0.2)', borderRadius: '6px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', display: 'block' }}>
                RECOVERED STRANDED VALUE
              </span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#FF5E78', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                +{recoveredVolumeMon.toFixed(2)} MON
              </div>
            </div>

            <div style={{ padding: '12px', background: 'rgba(255, 208, 0, 0.05)', border: '1px solid rgba(255, 208, 0, 0.2)', borderRadius: '6px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', display: 'block' }}>
                ACTIVE ENTITIES
              </span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFD000', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                {activeActors.size}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

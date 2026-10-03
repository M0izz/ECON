import React, { useState, useEffect } from 'react';
import { EnvioIndexerClient, globalEnvioClient } from '../../integrations/envio/client';
import { FormattedEconomicEvent, EnvioDataSourceStatus } from '../../integrations/envio/types';
import { getExplorerTxUrl, formatHash } from '../../integrations/envio/mappers';
import { EnvioProvenanceBadge } from './EnvioProvenanceBadge';
import {
  Clock,
  ExternalLink,
  RefreshCw,
  Filter,
  CheckCircle2,
  Lock,
  Layers,
  Recycle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface AgentEconomicTimelineProps {
  agentId: string;
  client?: EnvioIndexerClient;
}

export const AgentEconomicTimeline: React.FC<AgentEconomicTimelineProps> = ({
  agentId,
  client = globalEnvioClient,
}) => {
  const [events, setEvents] = useState<FormattedEconomicEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<EnvioDataSourceStatus>('INDEXING');
  const [filterType, setFilterType] = useState<string>('ALL');

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const res = await client.getTransactions(agentId, 100);
      if (res && res.length > 0) {
        // Sort chronologically ascending for timeline progression
        const sorted = [...res].sort((a, b) => a.timestamp - b.timestamp);
        setEvents(sorted);
        setDataSource(res[0]?.isEnvioIndexed ? 'LIVE' : 'SIMULATION');
      } else {
        setEvents([]);
        setDataSource('NO_DATA');
      }
    } catch (err) {
      console.warn('[Envio Timeline] Failed to query agent transactions:', err);
      setDataSource('NO_DATA');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();

    // Section 6: Real-time subscription to incoming events
    const unsubscribe = client.subscribeToEconomicEvents((newEvent) => {
      if (
        newEvent.actor?.toLowerCase() === agentId.toLowerCase() ||
        newEvent.counterparty?.toLowerCase() === agentId.toLowerCase()
      ) {
        setEvents((prev) => {
          if (prev.some((e) => e.id === newEvent.id)) return prev;
          return [...prev, newEvent].sort((a, b) => a.timestamp - b.timestamp);
        });
        setDataSource(newEvent.isEnvioIndexed ? 'LIVE' : 'SIMULATION');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [agentId]);

  const filteredEvents = events.filter((e) => {
    if (filterType === 'ALL') return true;
    return e.type === filterType;
  });

  const getStatusBadge = () => {
    switch (dataSource) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE (ENVIO HYPERINDEX)
          </span>
        );
      case 'INDEXING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-spin" />
            INDEXING
          </span>
        );
      case 'SIMULATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            SIMULATION
          </span>
        );
      case 'NO_DATA':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            NO DATA
          </span>
        );
    }
  };

  const getEventBadgeColor = (type: string) => {
    if (type.includes('REGISTERED')) return 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60';
    if (type.includes('OBJECT')) return 'text-blue-400 bg-blue-950/60 border-blue-800/60';
    if (type.includes('ESCROW')) return 'text-amber-400 bg-amber-950/60 border-amber-800/60';
    if (type.includes('RECOVERY')) return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60';
    if (type.includes('MARKET')) return 'text-indigo-400 bg-indigo-950/60 border-indigo-800/60';
    return 'text-slate-300 bg-slate-900 border-slate-800';
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                AGENT ECONOMIC TIMELINE
              </h3>
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                {agentId.slice(0, 16)}...
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Chronological economic event graph indexed by Envio from Monad Testnet
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <button
            onClick={fetchTimeline}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh Timeline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 my-3 text-xs overflow-x-auto pb-1">
        <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
          <Filter className="w-3 h-3" /> Filter:
        </span>
        {['ALL', 'AGENT_REGISTERED', 'ECONOMIC_OBJECT_CREATED', 'ESCROW_LOCKED', 'ESCROW_RELEASED', 'RECOVERY_EXECUTED'].map(
          (t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                filterType === t
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {t.replace(/_/g, ' ')}
            </button>
          )
        )}
      </div>

      {/* Chronological Timeline Stream */}
      {filteredEvents.length === 0 ? (
        <div className="py-12 text-center text-slate-500 font-mono text-xs bg-slate-950/40 rounded-lg border border-slate-800/60 my-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-cyan-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading Envio economic timeline...
            </div>
          ) : (
            <div>
              <p className="text-slate-400 font-semibold mb-1">NO INDEXED ECONOMIC EVENTS FOR THIS ENTITY</p>
              <p className="text-slate-600 text-[11px]">
                Events will appear here in real-time as transactions settle on Monad Testnet (Chain ID 10143).
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="relative pl-6 my-4 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {filteredEvents.map((event, idx) => {
            const timeStr = new Date(event.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });
            const explorerUrl = getExplorerTxUrl(event.txHash);

            return (
              <div key={event.id || idx} className="relative group">
                {/* Node dot on vertical line */}
                <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-slate-950 border-2 border-blue-500 group-hover:scale-125 transition-transform" />

                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 hover:border-slate-700 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold">{timeStr}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getEventBadgeColor(event.type)}`}>
                        {event.type.replace(/_/g, ' ')}
                      </span>
                      {event.amountMon > 0 && (
                        <span className="text-emerald-400 font-semibold">
                          +{event.amountMon.toFixed(2)} MON
                        </span>
                      )}
                    </div>

                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-slate-400 hover:text-blue-400 flex items-center gap-1 transition-colors"
                      title={event.txHash}
                    >
                      <span>Tx: {formatHash(event.txHash, 6, 4)}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    {event.summary}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-2 pt-1.5 border-t border-slate-900">
                    <span>Block: #{event.blockNumber}</span>
                    <span className="text-slate-400">Actor: {event.actorShort}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Provenance Note */}
      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>Source: Envio HyperIndex GraphQL (Monad Testnet 10143)</span>
        </div>
        <EnvioProvenanceBadge />
      </div>
    </div>
  );
};

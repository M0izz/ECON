import React, { useState } from 'react';
import { Agent, ServiceOffering } from '../sdk/types';
import { Compass, Search, Filter, CheckCircle2, Zap, ShoppingCart, Eye } from 'lucide-react';
import { MarketplaceHistory } from './envio/MarketplaceHistory';
import { CounterpartyIntelligenceModal } from './nansen/CounterpartyIntelligenceModal';

interface DiscoveryViewProps {
  services: ServiceOffering[];
  agents?: Agent[];
  onInitiateService?: (service: ServiceOffering) => void;
}

export const DiscoveryView: React.FC<DiscoveryViewProps> = ({ services, agents }) => {
  const [activeTab, setActiveTab] = useState<'SERVICES' | 'INDEXED_MARKET'>('SERVICES');
  const [searchTerm, setSearchTerm] = useState('');
  const [capabilityFilter, setCapabilityFilter] = useState('ALL');
  const [selectedIntelTarget, setSelectedIntelTarget] = useState<{
    address: string;
    name: string;
    role: 'SELLER' | 'BUYER' | 'AGENT' | 'RECOVERY_TARGET' | 'GENERAL';
  } | null>(null);

  const getProviderAddress = (providerId: string): string => {
    const agent = agents?.find((a) => a.id === providerId);
    if (agent && agent.controller) return agent.controller;
    if (providerId === 'GeoVision-Provider') return '0x991286A645c110E663B514571A15C198547A9';
    if (providerId === 'ComputeAgent-3') return '0x333286A645c110E663B514571A15C198547A3';
    if (providerId === 'MarketAgent-5') return '0x555286A645c110E663B514571A15C198547A5';
    if (providerId === 'ResearchAgent-42') return '0x1842B6792A645c110E663B514571A15C198547A1';
    if (providerId === 'DataAgent-7') return '0x777286A645c110E663B514571A15C198547A7';
    return '0x0000000000000000000000000000000000000000';
  };

  const filtered = services.filter((s) => {
    const matchesSearch =
      s.providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.capability.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCap =
      capabilityFilter === 'ALL' || s.capability === capabilityFilter;

    return matchesSearch && matchesCap;
  });

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className={`btn-econ ${activeTab === 'SERVICES' ? 'btn-econ-primary' : ''}`}
          onClick={() => setActiveTab('SERVICES')}
        >
          <Compass size={13} />
          <span>Services Registry ({services.length})</span>
        </button>
        <button
          className={`btn-econ ${activeTab === 'INDEXED_MARKET' ? 'btn-econ-primary' : ''}`}
          onClick={() => setActiveTab('INDEXED_MARKET')}
        >
          <ShoppingCart size={13} />
          <span>Indexed Marketplace Activity (Envio)</span>
        </button>
      </div>

      {activeTab === 'INDEXED_MARKET' ? (
        <MarketplaceHistory />
      ) : (
        <>
          {/* Header and Filter Controls */}
          <div className="panel" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div className="panel-title">
                <Compass size={14} className="text-mint" />
                <span>ECON Discovery Network Registry</span>
              </div>
              <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
                Machine-queryable service discovery for autonomous agents
              </span>
            </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={13}
              style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Query network services (e.g. satellite imagery, H100 GPU cluster)..."
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
            value={capabilityFilter}
            onChange={(e) => setCapabilityFilter(e.target.value)}
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
            <option value="ALL">All Capabilities</option>
            <option value="satellite-imagery">Satellite Imagery</option>
            <option value="gpu-cluster">GPU Cluster</option>
          </select>
        </div>
      </div>

      {/* Provider Offerings Table */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <span>Verified Network Providers ({filtered.length})</span>
          </div>
          <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
            Sorted by Multi-Attribute Utility (Reputation, Price, Latency)
          </span>
        </div>

        <table className="econ-table">
          <thead>
            <tr>
              <th>Provider & Service</th>
              <th>Capability</th>
              <th>Settlement Price</th>
              <th>Latency / SLA</th>
              <th>Reputation Score</th>
              <th>Counterparty Intelligence</th>
              <th>Availability</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const providerAddr = getProviderAddress(s.providerId);
              return (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.providerName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {s.description}
                    </div>
                    <div className="font-mono text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>
                      ID: {s.id} • Provider: {s.providerId}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-muted font-mono">{s.capability}</span>
                  </td>
                  <td>
                    <span className="font-mono text-mint" style={{ fontWeight: 600, fontSize: '13px' }}>
                      {s.priceMon} MON
                    </span>
                    <div className="font-mono text-muted" style={{ fontSize: '10px' }}>
                      {s.unit}
                    </div>
                  </td>
                  <td>
                    <div className="font-mono text-secondary" style={{ fontSize: '11px' }}>
                      {s.latencyMs} ms
                    </div>
                    <div className="font-mono text-muted" style={{ fontSize: '10px' }}>
                      {s.minSLA}% SLA min
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-mint font-mono">{s.reputation}%</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                      <button
                        className="btn-econ"
                        style={{
                          padding: '3px 8px',
                          fontSize: '10.5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          borderColor: 'rgba(99, 102, 241, 0.45)',
                          color: '#818cf8',
                          background: 'rgba(99, 102, 241, 0.08)',
                        }}
                        onClick={() =>
                          setSelectedIntelTarget({
                            address: providerAddr,
                            name: s.providerName,
                            role: 'SELLER',
                          })
                        }
                      >
                        <Eye size={11} />
                        <span>View Intelligence</span>
                      </button>
                      <span className="font-mono text-muted" style={{ fontSize: '9px' }}>
                        Nansen Monad Profiler
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-mint font-mono">
                      <CheckCircle2 size={10} style={{ marginRight: '3px' }} />
                      ONLINE
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
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

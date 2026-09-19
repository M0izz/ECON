import React, { useState } from 'react';
import { ServiceOffering } from '../sdk/types';
import { Compass, Search, Filter, CheckCircle2, Zap } from 'lucide-react';

interface DiscoveryViewProps {
  services: ServiceOffering[];
  onInitiateService?: (service: ServiceOffering) => void;
}

export const DiscoveryView: React.FC<DiscoveryViewProps> = ({ services }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [capabilityFilter, setCapabilityFilter] = useState('ALL');

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
              <th>Availability</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
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
                  <span className="badge badge-mint font-mono">
                    <CheckCircle2 size={10} style={{ marginRight: '3px' }} />
                    ONLINE
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

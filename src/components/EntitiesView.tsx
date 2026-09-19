import React, { useState } from 'react';
import { Agent, EconomicObject } from '../sdk/types';
import { User, Cpu, Shield, ExternalLink } from 'lucide-react';

interface EntitiesViewProps {
  agents: Agent[];
  objects: EconomicObject[];
}

export const EntitiesView: React.FC<EntitiesViewProps> = ({ agents, objects }) => {
  const [activeTab, setActiveTab] = useState<'AGENTS' | 'OBJECTS'>('AGENTS');

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
            <span>Economic Objects ({objects.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'AGENTS' && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <User size={14} className="text-mint" />
              <span>Economic Agent Registry</span>
            </div>
            <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
              Persistent Economic Identities with Spending Policies
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
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    <div className="font-mono text-muted" style={{ fontSize: '10px' }}>{a.id}</div>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'OBJECTS' && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Cpu size={14} className="text-blue" />
              <span>Stateful Programmable Economic Objects</span>
            </div>
            <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
              Assets, Compute Reservations, Licenses & Claims
            </span>
          </div>
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
              </tr>
            </thead>
            <tbody>
              {objects.map((o) => {
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
                      <div className="font-mono text-muted" style={{ fontSize: '10px' }}>
                        Hash: {o.metadataHash.substring(0, 10)}...
                      </div>
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
                        {o.quantity - o.consumedQuantity} / {o.quantity} {o.denomination}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontWeight: 600 }}>
                        {o.valueMon.toFixed(2)} MON
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

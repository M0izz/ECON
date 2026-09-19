import React from 'react';
import { ECONEvent, Agent, EconomicObject } from '../sdk/types';
import { DerivedState } from '../sdk/store';
import { DollarSign, ShieldAlert, ArrowUpRight, Cpu, Activity, Clock } from 'lucide-react';

interface CommandCenterProps {
  derived: DerivedState;
  events: ECONEvent[];
  agents: Agent[];
  objects: EconomicObject[];
  onSelectAgent?: (id: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  derived,
  events,
  agents,
  objects,
  onNavigateTab,
}) => {
  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Statistical Summary Row */}
      <div className="grid-4">
        <div className="panel" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="text-muted font-mono" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
              Network Treasury
            </span>
            <DollarSign size={14} className="text-mint" />
          </div>
          <div className="font-mono" style={{ fontSize: '20px', fontWeight: 600 }}>
            {derived.totalTreasuryMon.toFixed(2)} <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>MON</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Circulating across {derived.activeAgentsCount} autonomous agents
          </div>
        </div>

        <div className="panel" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="text-muted font-mono" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
              Stranded Value (GC Queue)
            </span>
            <ShieldAlert size={14} className="text-pink" />
          </div>
          <div className="font-mono text-pink" style={{ fontSize: '20px', fontWeight: 600 }}>
            {derived.totalStrandedValueMon.toFixed(2)} <span style={{ fontSize: '13px' }}>MON</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {objects.filter((o) => o.status === 'STRANDED').length} objects flagged for recovery
          </div>
        </div>

        <div className="panel" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="text-muted font-mono" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
              Total Value Recovered
            </span>
            <ArrowUpRight size={14} className="text-mint" />
          </div>
          <div className="font-mono text-mint" style={{ fontSize: '20px', fontWeight: 600 }}>
            +{derived.totalRecoveredValueMon.toFixed(2)} <span style={{ fontSize: '13px' }}>MON</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Via automated GC peer transfer & SLA refunds
          </div>
        </div>

        <div className="panel" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="text-muted font-mono" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
              Economic Objects
            </span>
            <Cpu size={14} className="text-blue" />
          </div>
          <div className="font-mono" style={{ fontSize: '20px', fontWeight: 600 }}>
            {derived.totalCirculatingObjects} <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>ACTIVE</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Compute credits, API licenses, datasets
          </div>
        </div>
      </div>

      {/* Main Split: Economic Agent Registry & Recent Events Stream */}
      <div className="grid-2">
        {/* Active Agents Snapshot */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Activity size={14} className="text-mint" />
              <span>Registered Economic Identities</span>
            </div>
            <button
              className="btn-econ"
              onClick={() => onNavigateTab('ENTITIES')}
              style={{ padding: '3px 8px', fontSize: '10.5px' }}
            >
              View All
            </button>
          </div>
          <div style={{ padding: 0 }}>
            <table className="econ-table">
              <thead>
                <tr>
                  <th>Agent ID</th>
                  <th>Controller Wallet</th>
                  <th>Balance</th>
                  <th>Reputation</th>
                  <th>Policy Max</th>
                </tr>
              </thead>
              <tbody>
                {agents.slice(0, 5).map((agent) => (
                  <tr key={agent.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{agent.name}</div>
                      <div className="font-mono text-muted" style={{ fontSize: '10px' }}>{agent.id}</div>
                    </td>
                    <td>
                      <span className="font-mono text-secondary" style={{ fontSize: '11px' }}>
                        {agent.walletAddress}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontWeight: 600 }}>
                        {agent.balanceMon.toFixed(1)} MON
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-mint font-mono">{agent.reputationScore.toFixed(1)}%</span>
                    </td>
                    <td>
                      <span className="font-mono text-secondary">{agent.policy.maxPerTransaction} MON</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time Economic Event Ledger */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Clock size={14} className="text-mint" />
              <span>Recent Economic Events Stream</span>
            </div>
            <button
              className="btn-econ"
              onClick={() => onNavigateTab('AUDIT_LOG')}
              style={{ padding: '3px 8px', fontSize: '10.5px' }}
            >
              Audit Log ({events.length})
            </button>
          </div>
          <div style={{ padding: '8px 12px', maxHeight: '340px', overflowY: 'auto' }}>
            {events.length === 0 ? (
              <div className="text-muted font-mono" style={{ padding: '16px', textAlign: 'center' }}>
                No events recorded yet. Run the simulation to trigger economic events.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {events.slice(0, 7).map((evt) => {
                  const date = new Date(evt.timestamp);
                  const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date
                    .getMinutes()
                    .toString()
                    .padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;

                  const isDebit = evt.summary.includes('-') || evt.type === 'ESCROW_LOCKED';
                  const isCredit = evt.summary.includes('+') || evt.type === 'RECOVERY_EXECUTED';
                  const isBlocked = evt.type === 'POLICY_BLOCKED';

                  return (
                    <div
                      key={evt.id}
                      style={{
                        padding: '8px 10px',
                        background: 'var(--bg-panel-secondary)',
                        borderLeft: `2px solid ${
                          isBlocked
                            ? 'var(--signal-pink)'
                            : isCredit
                            ? 'var(--accent-mint)'
                            : 'var(--border-focus)'
                        }`,
                        borderRadius: '2px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="font-mono text-muted" style={{ fontSize: '10px' }}>
                          {timeStr} • <span style={{ color: 'var(--text-secondary)' }}>{evt.actor}</span>
                        </span>
                        <span
                          className={`badge ${
                            isBlocked
                              ? 'badge-pink'
                              : isCredit
                              ? 'badge-mint'
                              : 'badge-muted'
                          }`}
                          style={{ fontSize: '9.5px' }}
                        >
                          {evt.type}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: isBlocked ? 'var(--signal-pink)' : 'var(--text-primary)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {evt.summary}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Agent, ECONEvent } from '../sdk/types';
import { MONAD_TESTNET_CONFIG } from '../settlement/MonadSettlementAdapter';
import { ShieldCheck, Code, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

interface PolicyControlViewProps {
  agents: Agent[];
  events: ECONEvent[];
  onUpdatePolicy: (agentId: string, updates: any) => void;
}

export const PolicyControlView: React.FC<PolicyControlViewProps> = ({
  agents,
  events,
  onUpdatePolicy,
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || 'ResearchAgent-42');
  const [selectedEvent, setSelectedEvent] = useState<ECONEvent | null>(null);

  const activeAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Grid: Policy Configuration & Smart Contract References */}
      <div className="grid-2">
        {/* Policy Guard Configuration */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <ShieldCheck size={14} className="text-mint" />
              <span>Autonomous Agent Policy Guard</span>
            </div>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              style={{
                background: 'var(--bg-app)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '2px',
                outline: 'none',
              }}
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.balanceMon.toFixed(1)} MON)
                </option>
              ))}
            </select>
          </div>

          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Constraints enforced pre-settlement. Transactions violating these limits are rejected by the Policy Engine before reaching settlement adapters.
            </div>

            {activeAgent && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-mono text-secondary" style={{ fontSize: '11.5px' }}>
                    Max Single Transaction Cap
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      value={activeAgent.policy.maxPerTransaction}
                      onChange={(e) =>
                        onUpdatePolicy(activeAgent.id, {
                          maxPerTransaction: parseFloat(e.target.value) || 0,
                        })
                      }
                      style={{
                        width: '70px',
                        background: 'var(--bg-app)',
                        border: '1px solid var(--border-color)',
                        padding: '3px 6px',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11.5px',
                        textAlign: 'right',
                      }}
                    />
                    <span className="font-mono text-muted" style={{ fontSize: '11px' }}>MON</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-mono text-secondary" style={{ fontSize: '11.5px' }}>
                    Daily Aggregate Spending Limit
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      value={activeAgent.policy.dailySpendingLimit}
                      onChange={(e) =>
                        onUpdatePolicy(activeAgent.id, {
                          dailySpendingLimit: parseFloat(e.target.value) || 0,
                        })
                      }
                      style={{
                        width: '70px',
                        background: 'var(--bg-app)',
                        border: '1px solid var(--border-color)',
                        padding: '3px 6px',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11.5px',
                        textAlign: 'right',
                      }}
                    />
                    <span className="font-mono text-muted" style={{ fontSize: '11px' }}>MON</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-mono text-secondary" style={{ fontSize: '11.5px' }}>
                    Minimum Retained Reserve Floor
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      value={activeAgent.policy.minRetainedBalance}
                      onChange={(e) =>
                        onUpdatePolicy(activeAgent.id, {
                          minRetainedBalance: parseFloat(e.target.value) || 0,
                        })
                      }
                      style={{
                        width: '70px',
                        background: 'var(--bg-app)',
                        border: '1px solid var(--border-color)',
                        padding: '3px 6px',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11.5px',
                        textAlign: 'right',
                      }}
                    />
                    <span className="font-mono text-muted" style={{ fontSize: '11px' }}>MON</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span className="font-mono text-secondary" style={{ fontSize: '11.5px' }}>
                    Automated GC Value Recovery
                  </span>
                  <button
                    className={`btn-econ ${activeAgent.policy.autoRecoveryEnabled ? 'btn-econ-primary' : ''}`}
                    onClick={() =>
                      onUpdatePolicy(activeAgent.id, {
                        autoRecoveryEnabled: !activeAgent.policy.autoRecoveryEnabled,
                      })
                    }
                    style={{ padding: '3px 10px', fontSize: '10.5px' }}
                  >
                    {activeAgent.policy.autoRecoveryEnabled ? 'ENABLED' : 'MANUAL REVIEW'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Monad Smart Contracts Verification Plane */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Code size={14} className="text-blue" />
              <span>Monad Settlement Smart Contracts</span>
            </div>
            <span className="badge badge-mint font-mono">CHAIN ID {MONAD_TESTNET_CONFIG.chainId}</span>
          </div>

          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              On-chain settlement contracts for identity, programmable objects, and escrows.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ padding: '8px 10px', background: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-mono" style={{ fontWeight: 600 }}>ERC-8004 IdentityRegistry</span>
                  <span className="badge badge-mint font-mono">MONAD STANDARD</span>
                </div>
                <div className="font-mono text-muted" style={{ fontSize: '10.5px', marginTop: '3px' }}>
                  {MONAD_TESTNET_CONFIG.identityRegistryAddress}
                </div>
              </div>

              <div style={{ padding: '8px 10px', background: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-mono" style={{ fontWeight: 600 }}>ERC-8004 ReputationRegistry</span>
                  <span className="badge badge-mint font-mono">MONAD STANDARD</span>
                </div>
                <div className="font-mono text-muted" style={{ fontSize: '10.5px', marginTop: '3px' }}>
                  {MONAD_TESTNET_CONFIG.reputationRegistryAddress}
                </div>
              </div>

              <div style={{ padding: '8px 10px', background: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-mono" style={{ fontWeight: 600 }}>ECONEconomicObject.sol</span>
                  <span className="badge badge-mint font-mono">DEPLOYED</span>
                </div>
                <div className="font-mono text-muted" style={{ fontSize: '10.5px', marginTop: '3px' }}>
                  {MONAD_TESTNET_CONFIG.economicObjectAddress}
                </div>
              </div>

              <div style={{ padding: '8px 10px', background: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-mono" style={{ fontWeight: 600 }}>ECONEscrow.sol</span>
                  <span className="badge badge-mint font-mono">DEPLOYED</span>
                </div>
                <div className="font-mono text-muted" style={{ fontSize: '10.5px', marginTop: '3px' }}>
                  {MONAD_TESTNET_CONFIG.escrowAddress}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Event Stream Table & JSON Inspector */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <FileText size={14} className="text-mint" />
            <span>Verifiable Economic Event Stream (Audit Log)</span>
          </div>
          <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
            {events.length} Historical Records Logged
          </span>
        </div>

        <table className="econ-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Event Type</th>
              <th>Actor</th>
              <th>Summary</th>
              <th>Inspect</th>
            </tr>
          </thead>
          <tbody>
            {events.slice(0, 10).map((e) => (
              <tr key={e.id}>
                <td className="font-mono text-muted" style={{ fontSize: '11px' }}>
                  {new Date(e.timestamp).toISOString().substring(11, 19)}
                </td>
                <td>
                  <span
                    className={`badge ${
                      e.type.includes('BLOCKED')
                        ? 'badge-pink'
                        : e.type.includes('SETTLEMENT') || e.type.includes('RECOVERY')
                        ? 'badge-mint'
                        : 'badge-muted'
                    }`}
                  >
                    {e.type}
                  </span>
                </td>
                <td className="font-mono text-secondary">{e.actor}</td>
                <td className="font-mono" style={{ fontSize: '11.5px' }}>{e.summary}</td>
                <td>
                  <button
                    className="btn-econ"
                    style={{ padding: '2px 8px', fontSize: '10px' }}
                    onClick={() => setSelectedEvent(e)}
                  >
                    JSON
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* JSON Inspector Modal */}
      {selectedEvent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="panel"
            style={{ width: '600px', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header">
              <div className="panel-title">
                <span>Event Telemetry — {selectedEvent.type}</span>
              </div>
              <button className="btn-econ" onClick={() => setSelectedEvent(null)}>
                Close
              </button>
            </div>
            <div className="panel-body">
              <pre className="terminal-window" style={{ maxHeight: '400px' }}>
                {JSON.stringify(selectedEvent, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

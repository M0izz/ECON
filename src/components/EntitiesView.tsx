import React, { useState } from 'react';
import { Agent, EconomicObject } from '../sdk/types';
import { User, Cpu, Shield, ExternalLink } from 'lucide-react';

interface EntitiesViewProps {
  agents: Agent[];
  objects: EconomicObject[];
}

export const EntitiesView: React.FC<EntitiesViewProps> = ({ agents, objects }) => {
  const [activeTab, setActiveTab] = useState<'AGENTS' | 'OBJECTS'>('AGENTS');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [task, setTask] = useState('');
  const [useStatus, setUseStatus] = useState<string | null>(null);
  const [isUsing, setIsUsing] = useState(false);

  const invokeAgent = async () => {
    if (!task.trim() || !selectedAgent) return;
    setIsUsing(true);
    setUseStatus(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 650));
      const requestId = `req_${Date.now().toString(36)}`;
      const result = {
        success: true,
        mode: 'demo',
        status: 'completed',
        agentId: selectedAgent.onChainAgentId,
        requestId,
        task: task.trim(),
        result: {
          summary: `Task analyzed by ${selectedAgent.name}.`,
          recommendation: 'The agent identified the request and prepared an execution plan.',
          confidence: 0.94,
          nextSteps: [
            'Validate the requested input',
            'Execute the agent capability',
            'Return the verified output',
          ],
        },
        creditsConsumed: 5,
        creditsReturned: 0,
        timestamp: new Date().toISOString(),
      };
      setUseStatus(JSON.stringify(result, null, 2));
    } catch (error) {
      setUseStatus(error instanceof Error ? error.message : 'Demo agent execution failed.');
    } finally {
      setIsUsing(false);
    }
  };

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
              Public ERC-8004 identities read from Monad Testnet
            </span>
          </div>
          {agents.length === 0 ? (
            <div className="text-muted font-mono" style={{ padding: '28px', textAlign: 'center' }}>
              No agents are published yet. Publish the first agent from Agent Builder.
            </div>
          ) : (
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
                <th>Use Agent</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    <div className="font-mono text-muted" style={{ fontSize: '10px' }}>{a.id}</div>
                    {a.onChainAgentId && (
                      <div className="font-mono text-mint" style={{ fontSize: '10px', marginTop: '3px' }}>
                        ERC-8004 #{a.onChainAgentId}
                      </div>
                    )}
                    {a.onChainTxHash && (
                      <a
                        className="font-mono"
                        href={`https://testnet.monadscan.com/tx/${a.onChainTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '10px', color: 'var(--accent-blue)' }}
                      >
                        View Monad receipt ↗
                      </a>
                    )}
                  </td>
                  <td>
                    {a.services?.some((service) => /^https?:\/\//.test(service.endpoint)) ? (
                      <button className="btn-econ btn-econ-primary" onClick={() => { setSelectedAgent(a); setTask(''); setUseStatus(null); }}>
                        Use Agent
                      </button>
                    ) : (
                      <span className="font-mono text-muted" style={{ fontSize: '10px' }}>NO ENDPOINT</span>
                    )}
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
          )}
        </div>
      )}

      {selectedAgent && (
        <div className="policy-modal-overlay">
          <div className="econ-card policy-modal-dialog">
            <div className="modal-header">
              <div>
                <span className="econ-eyebrow">// LIVE AGENT SERVICE</span>
                <h3 className="modal-title">USE {selectedAgent.name}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedAgent(null)}>X</button>
            </div>
            <p className="text-muted font-mono" style={{ fontSize: '11px', marginBottom: '12px' }}>
              Execution mode: demo response preview (backend integration paused)
            </p>
            <textarea
              value={task}
              onChange={(event) => setTask(event.target.value)}
              placeholder="Describe the task for this agent"
              rows={4}
              style={{ width: '100%', background: 'var(--bg-app)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '10px', fontFamily: 'var(--font-mono)' }}
            />
            <button className="btn-econ btn-econ-primary" onClick={invokeAgent} disabled={isUsing || !task.trim()} style={{ marginTop: '12px' }}>
              {isUsing ? 'Sending request...' : 'Send Task'}
            </button>
            {useStatus && <pre className="terminal-window" style={{ marginTop: '12px', whiteSpace: 'pre-wrap' }}>{useStatus}</pre>}
          </div>
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

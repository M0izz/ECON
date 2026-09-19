import React, { useState } from 'react';
import { ECONEvent } from '../sdk/types';
import { ScrollText, Search, Filter } from 'lucide-react';

interface AuditLedgerProps {
  events: ECONEvent[];
}

export const AuditLedger: React.FC<AuditLedgerProps> = ({ events }) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeModalEvent, setActiveModalEvent] = useState<ECONEvent | null>(null);

  const filtered = events.filter((e) => {
    const matchesType = filterType === 'ALL' || e.type === filterType;
    const matchesSearch =
      e.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.actor.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="panel" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div className="panel-title">
            <ScrollText size={14} className="text-mint" />
            <span>Verifiable Economic Event Stream Ledger</span>
          </div>
          <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
            Total Events: {events.length}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={13}
              style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search event summary or actor..."
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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
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
            <option value="ALL">All Event Types</option>
            <option value="SETTLEMENT_COMPLETED">SETTLEMENT_COMPLETED</option>
            <option value="ESCROW_LOCKED">ESCROW_LOCKED</option>
            <option value="STRANDED_VALUE_DETECTED">STRANDED_VALUE_DETECTED</option>
            <option value="RECOVERY_EXECUTED">RECOVERY_EXECUTED</option>
            <option value="POLICY_BLOCKED">POLICY_BLOCKED</option>
          </select>
        </div>
      </div>

      <div className="panel">
        <table className="econ-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Type</th>
              <th>Actor</th>
              <th>Description / Payload Summary</th>
              <th>Inspect</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id}>
                <td className="font-mono text-muted" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                  {new Date(e.timestamp).toLocaleTimeString()}
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
                    onClick={() => setActiveModalEvent(e)}
                  >
                    Payload
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeModalEvent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setActiveModalEvent(null)}
        >
          <div
            className="panel"
            style={{ width: '640px', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header">
              <div className="panel-title">
                <span>Event Metadata — {activeModalEvent.type}</span>
              </div>
              <button className="btn-econ" onClick={() => setActiveModalEvent(null)}>
                Close
              </button>
            </div>
            <div className="panel-body">
              <pre className="terminal-window" style={{ maxHeight: '420px' }}>
                {JSON.stringify(activeModalEvent, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

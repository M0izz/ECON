import React, { useState } from 'react';
import { EscrowRecord, Agent } from '../sdk/types';
import { ECON } from '../sdk/client';
import { Lock, CheckCircle2, RefreshCw, Send, ShieldCheck, ExternalLink, Plus, Clock } from 'lucide-react';

interface EscrowContractsViewProps {
  econ: ECON;
  agents: Agent[];
  escrows: EscrowRecord[];
  onRefresh: () => void;
}

export const EscrowContractsView: React.FC<EscrowContractsViewProps> = ({
  econ,
  agents,
  escrows,
  onRefresh,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isCreating, setIsCreating] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Form State
  const [buyerId, setBuyerId] = useState(agents[0]?.id || '');
  const [sellerId, setSellerId] = useState(agents[1]?.id || '');
  const [amountMon, setAmountMon] = useState(5.0);
  const [condition, setCondition] = useState('High-throughput compute verification SLA 99.9%');
  const [deadlineHours, setDeadlineHours] = useState(6);

  const filteredEscrows = escrows.filter((e) => {
    if (filterStatus === 'ALL') return true;
    return e.status === filterStatus;
  });

  const totalLockedMon = escrows
    .filter((e) => e.status === 'LOCKED' || e.status === 'DELIVERED' || e.status === 'VERIFIED')
    .reduce((sum, e) => sum + e.amountMon, 0);

  const handleCreateEscrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerId || !sellerId || amountMon <= 0) return;

    try {
      const deadlineMs = Date.now() + deadlineHours * 3600 * 1000;
      await econ.escrow.createEscrow(buyerId, sellerId, amountMon, condition, deadlineMs);
      setActionNotice(`Created escrow lock: ${amountMon} MON allocated from ${buyerId}`);
      setIsCreating(false);
      onRefresh();
    } catch (err: any) {
      setActionNotice(`Escrow lock failed: ${err.message}`);
    }
  };

  const handleSubmitDelivery = (escrowId: string) => {
    try {
      const hash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      econ.escrow.submitDelivery(escrowId, hash);
      setActionNotice(`Proof of delivery submitted for ${escrowId}: ${hash.substring(0, 16)}...`);
      onRefresh();
    } catch (err: any) {
      setActionNotice(`Delivery submission error: ${err.message}`);
    }
  };

  const handleVerifyAndRelease = async (escrowId: string) => {
    try {
      await econ.escrow.verifyAndRelease(escrowId);
      setActionNotice(`Escrow ${escrowId} verified and funds released to seller.`);
      onRefresh();
    } catch (err: any) {
      setActionNotice(`Release error: ${err.message}`);
    }
  };

  const handleRefund = async (escrowId: string) => {
    try {
      await econ.escrow.refund(escrowId);
      setActionNotice(`Escrow ${escrowId} refunded back to buyer.`);
      onRefresh();
    } catch (err: any) {
      setActionNotice(`Refund error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Overview Metric Banner */}
      <div className="panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={16} className="text-mint" />
              <span style={{ fontSize: '15px', fontWeight: 700 }}>Autonomous Escrow Settlement Contracts</span>
            </div>
            <p className="text-secondary" style={{ fontSize: '11.5px', marginTop: '4px' }}>
              Deterministic conditional value locks for agent-to-agent commitments on Monad Parallel EVM.
            </p>
          </div>

          <button
            className="btn-econ btn-econ-primary"
            onClick={() => setIsCreating(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} />
            <span>Lock Funds in Escrow</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <div>
            <div className="font-mono text-muted" style={{ fontSize: '10.5px' }}>TOTAL VALUE LOCKED</div>
            <div className="font-mono text-mint" style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px' }}>
              {totalLockedMon.toFixed(2)} MON
            </div>
          </div>
          <div>
            <div className="font-mono text-muted" style={{ fontSize: '10.5px' }}>ACTIVE CONTRACTS</div>
            <div className="font-mono" style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px', color: '#FFF' }}>
              {escrows.filter((e) => e.status === 'LOCKED' || e.status === 'DELIVERED').length}
            </div>
          </div>
          <div>
            <div className="font-mono text-muted" style={{ fontSize: '10.5px' }}>SETTLED & RELEASED</div>
            <div className="font-mono" style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px', color: '#CFFF3D' }}>
              {escrows.filter((e) => e.status === 'RELEASED').length}
            </div>
          </div>
          <div>
            <div className="font-mono text-muted" style={{ fontSize: '10.5px' }}>MONAD CONTRACT</div>
            <div className="font-mono text-muted" style={{ fontSize: '11px', marginTop: '6px' }}>
              <a
                href="https://testnet.monadexplorer.com/address/0x62B9D90e964C108779951664c39832B6F9A27F03"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>0x62B9...7F03</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div style={{ background: '#0F3B4F', border: '1px solid #1E5C78', borderRadius: '4px', padding: '10px 14px', fontSize: '12px', color: '#CFFF3D', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Creation Modal */}
      {isCreating && (
        <div style={{ background: 'rgba(3, 20, 28, 0.85)', backdropFilter: 'blur(8px)', position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="panel" style={{ width: '100%', maxWidth: '520px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFF' }}>Lock Autonomous Escrow</h3>
              <button onClick={() => setIsCreating(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateEscrow} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="font-mono text-muted" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>BUYER (PURCHASING AGENT)</label>
                <select
                  value={buyerId}
                  onChange={(e) => setBuyerId(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: '#FFF', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.balanceMon.toFixed(1)} MON)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-mono text-muted" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>SELLER / PROVIDER AGENT</label>
                <select
                  value={sellerId}
                  onChange={(e) => setSellerId(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: '#FFF', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                >
                  {agents.filter((a) => a.id !== buyerId).map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.balanceMon.toFixed(1)} MON)</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="font-mono text-muted" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>LOCKED AMOUNT (MON)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={amountMon}
                    onChange={(e) => setAmountMon(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: '#FFF', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label className="font-mono text-muted" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>EXPIRY DEADLINE</label>
                  <select
                    value={deadlineHours}
                    onChange={(e) => setDeadlineHours(parseInt(e.target.value) || 6)}
                    style={{ width: '100%', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: '#FFF', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                  >
                    <option value={1}>1 Hour</option>
                    <option value={6}>6 Hours</option>
                    <option value={24}>24 Hours</option>
                    <option value={72}>3 Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-mono text-muted" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>COMMITMENT CONDITION / SLA</label>
                <textarea
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: '#FFF', fontFamily: 'sans-serif', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="btn-econ" onClick={() => setIsCreating(false)}>Cancel</button>
                <button type="submit" className="btn-econ btn-econ-primary">Execute Escrow Lock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {['ALL', 'LOCKED', 'DELIVERED', 'RELEASED', 'REFUNDED'].map((status) => (
          <button
            key={status}
            className={`btn-econ ${filterStatus === status ? 'btn-econ-primary' : ''}`}
            onClick={() => setFilterStatus(status)}
            style={{ fontSize: '11px', padding: '5px 12px' }}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Escrow Records Table */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="econ-table">
          <thead>
            <tr>
              <th>Escrow ID</th>
              <th>Buyer</th>
              <th>Seller</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Condition</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEscrows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No escrow contracts found matching '{filterStatus}'.
                </td>
              </tr>
            ) : (
              filteredEscrows.map((esc) => (
                <tr key={esc.id}>
                  <td>
                    <div className="font-mono text-mint" style={{ fontWeight: 600, fontSize: '12px' }}>
                      {esc.id}
                    </div>
                    <div className="font-mono text-muted" style={{ fontSize: '10px' }}>
                      {new Date(esc.createdAt).toLocaleTimeString()}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{esc.buyer}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{esc.seller}</div>
                  </td>
                  <td>
                    <span className="font-mono text-mint" style={{ fontWeight: 700, fontSize: '13px' }}>
                      {esc.amountMon.toFixed(2)} MON
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge font-mono ${
                        esc.status === 'LOCKED'
                          ? 'badge-amber'
                          : esc.status === 'DELIVERED'
                          ? 'badge-cyan'
                          : esc.status === 'RELEASED'
                          ? 'badge-mint'
                          : 'badge-muted'
                      }`}
                    >
                      {esc.status}
                    </span>
                  </td>
                  <td style={{ maxWidth: '240px' }}>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{esc.condition}</div>
                    {esc.deliveryHash && (
                      <div className="font-mono text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>
                        Hash: {esc.deliveryHash.substring(0, 14)}...
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {esc.status === 'LOCKED' && (
                        <>
                          <button
                            className="btn-econ btn-econ-primary"
                            style={{ fontSize: '10.5px', padding: '3px 8px' }}
                            onClick={() => handleSubmitDelivery(esc.id)}
                            title="Submit Proof of Delivery"
                          >
                            Deliver Proof
                          </button>
                          <button
                            className="btn-econ"
                            style={{ fontSize: '10.5px', padding: '3px 8px', borderColor: '#FF8FA3', color: '#FF8FA3' }}
                            onClick={() => handleRefund(esc.id)}
                            title="Refund back to Buyer"
                          >
                            Refund
                          </button>
                        </>
                      )}

                      {esc.status === 'DELIVERED' && (
                        <button
                          className="btn-econ btn-econ-primary"
                          style={{ fontSize: '10.5px', padding: '3px 8px' }}
                          onClick={() => handleVerifyAndRelease(esc.id)}
                          title="Verify cryptographic delivery and release funds to seller"
                        >
                          Verify & Release
                        </button>
                      )}

                      {(esc.status === 'RELEASED' || esc.status === 'REFUNDED') && (
                        <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
                          ✓ Terminal
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

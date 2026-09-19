import React, { useState } from 'react';
import { EconomicObject, RecoveryPlan, Agent } from '../sdk/types';
import { ECON } from '../sdk/client';
import { Repeat, ShieldAlert, ArrowRight, CheckCircle2, TrendingUp, Cpu } from 'lucide-react';

interface RecoveryViewProps {
  econ: ECON;
  objects: EconomicObject[];
  plans: RecoveryPlan[];
  agents: Agent[];
  onTriggerScan: () => void;
  onRefresh: () => void;
}

export const RecoveryView: React.FC<RecoveryViewProps> = ({
  econ,
  objects,
  plans,
  onTriggerScan,
  onRefresh,
}) => {
  const [selectedObjectId, setSelectedObjectId] = useState<string>('OBJ-COMP-0042');
  const [activePlan, setActivePlan] = useState<RecoveryPlan | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const strandedObjects = objects.filter((o) => o.status === 'STRANDED');

  const handleGeneratePlan = (objId: string) => {
    try {
      const plan = econ.gc.plan(objId);
      setActivePlan(plan);
      setSelectedObjectId(objId);
      setActionMessage(`Generated quantitative EV plan for ${objId}`);
      onRefresh();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleExecute = async (plan: RecoveryPlan) => {
    setIsExecuting(true);
    setActionMessage(null);
    try {
      await econ.recovery.execute(plan, true);
      setActionMessage(
        `Successfully executed ${plan.recommendedStrategy} recovery! Recovered +${plan.expectedRecoveryMon} MON.`
      );
      onRefresh();
    } catch (err: any) {
      setActionMessage(`Execution failed: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const currentObj = objects.find((o) => o.id === selectedObjectId) || strandedObjects[0];

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner: Pipeline Explanation */}
      <div className="panel" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div className="panel-title">
            <Repeat size={14} className="text-mint" />
            <span>Economic Garbage Collection Pipeline</span>
          </div>
          <button className="btn-econ btn-econ-primary" onClick={onTriggerScan}>
            Trigger Network Scan
          </button>
        </div>

        {/* Pipeline Diagram */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            borderRadius: '2px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10.5px',
            overflowX: 'auto',
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>Object Registry</span>
          <ArrowRight size={12} className="text-muted" />
          <span style={{ color: 'var(--accent-blue)' }}>Eligibility Scanner</span>
          <ArrowRight size={12} className="text-muted" />
          <span style={{ color: 'var(--signal-pink)' }}>Stranded Detector</span>
          <ArrowRight size={12} className="text-muted" />
          <span style={{ color: 'var(--accent-amber)' }}>EV Analysis</span>
          <ArrowRight size={12} className="text-muted" />
          <span style={{ color: 'var(--text-primary)' }}>Policy Check</span>
          <ArrowRight size={12} className="text-muted" />
          <span style={{ color: 'var(--accent-mint)', fontWeight: 600 }}>Strategy & Settlement</span>
        </div>
      </div>

      {actionMessage && (
        <div
          style={{
            padding: '10px 14px',
            background: 'var(--bg-panel-secondary)',
            border: '1px solid var(--border-color)',
            borderLeft: '3px solid var(--accent-mint)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11.5px',
            color: 'var(--text-primary)',
          }}
        >
          {actionMessage}
        </div>
      )}

      {/* Main Grid: Stranded Objects List vs Quantitative EV Breakdown Card */}
      <div className="grid-2">
        {/* Left: Stranded Objects Queue */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <ShieldAlert size={14} className="text-pink" />
              <span>Stranded Value Detected ({strandedObjects.length})</span>
            </div>
            <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
              Unused or decaying quota past utilization thresholds
            </span>
          </div>

          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {strandedObjects.length === 0 ? (
              <div className="font-mono text-muted" style={{ padding: '20px', textAlign: 'center' }}>
                No stranded value detected on network. All assets actively utilized.
              </div>
            ) : (
              strandedObjects.map((obj) => (
                <div
                  key={obj.id}
                  onClick={() => handleGeneratePlan(obj.id)}
                  style={{
                    padding: '12px 14px',
                    background:
                      selectedObjectId === obj.id
                        ? 'var(--bg-panel-secondary)'
                        : 'var(--bg-app)',
                    border: `1px solid ${
                      selectedObjectId === obj.id
                        ? 'var(--accent-mint)'
                        : 'var(--border-color)'
                    }`,
                    borderRadius: '2px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {obj.id}
                    </span>
                    <span className="badge badge-pink font-mono">STRANDED</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span className="text-secondary">{obj.denomination}</span>
                    <span className="font-mono text-pink" style={{ fontWeight: 600 }}>
                      ~{obj.valueMon.toFixed(1)} MON
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                    <span>Owner: {obj.owner}</span>
                    <span>Quota: {obj.quantity - obj.consumedQuantity} remaining</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Quantitative Expected Value Analysis & Execution Card */}
        {currentObj ? (
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <TrendingUp size={14} className="text-mint" />
                <span>Quantitative Recovery Analysis — {currentObj.id}</span>
              </div>
              <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
                Expected Value Model
              </span>
            </div>

            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Telemetry Snapshot */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  background: 'var(--bg-app)',
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '2px',
                }}
              >
                <div>
                  <div className="text-muted font-mono" style={{ fontSize: '9.5px' }}>CURRENT ALLOCATION</div>
                  <div className="font-mono" style={{ fontWeight: 600, fontSize: '12px' }}>
                    {currentObj.quantity} {currentObj.denomination}
                  </div>
                </div>
                <div>
                  <div className="text-muted font-mono" style={{ fontSize: '9.5px' }}>HISTORICAL UTILIZATION</div>
                  <div className="font-mono" style={{ fontSize: '12px' }}>
                    {currentObj.utilizationRatePerHour} / hr
                  </div>
                </div>
                <div>
                  <div className="text-muted font-mono" style={{ fontSize: '9.5px' }}>PROJECTED DEMAND</div>
                  <div className="font-mono" style={{ fontSize: '12px' }}>
                    {currentObj.projectedRequirement} units
                  </div>
                </div>
              </div>

              {/* Four Strategy Expected Values */}
              <div>
                <div
                  className="font-mono text-muted"
                  style={{ fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px' }}
                >
                  Calculated Strategy Expected Value (EV)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  <div
                    style={{
                      padding: '8px',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      textAlign: 'center',
                    }}
                  >
                    <div className="text-muted font-mono" style={{ fontSize: '10px' }}>KEEP</div>
                    <div className="font-mono" style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                      {activePlan ? activePlan.calculations.keepValue.toFixed(1) : '2.1'} MON
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '8px',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      textAlign: 'center',
                    }}
                  >
                    <div className="text-muted font-mono" style={{ fontSize: '10px' }}>SELL</div>
                    <div className="font-mono" style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                      {activePlan ? activePlan.calculations.sellValue.toFixed(1) : '7.2'} MON
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '8px',
                      background: 'var(--bg-panel-secondary)',
                      border: '1px solid var(--accent-mint)',
                      textAlign: 'center',
                    }}
                  >
                    <div className="text-mint font-mono" style={{ fontSize: '10px', fontWeight: 600 }}>TRANSFER ★</div>
                    <div className="font-mono text-mint" style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>
                      +{activePlan ? activePlan.calculations.transferValue.toFixed(1) : '8.2'} MON
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '8px',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      textAlign: 'center',
                    }}
                  >
                    <div className="text-muted font-mono" style={{ fontSize: '10px' }}>REFUND</div>
                    <div className="font-mono" style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                      {activePlan ? activePlan.calculations.refundValue.toFixed(1) : '6.7'} MON
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendation Card */}
              <div
                style={{
                  padding: '12px 14px',
                  background: 'var(--bg-panel-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-mono text-muted" style={{ fontSize: '10px' }}>RECOMMENDATION</span>
                  <span className="badge badge-mint font-mono">
                    CONFIDENCE: {activePlan ? Math.round(activePlan.confidenceScore * 100) : 91}%
                  </span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Strategy: {activePlan ? activePlan.recommendedStrategy : 'TRANSFER'} (Peer Buyout)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {activePlan
                    ? activePlan.reason
                    : 'Projected internal utilization is low and 3 network peer agents currently demand GPU compute credits.'}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  className="btn-econ btn-econ-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={isExecuting || currentObj.status !== 'STRANDED'}
                  onClick={() => {
                    const plan = activePlan || econ.gc.plan(currentObj.id);
                    handleExecute(plan);
                  }}
                >
                  <CheckCircle2 size={13} />
                  <span>
                    {currentObj.status === 'STRANDED'
                      ? `Approve & Settle Recovery (+${
                          activePlan ? activePlan.expectedRecoveryMon : '8.2'
                        } MON)`
                      : 'Asset Already Recovered'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

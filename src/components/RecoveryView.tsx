import React, { useState, useMemo } from 'react';
import { EconomicObject, RecoveryPlan, Agent } from '../sdk/types';
import { ECON } from '../sdk/client';
import {
  Repeat,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Database,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Ban,
  Activity,
} from 'lucide-react';
import { RecoveryHistory } from './envio/RecoveryHistory';
import { StructuredRecommendation, RecoveryCandidate } from '../sdk/egc/types';

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
  agents,
  onTriggerScan,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'PIPELINE' | 'ENVIO_LEDGER'>('PIPELINE');
  const [selectedObjectId, setSelectedObjectId] = useState<string>(objects[0]?.id || 'OBJ-GPU-82');
  const [activeRecommendation, setActiveRecommendation] = useState<StructuredRecommendation | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' | 'info'; txHash?: string } | null>(null);

  const settlementMode = econ.store.getSettlementMode();

  // Evaluate candidate states dynamically
  const candidates: RecoveryCandidate[] = useMemo(() => {
    try {
      return econ.gc.scanCandidates();
    } catch {
      return [];
    }
  }, [econ, objects]);

  // Derived real pipeline metrics
  const metrics = useMemo(() => {
    const totalEvaluated = objects.length;
    const totalCandidates = candidates.length;
    const eligibleCount = candidates.filter((c) => c.eligibilityStatus).length;
    const ineligibleCount = candidates.filter((c) => !c.eligibilityStatus).length;
    const reviewRequiredCount = candidates.filter((c) => c.reasonCode === 'POLICY_REVIEW_REQUIRED' || c.confidence < 0.75).length;

    const potentialRecoverableMon = candidates
      .filter((c) => c.eligibilityStatus)
      .reduce((sum, c) => sum + (c.nominalValueMon * (c.potentialSurplus / Math.max(1, c.remainingQuantity))), 0);

    const realizedRecoveredMon = plans
      .filter((p) => p.status === 'EXECUTED')
      .reduce((sum, p) => sum + p.expectedRecoveryMon, 0);

    const failedExecutions = plans.filter((p) => p.status === 'REJECTED').length;

    return {
      totalEvaluated,
      totalCandidates,
      eligibleCount,
      ineligibleCount,
      reviewRequiredCount,
      potentialRecoverableMon: Math.round(potentialRecoverableMon * 100) / 100,
      realizedRecoveredMon: Math.round(realizedRecoveredMon * 100) / 100,
      failedExecutions,
    };
  }, [objects, candidates, plans]);

  const currentCandidate = candidates.find((c) => c.objectId === selectedObjectId);
  const currentObj = objects.find((o) => o.id === selectedObjectId) || objects[0];

  const handleGeneratePlan = (objId: string) => {
    try {
      const rec = econ.gc.planStructured(objId);
      setActiveRecommendation(rec);
      setSelectedObjectId(objId);
      setActionMessage({
        text: `Generated quantitative EV recommendation for ${objId} (${rec.proposedStrategy}, EV: +${rec.netExpectedMon} MON)`,
        type: 'info',
      });
      onRefresh();
    } catch (err: any) {
      setActionMessage({
        text: `Evaluation error: ${err.message}`,
        type: 'error',
      });
    }
  };

  const handleExecute = async () => {
    if (!currentObj) return;
    setIsExecuting(true);
    setActionMessage(null);

    try {
      const plan = activeRecommendation
        ? econ.gc.strategyEngine.toRecoveryPlan(activeRecommendation)
        : econ.gc.plan(currentObj.id);

      const result = await econ.recovery.executeWithResult(plan, true);

      if (result.success) {
        setActionMessage({
          text: `Successfully executed ${result.action} recovery! Recovered +${result.recoveredAmountMon} MON (State: ${result.state})`,
          type: 'success',
          txHash: result.txHash,
        });
      } else {
        setActionMessage({
          text: `Execution failed: ${result.error}`,
          type: 'error',
        });
      }
      onRefresh();
    } catch (err: any) {
      setActionMessage({
        text: `Execution failed: ${err.message}`,
        type: 'error',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Environment Status Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn-econ ${activeTab === 'PIPELINE' ? 'btn-econ-primary' : ''}`}
            onClick={() => setActiveTab('PIPELINE')}
          >
            <Repeat size={13} />
            <span>Garbage Collection Pipeline</span>
          </button>
          <button
            className={`btn-econ ${activeTab === 'ENVIO_LEDGER' ? 'btn-econ-primary' : ''}`}
            onClick={() => setActiveTab('ENVIO_LEDGER')}
          >
            <Database size={13} />
            <span>Envio Recovery Ledger</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            className={`badge font-mono ${
              settlementMode === 'MONAD_TESTNET' ? 'badge-mint' : 'badge-amber'
            }`}
          >
            ● {settlementMode === 'MONAD_TESTNET' ? 'MONAD TESTNET (10143)' : 'LOCAL SIMULATION'}
          </span>
          <button className="btn-econ btn-econ-primary" onClick={onTriggerScan}>
            <Activity size={13} />
            <span>Scan Network Now</span>
          </button>
        </div>
      </div>

      {activeTab === 'ENVIO_LEDGER' ? (
        <RecoveryHistory />
      ) : (
        <>
          {/* Recovery Overview Metrics Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
            }}
          >
            <div className="panel" style={{ padding: '12px' }}>
              <div className="text-muted font-mono" style={{ fontSize: '10px' }}>
                OBJECTS EVALUATED / STRANDED
              </div>
              <div className="font-mono" style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>
                {metrics.totalCandidates} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ {metrics.totalEvaluated}</span>
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--accent-blue)', marginTop: '2px' }}>
                {metrics.eligibleCount} verified eligible
              </div>
            </div>

            <div className="panel" style={{ padding: '12px' }}>
              <div className="text-muted font-mono" style={{ fontSize: '10px' }}>
                POTENTIAL RECOVERABLE VALUE
              </div>
              <div className="font-mono text-mint" style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>
                {metrics.potentialRecoverableMon.toFixed(2)} MON
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Unrecovered surplus potential
              </div>
            </div>

            <div className="panel" style={{ padding: '12px' }}>
              <div className="text-muted font-mono" style={{ fontSize: '10px' }}>
                REALIZED RECOVERED VALUE
              </div>
              <div className="font-mono text-mint" style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>
                +{metrics.realizedRecoveredMon.toFixed(2)} MON
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Settled to treasury
              </div>
            </div>

            <div className="panel" style={{ padding: '12px' }}>
              <div className="text-muted font-mono" style={{ fontSize: '10px' }}>
                SAFETY & POLICY INVARIANTS
              </div>
              <div className="font-mono" style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px', color: metrics.failedExecutions > 0 ? 'var(--signal-pink)' : 'var(--text-primary)' }}>
                {metrics.ineligibleCount} Ineligible
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--accent-amber)', marginTop: '2px' }}>
                {metrics.reviewRequiredCount} review-required
              </div>
            </div>
          </div>

          {/* Alert Message Banner */}
          {actionMessage && (
            <div
              style={{
                padding: '12px 16px',
                background:
                  actionMessage.type === 'error'
                    ? 'rgba(239, 68, 68, 0.1)'
                    : actionMessage.type === 'success'
                    ? 'rgba(16, 185, 129, 0.1)'
                    : 'var(--bg-panel-secondary)',
                border: `1px solid ${
                  actionMessage.type === 'error'
                    ? 'var(--signal-pink)'
                    : actionMessage.type === 'success'
                    ? 'var(--accent-mint)'
                    : 'var(--border-color)'
                }`,
                borderLeft: `4px solid ${
                  actionMessage.type === 'error'
                    ? 'var(--signal-pink)'
                    : actionMessage.type === 'success'
                    ? 'var(--accent-mint)'
                    : 'var(--accent-blue)'
                }`,
                fontFamily: 'var(--font-mono)',
                fontSize: '11.5px',
                color: 'var(--text-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{actionMessage.text}</span>
              {actionMessage.txHash && (
                <span className="badge badge-mint font-mono" style={{ fontSize: '10px' }}>
                  TX: {actionMessage.txHash.slice(0, 10)}...
                </span>
              )}
            </div>
          )}

          {/* Main Grid: Candidates Queue vs Quantitative EV Breakdown Card */}
          <div className="grid-2">
            {/* Left: Stranded Objects Queue */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <ShieldAlert size={14} className="text-pink" />
                  <span>Stranded Value Detected ({candidates.length})</span>
                </div>
                <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
                  Verifiable surplus past utilization thresholds
                </span>
              </div>

              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {candidates.length === 0 ? (
                  <div className="font-mono text-muted" style={{ padding: '24px', textAlign: 'center' }}>
                    No stranded value detected on network. All assets actively utilized.
                  </div>
                ) : (
                  candidates.map((cand) => (
                    <div
                      key={cand.objectId}
                      onClick={() => handleGeneratePlan(cand.objectId)}
                      style={{
                        padding: '12px 14px',
                        background:
                          selectedObjectId === cand.objectId
                            ? 'var(--bg-panel-secondary)'
                            : 'var(--bg-app)',
                        border: `1px solid ${
                          selectedObjectId === cand.objectId
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
                          {cand.objectId}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span
                            className={`badge font-mono ${
                              cand.eligibilityStatus ? 'badge-mint' : 'badge-amber'
                            }`}
                          >
                            {cand.reasonCode}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span className="text-secondary">{cand.resourceType}</span>
                        <span className="font-mono text-pink" style={{ fontWeight: 600 }}>
                          Surplus: {cand.potentialSurplus} / {cand.remainingQuantity} units
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '10px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <span>Owner: {cand.ownerId}</span>
                        <span>Time Left: {cand.timeLeftHours}h</span>
                        <span>Transfer: {cand.transferability}</span>
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
                    Deterministic EV Model
                  </span>
                </div>

                <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Rights & Entitlements Badge Strip */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      padding: '8px 10px',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '2px',
                      fontSize: '11px',
                    }}
                  >
                    <span className="font-mono text-muted">ENTITLEMENTS:</span>
                    <span
                      className={`badge font-mono ${
                        (currentObj as any).transferability === 'YES' || currentObj.transferable
                          ? 'badge-mint'
                          : 'badge-amber'
                      }`}
                    >
                      Transferable: {(currentObj as any).transferability || (currentObj.transferable ? 'YES' : 'NO')}
                    </span>
                    <span
                      className={`badge font-mono ${
                        (currentObj as any).sellability === 'YES' ? 'badge-mint' : 'badge-amber'
                      }`}
                    >
                      Marketplace: {(currentObj as any).sellability || (currentObj.transferable ? 'YES' : 'NO')}
                    </span>
                    <span
                      className={`badge font-mono ${
                        (currentObj as any).refundability === 'YES' ? 'badge-mint' : 'badge-amber'
                      }`}
                    >
                      Refundable: {(currentObj as any).refundability || 'UNKNOWN'}
                    </span>
                  </div>

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
                      <div className="text-muted font-mono" style={{ fontSize: '9.5px' }}>
                        REMAINING QUOTA
                      </div>
                      <div className="font-mono" style={{ fontWeight: 600, fontSize: '12px' }}>
                        {currentObj.quantity - currentObj.consumedQuantity} / {currentObj.quantity} units
                      </div>
                    </div>
                    <div>
                      <div className="text-muted font-mono" style={{ fontSize: '9.5px' }}>
                        PROJECTED DEMAND
                      </div>
                      <div className="font-mono" style={{ fontSize: '12px' }}>
                        {currentCandidate ? currentCandidate.projectedRequirement : currentObj.projectedRequirement} units
                      </div>
                    </div>
                    <div>
                      <div className="text-muted font-mono" style={{ fontSize: '9.5px' }}>
                        VERIFIABLE SURPLUS
                      </div>
                      <div className="font-mono text-pink" style={{ fontWeight: 600, fontSize: '12px' }}>
                        {currentCandidate ? currentCandidate.potentialSurplus : Math.max(0, currentObj.quantity - currentObj.consumedQuantity - currentObj.projectedRequirement)} units
                      </div>
                    </div>
                  </div>

                  {/* Four Strategy Expected Values */}
                  <div>
                    <div
                      className="font-mono text-muted"
                      style={{ fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px' }}
                    >
                      Calculated Net Expected Value (EV) by Strategy
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
                          {activeRecommendation
                            ? `${activeRecommendation.valuations.keep.netExpectedMon.toFixed(2)} MON`
                            : '—'}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '8px',
                          background:
                            activeRecommendation?.proposedStrategy === 'SELL'
                              ? 'var(--bg-panel-secondary)'
                              : 'var(--bg-app)',
                          border: `1px solid ${
                            activeRecommendation?.proposedStrategy === 'SELL'
                              ? 'var(--accent-mint)'
                              : 'var(--border-color)'
                          }`,
                          textAlign: 'center',
                        }}
                      >
                        <div className="text-muted font-mono" style={{ fontSize: '10px' }}>SELL (1% FEE)</div>
                        <div className="font-mono" style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                          {activeRecommendation && activeRecommendation.valuations.sell.isAvailable
                            ? `+${activeRecommendation.valuations.sell.netExpectedMon.toFixed(2)} MON`
                            : 'N/A'}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '8px',
                          background:
                            activeRecommendation?.proposedStrategy === 'TRANSFER'
                              ? 'var(--bg-panel-secondary)'
                              : 'var(--bg-app)',
                          border: `1px solid ${
                            activeRecommendation?.proposedStrategy === 'TRANSFER'
                              ? 'var(--accent-mint)'
                              : 'var(--border-color)'
                          }`,
                          textAlign: 'center',
                        }}
                      >
                        <div className="text-mint font-mono" style={{ fontSize: '10px', fontWeight: 600 }}>TRANSFER (5% FEE)</div>
                        <div className="font-mono text-mint" style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>
                          {activeRecommendation && activeRecommendation.valuations.transfer.isAvailable
                            ? `+${activeRecommendation.valuations.transfer.netExpectedMon.toFixed(2)} MON`
                            : 'N/A'}
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
                        <div className="text-muted font-mono" style={{ fontSize: '10px' }}>REFUND (SLA)</div>
                        <div className="font-mono" style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                          {activeRecommendation && activeRecommendation.valuations.refund.isAvailable
                            ? `+${activeRecommendation.valuations.refund.netExpectedMon.toFixed(2)} MON`
                            : 'UNVERIFIED'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Card */}
                  {activeRecommendation ? (
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
                        <span className="font-mono text-muted" style={{ fontSize: '10px' }}>RECOMMENDATION PROVENANCE</span>
                        <span className="badge badge-mint font-mono">
                          CONFIDENCE: {Math.round(activeRecommendation.confidence * 100)}%
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Strategy: {activeRecommendation.proposedStrategy} (Net: +{activeRecommendation.netExpectedMon} MON)
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {activeRecommendation.eligibilityEvidence}
                      </div>
                    </div>
                  ) : null}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      className="btn-econ"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => handleGeneratePlan(currentObj.id)}
                    >
                      <TrendingUp size={13} />
                      <span>Evaluate Quantitative EV</span>
                    </button>
                    <button
                      className="btn-econ btn-econ-primary"
                      style={{ flex: 1, justifyContent: 'center' }}
                      disabled={isExecuting || currentObj.status === 'RECOVERED' || currentObj.status === 'LIQUIDATED'}
                      onClick={handleExecute}
                    >
                      <CheckCircle2 size={13} />
                      <span>
                        {isExecuting
                          ? 'Executing...'
                          : activeRecommendation
                          ? `Execute ${activeRecommendation.proposedStrategy} Recovery (+${activeRecommendation.netExpectedMon} MON)`
                          : 'Execute Authorized Recovery'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
};

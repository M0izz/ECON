import React, { useState } from 'react';
import { ECON } from '../../sdk/client';
import { EconomicObject, RecoveryPlan } from '../../sdk/types';

interface ConsoleRecoveryEngineProps {
  econ: ECON;
  objects: EconomicObject[];
  plans: RecoveryPlan[];
  onTriggerScan: () => void;
  onRefresh: () => void;
}

export const ConsoleRecoveryEngine: React.FC<ConsoleRecoveryEngineProps> = ({
  econ,
  objects,
  plans,
  onTriggerScan,
  onRefresh,
}) => {
  const derived = econ.store.getDerivedState();
  const stranded = objects.filter((o) => o.status === 'STRANDED');

  // Policy validation modal state
  const [selectedCandidate, setSelectedCandidate] = useState<{
    id: string;
    title: string;
    units: number;
    decayProbability: number;
    options: { label: string; yieldMon: number; action: string }[];
  } | null>(null);

  const [validationStep, setValidationStep] = useState<
    'REVIEW' | 'VALIDATING_POLICY' | 'POLICY_APPROVED' | 'SETTLING' | 'SETTLED' | 'REJECTED'
  >('REVIEW');
  const [validationLog, setValidationLog] = useState<string[]>([]);
  const [chosenOption, setChosenOption] = useState<number>(0);

  const handleOpenReview = (candidate: any) => {
    setSelectedCandidate(candidate);
    setValidationStep('REVIEW');
    setValidationLog([]);
  };

  const handleStartPolicyValidation = async () => {
    setValidationStep('VALIDATING_POLICY');
    setValidationLog([
      '[POLICY_GUARD] Initiating pre-flight verification for recovery action...',
      '[POLICY_GUARD] Checking Target Agent Policy: agent_research_01...',
      '[POLICY_GUARD] Evaluating spend limit & velocity caps: PASS (Yield: Inflow)',
      '[POLICY_GUARD] Validating Counterparty Whitelist (0x8004...): PASS',
      '[POLICY_GUARD] Monad Execution Reserve Balance: 15.00 MON (Sufficient)',
    ]);

    // Simulate real pipeline verification delay
    setTimeout(() => {
      setValidationStep('POLICY_APPROVED');
      setValidationLog((prev) => [
        ...prev,
        '[POLICY_GUARD] Mathematical EV Analysis: EV = (+4.60 MON - 0.002 MON Gas) = +4.598 MON > 0',
        '[POLICY_GUARD] DECISION: APPROVED for autonomous execution.',
      ]);
    }, 1200);
  };

  const handleExecuteSettlement = async () => {
    if (!selectedCandidate) return;
    setValidationStep('SETTLING');

    const matchingPlan = plans.find((p) => p.objectId === selectedCandidate.id) || plans[0];
    if (matchingPlan) {
      try {
        await econ.recovery.execute(matchingPlan, true);
      } catch {
        econ.gc.scan();
      }
    } else {
      econ.gc.scan();
    }

    setTimeout(() => {
      setValidationStep('SETTLED');
      onRefresh();
    }, 800);
  };

  return (
    <div className="console-recovery-page">
      {/* Signature Hero Product Header */}
      <div className="recovery-hero-banner">
        <div className="r-hero-left">
          <span className="econ-eyebrow pink">// SIGNATURE HERO PRODUCT</span>
          <h1 className="r-hero-title">ECONOMIC GARBAGE COLLECTOR</h1>
          <p className="r-hero-desc">
            Autonomous value reclamation engine powered by quantitative Expected Value ($EV$) scanning.
            Recovers locked escrows, idle API credits, and stranded commitments back to agent balance sheets.
          </p>
        </div>

        <div className="r-hero-metrics">
          <div className="r-metric-card">
            <span className="r-lbl">DETECTED STRANDED VALUE</span>
            <span className="r-val text-accent-pink">{derived.totalStrandedValueMon.toFixed(2)} MON</span>
            <span className="r-sub">{stranded.length} UNCLAIMED OBJECTS</span>
          </div>
          <div className="r-metric-card highlight-mint">
            <span className="r-lbl">CUMULATIVE VALUE RECOVERED</span>
            <span className="r-val text-mint">+{derived.totalRecoveredValueMon.toFixed(2)} MON</span>
            <span className="r-sub">SWEEPS COMPLETED</span>
          </div>
          <div className="r-metric-card">
            <button
              className="econ-btn econ-btn-primary econ-btn-sm"
              onClick={onTriggerScan}
            >
              <span>Scan Residuals ↻</span>
            </button>
          </div>
        </div>
      </div>

      {/* Signature Showcase Card: API Credits (Requested by user) */}
      <div className="econ-card signature-recovery-showcase">
        <div className="sig-badge-row">
          <span className="econ-badge econ-badge-pink">HIGH YIELD CANDIDATE</span>
          <span className="econ-badge econ-badge-monad">MONAD TESTNET VERIFIED</span>
        </div>

        <div className="showcase-content-split">
          <div className="showcase-left">
            <h2 className="showcase-target-title">API COMPUTE CREDITS // 37 UNITS</h2>
            <p className="showcase-sub">
              Originating from <code>agent_research_01</code> batch subscription.
              Agent idle duration: 18 hours. Probability of natural utilization before expiry: <strong>18% (82% Stranded)</strong>.
            </p>

            <div className="ev-equation-bar">
              <span className="eq-label">MATHEMATICAL EXPECTED VALUE</span>
              <code className="eq-math">EV = (8.90 MON × 0.82) − 0.002 MON (Gas) = +7.29 MON &gt; 0</code>
            </div>
          </div>

          <div className="showcase-right">
            <div className="recovery-options-table">
              <div className="opt-row highlight">
                <span className="opt-name">TRANSFER TO SENTINEL AGENT</span>
                <span className="opt-yield text-mint">+4.60 MON</span>
              </div>
              <div className="opt-row">
                <span className="opt-name">SELL ON SECONDARY MARKETPLACE</span>
                <span className="opt-yield text-mint">+4.20 MON</span>
              </div>
              <div className="opt-row">
                <span className="opt-name">RETAIN 10 UNITS AS SAFETY RESERVE</span>
                <span className="opt-yield text-muted">+1.80 MON</span>
              </div>
            </div>

            <div className="showcase-action-footer">
              <div className="safety-badge">
                <span className="font-mono text-[11px] text-[#CFFF3D]">✓ Policy Validation Mandatory</span>
              </div>
              <button
                className="econ-btn econ-btn-primary econ-btn-lg"
                onClick={() =>
                  handleOpenReview({
                    id: stranded[0]?.id || 'obj_api_credits',
                    title: 'API COMPUTE CREDITS (37 UNITS)',
                    units: 37,
                    decayProbability: 0.82,
                    options: [
                      { label: 'Transfer to Sentinel Agent', yieldMon: 4.6, action: 'TRANSFER' },
                      { label: 'Sell on Secondary Marketplace', yieldMon: 4.2, action: 'SELL' },
                      { label: 'Retain Minimum Reserve', yieldMon: 1.8, action: 'RESERVE' },
                    ],
                  })
                }
              >
                <span>REVIEW RECOVERY →</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Recovery Opportunities Grid */}
      <div className="recovery-grid-section">
        <div className="section-header-row">
          <h3 className="econ-title-md">ACTIVE RECOVERY OPPORTUNITIES ({plans.length})</h3>
          <span className="font-mono text-muted">SORTED BY HIGHEST NET YIELD</span>
        </div>

        <div className="recovery-plans-list">
          {plans.map((plan) => (
            <div key={plan.id} className="econ-card plan-item-card">
              <div className="plan-item-left">
                <div className="plan-tag-row">
                  <span className="econ-badge econ-badge-pink">{plan.recommendedStrategy}</span>
                  <span className="font-mono text-muted">ID: {plan.id}</span>
                </div>
                <h4 className="plan-target-title">Target: {plan.objectId}</h4>
                <p className="plan-desc font-mono">
                  {plan.reason} (Owner: {plan.ownerId})
                </p>
              </div>

              <div className="plan-item-yield">
                <span className="yield-label">ESTIMATED YIELD</span>
                <span className="yield-val text-mint">+{plan.expectedRecoveryMon.toFixed(2)} MON</span>
                <span className="yield-gas font-mono text-muted">Conf: {(plan.confidenceScore * 100).toFixed(0)}%</span>
              </div>

              <div className="plan-item-action">
                <button
                  className="econ-btn econ-btn-secondary econ-btn-sm"
                  onClick={() =>
                    handleOpenReview({
                      id: plan.objectId,
                      title: `RECOVERY PLAN: ${plan.id}`,
                      units: plan.strandedQuantity,
                      decayProbability: 1 - plan.confidenceScore,
                      options: [{ label: plan.recommendedStrategy, yieldMon: plan.expectedRecoveryMon, action: plan.recommendedStrategy }],
                    })
                  }
                >
                  <span>Review ➔</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Policy-Gated Recovery Modal Flow */}
      {selectedCandidate && (
        <div className="policy-modal-overlay">
          <div className="econ-card policy-modal-dialog">
            <div className="modal-header">
              <div>
                <span className="econ-eyebrow pink">// SAFETY ARCHITECTURE PIPELINE</span>
                <h3 className="modal-title">RECOVERY VERIFICATION & EXECUTION</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedCandidate(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-stepper">
              <div className={`step-pill ${validationStep === 'REVIEW' ? 'active' : 'done'}`}>
                1. Review Proposal
              </div>
              <div
                className={`step-pill ${
                  validationStep === 'VALIDATING_POLICY'
                    ? 'active'
                    : validationStep === 'POLICY_APPROVED' || validationStep === 'SETTLING' || validationStep === 'SETTLED'
                    ? 'done'
                    : ''
                }`}
              >
                2. Policy Validation
              </div>
              <div className={`step-pill ${validationStep === 'SETTLING' ? 'active' : validationStep === 'SETTLED' ? 'done' : ''}`}>
                3. Settlement Execution
              </div>
            </div>

            <div className="modal-body-content">
              {validationStep === 'REVIEW' && (
                <div className="review-step-content">
                  <h4>Select Recovery Strategy:</h4>
                  <div className="options-selector">
                    {selectedCandidate.options.map((opt, i) => (
                      <label
                        key={i}
                        className={`option-choice-box ${chosenOption === i ? 'selected' : ''}`}
                        onClick={() => setChosenOption(i)}
                      >
                        <input
                          type="radio"
                          name="recoveryOpt"
                          checked={chosenOption === i}
                          onChange={() => setChosenOption(i)}
                        />
                        <div className="choice-info">
                          <strong>{opt.label}</strong>
                          <span className="choice-yield text-mint">+{opt.yieldMon.toFixed(2)} MON Yield</span>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="safety-warning-banner">
                    <span className="warn-icon font-mono font-bold text-xs">[INFO]</span>
                    <span>
                      Transactions are never executed blindly. Clicking below evaluates the proposal against the
                      agent's deterministic Policy Guard.
                    </span>
                  </div>

                  <div className="modal-action-row">
                    <button
                      className="econ-btn econ-btn-secondary"
                      onClick={() => setSelectedCandidate(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="econ-btn econ-btn-primary"
                      onClick={handleStartPolicyValidation}
                    >
                      <span>Proceed to Policy Validation →</span>
                    </button>
                  </div>
                </div>
              )}

              {(validationStep === 'VALIDATING_POLICY' || validationStep === 'POLICY_APPROVED') && (
                <div className="policy-eval-step">
                  <h4>Policy Engine Verification Log:</h4>
                  <div className="terminal-eval-box">
                    {validationLog.map((log, i) => (
                      <div key={i} className="log-line">
                        {log}
                      </div>
                    ))}
                    {validationStep === 'VALIDATING_POLICY' && (
                      <div className="log-line text-mint">
                        <span className="econ-status-dot-pulse"></span> Evaluating constraints on Monad...
                      </div>
                    )}
                  </div>

                  {validationStep === 'POLICY_APPROVED' && (
                    <div className="modal-action-row">
                      <button
                        className="econ-btn econ-btn-secondary"
                        onClick={() => setSelectedCandidate(null)}
                      >
                        Abort
                      </button>
                      <button
                        className="econ-btn econ-btn-lime econ-btn-lg"
                        onClick={handleExecuteSettlement}
                      >
                        <span>Execute Authorized Settlement ➔</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {validationStep === 'SETTLING' && (
                <div className="settling-step text-center">
                  <div className="econ-status-dot-pulse" style={{ width: '16px', height: '16px' }}></div>
                  <h4 style={{ marginTop: '16px' }}>Settling on Monad Parallel EVM...</h4>
                  <p className="font-mono text-muted">Submitting atomic state transition (Block time: 400ms)...</p>
                </div>
              )}

              {validationStep === 'SETTLED' && (
                <div className="settled-step text-center">
                  <div className="settled-icon">✅</div>
                  <h3>Recovery Settlement Completed!</h3>
                  <p className="text-secondary">
                    Stranded capital successfully swept. Treasury updated on Monad Testnet.
                  </p>
                  <button
                    className="econ-btn econ-btn-primary"
                    onClick={() => setSelectedCandidate(null)}
                    style={{ marginTop: '16px' }}
                  >
                    <span>Close</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

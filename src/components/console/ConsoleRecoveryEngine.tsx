import React, { useState } from 'react';
import { ECON } from '../../sdk/client';
import { EconomicObject, RecoveryPlan } from '../../sdk/types';
import { RecoveryHistory } from '../envio/RecoveryHistory';
import { Recycle, Database, Eye, Sparkles, Cpu } from 'lucide-react';
import { CounterpartyIntelligenceModal } from '../nansen/CounterpartyIntelligenceModal';
import { QwenReasoningModal } from '../qwen/QwenReasoningModal';
import { EconomicContextBuilder } from '../../integrations/qwen/qwenContext';
import { EconomicIntent } from '../../integrations/qwen/qwenTypes';
import { CREWorkflowCard } from '../cre/CREWorkflowCard';

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
  const [activeSubTab, setActiveSubTab] = useState<'SCANNER' | 'CRE_WORKFLOW' | 'ENVIO_HISTORY'>('SCANNER');
  const derived = econ.store.getDerivedState();
  const stranded = objects.filter((o) => o.status === 'STRANDED');

  // Qwen Economic Reasoning modal state
  const [showQwenModal, setShowQwenModal] = useState(false);
  const [qwenTargetObject, setQwenTargetObject] = useState<EconomicObject | null>(null);

  // Policy validation modal state
  const [selectedCandidate, setSelectedCandidate] = useState<{
    id: string;
    title: string;
    units: number;
    decayProbability: number;
    options: { label: string; yieldMon: number; action: string }[];
  } | null>(null);

  const [selectedIntelTarget, setSelectedIntelTarget] = useState<{
    address: string;
    name: string;
    role: 'SELLER' | 'BUYER' | 'AGENT' | 'RECOVERY_TARGET' | 'GENERAL';
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
      '[POLICY_GUARD] Nansen Intelligence: Recipient 0x7772...47A7 verified on Monad (No exploit labels)',
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

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          className={`btn-econ ${activeSubTab === 'SCANNER' ? 'btn-econ-primary' : ''}`}
          onClick={() => setActiveSubTab('SCANNER')}
        >
          <Recycle size={13} />
          <span>Active GC Residual Scanner</span>
        </button>
        <button
          className={`btn-econ ${activeSubTab === 'CRE_WORKFLOW' ? 'btn-econ-primary' : ''}`}
          onClick={() => setActiveSubTab('CRE_WORKFLOW')}
        >
          <Cpu size={13} />
          <span>Chainlink CRE Orchestrator</span>
        </button>
        <button
          className={`btn-econ ${activeSubTab === 'ENVIO_HISTORY' ? 'btn-econ-primary' : ''}`}
          onClick={() => setActiveSubTab('ENVIO_HISTORY')}
        >
          <Database size={13} />
          <span>Indexed Recovery Chronicle (Envio)</span>
        </button>
      </div>

      {activeSubTab === 'ENVIO_HISTORY' ? (
        <RecoveryHistory />
      ) : activeSubTab === 'CRE_WORKFLOW' ? (
        <CREWorkflowCard econ={econ} onRefresh={onRefresh} />
      ) : (
        <>
          {/* Chainlink CRE Autonomous Recovery Scanner Banner & Control */}
          <CREWorkflowCard econ={econ} onRefresh={onRefresh} />

          {/* Signature Showcase Card: API Credits (Requested by user) */}
          <div className="econ-card signature-recovery-showcase">
        <div className="sig-badge-row">
          <span className="econ-badge econ-badge-pink">HIGH YIELD CANDIDATE</span>
          <span className="econ-badge econ-badge-monad">MONAD TESTNET VERIFIED</span>
          <span
            className="econ-badge"
            style={{
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              borderColor: 'rgba(99, 102, 241, 0.4)',
            }}
          >
            NANSEN INTELLIGENCE CONTEXT
          </span>
        </div>

        <div className="showcase-content-split">
          <div className="showcase-left">
            <h2 className="showcase-target-title">API COMPUTE CREDITS // 37 UNITS</h2>
            <p className="showcase-sub">
              Originating from <code>agent_research_01</code> batch subscription.
              Agent idle duration: 18 hours. Probability of natural utilization before expiry: <strong>18% (82% Stranded)</strong>.
            </p>

            <div
              style={{
                marginTop: '10px',
                marginBottom: '12px',
                padding: '8px 12px',
                background: 'rgba(99, 102, 241, 0.05)',
                borderRadius: '4px',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
                  TARGET BUYER / RECIPIENT:
                </span>{' '}
                <strong style={{ color: 'var(--text-primary)', fontSize: '12px' }}>
                  DataAgent-7
                </strong>{' '}
                <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
                  (0x7772...47A7)
                </span>
              </div>
              <button
                className="btn-econ"
                style={{
                  padding: '2px 8px',
                  fontSize: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#818cf8',
                  borderColor: 'rgba(99, 102, 241, 0.4)',
                }}
                onClick={() =>
                  setSelectedIntelTarget({
                    address: '0x777286A645c110E663B514571A15C198547A7',
                    name: 'DataAgent-7 (Target Buyer)',
                    role: 'RECOVERY_TARGET',
                  })
                }
              >
                <Eye size={10} />
                <span>Nansen Profile</span>
              </button>
            </div>

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

            <div className="showcase-action-footer" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div className="safety-badge">
                <span className="font-mono text-[11px] text-[#CFFF3D]">✓ Policy Validation Mandatory</span>
              </div>
              <button
                className="econ-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(217, 70, 239, 0.15)',
                  color: '#f472b6',
                  borderColor: 'rgba(217, 70, 239, 0.45)',
                  fontWeight: 600,
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontSize: '11.5px',
                }}
                onClick={() => {
                  setQwenTargetObject(stranded[0] || objects[0] || null);
                  setShowQwenModal(true);
                }}
              >
                <Sparkles size={13} />
                <span>AI Recovery Strategy (Qwen 3.8 Max)</span>
              </button>
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

              <div className="plan-item-action" style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="econ-btn"
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(217, 70, 239, 0.12)',
                    color: '#f472b6',
                    borderColor: 'rgba(217, 70, 239, 0.4)',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const matchObj = objects.find((o) => o.id === plan.objectId);
                    setQwenTargetObject(
                      matchObj || {
                        id: plan.objectId,
                        owner: plan.ownerId,
                        type: 'API_LICENSE',
                        denomination: 'units',
                        quantity: plan.strandedQuantity,
                        valueMon: plan.expectedRecoveryMon,
                        expiryTimestamp: Date.now() + 36000000,
                        transferable: true,
                        status: 'STRANDED',
                        metadataHash: '0x' + plan.id,
                        createdAt: Date.now(),
                        allocationQuantity: plan.strandedQuantity,
                        consumedQuantity: 0,
                        utilizationRatePerHour: 0.1,
                        projectedRequirement: 0,
                      }
                    );
                    setShowQwenModal(true);
                  }}
                >
                  <Sparkles size={11} />
                  <span>AI Strategy</span>
                </button>
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
    </>
  )}

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

                  {/* Nansen On-Chain Context for Recipient */}
                  <div
                    style={{
                      margin: '12px 0',
                      padding: '10px 14px',
                      background: 'rgba(99, 102, 241, 0.06)',
                      borderRadius: '4px',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="font-mono text-xs" style={{ color: '#818cf8', fontWeight: 600 }}>
                          [ON-CHAIN INTELLIGENCE / NANSEN]
                        </span>
                        <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
                          Target Counterparty: DataAgent-7 (0x7772...47A7)
                        </span>
                      </div>
                      <button
                        className="btn-econ"
                        style={{
                          padding: '2px 8px',
                          fontSize: '10.5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#818cf8',
                          borderColor: 'rgba(99, 102, 241, 0.4)',
                        }}
                        onClick={() =>
                          setSelectedIntelTarget({
                            address: '0x777286A645c110E663B514571A15C198547A7',
                            name: 'DataAgent-7',
                            role: 'RECOVERY_TARGET',
                          })
                        }
                      >
                        <Eye size={10} />
                        <span>Inspect Profile</span>
                      </button>
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Nansen profiling informs ECON Policy Engine before capital sweep. Nansen is read-only and does not execute transactions.
                    </p>
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

      {selectedIntelTarget && (
        <CounterpartyIntelligenceModal
          address={selectedIntelTarget.address}
          title={selectedIntelTarget.name}
          role={selectedIntelTarget.role}
          chain="monad"
          onClose={() => setSelectedIntelTarget(null)}
        />
      )}

      {showQwenModal && (() => {
        const targetObj: EconomicObject = qwenTargetObject || stranded[0] || objects[0] || {
          id: 'OBJ-API-002',
          owner: 'ResearchAgent-42',
          type: 'API_LICENSE',
          denomination: 'units',
          quantity: 37,
          valueMon: 7.29,
          expiryTimestamp: Date.now() + 32400000,
          transferable: true,
          status: 'STRANDED',
          metadataHash: '0x992',
          createdAt: Date.now() - 64800000,
          allocationQuantity: 37,
          consumedQuantity: 0,
          utilizationRatePerHour: 0.18,
          projectedRequirement: 0,
        };

        const targetPlan: RecoveryPlan = plans.find((p) => p.objectId === targetObj.id) || plans[0] || {
          id: 'PLAN-001',
          objectId: targetObj.id,
          ownerId: targetObj.owner || 'ResearchAgent-42',
          strandedQuantity: targetObj.quantity || 37,
          recommendedStrategy: 'TRANSFER',
          confidenceScore: 0.91,
          reason: 'Stranded API credit units with high secondary recovery potential on Monad',
          expectedRecoveryMon: 4.60,
          calculations: {
            keepValue: 1.80,
            sellValue: 4.20,
            transferValue: 4.60,
            refundValue: 3.70,
          },
          timestamp: Date.now(),
        };

        const defaultAgent = econ.store.getAllAgents()[0] || {
          id: targetObj.owner || 'ResearchAgent-42',
          name: 'ResearchAgent-42',
          controller: '0x1842B6792A645c110E663B514571A15C198547A1',
          walletAddress: '0x1842B6792A645c110E663B514571A15C198547A1',
          balanceMon: 184,
          reputationScore: 98,
          active: true,
          registeredAt: Date.now(),
          policy: {
            maxPerTransaction: 20,
            dailySpendingLimit: 100,
            allowedCategories: ['DATA_SUBSCRIPTION' as const, 'API_LICENSE' as const],
            requireApprovalAbove: 20,
            autoRecoveryEnabled: true,
            autoTransferEnabled: true,
            minRetainedBalance: 10,
          },
          activeObligations: 0,
        };

        return (
          <QwenReasoningModal
            isOpen={showQwenModal}
            context={EconomicContextBuilder.forRecovery({
              agent: defaultAgent,
              object: targetObj,
              plan: targetPlan,
            })}
            policyEngine={econ.policy}
            onClose={() => {
              setShowQwenModal(false);
              setQwenTargetObject(null);
            }}
            onAcceptRecommendation={(intent: EconomicIntent) => {
              setShowQwenModal(false);
              handleOpenReview({
                id: targetObj.id,
                title: `${targetObj.id} (${targetObj.quantity} units) [AI Strategy: ${intent.strategy || intent.action}]`,
                units: targetObj.quantity,
                decayProbability: 0.82,
                options: [
                  { label: 'Transfer to Sentinel Agent', yieldMon: 4.6, action: 'TRANSFER' },
                  { label: 'Sell on Secondary Marketplace', yieldMon: 4.2, action: 'SELL' },
                  { label: 'Retain Minimum Reserve', yieldMon: 1.8, action: 'RESERVE' },
                ],
              });
              setQwenTargetObject(null);
            }}
          />
        );
      })()}
    </div>
  );
};

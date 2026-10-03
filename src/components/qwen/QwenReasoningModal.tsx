import React, { useState, useEffect } from 'react';
import {
  X,
  BrainCircuit,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { EconomicContext, ReasoningResult, EconomicIntent } from '../../integrations/qwen/qwenTypes';
import { defaultQwenProvider } from '../../integrations/qwen/qwenProvider';
import { PolicyEngine, PolicyCheckResult } from '../../sdk/policy';

interface QwenReasoningModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: EconomicContext;
  policyEngine?: PolicyEngine;
  onAcceptRecommendation?: (intent: EconomicIntent) => void;
}

export const QwenReasoningModal: React.FC<QwenReasoningModalProps> = ({
  isOpen,
  onClose,
  context,
  policyEngine,
  onAcceptRecommendation,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReasoningResult | null>(null);
  const [policyCheck, setPolicyCheck] = useState<PolicyCheckResult | null>(null);

  const runReasoning = async () => {
    setLoading(true);
    setResult(null);
    setPolicyCheck(null);

    try {
      const res = await defaultQwenProvider.reason(context);
      setResult(res);

      // Validate against policy engine if available
      if (policyEngine && res.available && res.intent.amountMon) {
        const check = policyEngine.validateTransaction(
          context.agentId,
          res.intent.amountMon,
          context.recoveryCandidate ? undefined : (res.intent.category as any),
          context.counterpartyIntelligence
        );
        setPolicyCheck(check);
      }
    } catch (err: any) {
      setResult({
        intent: {
          action: 'NEEDS_INFORMATION',
          confidence: 0,
          reason: err.message || 'Execution error',
          timestamp: Date.now(),
        },
        modelUsed: 'qwen3.8-max',
        durationMs: 0,
        available: false,
        error: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runReasoning();
    }
  }, [isOpen, context.objective]);

  if (!isOpen) return null;

  const intent = result?.intent;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="econ-card"
        style={{
          width: '680px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-panel)',
          borderRadius: '8px',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)',
          padding: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.35), rgba(15, 23, 42, 0.8))',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="econ-eyebrow" style={{ color: '#C084FC', letterSpacing: '0.08em' }}>
                // ECONOMIC REASONING ENGINE
              </span>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(168, 85, 247, 0.2)',
                  color: '#C084FC',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                }}
              >
                QWEN 3.8 MAX
              </span>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(0, 229, 153, 0.15)',
                  color: '#00E599',
                  border: '1px solid rgba(0, 229, 153, 0.3)',
                }}
              >
                MONAD (10143)
              </span>
            </div>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#FFF', margin: '4px 0 0 0' }}>
              Autonomous Economic Advisory
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn-econ"
            style={{ padding: '6px', background: 'transparent', border: 'none', color: '#9CA3AF' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Context Overview Bar */}
          <div
            style={{
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
              OBJECTIVE: <strong style={{ color: 'var(--text-primary)' }}>{context.objective}</strong>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '16px',
                marginTop: '8px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: 'var(--text-secondary)',
              }}
            >
              <span>Agent: {context.agentName || context.agentId}</span>
              <span>Treasury: {context.treasuryBalanceMon.toFixed(2)} MON</span>
              <span>Max Cap: {context.policy.maxPerTransaction} MON</span>
              {context.candidateServices && (
                <span>Candidates: {context.candidateServices.length} providers</span>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <Loader2
                size={32}
                className="animate-spin"
                style={{ color: '#C084FC', margin: '0 auto 12px' }}
              />
              <div style={{ fontWeight: 600, color: '#FFF', fontSize: '14px' }}>
                Qwen 3.8 Max Reasoning in Progress...
              </div>
              <p
                className="font-mono text-muted"
                style={{ fontSize: '11px', marginTop: '4px', maxWidth: '420px', margin: '4px auto 0' }}
              >
                Synthesizing multi-variable utility, Envio transaction history, Nansen on-chain
                counterparty intelligence, and deterministic policy constraints...
              </p>
            </div>
          )}

          {/* Error / Unavailable State */}
          {!loading && result && !result.available && (
            <div
              style={{
                padding: '16px',
                background: 'rgba(239, 68, 68, 0.08)',
                borderRadius: '6px',
                border: '1px solid rgba(239, 68, 68, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F87171' }}>
                <AlertCircle size={16} />
                <strong style={{ fontSize: '13px' }}>AI Reasoning Unavailable</strong>
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                {result.error || 'QWEN_API_KEY is not configured on the server.'}
              </p>
              <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                Core ECON protocol remains fully operational. Manual operator execution and
                deterministic policy enforcement are active.
              </p>
            </div>
          )}

          {/* Success Recommendation State */}
          {!loading && result && result.available && intent && (
            <>
              <div
                style={{
                  padding: '16px',
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(59, 130, 246, 0.05))',
                  borderRadius: '6px',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: '#A855F7',
                        color: '#FFF',
                      }}
                    >
                      RECOMMENDATION: {intent.action}
                    </span>
                    {intent.target && (
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFF', margin: '8px 0 2px 0' }}>
                        {intent.target}
                      </h3>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono text-muted" style={{ fontSize: '10px' }}>
                      CERTAINTY
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#C084FC' }}>
                      {(intent.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div
                  style={{
                    display: 'flex',
                    gap: '24px',
                    margin: '12px 0',
                    padding: '8px 12px',
                    background: 'rgba(0,0,0,0.25)',
                    borderRadius: '4px',
                  }}
                >
                  {intent.amountMon !== undefined && (
                    <div>
                      <span className="font-mono text-muted" style={{ fontSize: '10px' }}>
                        PROPOSED SETTLEMENT
                      </span>
                      <div className="font-mono text-mint" style={{ fontWeight: 700, fontSize: '14px' }}>
                        {intent.amountMon} MON
                      </div>
                    </div>
                  )}

                  {intent.strategy && (
                    <div>
                      <span className="font-mono text-muted" style={{ fontSize: '10px' }}>
                        RECOVERY STRATEGY
                      </span>
                      <div className="font-mono" style={{ fontWeight: 700, fontSize: '14px', color: '#F472B6' }}>
                        {intent.strategy}
                      </div>
                    </div>
                  )}

                  {intent.expectedValueMon !== undefined && (
                    <div>
                      <span className="font-mono text-muted" style={{ fontSize: '10px' }}>
                        EXPECTED VALUE ($EV$)
                      </span>
                      <div className="font-mono text-mint" style={{ fontWeight: 700, fontSize: '14px' }}>
                        +{intent.expectedValueMon} MON
                      </div>
                    </div>
                  )}
                </div>

                {/* Reason Explanation */}
                <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  <strong>Rationale:</strong> {intent.reason}
                </div>
              </div>

              {/* Policy Engine Gate Evaluation */}
              <div
                style={{
                  padding: '12px 14px',
                  background: policyCheck?.allowed
                    ? 'rgba(0, 229, 153, 0.05)'
                    : 'rgba(239, 68, 68, 0.05)',
                  borderRadius: '6px',
                  border: `1px solid ${
                    policyCheck?.allowed ? 'rgba(0, 229, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                  }`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {policyCheck?.allowed ? (
                    <ShieldCheck size={16} className="text-mint" />
                  ) : (
                    <ShieldAlert size={16} style={{ color: '#F87171' }} />
                  )}
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>
                    ECON POLICY ENGINE GUARD:{' '}
                    {policyCheck?.allowed
                      ? policyCheck.requiresManualApproval
                        ? 'REQUIRES OPERATOR REVIEW'
                        : 'COMPLIANT (ALLOWED)'
                      : `BLOCKED [${policyCheck?.violatesRule || 'POLICY_REJECTED'}]`}
                  </span>
                </div>
                {policyCheck?.reason && (
                  <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {policyCheck.reason}
                  </p>
                )}
              </div>

              {/* Invariant Footer Reminder */}
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  fontFamily: 'monospace',
                  textAlign: 'center',
                }}
              >
                Qwen thinks. ECON Policy decides. Smart contracts enforce. Monad settles. Qwen never signs transactions.
              </div>
            </>
          )}

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button className="btn-econ" onClick={onClose}>
              Dismiss
            </button>
            {result?.available && intent && intent.action !== 'NEEDS_INFORMATION' && (
              <button
                className="btn-econ btn-econ-primary"
                style={{
                  background: 'linear-gradient(135deg, #A855F7, #6366F1)',
                  borderColor: '#A855F7',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onClick={() => {
                  if (onAcceptRecommendation) onAcceptRecommendation(intent);
                  onClose();
                }}
              >
                <span>Review & Proceed to Policy Guard</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

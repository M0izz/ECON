import React, { useState } from 'react';
import { ECON } from '../../sdk/client';
import { CREWorkflowService } from '../../integrations/cre/creService';
import { CREWorkflowReport, CRETelemetry } from '../../integrations/cre/creTypes';
import {
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  ExternalLink,
  Zap,
  Play,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface CREWorkflowCardProps {
  econ: ECON;
  onRefresh?: () => void;
}

export const CREWorkflowCard: React.FC<CREWorkflowCardProps> = ({ econ, onRefresh }) => {
  const [creService] = useState<CREWorkflowService>(() => new CREWorkflowService(econ));
  const [telemetry, setTelemetry] = useState<CRETelemetry>(() => creService.getTelemetry());
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [lastReport, setLastReport] = useState<CREWorkflowReport | null>(null);
  const [demoActive, setDemoActive] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  const updateTelemetry = () => {
    setTelemetry(creService.getTelemetry());
  };

  const handleRunScan = async (isBountyDemo = false) => {
    setIsRunning(true);
    setDemoActive(isBountyDemo);
    setActiveStepIndex(1);

    try {
      if (isBountyDemo) {
        // Step progression simulation for UI visual wow factor
        const interval = setInterval(() => {
          setActiveStepIndex((prev) => (prev < 5 ? prev + 1 : prev));
        }, 450);

        const report = await creService.runBountyDemo();
        clearInterval(interval);
        setActiveStepIndex(5);
        setLastReport(report);
      } else {
        const report = await creService.runWorkflowScan('CRON_SCHEDULE', undefined, true);
        setLastReport(report);
      }

      updateTelemetry();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('[CRE Card Error]', err);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusBadge = () => {
    if (telemetry.status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          ACTIVE (DECENTRALIZED ORACLE)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        SIMULATED RUNTIME (CRE v1.23.0)
      </span>
    );
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-2xl relative overflow-hidden mb-6">
      {/* Glow highlight */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                CHAINLINK RUNTIME ENVIRONMENT (CRE)
              </h3>
              <span className="text-[10px] uppercase font-mono tracking-wider bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800/50">
                Orchestrator
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Verifiable Autonomous Workflow: Automated Economic GC Recovery Scanner
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {getStatusBadge()}
          <span className="text-xs font-mono text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800">
            Cron: <span className="text-slate-200">*/5 * * * *</span>
          </span>
          <span className="text-xs font-mono text-purple-300 bg-purple-950/50 px-2.5 py-1 rounded border border-purple-800/40">
            Monad Testnet (10143)
          </span>
        </div>
      </div>

      {/* Invariant Rule Banner */}
      <div className="my-3 py-2 px-3 bg-slate-950/80 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-200">Execution Hierarchy:</span>
          <span className="text-blue-400 font-mono">CRE orchestrates</span>
          <ArrowRight className="w-3 h-3 text-slate-600" />
          <span className="text-purple-400 font-mono">Qwen reasons</span>
          <ArrowRight className="w-3 h-3 text-slate-600" />
          <span className="text-amber-400 font-mono">ECON Policy decides</span>
          <ArrowRight className="w-3 h-3 text-slate-600" />
          <span className="text-emerald-400 font-mono">Monad settles</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Policy Engine Authoritative Gate
        </div>
      </div>

      {/* Live Telemetry Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 my-4">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
          <span className="text-[11px] text-slate-400 block font-medium">Status</span>
          <span className="text-sm font-semibold text-slate-200 font-mono">
            {telemetry.status}
          </span>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
          <span className="text-[11px] text-slate-400 block font-medium">Total Sweeps Run</span>
          <span className="text-sm font-semibold text-cyan-400 font-mono">
            {telemetry.totalRuns} runs
          </span>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
          <span className="text-[11px] text-slate-400 block font-medium">Recovered Assets</span>
          <span className="text-sm font-semibold text-emerald-400 font-mono">
            {telemetry.successfulSweeps} objects (+{telemetry.cumulativeRecoveredMon.toFixed(1)} MON)
          </span>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
          <span className="text-[11px] text-slate-400 block font-medium">Policy Decisions</span>
          <div className="flex items-center gap-2 text-xs font-mono mt-0.5">
            <span className="text-emerald-400" title="Allowed">
              ✓ {telemetry.successfulSweeps}
            </span>
            <span className="text-amber-400" title="Review Required">
              ⚠ {telemetry.reviewsTriggered}
            </span>
            <span className="text-rose-400" title="Blocked">
              ✕ {telemetry.policyBlocks}
            </span>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
          <span className="text-[11px] text-slate-400 block font-medium">Last Run Result</span>
          <span
            className={`text-xs font-mono font-semibold ${
              lastReport?.status === 'SUCCESS'
                ? 'text-emerald-400'
                : lastReport?.status === 'REVIEW_REQUIRED'
                ? 'text-amber-400'
                : lastReport?.status === 'BLOCKED_BY_POLICY'
                ? 'text-rose-400'
                : 'text-slate-400'
            }`}
          >
            {lastReport ? lastReport.status : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Action Controls & Bounty Demo Launcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
        <div className="flex items-center gap-2">
          {/* Section 14 Deterministic Bounty Demo Button */}
          <button
            id="cre-bounty-demo-btn"
            onClick={() => handleRunScan(true)}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all duration-150 disabled:opacity-50"
          >
            {isRunning && demoActive ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-300" />
            )}
            Run Bounty Demo: OBJ-GPU-82 (82 Units)
          </button>

          {/* Standard Periodic Scan Button */}
          <button
            id="cre-standard-scan-btn"
            onClick={() => handleRunScan(false)}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 text-blue-400" />
            Trigger Scan Cycle
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Target Demo: <span className="text-slate-200">OBJ-GPU-82</span> (Remaining: 82, Req: 17, Transferable: YES)
        </div>
      </div>

      {/* Active Execution Pipeline Indicator (Section 14 Lifecycle Visualizer) */}
      {isRunning && (
        <div className="mt-4 p-3 bg-blue-950/40 border border-blue-800/40 rounded-lg">
          <div className="flex items-center justify-between text-xs text-blue-200 mb-2 font-mono">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
              CRE Verifiable Execution in progress...
            </span>
            <span>Step {activeStepIndex} of 5</span>
          </div>
          <div className="grid grid-cols-5 gap-2 text-[11px] font-mono">
            <div
              className={`p-2 rounded border text-center ${
                activeStepIndex >= 1
                  ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              1. Candidate Scan
            </div>
            <div
              className={`p-2 rounded border text-center ${
                activeStepIndex >= 2
                  ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              2. Nansen / Envio Intel
            </div>
            <div
              className={`p-2 rounded border text-center ${
                activeStepIndex >= 3
                  ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              3. Qwen 3.8 Reasoning
            </div>
            <div
              className={`p-2 rounded border text-center ${
                activeStepIndex >= 4
                  ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              4. Policy Approval
            </div>
            <div
              className={`p-2 rounded border text-center ${
                activeStepIndex >= 5
                  ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              5. Monad Settlement
            </div>
          </div>
        </div>
      )}

      {/* Last Workflow Run Report Modal / Box */}
      {lastReport && (
        <div className="mt-4 p-4 bg-slate-950/90 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-slate-200">
                LATEST CRE WORKFLOW EXECUTION REPORT ({lastReport.executionId})
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Duration: {lastReport.durationMs}ms
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400 block mb-1">Evaluated Candidate:</span>
              {lastReport.candidate ? (
                <div className="p-2.5 bg-slate-900 rounded border border-slate-800 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-white font-bold">{lastReport.candidate.objectId}</span>
                    <span className="text-blue-400">{lastReport.candidate.type}</span>
                  </div>
                  <div className="mt-1 text-slate-400">
                    Remaining: <span className="text-white">{lastReport.candidate.remainingUnits} units</span> | Requirement: <span className="text-white">{lastReport.candidate.projectedRequirement}</span>
                  </div>
                  <div className="mt-0.5 text-slate-400">
                    Transferable: <span className="text-emerald-400 font-bold">{lastReport.candidate.transferable ? 'YES' : 'NO'}</span> | Excess: <span className="text-amber-400">{lastReport.candidate.idleExcessUnits}</span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-900 rounded border border-slate-800 text-slate-500 italic">
                  No stranded objects requiring recovery
                </div>
              )}
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Reasoning & Policy Invariants:</span>
              <div className="p-2.5 bg-slate-900 rounded border border-slate-800 text-slate-300">
                <div className="flex justify-between">
                  <span>Qwen Strategy:</span>
                  <span className="text-purple-400 font-bold">
                    {lastReport.qwenRecommendation?.strategy || lastReport.qwenRecommendation?.action || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Policy Gate Status:</span>
                  <span
                    className={`font-bold ${
                      lastReport.policyDecision?.allowed
                        ? 'text-emerald-400'
                        : lastReport.policyDecision?.requiresReview
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {lastReport.policyDecision?.allowed
                      ? 'APPROVED (ALLOWED)'
                      : lastReport.policyDecision?.requiresReview
                      ? 'REVIEW REQUIRED'
                      : 'BLOCKED'}
                  </span>
                </div>
                {lastReport.settlementTxHash && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Monad Settlement Tx:</span>
                    <span className="text-cyan-400 truncate max-w-[200px]" title={lastReport.settlementTxHash}>
                      {lastReport.settlementTxHash}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 p-2 bg-slate-900/60 rounded border border-slate-800/60 text-xs font-mono text-slate-300">
            <span className="text-slate-400 font-semibold">Audit Summary: </span>
            {lastReport.verifiableAuditSummary}
          </div>
        </div>
      )}
    </div>
  );
};

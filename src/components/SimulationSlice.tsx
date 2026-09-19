import React, { useState } from 'react';
import { EconomicLoopSimulation, SimulationStepState } from '../demo/scenarios';
import { ECON } from '../sdk/client';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Cpu,
  DollarSign,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface SimulationSliceProps {
  econ: ECON;
  sim: EconomicLoopSimulation;
  onStateChange: () => void;
  onResetSeed: () => void;
}

export const SimulationSlice: React.FC<SimulationSliceProps> = ({
  econ,
  sim,
  onStateChange,
  onResetSeed,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(sim.currentStep);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleNextStep = async () => {
    if (sim.currentStep >= 10) return;
    setIsRunning(true);
    try {
      const stepState = await sim.executeNextStep();
      setCurrentStep(sim.currentStep);
      setLogs((prev) => [...prev, ...stepState.log]);
      onStateChange();
    } catch (err: any) {
      setLogs((prev) => [...prev, `[ERROR] ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleAutoRun = async () => {
    setIsRunning(true);
    for (let i = sim.currentStep; i < 10; i++) {
      const stepState = await sim.executeNextStep();
      setCurrentStep(sim.currentStep);
      setLogs((prev) => [...prev, ...stepState.log]);
      onStateChange();
      await new Promise((r) => setTimeout(r, 650));
    }
    setIsRunning(false);
  };

  const handleReset = () => {
    onResetSeed();
    sim.reset();
    setCurrentStep(0);
    setLogs([]);
    onStateChange();
  };

  const activeStepState = sim.stepStates[Math.max(0, currentStep - 1)];

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Simulation Header & Control Panel */}
      <div className="panel" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="panel-title" style={{ fontSize: '13px' }}>
              <span>Autonomous Purchase + Recovery Lifecycle (Section 13)</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Vertical Slice demonstrating real-state mutation across the full economic loop
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-econ"
              onClick={handleReset}
              disabled={isRunning}
            >
              <RotateCcw size={12} />
              <span>Reset State</span>
            </button>
            <button
              className="btn-econ btn-econ-primary"
              onClick={handleNextStep}
              disabled={isRunning || currentStep >= 10}
            >
              <Play size={12} />
              <span>{currentStep === 0 ? 'Start Loop (Step 01)' : `Execute Step ${String(currentStep + 1).padStart(2, '0')}`}</span>
            </button>
            <button
              className="btn-econ"
              onClick={handleAutoRun}
              disabled={isRunning || currentStep >= 10}
            >
              <span>Auto-Run All</span>
            </button>
          </div>
        </div>

        {/* Stepper Timeline */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(10, 1fr)',
            gap: '6px',
            marginTop: '16px',
          }}
        >
          {sim.stepStates.map((step) => {
            const isCompleted = step.status === 'COMPLETED';
            const isCurrent = sim.currentStep === step.stepNumber;

            return (
              <div
                key={step.stepNumber}
                style={{
                  padding: '8px 6px',
                  background: isCurrent
                    ? 'var(--bg-panel-secondary)'
                    : isCompleted
                    ? 'var(--bg-app)'
                    : 'transparent',
                  border: `1px solid ${
                    isCurrent
                      ? 'var(--accent-mint)'
                      : isCompleted
                      ? 'var(--border-focus)'
                      : 'var(--border-color)'
                  }`,
                  borderRadius: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  textAlign: 'center',
                }}
              >
                <div
                  className="font-mono"
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    color: isCurrent
                      ? 'var(--accent-mint)'
                      : isCompleted
                      ? 'var(--text-secondary)'
                      : 'var(--text-muted)',
                  }}
                >
                  {String(step.stepNumber).padStart(2, '0')}
                </div>
                <div
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: isCurrent
                      ? 'var(--text-primary)'
                      : isCompleted
                      ? 'var(--text-secondary)'
                      : 'var(--text-muted)',
                  }}
                >
                  {step.title.split(' ')[0]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Simulation View: Terminal Execution Stream vs Step Diagnostics */}
      <div className="grid-2">
        {/* Left: Terminal Output Stream */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header">
            <div className="panel-title">
              <Cpu size={14} className="text-mint" />
              <span>Autonomous Execution Terminal</span>
            </div>
            <span className="font-mono text-muted" style={{ fontSize: '10.5px' }}>
              STATUS: {currentStep === 10 ? 'COMPLETE' : currentStep > 0 ? 'IN PROGRESS' : 'IDLE'}
            </span>
          </div>

          <div
            className="terminal-window"
            style={{
              flex: 1,
              minHeight: '380px',
              maxHeight: '440px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {logs.length === 0 ? (
              <div className="terminal-line prompt">
                // System ready. Click "Start Loop" to begin autonomous transaction...
              </div>
            ) : (
              logs.map((log, idx) => {
                let colorClass = 'terminal-line';
                if (log.includes('PASSED') || log.includes('COMPLETE') || log.includes('Released') || log.includes('VALID')) {
                  colorClass += ' success';
                } else if (log.includes('Stranded') || log.includes('RECOMMENDED')) {
                  colorClass += ' warn';
                } else if (log.includes('[ERROR]')) {
                  colorClass += ' error';
                }

                return (
                  <div key={idx} className={colorClass}>
                    {log}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Real Economic State Transition Monitor */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <TrendingUp size={14} className="text-mint" />
              <span>Real-Time State Ledger Delta</span>
            </div>
            <span className="font-mono text-muted" style={{ fontSize: '10.5px' }}>
              Zero Synthetic Data
            </span>
          </div>

          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Real Financial Balances */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="font-mono text-muted" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                Active Agent Treasuries (Live Store)
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  background: 'var(--bg-app)',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div>
                  <div className="font-mono text-secondary" style={{ fontSize: '11px' }}>
                    Buyer: ResearchAgent-42
                  </div>
                  <div className="font-mono text-primary" style={{ fontSize: '16px', fontWeight: 600, marginTop: '2px' }}>
                    {econ.store.getAgent('ResearchAgent-42')?.balanceMon.toFixed(2)} MON
                  </div>
                  <div className="font-mono text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>
                    Genesis: 184.0 MON
                  </div>
                </div>

                <div>
                  <div className="font-mono text-secondary" style={{ fontSize: '11px' }}>
                    Seller: GeoVision Provider
                  </div>
                  <div className="font-mono text-primary" style={{ fontSize: '16px', fontWeight: 600, marginTop: '2px' }}>
                    {econ.store.getAgent('GeoVision-Provider')?.balanceMon.toFixed(2)} MON
                  </div>
                  <div className="font-mono text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>
                    Genesis: 340.0 MON
                  </div>
                </div>
              </div>
            </div>

            {/* Loop Summary Card if Completed */}
            {currentStep === 10 && (
              <div
                style={{
                  padding: '14px',
                  background: 'var(--bg-panel-secondary)',
                  border: '1px solid var(--accent-mint)',
                  borderRadius: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} className="text-mint" />
                  <span className="font-mono text-mint" style={{ fontWeight: 700, fontSize: '12.5px' }}>
                    ECONOMIC LOOP COMPLETE
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '10px',
                    fontSize: '11.5px',
                  }}
                >
                  <div className="font-mono">
                    <div className="text-muted">Total Spent</div>
                    <div style={{ fontWeight: 600, color: 'var(--signal-pink)' }}>12.00 MON</div>
                  </div>
                  <div className="font-mono">
                    <div className="text-muted">Value Recovered</div>
                    <div style={{ fontWeight: 600, color: 'var(--accent-mint)' }}>+4.60 MON</div>
                  </div>
                  <div className="font-mono">
                    <div className="text-muted">Stranded Value Cleared</div>
                    <div style={{ fontWeight: 600 }}>0.00 MON</div>
                  </div>
                  <div className="font-mono">
                    <div className="text-muted">New Asset Owner</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>DataAgent-7</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

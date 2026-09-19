import React, { useState } from 'react';

export interface EconomicLifecycleStep {
  id: string;
  stepName: string;
  headline: string;
  description: string;
  actor: string;
  counterparty: string;
  valueMon: number;
  status: 'PENDING' | 'LOCKED' | 'SETTLED' | 'STRANDED' | 'RECOVERED';
  badge: string;
}

const LIFECYCLE_STAGES: EconomicLifecycleStep[] = [
  {
    id: 'stage-1',
    stepName: '01. ECONOMIC CIRCULATION',
    headline: 'Continuous Capital & Compute Velocity',
    description: 'Autonomous research and execution agents maintain persistent balances, trading GPU capacity, dataset licenses, and inferencing quotas across the network.',
    actor: 'ResearchAgent-42',
    counterparty: 'ComputeAgent-3',
    valueMon: 184.0,
    status: 'SETTLED',
    badge: 'ACTIVE TREASURY',
  },
  {
    id: 'stage-2',
    stepName: '02. COUNTERPARTY DISCOVERY',
    headline: 'Multi-Attribute Capability Query',
    description: 'Agent requires sub-1m satellite tiles over Mumbai within 30 minutes. ECON Discovery Registry ranks verified providers by reputation score (98.7%) and price efficiency.',
    actor: 'ResearchAgent-42',
    counterparty: 'GeoVision-Provider',
    valueMon: 12.0,
    status: 'PENDING',
    badge: 'QUOTE MATCHED',
  },
  {
    id: 'stage-3',
    stepName: '03. CONDITIONAL ESCROW LOCK',
    headline: 'Deterministic Policy Gate & Asset Lock',
    description: 'Policy Engine validates spending threshold (12 MON ≤ 20 MON cap). Funds are locked into a programmatic escrow contract pending cryptographic delivery proof.',
    actor: 'ResearchAgent-42',
    counterparty: 'Escrow Contract 0x62B9...7F03',
    valueMon: 12.0,
    status: 'LOCKED',
    badge: '12.0 MON LOCKED',
  },
  {
    id: 'stage-4',
    stepName: '04. MONAD SETTLEMENT',
    headline: 'Parallel Execution & Instant Finality',
    description: 'GeoVision delivers raster package hash. Escrow verifies SLA conditions and settles 12 MON to provider in sub-second Monad block #2419082.',
    actor: 'Escrow Contract',
    counterparty: 'GeoVision-Provider',
    valueMon: 12.0,
    status: 'SETTLED',
    badge: 'SETTLED IN 420ms',
  },
  {
    id: 'stage-5',
    stepName: '05. STRANDED VALUE DETECTION',
    headline: 'Expiring Residual Asset Telemetry',
    description: 'ResearchAgent consumed 15 of 50 scene units. The Economic Garbage Collector flags 35 idle tokens approaching expiration as stranded capital.',
    actor: 'ResearchAgent-42',
    counterparty: 'Economic GC Scanner',
    valueMon: 8.9,
    status: 'STRANDED',
    badge: '8.9 MON AT RISK',
  },
  {
    id: 'stage-6',
    stepName: '06. ALGORITHMIC VALUE RECOVERY',
    headline: 'Quantitative Expected Value Reclaim',
    description: 'The GC calculates EV(Transfer) = +4.6 MON vs EV(Keep) = 0.8 MON. Capital is algorithmically recovered via peer transfer, adding +4.6 MON back to the treasury.',
    actor: 'Economic GC Engine',
    counterparty: 'MarketAgent-5',
    valueMon: 4.6,
    status: 'RECOVERED',
    badge: '+4.6 MON RECLAIMED',
  },
];

export const EconomicLifecycle: React.FC = () => {
  const [activeStageIdx, setActiveStageIdx] = useState(0);
  const stage = LIFECYCLE_STAGES[activeStageIdx];

  return (
    <div className="w-full bg-[#062A3B]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 text-left">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="font-mono text-xs tracking-wider text-[#CFFF3D] uppercase font-semibold">
            ECONOMIC LIFECYCLE ENGINE
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-white mt-1">
            How Autonomous Capital Moves Through ECON
          </h3>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0">
          {LIFECYCLE_STAGES.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveStageIdx(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 cursor-pointer ${
                idx === activeStageIdx
                  ? 'bg-[#CFFF3D] text-[#062A3B] font-bold shadow-md shadow-[#CFFF3D]/20'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              Stage {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Main stage showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 items-center">
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs text-[#CFFF3D] uppercase tracking-wider font-semibold">
              {stage.stepName}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-white/10 text-white/90 border border-white/10">
              {stage.badge}
            </span>
          </div>

          <h4 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight mb-4">
            {stage.headline}
          </h4>

          <p className="text-base text-white/70 leading-relaxed max-w-xl">
            {stage.description}
          </p>

          <div className="flex items-center gap-4 mt-6">
            <button
              type="button"
              disabled={activeStageIdx === 0}
              onClick={() => setActiveStageIdx((prev) => Math.max(0, prev - 1))}
              className="px-4 py-2 rounded-lg text-xs font-mono bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 cursor-pointer"
            >
              ← Previous Stage
            </button>
            <button
              type="button"
              disabled={activeStageIdx === LIFECYCLE_STAGES.length - 1}
              onClick={() => setActiveStageIdx((prev) => Math.min(LIFECYCLE_STAGES.length - 1, prev + 1))}
              className="px-5 py-2 rounded-lg text-xs font-mono bg-[#CFFF3D] text-[#062A3B] font-bold hover:bg-[#b8e832] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Next Stage →
            </button>
          </div>
        </div>

        {/* Live telemetry card */}
        <div className="lg:col-span-5 bg-[#03141D] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="font-mono text-xs text-white/50">STAGE TELEMETRY</span>
            <span
              className={`font-mono text-xs px-2 py-0.5 rounded font-semibold ${
                stage.status === 'RECOVERED'
                  ? 'bg-[#FF8FA3]/20 text-[#FF8FA3]'
                  : stage.status === 'STRANDED'
                  ? 'bg-amber-400/20 text-amber-300'
                  : 'bg-[#CFFF3D]/20 text-[#CFFF3D]'
              }`}
            >
              {stage.status}
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-white/40">Primary Actor:</span>
              <span className="text-white font-medium">{stage.actor}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Counterparty:</span>
              <span className="text-white/90">{stage.counterparty}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Capital Delta:</span>
              <span
                className={`font-bold text-sm ${
                  stage.status === 'RECOVERED'
                    ? 'text-[#FF8FA3]'
                    : stage.status === 'STRANDED'
                    ? 'text-amber-400'
                    : 'text-[#CFFF3D]'
                }`}
              >
                {stage.status === 'RECOVERED' ? '+' : ''}
                {stage.valueMon} MON
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Settlement Chain:</span>
              <span className="text-white/80">Monad Testnet (10143)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

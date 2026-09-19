import React, { useState } from 'react';

export const RecoveryVisualizer: React.FC = () => {
  const [reclaimed, setReclaimed] = useState(false);
  const [treasury, setTreasury] = useState(184.0);

  const handleExecuteRecovery = () => {
    if (reclaimed) return;
    setReclaimed(true);
    setTreasury((prev) => Math.round((prev + 4.6) * 10) / 10);
  };

  const handleReset = () => {
    setReclaimed(false);
    setTreasury(184.0);
  };

  return (
    <div className="w-full bg-[#062A3B]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="font-mono text-xs tracking-wider text-[#FF8FA3] uppercase font-semibold">
            AUTONOMOUS VALUE RECOVERY ENGINE
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-white mt-1">
            Reclaiming Stranded Capital from Expiring Assets
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="font-mono text-xs text-white/50 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            Treasury Balance:{' '}
            <span className="text-[#CFFF3D] font-bold text-sm">
              {treasury.toFixed(1)} MON
            </span>
          </div>
          {reclaimed && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-mono text-white/60 hover:text-white px-2 py-1 rounded bg-white/5 border border-white/10 cursor-pointer"
            >
              Reset Demo
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 items-center">
        {/* Left: Field of Economic Objects */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex justify-between items-center text-xs font-mono text-white/50">
            <span>ACTIVE ASSET INVENTORY</span>
            <span>4 OBJECTS MONITORED</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Object 1: Healthy */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
              <div className="flex justify-between text-white/50 mb-1">
                <span>GPU-H100-MIN</span>
                <span className="text-[#CFFF3D]">94% USED</span>
              </div>
              <div className="text-white font-bold">120 Minutes</div>
              <div className="text-[11px] text-white/40 mt-1">Status: Active Consumption</div>
            </div>

            {/* Object 2: Healthy */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
              <div className="flex justify-between text-white/50 mb-1">
                <span>STORAGE-TB</span>
                <span className="text-[#CFFF3D]">78% USED</span>
              </div>
              <div className="text-white font-bold">2.4 TB-Month</div>
              <div className="text-[11px] text-white/40 mt-1">Status: Active Retention</div>
            </div>

            {/* Object 3: STRANDED OBJECT */}
            <div
              className={`col-span-2 p-4 rounded-xl border transition-all duration-300 font-mono text-xs ${
                reclaimed
                  ? 'bg-[#FF8FA3]/10 border-[#FF8FA3]/30'
                  : 'bg-amber-500/10 border-amber-400/40 shadow-lg shadow-amber-500/5'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider mb-1 ${
                      reclaimed ? 'bg-[#FF8FA3]/20 text-[#FF8FA3]' : 'bg-amber-400/20 text-amber-300'
                    }`}
                  >
                    {reclaimed ? 'RECOVERED VIA PEER TRANSFER' : 'STRANDED VALUE DETECTED'}
                  </span>
                  <div className="text-sm font-bold text-white">OBJ-API-SAT-3829</div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-white/50 block">Nominal Value</span>
                  <span className="text-sm font-bold text-amber-400">8.9 MON</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-[11px] text-white/70">
                <div>
                  <span className="text-white/40 block">Idle Quota</span>
                  <span>37 API Credits</span>
                </div>
                <div>
                  <span className="text-white/40 block">Utilization</span>
                  <span className="text-amber-400">18% (82% Unused)</span>
                </div>
                <div>
                  <span className="text-white/40 block">Time to Expiry</span>
                  <span>18.4 Hours</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Quantitative EV Decision & Reclaim Execution */}
        <div className="lg:col-span-6 bg-[#03141D] border border-white/10 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-mono text-xs text-white/50">EXPECTED VALUE EVALUATION</span>
            <span className="font-mono text-xs text-[#CFFF3D] font-semibold">
              OPTIMAL: TRANSFER (+4.6 MON)
            </span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between p-2.5 rounded bg-white/5">
              <span className="text-white/70">EV(Keep) — Retention with decay</span>
              <span className="text-white/50">0.8 MON</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-white/5">
              <span className="text-white/70">EV(Sell) — Secondary liquidation</span>
              <span className="text-white/70">3.2 MON</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-[#CFFF3D]/10 border border-[#CFFF3D]/30">
              <span className="text-[#CFFF3D] font-bold">EV(Transfer) — Peer allocation to MarketAgent-5</span>
              <span className="text-[#CFFF3D] font-bold">+4.6 MON</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-white/5">
              <span className="text-white/70">EV(Refund) — Issuer SLA claim</span>
              <span className="text-white/50">2.1 MON</span>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <div className="text-[11px] font-mono text-white/50">Reclaimable Capital</div>
              <div className="font-mono text-lg font-bold text-[#FF8FA3]">+4.6 MON</div>
            </div>

            <button
              type="button"
              disabled={reclaimed}
              onClick={handleExecuteRecovery}
              className={`w-full sm:w-auto px-6 py-3 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                reclaimed
                  ? 'bg-white/10 text-white/40 cursor-not-allowed border border-white/5'
                  : 'bg-[#FF8FA3] text-[#062A3B] hover:bg-[#ff7a93] shadow-lg shadow-[#FF8FA3]/25'
              }`}
            >
              {reclaimed ? '✓ Capital Reclaimed' : 'Execute Recovery →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

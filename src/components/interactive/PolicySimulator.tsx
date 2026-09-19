import React, { useState } from 'react';

export const PolicySimulator: React.FC = () => {
  const [amountMon, setAmountMon] = useState<number>(12);
  const [selectedCategory, setSelectedCategory] = useState<string>('DATA_SUBSCRIPTION');
  const [agentTreasury] = useState<number>(184.0);

  // Policy Rules
  const maxPerTx = 20.0;
  const minRetainedFloor = 50.0;
  const allowedCategories = ['GPU_COMPUTE_CREDIT', 'API_LICENSE', 'DATA_SUBSCRIPTION', 'STORAGE_CREDIT'];

  // Evaluation
  const violatesMaxTx = amountMon > maxPerTx;
  const violatesReserveFloor = agentTreasury - amountMon < minRetainedFloor;
  const violatesCategory = !allowedCategories.includes(selectedCategory);

  const isAllowed = !violatesMaxTx && !violatesReserveFloor && !violatesCategory;

  return (
    <div className="w-full bg-[#062A3B]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="font-mono text-xs tracking-wider text-[#CFFF3D] uppercase font-semibold">
            DETERMINISTIC SPENDING POLICY
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-white mt-1">
            Simulate Economic Authority & Bounds
          </h3>
        </div>
        <div className="font-mono text-xs text-white/50 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
          Agent Treasury: <span className="text-[#CFFF3D] font-bold">{agentTreasury} MON</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 items-center">
        {/* Controls */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-mono text-xs text-white/70">
                PROPOSED TRANSACTION AMOUNT
              </label>
              <span className="font-mono text-sm font-bold text-[#CFFF3D]">
                {amountMon} MON
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="75"
              step="1"
              value={amountMon}
              onChange={(e) => setAmountMon(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#CFFF3D]"
            />
            <div className="flex justify-between text-[11px] font-mono text-white/40 mt-1">
              <span>1 MON</span>
              <span className="text-amber-400/80">Max Cap: 20 MON</span>
              <span>75 MON</span>
            </div>
          </div>

          <div>
            <label className="block font-mono text-xs text-white/70 mb-2">
              RESOURCE CATEGORY
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['DATA_SUBSCRIPTION', 'GPU_COMPUTE_CREDIT', 'API_LICENSE', 'UNLISTED_SPECULATIVE'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-2 rounded-lg text-xs font-mono text-left transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#CFFF3D]/20 text-[#CFFF3D] border border-[#CFFF3D]/40 font-semibold'
                      : 'bg-white/5 text-white/60 hover:text-white border border-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Evaluation Output */}
        <div className="lg:col-span-6 bg-[#03141D] border border-white/10 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-mono text-xs text-white/50">PRE-FLIGHT DECISION</span>
            <span
              className={`font-mono text-xs px-3 py-1 rounded-full font-bold tracking-wider ${
                isAllowed
                  ? 'bg-[#CFFF3D]/20 text-[#CFFF3D] border border-[#CFFF3D]/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {isAllowed ? '✓ ALLOWED' : '✕ BLOCKED BY POLICY'}
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {/* Rule 1: Max Single Tx */}
            <div className="flex items-center justify-between p-2 rounded bg-white/5">
              <span className="text-white/70">Rule 1: Single Tx Cap (≤ 20 MON)</span>
              <span className={violatesMaxTx ? 'text-rose-400 font-bold' : 'text-[#CFFF3D]'}>
                {violatesMaxTx ? '✕ EXCEEDED' : '✓ PASSED'}
              </span>
            </div>

            {/* Rule 2: Minimum Floor */}
            <div className="flex items-center justify-between p-2 rounded bg-white/5">
              <span className="text-white/70">Rule 2: Reserve Floor (≥ 50 MON)</span>
              <span className={violatesReserveFloor ? 'text-rose-400 font-bold' : 'text-[#CFFF3D]'}>
                {violatesReserveFloor ? '✕ VIOLATED' : '✓ PASSED'}
              </span>
            </div>

            {/* Rule 3: Category Allowlist */}
            <div className="flex items-center justify-between p-2 rounded bg-white/5">
              <span className="text-white/70">Rule 3: Category Whitelist</span>
              <span className={violatesCategory ? 'text-rose-400 font-bold' : 'text-[#CFFF3D]'}>
                {violatesCategory ? '✕ NOT ALLOWED' : '✓ PASSED'}
              </span>
            </div>
          </div>

          <p className="text-xs text-white/60 leading-relaxed pt-2 border-t border-white/10">
            {isAllowed
              ? `Transaction of ${amountMon} MON satisfies all agent policy constraints. Pre-flight approved for Monad settlement.`
              : violatesMaxTx
              ? `Rejected: ${amountMon} MON exceeds agent's single transaction ceiling of ${maxPerTx} MON.`
              : violatesCategory
              ? `Rejected: ${selectedCategory} is not in the agent's authorized category allowlist.`
              : `Rejected: Transaction reduces treasury below minimum retained reserve floor.`}
          </p>
        </div>
      </div>
    </div>
  );
};

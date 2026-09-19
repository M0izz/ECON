import React, { useState, useEffect } from 'react';

export const MonadSettlementVisualizer: React.FC = () => {
  const [blockHeight, setBlockHeight] = useState(2419082);
  const [settledCount, setSettledCount] = useState(14892);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlockHeight((prev) => prev + 1);
      setSettledCount((prev) => prev + Math.floor(Math.random() * 8 + 3));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#062A3B]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="font-mono text-xs tracking-wider text-[#CFFF3D] uppercase font-semibold">
            PARALLEL EXECUTION SETTLEMENT
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-white mt-1">
            Settled on Monad
          </h3>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Chain ID: 10143
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-white/5 text-white/70 border border-white/10">
            Block #{blockHeight}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
        <div className="p-5 rounded-xl bg-[#03141D] border border-white/10">
          <div className="text-xs font-mono text-white/50 mb-1">EXECUTION ARCHITECTURE</div>
          <div className="text-lg font-bold text-white font-mono">Parallel EVM & Async I/O</div>
          <p className="text-xs text-white/60 mt-2 leading-relaxed font-sans">
            Independent agent transactions execute concurrently across isolated state lanes with zero head-of-line blocking.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-[#03141D] border border-white/10">
          <div className="text-xs font-mono text-white/50 mb-1">CONSENSUS & FINALITY</div>
          <div className="text-lg font-bold text-[#CFFF3D] font-mono">Sub-Second Pipelining</div>
          <p className="text-xs text-white/60 mt-2 leading-relaxed font-sans">
            Conditional escrow release and state proofs confirm in under 500ms with MonadBFT finality.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-[#03141D] border border-white/10">
          <div className="text-xs font-mono text-white/50 mb-1">TRANSACTIONS SETTLED</div>
          <div className="text-lg font-bold text-white font-mono">{settledCount.toLocaleString()} Verified</div>
          <p className="text-xs text-white/60 mt-2 leading-relaxed font-sans">
            High-frequency agent micropayments settle with negligible Monad native gas footprint.
          </p>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs font-mono text-white/50">
        <span>RPC: https://testnet-rpc.monad.xyz</span>
        <span>Explorer: testnet.monadexplorer.com</span>
      </div>
    </div>
  );
};

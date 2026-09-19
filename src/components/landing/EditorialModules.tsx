import React from 'react';
import { EconomicStore } from '../../sdk/store';
import { PolicySimulator } from '../interactive/PolicySimulator';
import { RecoveryVisualizer } from '../interactive/RecoveryVisualizer';
import { AgentRuntimeDemo } from '../interactive/AgentRuntimeDemo';
import { MonadSettlementVisualizer } from '../interactive/MonadSettlementVisualizer';

interface EditorialModulesProps {
  store: EconomicStore;
  onEnterConsole: (targetTab?: string) => void;
}

export const EditorialModules: React.FC<EditorialModulesProps> = ({ store, onEnterConsole }) => {
  const derived = store.getDerivedState();

  return (
    <div className="w-full space-y-24 py-12">
      {/* SECTION: COUNTERPARTY DISCOVERY & POLICY */}
      <section className="w-full max-w-7xl mx-auto px-6 md:px-12 text-left">
        <div className="max-w-3xl mb-8">
          <div className="font-mono text-xs tracking-wider text-[#CFFF3D] uppercase font-semibold mb-2">
            CONTROLLED AUTHORITY
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase leading-tight">
            Deterministic Spending Boundaries.
          </h2>
          <p className="text-base text-white/70 mt-3 leading-relaxed">
            AI proposes transactions; ECON Policy decides. Every attempted transaction is validated against
            agent velocity limits, minimum reserve balances, and category whitelists prior to settlement.
          </p>
        </div>

        <PolicySimulator />
      </section>

      {/* SECTION: SETTLEMENT ON MONAD */}
      <section className="w-full max-w-7xl mx-auto px-6 md:px-12 text-left">
        <div className="max-w-3xl mb-8">
          <div className="font-mono text-xs tracking-wider text-[#CFFF3D] uppercase font-semibold mb-2">
            SETTLEMENT FABRIC
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase leading-tight">
            Built for Autonomous Economies. Settled on Monad.
          </h2>
          <p className="text-base text-white/70 mt-3 leading-relaxed">
            Sequential blockchains choke when swarms of autonomous agents execute high-frequency micropayments.
            ECON routes transactions to Monad's 10,000 TPS parallel EVM for sub-second atomic finality.
          </p>
        </div>

        <MonadSettlementVisualizer />
      </section>

      {/* SECTION: SIGNATURE HERO FEATURE — THE ECONOMIC GARBAGE COLLECTOR */}
      <section className="w-full max-w-7xl mx-auto px-6 md:px-12 text-left">
        <div className="max-w-4xl mb-8">
          <div className="font-mono text-xs tracking-wider text-[#FF8FA3] uppercase font-semibold mb-2">
            VALUE RECOVERY
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight uppercase leading-tight">
            What happens to value{' '}
            <span className="text-[#FF8FA3]">an agent stops using?</span>
          </h2>
          <p className="text-base sm:text-lg text-white/70 mt-4 leading-relaxed max-w-2xl font-sans">
            In standard smart contracts, abandoned deposits, expired API quotas, and forgotten escrows sit stranded forever.
            ECON's Economic Garbage Collector finds stranded resources and determines whether they should be retained,
            transferred, sold, or refunded.
          </p>
        </div>

        <RecoveryVisualizer />
      </section>

      {/* SECTION: LIVE NORMALIZED PROTOCOL STATE */}
      <section className="w-full max-w-7xl mx-auto px-6 md:px-12 text-left">
        <div className="p-8 md:p-10 rounded-2xl bg-[#062A3B]/40 backdrop-blur-xl border border-white/10">
          <div className="max-w-2xl mb-8">
            <div className="font-mono text-xs tracking-wider text-[#CFFF3D] uppercase font-semibold mb-2">
              NORMALIZED PROTOCOL STATE
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase">
              Verifiable Network Ledger
            </h3>
            <p className="text-xs sm:text-sm text-white/60 mt-1">
              Projected directly from econ.store state engine. Zero synthetic ticker claims.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            <div className="p-5 rounded-xl bg-[#03141D] border border-white/10">
              <span className="text-[11px] text-white/40 block">TOTAL TREASURY</span>
              <span className="text-xl md:text-2xl font-bold text-white mt-1 block">
                {derived.totalTreasuryMon.toFixed(2)} MON
              </span>
              <span className="text-[10px] text-white/50 mt-1 block">Non-custodial agent vaults</span>
            </div>

            <div className="p-5 rounded-xl bg-[#03141D] border border-white/10">
              <span className="text-[11px] text-white/40 block">ACTIVE AGENTS</span>
              <span className="text-xl md:text-2xl font-bold text-[#CFFF3D] mt-1 block">
                {derived.activeAgentsCount} Sovereign
              </span>
              <span className="text-[10px] text-white/50 mt-1 block">ERC-8004 Registry</span>
            </div>

            <div className="p-5 rounded-xl bg-[#03141D] border border-white/10">
              <span className="text-[11px] text-white/40 block">ECONOMIC OBJECTS</span>
              <span className="text-xl md:text-2xl font-bold text-white mt-1 block">
                {derived.totalCirculatingObjects} Units
              </span>
              <span className="text-[10px] text-white/50 mt-1 block">Compute, API, Escrow</span>
            </div>

            <div className="p-5 rounded-xl bg-[#03141D] border border-[#FF8FA3]/20">
              <span className="text-[11px] text-white/40 block">CAPITAL RECLAIMED</span>
              <span className="text-xl md:text-2xl font-bold text-[#FF8FA3] mt-1 block">
                +{derived.totalRecoveredValueMon.toFixed(2)} MON
              </span>
              <span className="text-[10px] text-white/50 mt-1 block">Autonomous GC Engine</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: LIVE SDK RUNTIME DEMO */}
      <section className="w-full max-w-7xl mx-auto px-6 md:px-12 text-left">
        <div className="max-w-3xl mb-8">
          <div className="font-mono text-xs tracking-wider text-[#CFFF3D] uppercase font-semibold mb-2">
            DEVELOPER INTEGRATION
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase leading-tight">
            Give Your Agents an Economy.
          </h2>
          <p className="text-base text-white/70 mt-3 leading-relaxed">
            Integrate ECON into existing autonomous agent runtimes in minutes.
            Watch code execution drive sovereign identity, escrow locks, and value recovery in real-time.
          </p>
        </div>

        <AgentRuntimeDemo />
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="w-full max-w-7xl mx-auto px-6 md:px-12 text-center pt-8 pb-16">
        <div className="p-12 md:p-16 rounded-3xl bg-gradient-to-b from-[#062A3B] to-[#03141D] border border-white/10 flex flex-col items-center">
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight uppercase max-w-3xl leading-[1.05]">
            Deploy an Autonomous Economic Agent.
          </h2>
          <p className="text-base text-white/70 max-w-xl mt-4 leading-relaxed font-sans">
            Connect to Monad Testnet or run deterministic local simulations.
            Begin building self-sustaining autonomous economies today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <button
              type="button"
              onClick={() => onEnterConsole('AGENT_BUILDER')}
              className="px-8 py-4 rounded-xl font-mono text-sm font-bold bg-[#CFFF3D] text-[#062A3B] hover:bg-[#b8e832] transition-all duration-200 shadow-xl shadow-[#CFFF3D]/25 cursor-pointer flex items-center gap-2"
            >
              <span>Launch ECON</span>
              <span className="text-base font-bold">↗</span>
            </button>
            <button
              type="button"
              onClick={() => onEnterConsole('OVERVIEW')}
              className="px-8 py-4 rounded-xl font-mono text-sm font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all duration-200 cursor-pointer flex items-center gap-2"
            >
              <span>Enter Console</span>
              <span className="text-base">→</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

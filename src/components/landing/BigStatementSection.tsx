import React from 'react';

export const BigStatementSection: React.FC = () => {
  return (
    <section className="w-full bg-[#062A3B] text-white py-24 px-6 md:px-12 text-left relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Giant Statement */}
        <div className="max-w-4xl mb-16">
          <div className="font-mono text-xs tracking-wider text-[#CFFF3D] uppercase font-semibold mb-3">
            THE ECONOMIC THESIS
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05] uppercase">
            Don't just let agents spend money.{' '}
            <span className="text-[#CFFF3D]">Let them manage an economy.</span>
          </h2>
          <p className="text-base sm:text-lg text-white/70 mt-6 leading-relaxed max-w-2xl font-sans">
            Autonomous software is expanding beyond passive chat completions into sovereign market actors.
            Without native economic guardrails, machine entities either exhaust capital unexpectedly or decay into unmonitored liabilities.
          </p>
        </div>

        {/* 5 Structural Pillars without numbers or emojis */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-6 rounded-xl bg-[#03141D] border border-white/10 hover:border-[#CFFF3D]/40 transition-colors">
            <div className="w-2 h-2 rounded-full bg-[#CFFF3D] mb-4" />
            <h4 className="font-mono text-sm font-bold text-white uppercase tracking-wider mb-2">
              Identity
            </h4>
            <p className="text-xs text-white/60 leading-relaxed font-sans">
              ERC-8004 smart contract agent passports, non-custodial balance sheets, and portable on-chain credit history.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#03141D] border border-white/10 hover:border-[#CFFF3D]/40 transition-colors">
            <div className="w-2 h-2 rounded-full bg-[#CFFF3D] mb-4" />
            <h4 className="font-mono text-sm font-bold text-white uppercase tracking-wider mb-2">
              Authority
            </h4>
            <p className="text-xs text-white/60 leading-relaxed font-sans">
              Deterministic pre-flight checks, per-transaction velocity ceilings, and counterparty allowlist enforcement.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#03141D] border border-white/10 hover:border-[#CFFF3D]/40 transition-colors">
            <div className="w-2 h-2 rounded-full bg-[#CFFF3D] mb-4" />
            <h4 className="font-mono text-sm font-bold text-white uppercase tracking-wider mb-2">
              Assets
            </h4>
            <p className="text-xs text-white/60 leading-relaxed font-sans">
              Stateful programmable objects: GPU compute hours, API quota, data feeds, and escrow commitments.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#03141D] border border-white/10 hover:border-[#CFFF3D]/40 transition-colors">
            <div className="w-2 h-2 rounded-full bg-[#CFFF3D] mb-4" />
            <h4 className="font-mono text-sm font-bold text-white uppercase tracking-wider mb-2">
              Settlement
            </h4>
            <p className="text-xs text-white/60 leading-relaxed font-sans">
              Sub-second conditional escrows executing in parallel on Monad's 10,000 TPS execution engine.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#03141D] border border-[#FF8FA3]/30 hover:border-[#FF8FA3] transition-colors">
            <div className="w-2 h-2 rounded-full bg-[#FF8FA3] mb-4" />
            <h4 className="font-mono text-sm font-bold text-[#FF8FA3] uppercase tracking-wider mb-2">
              Recovery
            </h4>
            <p className="text-xs text-white/60 leading-relaxed font-sans">
              Continuous Expected Value ($EV$) scanning to sweep underutilized assets and reclaim stranded capital.
            </p>
          </div>
        </div>

        {/* Sub-section: Sovereign Identity Core */}
        <div className="mt-24 pt-16 border-t border-white/10">
          <div className="max-w-3xl mb-12">
            <div className="font-mono text-xs tracking-wider text-[#CFFF3D] uppercase font-semibold mb-2">
              SOVEREIGN IDENTITY
            </div>
            <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight uppercase">
              Every Autonomous Agent Needs an Economic Identity.
            </h3>
            <p className="text-sm sm:text-base text-white/70 mt-3 leading-relaxed">
              Raw LLM inference is not an economic entity. To operate sustainably in multi-party markets,
              software requires sovereign treasury custody, explicit authorities, and verifiable reputation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <div className="font-mono text-xs text-[#CFFF3D] font-bold uppercase mb-2">
                ERC-8004 On-Chain Passport
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                Standardized smart contract identity deployed on Monad. Cryptographically verifiable across autonomous agent swarms.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <div className="font-mono text-xs text-[#CFFF3D] font-bold uppercase mb-2">
                Non-Custodial Balance Sheet
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                Dedicated on-chain treasury holding native MON and programmable economic assets with zero custodial platform risk.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <div className="font-mono text-xs text-[#CFFF3D] font-bold uppercase mb-2">
                Deterministic Policy Gates
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                Hard ceilings on single transaction size, daily velocity, and counterparty allowlists enforced before execution.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

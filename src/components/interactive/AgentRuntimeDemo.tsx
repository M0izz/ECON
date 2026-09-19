import React, { useState } from 'react';

interface SdkStep {
  step: string;
  title: string;
  code: string;
  agentCard: {
    name: string;
    status: string;
    treasury: string;
    dailyLimit: string;
    capabilities: string[];
    activityBadge: string;
    checks?: { name: string; status: string }[];
  };
}

const SDK_STEPS: SdkStep[] = [
  {
    step: 'STEP 01',
    title: 'Create Economic Identity',
    code: `import { ECON } from '@econ/sdk';

const econ = new ECON();
const agent = await econ.identity.register({
  name: "TradingAgent",
  purpose: "Autonomous Liquidity & Compute Arbitrage",
  initialBalanceMon: 50.0
});`,
    agentCard: {
      name: 'TRADING AGENT',
      status: 'IDENTITY REGISTERED',
      treasury: '50.0 MON',
      dailyLimit: 'Unbounded',
      capabilities: ['Wallet Sovereign', 'Identity Active'],
      activityBadge: '0x1842...47A1',
    },
  },
  {
    step: 'STEP 02',
    title: 'Enforce Spending Policy',
    code: `await agent.policy.set({
  maxPerTransaction: 15.0,
  dailySpendingLimit: 60.0,
  minRetainedBalance: 10.0,
  allowedCategories: ['GPU_COMPUTE', 'API_LICENSE']
});`,
    agentCard: {
      name: 'TRADING AGENT',
      status: 'POLICY BOUNDED',
      treasury: '50.0 MON',
      dailyLimit: '60.0 MON Cap',
      capabilities: ['Max Tx: 15 MON', 'Min Reserve: 10 MON'],
      activityBadge: 'POLICY ACTIVE',
    },
  },
  {
    step: 'STEP 03',
    title: 'Discover Counterparties',
    code: `const providers = await agent.tools.discover({
  capability: "gpu-cluster",
  maxPrice: 15.0,
  minReputation: 95.0
});
const quote = await agent.tools.quote({
  serviceId: providers[0].id
});`,
    agentCard: {
      name: 'TRADING AGENT',
      status: 'MATCHED COUNTERPARTY',
      treasury: '50.0 MON',
      dailyLimit: '60.0 MON Cap',
      capabilities: ['Nebula GPU Cluster', 'Reputation: 99.1%'],
      activityBadge: 'QUOTE: 12.0 MON',
    },
  },
  {
    step: 'STEP 04',
    title: 'Conditional Escrow Lock',
    code: `const escrow = await agent.tools.createEscrow({
  sellerId: quote.providerId,
  amountMon: quote.totalPriceMon,
  condition: "GPU_NODE_COMPUTE_PROOF_BATCH_1"
});`,
    agentCard: {
      name: 'TRADING AGENT',
      status: 'ESCROW LOCKED',
      treasury: '38.0 MON (-12.0 LOCKED)',
      dailyLimit: '60.0 MON Cap',
      capabilities: ['Policy Check ✓', 'Condition Set ✓'],
      activityBadge: 'ESCROW #62B9...7F03',
      checks: [
        { name: 'Policy Pre-Flight Check', status: '✓ PASSED' },
        { name: 'Reserve Balance Check', status: '✓ PASSED' },
        { name: 'Conditional Lock', status: '✓ 12.0 MON' },
      ],
    },
  },
  {
    step: 'STEP 05',
    title: 'Settle on Monad',
    code: `// Sub-second parallel settlement on Monad Testnet (Chain ID 10143)
const receipt = await agent.escrow.verifyAndRelease(escrow.id);
console.log("Settlement TxHash:", receipt.settlementHash);`,
    agentCard: {
      name: 'TRADING AGENT',
      status: 'SETTLED (MONAD BLOCK #2419082)',
      treasury: '38.0 MON',
      dailyLimit: '48.0 MON Remaining',
      capabilities: ['Sub-second Finality', 'Asset Delivered'],
      activityBadge: 'TX: 0x8a91...4c19',
      checks: [
        { name: 'Delivery Proof Verified', status: '✓ PASSED' },
        { name: 'Monad EVM Execution', status: '✓ SUB-SECOND' },
        { name: 'Receipt Confirmed', status: '✓ 12.0 MON' },
      ],
    },
  },
  {
    step: 'STEP 06',
    title: 'Recover Stranded Value',
    code: `const stranded = await agent.tools.scanRecovery();
const plan = await agent.gc.plan(stranded[0].objectId);
// Algorithmic peer reallocation (+4.6 MON)
await agent.tools.requestRecovery({ objectId: plan.objectId });`,
    agentCard: {
      name: 'TRADING AGENT',
      status: 'CAPITAL RECLAIMED',
      treasury: '42.6 MON (+4.6 RECOVERED)',
      dailyLimit: '48.0 MON Remaining',
      capabilities: ['Stranded Value Reclaimed', 'Inventory Clean'],
      activityBadge: 'RECOVERED +4.6 MON',
      checks: [
        { name: 'Stranded Value Scan', status: '✓ 37 CREDITS IDLE' },
        { name: 'EV Evaluation', status: '✓ TRANSFER OPTIMAL' },
        { name: 'Treasury Restored', status: '✓ +4.6 MON' },
      ],
    },
  },
];

export const AgentRuntimeDemo: React.FC = () => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const active = SDK_STEPS[currentStepIdx];

  return (
    <div className="w-full bg-[#062A3B]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="font-mono text-xs tracking-wider text-[#CFFF3D] uppercase font-semibold">
            DEVELOPER INTEGRATION RUNTIME
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-white mt-1">
            Give Your Agents an Economy
          </h3>
        </div>

        {/* Step Scrubber */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-2 md:pb-0">
          {SDK_STEPS.map((s, idx) => (
            <button
              key={s.step}
              type="button"
              onClick={() => setCurrentStepIdx(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 cursor-pointer ${
                idx === currentStepIdx
                  ? 'bg-[#CFFF3D] text-[#062A3B] font-bold shadow-md shadow-[#CFFF3D]/20'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {s.step}
            </button>
          ))}
        </div>
      </div>

      {/* Code + Live Agent UI Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 items-stretch">
        {/* Left: Interactive Code Block */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-[#03141D] border border-white/10 rounded-xl p-5">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <span className="font-mono text-xs text-[#CFFF3D] font-semibold">
                {active.step} — {active.title}
              </span>
              <span className="font-mono text-[11px] text-white/40">TypeScript / Viem</span>
            </div>
            <pre className="font-mono text-xs text-white/85 overflow-x-auto leading-relaxed whitespace-pre font-normal">
              <code>{active.code}</code>
            </pre>
          </div>

          <div className="flex items-center justify-between pt-4 mt-6 border-t border-white/10 text-xs font-mono">
            <span className="text-white/40">SDK: @econ/sdk (v0.1.0)</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentStepIdx === 0}
                onClick={() => setCurrentStepIdx((p) => Math.max(0, p - 1))}
                className="px-3 py-1.5 rounded bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-30 cursor-pointer"
              >
                ← Prev
              </button>
              <button
                type="button"
                disabled={currentStepIdx === SDK_STEPS.length - 1}
                onClick={() => setCurrentStepIdx((p) => Math.min(SDK_STEPS.length - 1, p + 1))}
                className="px-4 py-1.5 rounded bg-[#CFFF3D] text-[#062A3B] font-bold hover:bg-[#b8e832] disabled:opacity-30 cursor-pointer"
              >
                Next Step →
              </button>
            </div>
          </div>
        </div>

        {/* Right: Real-time Live Economic Agent UI */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-[#062A3B] border border-[#CFFF3D]/30 rounded-xl p-6 shadow-xl shadow-black/40">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#CFFF3D] animate-ping" />
                <span className="font-mono text-xs font-bold text-white tracking-wide">
                  {active.agentCard.name}
                </span>
              </div>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#CFFF3D]/20 text-[#CFFF3D] border border-[#CFFF3D]/30 font-semibold">
                {active.agentCard.status}
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs mb-5">
              <div className="flex justify-between items-center p-2 rounded bg-white/5">
                <span className="text-white/50">Treasury Balance:</span>
                <span className="text-[#CFFF3D] font-bold text-sm">
                  {active.agentCard.treasury}
                </span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-white/5">
                <span className="text-white/50">Daily Spending Limit:</span>
                <span className="text-white font-medium">
                  {active.agentCard.dailyLimit}
                </span>
              </div>

              <div className="p-2.5 rounded bg-white/5 space-y-1">
                <span className="text-white/50 block mb-1">Active Capabilities:</span>
                <div className="flex flex-wrap gap-1.5">
                  {active.agentCard.capabilities.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded bg-white/10 text-white/80 text-[10px]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Step Checkmarks */}
            {active.agentCard.checks && (
              <div className="space-y-1.5 pt-2 border-t border-white/10 font-mono text-xs">
                {active.agentCard.checks.map((chk) => (
                  <div key={chk.name} className="flex justify-between text-[11px]">
                    <span className="text-white/60">{chk.name}</span>
                    <span className="text-[#CFFF3D] font-semibold">{chk.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-between items-center font-mono text-[11px] text-white/40">
            <span>State Engine: econ.store</span>
            <span className="text-[#CFFF3D]">{active.agentCard.activityBadge}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

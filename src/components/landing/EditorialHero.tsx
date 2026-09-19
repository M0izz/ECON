import React, { useState } from 'react';
import { EconomicFlowField, FlowLifecycleState } from '../interactive/EconomicFlowField';

interface EditorialHeroProps {
  onEnterConsole: (targetTab?: string) => void;
}

export const EditorialHero: React.FC<EditorialHeroProps> = ({ onEnterConsole }) => {
  const [flowState, setFlowState] = useState<FlowLifecycleState>('ACTIVITY');

  return (
    <section className="relative w-full pt-32 pb-16 px-6 md:px-12 flex flex-col items-center text-center overflow-hidden bg-[#03141D]">
      {/* Top Refined Eyebrow */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-[#CFFF3D] animate-pulse" />
        <span className="font-mono text-xs text-[#CFFF3D] tracking-widest uppercase font-semibold">
          ECONOMIC INFRASTRUCTURE FOR AGENTS
        </span>
      </div>

      {/* Massive Headline */}
      <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[92px] font-black text-white tracking-tight leading-[0.96] max-w-6xl uppercase">
        The Economic Operating Layer for Autonomous Agents.
      </h1>

      {/* Concise Editorial Subtitle */}
      <p className="text-base sm:text-lg md:text-xl text-white/70 max-w-2xl mt-6 leading-relaxed font-sans">
        Give software an economic identity, balance sheets, policy constraints,
        and autonomous value recovery. Built for autonomous economies. Settled on Monad.
      </p>

      {/* Button Group */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-8 z-20">
        <button
          type="button"
          onClick={() => onEnterConsole('AGENT_BUILDER')}
          className="px-7 py-3.5 rounded-xl font-mono text-sm font-bold bg-[#CFFF3D] text-[#062A3B] hover:bg-[#b8e832] transition-all duration-200 shadow-lg shadow-[#CFFF3D]/20 cursor-pointer flex items-center gap-2"
        >
          <span>Start Building</span>
          <span className="text-base">↗</span>
        </button>

        <button
          type="button"
          onClick={() => onEnterConsole('OVERVIEW')}
          className="px-7 py-3.5 rounded-xl font-mono text-sm font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all duration-200 cursor-pointer flex items-center gap-2"
        >
          <span>Enter Console</span>
          <span className="text-base">→</span>
        </button>
      </div>

      {/* 50-70% Viewport Interactive Economic Flow Field Visual */}
      <div className="w-full max-w-7xl mt-12 rounded-2xl border border-white/10 bg-[#062A3B]/40 backdrop-blur-xl shadow-2xl shadow-black/80 overflow-hidden relative">
        <EconomicFlowField
          currentState={flowState}
          onStateChange={setFlowState}
          interactive={true}
        />
      </div>
    </section>
  );
};

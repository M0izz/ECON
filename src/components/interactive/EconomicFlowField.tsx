import React, { useEffect, useRef, useState, useCallback } from 'react';

export type FlowLifecycleState =
  | 'ACTIVITY'
  | 'DISCOVERY'
  | 'ESCROW'
  | 'SETTLED'
  | 'STRANDED'
  | 'RECOVERED';

interface EconomicFlowFieldProps {
  currentState?: FlowLifecycleState;
  onStateChange?: (state: FlowLifecycleState) => void;
  interactive?: boolean;
  className?: string;
}

interface Ribbon {
  id: number;
  baseY: number;
  amplitude: number;
  frequency: number;
  speed: number;
  phase: number;
  width: number;
  color: string;
  alpha: number;
  type: 'PRIMARY' | 'SECONDARY' | 'RECOVERY' | 'SETTLEMENT';
}

const LIFECYCLE_STATES: { key: FlowLifecycleState; label: string; detail: string; amount: string }[] = [
  { key: 'ACTIVITY', label: 'ECONOMIC CIRCULATION', detail: 'Autonomous agents continuously trade compute, APIs, and models.', amount: '48.2 MON' },
  { key: 'DISCOVERY', label: 'COUNTERPARTY DISCOVERY', detail: 'Stream separates from field toward verified geospatial provider.', amount: '12.0 MON' },
  { key: 'ESCROW', label: 'CONDITIONAL ESCROW LOCK', detail: 'Capital concentrates into programmatic condition smart contract.', amount: '12.0 MON LOCKED' },
  { key: 'SETTLED', label: 'MONAD PIPELINE SETTLEMENT', detail: 'Instant sub-second parallel execution and state transition.', amount: 'SETTLED #2419082' },
  { key: 'STRANDED', label: 'STRANDED VALUE DETECTED', detail: 'Unused quota isolates as residual capital approaching expiry.', amount: '8.9 MON IDLE' },
  { key: 'RECOVERED', label: 'ALGORITHMIC VALUE RECOVERY', detail: 'Economic GC reclaims stranded asset via optimal peer reallocation.', amount: '+4.6 MON RECLAIMED' },
];

export const EconomicFlowField: React.FC<EconomicFlowFieldProps> = ({
  currentState = 'ACTIVITY',
  onStateChange,
  interactive = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const animFrameRef = useRef<number | null>(null);

  const [activeState, setActiveState] = useState<FlowLifecycleState>(currentState);
  const [hoveredData, setHoveredData] = useState<{ visible: boolean; x: number; y: number; text: string; subtext: string }>({
    visible: false,
    x: 0,
    y: 0,
    text: '',
    subtext: '',
  });

  // Sync internal state with prop
  useEffect(() => {
    setActiveState(currentState);
  }, [currentState]);

  const handleStateClick = (state: FlowLifecycleState) => {
    setActiveState(state);
    if (onStateChange) onStateChange(state);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    };

    // Calculate proximity to main ribbon stream for tooltip
    const relY = (e.clientY - rect.top) / rect.height;
    if (relY > 0.35 && relY < 0.65) {
      setHoveredData({
        visible: true,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 40,
        text: 'VALUE FLOW: +12.0 MON',
        subtext: 'ResearchAgent-42 → GeoVision-Provider',
      });
    } else {
      setHoveredData((prev) => ({ ...prev, visible: false }));
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current.active = false;
    setHoveredData((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 1200);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 650);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Generate volumetric ribbons
    const ribbons: Ribbon[] = [];
    const ribbonCount = 28;

    for (let i = 0; i < ribbonCount; i++) {
      const progress = i / ribbonCount;
      const isRecovery = i >= ribbonCount - 5;
      const isSettlement = i >= 8 && i <= 14;

      ribbons.push({
        id: i,
        baseY: 0.25 + progress * 0.5, // Center band
        amplitude: 25 + Math.sin(i * 0.8) * 18,
        frequency: 0.0018 + (i % 4) * 0.0006,
        speed: 0.008 + (i % 3) * 0.004,
        phase: (i * Math.PI) / 6,
        width: 1.5 + (i % 3) * 1.8,
        color: isRecovery ? '#FF8FA3' : isSettlement ? '#CFFF3D' : (i % 2 === 0 ? '#CFFF3D' : '#8DBB02'),
        alpha: 0.15 + (i % 5) * 0.12,
        type: isRecovery ? 'RECOVERY' : isSettlement ? 'SETTLEMENT' : 'PRIMARY',
      });
    }

    let time = 0;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = () => {
      time += prefersReducedMotion ? 0.003 : 0.012;
      ctx.clearRect(0, 0, width, height);

      // Deep atmospheric gradient
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.48,
        50,
        width * 0.5,
        height * 0.5,
        width * 0.7
      );
      bgGrad.addColorStop(0, 'rgba(6, 42, 59, 0.45)');
      bgGrad.addColorStop(0.6, 'rgba(3, 20, 29, 0.25)');
      bgGrad.addColorStop(1, 'rgba(3, 20, 29, 0.0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Render flowing volumetric ribbons
      ribbons.forEach((ribbon) => {
        ctx.save();
        ctx.beginPath();

        let stateDisplacement = 0;
        let stateAlphaMod = 1;
        let stateColor = ribbon.color;

        // Apply state-specific fluid physics
        switch (activeState) {
          case 'DISCOVERY':
            if (ribbon.type === 'SETTLEMENT') {
              stateDisplacement = Math.sin(time * 2 + ribbon.phase) * 35;
            }
            break;
          case 'ESCROW':
            // Streams converge into a tight bundle in the center
            stateDisplacement = (0.5 - ribbon.baseY) * height * 0.45;
            stateAlphaMod = ribbon.type === 'SETTLEMENT' ? 1.6 : 0.7;
            break;
          case 'SETTLED':
            // Rapid smooth parallel flow with green flash
            stateAlphaMod = 1.8;
            stateColor = '#CFFF3D';
            break;
          case 'STRANDED':
            if (ribbon.type === 'RECOVERY') {
              stateAlphaMod = 0.25;
              stateDisplacement = 50;
            }
            break;
          case 'RECOVERED':
            if (ribbon.type === 'RECOVERY') {
              stateAlphaMod = 2.0;
              stateColor = '#FF8FA3'; // Pink recovery accent
              stateDisplacement = Math.sin(time * 3 + ribbon.phase) * -40;
            }
            break;
          case 'ACTIVITY':
          default:
            stateDisplacement = 0;
            stateAlphaMod = 1;
            break;
        }

        const effectiveBaseY = ribbon.baseY * height + stateDisplacement;

        for (let x = 0; x <= width; x += 12) {
          const normX = x / width;
          let wave = Math.sin(x * ribbon.frequency + ribbon.phase + time * ribbon.speed) * ribbon.amplitude;

          // Mouse attraction: fluid surface bends organically toward cursor
          if (mouseRef.current.active && interactive) {
            const dx = x - mouseRef.current.x;
            const dist = Math.abs(dx);
            if (dist < 260) {
              const influence = Math.cos((dist / 260) * (Math.PI / 2));
              const targetY = mouseRef.current.y;
              wave += (targetY - effectiveBaseY) * influence * 0.35;
            }
          }

          // Center envelope to keep edges gentle
          const envelope = Math.sin(normX * Math.PI);
          const y = effectiveBaseY + wave * envelope;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.lineWidth = ribbon.width;
        ctx.strokeStyle = stateColor;
        ctx.globalAlpha = Math.min(1, ribbon.alpha * stateAlphaMod);
        ctx.stroke();
        ctx.restore();
      });

      // Interactive focal point when in Escrow or Settled state
      if (activeState === 'ESCROW' || activeState === 'SETTLED') {
        const cx = width * 0.5;
        const cy = height * 0.5;

        ctx.save();
        const pulse = (Math.sin(time * 3) + 1) * 0.5;
        const glowRadius = 40 + pulse * 25;

        const focalGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, glowRadius);
        focalGrad.addColorStop(0, activeState === 'SETTLED' ? 'rgba(207, 255, 61, 0.7)' : 'rgba(34, 211, 238, 0.6)');
        focalGrad.addColorStop(1, 'rgba(207, 255, 61, 0)');
        ctx.fillStyle = focalGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // High precision center ring
        ctx.strokeStyle = activeState === 'SETTLED' ? '#CFFF3D' : '#22D3EE';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeState, interactive]);

  const currentStateMeta = LIFECYCLE_STATES.find((s) => s.key === activeState) || LIFECYCLE_STATES[0];

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ minHeight: '560px' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Hover Telemetry Card */}
      {hoveredData.visible && (
        <div
          className="absolute pointer-events-none z-30 px-3.5 py-2 rounded border bg-[#062A3B]/90 backdrop-blur-md text-left transition-opacity duration-150"
          style={{
            left: `${hoveredData.x}px`,
            top: `${hoveredData.y}px`,
            borderColor: 'rgba(207, 255, 61, 0.35)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div className="font-mono text-[10px] tracking-wider text-[#CFFF3D] uppercase font-semibold">
            {hoveredData.text}
          </div>
          <div className="font-mono text-[11px] text-white/70 mt-0.5">
            {hoveredData.subtext}
          </div>
        </div>
      )}

      {/* Bottom Interactive Economic Lifecycle Controller */}
      <div className="absolute bottom-6 left-6 right-6 z-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl bg-[#062A3B]/80 backdrop-blur-lg border border-white/10">
        <div className="flex flex-col text-left max-w-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#CFFF3D] animate-pulse" />
            <span className="font-mono text-xs text-[#CFFF3D] tracking-wider uppercase font-semibold">
              {currentStateMeta.label}
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/5 text-white/80 border border-white/10">
              {currentStateMeta.amount}
            </span>
          </div>
          <p className="text-xs text-white/70 mt-1 leading-relaxed">
            {currentStateMeta.detail}
          </p>
        </div>

        {/* State Scrubber */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0">
          {LIFECYCLE_STATES.map((s, idx) => {
            const isActive = s.key === activeState;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => handleStateClick(s.key)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#CFFF3D] text-[#062A3B] font-semibold shadow-md shadow-[#CFFF3D]/20'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                {idx + 1}. {s.key}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

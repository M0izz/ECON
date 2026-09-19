import React, { useEffect, useRef, useState } from 'react';

interface EconomicNode {
  id: string;
  label: string;
  x: number;
  y: number;
  type: 'agent' | 'discovery' | 'transaction' | 'settlement' | 'recovery';
}

interface EconomicStream {
  fromIndex: number;
  toIndex: number;
  progress: number;
  speed: number;
  width: number;
  type: 'lime' | 'ink' | 'pink' | 'cyan';
  particles: { offset: number; size: number }[];
}

export const EconomicFlowCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check user preference for reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mediaQuery.addEventListener('change', handleMotionChange);

    return () => mediaQuery.removeEventListener('change', handleMotionChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 640);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight || 640;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    // 5 Protocol Stages: Agent -> Discovery -> Transaction -> Settlement -> Recovery
    const nodes: EconomicNode[] = [
      { id: 'n1', label: 'Agent α', x: 0.12, y: 0.35, type: 'agent' },
      { id: 'n2', label: 'Agent β', x: 0.14, y: 0.68, type: 'agent' },
      { id: 'n3', label: 'Agent γ', x: 0.08, y: 0.52, type: 'agent' },
      { id: 'n4', label: 'Discovery Registry', x: 0.34, y: 0.42, type: 'discovery' },
      { id: 'n5', label: 'Escrow Vault', x: 0.54, y: 0.48, type: 'transaction' },
      { id: 'n6', label: 'Monad Parallel EVM', x: 0.74, y: 0.36, type: 'settlement' },
      { id: 'n7', label: 'Settled Treasury', x: 0.88, y: 0.30, type: 'settlement' },
      { id: 'n8', label: 'Economic GC (Recovery)', x: 0.68, y: 0.76, type: 'recovery' },
      { id: 'n9', label: 'Reclaimed Capital', x: 0.38, y: 0.82, type: 'recovery' },
    ];

    // 28 Meaningful Economic Streams connecting the protocol stages
    // Strict Color Hierarchy:
    // 75% Lime (#CFFF3D), 15% Deep Ink (#062A3B), 7% Soft Pink (#FF8FA3), 3% Muted Cyan Flow Accent (#38BDF8)
    const streamDefs: { from: number; to: number; type: 'lime' | 'ink' | 'pink' | 'cyan'; width: number }[] = [
      // Inflow from Agents to Discovery (Lime)
      { from: 0, to: 3, type: 'lime', width: 2.5 },
      { from: 1, to: 3, type: 'lime', width: 2.0 },
      { from: 2, to: 3, type: 'lime', width: 2.2 },
      { from: 0, to: 4, type: 'ink', width: 1.5 },
      { from: 1, to: 4, type: 'lime', width: 1.8 },
      // Discovery to Escrow
      { from: 3, to: 4, type: 'lime', width: 3.2 },
      { from: 3, to: 4, type: 'cyan', width: 1.2 }, // Rare flow accent
      { from: 3, to: 5, type: 'lime', width: 2.0 },
      // Escrow to Monad Settlement
      { from: 4, to: 5, type: 'lime', width: 3.8 },
      { from: 4, to: 5, type: 'ink', width: 1.8 },
      { from: 5, to: 6, type: 'lime', width: 3.4 },
      // Stranded Capital Detection to Recovery GC (Pink / Recovery)
      { from: 4, to: 7, type: 'pink', width: 2.4 },
      { from: 5, to: 7, type: 'pink', width: 2.0 },
      { from: 7, to: 8, type: 'pink', width: 3.0 },
      // Recovery Loop returning Capital to Agent Treasuries (Lime & Pink loop)
      { from: 8, to: 0, type: 'lime', width: 2.2 },
      { from: 8, to: 1, type: 'lime', width: 2.0 },
      // Parallel Cross-Entity Reallocation threads
      { from: 6, to: 0, type: 'lime', width: 1.5 },
      { from: 6, to: 1, type: 'ink', width: 1.4 },
      { from: 3, to: 8, type: 'lime', width: 1.6 },
      { from: 5, to: 8, type: 'pink', width: 1.8 },
      { from: 7, to: 3, type: 'cyan', width: 1.2 }, // Rare subtle routing signal
      { from: 2, to: 5, type: 'lime', width: 2.0 },
      { from: 4, to: 6, type: 'lime', width: 2.8 },
      { from: 8, to: 4, type: 'ink', width: 1.5 },
      { from: 1, to: 7, type: 'pink', width: 1.6 },
    ];

    const streams: EconomicStream[] = streamDefs.map((def, idx) => ({
      fromIndex: def.from,
      toIndex: def.to,
      progress: (idx * 0.13) % 1,
      speed: 0.003 + (idx % 5) * 0.0012,
      width: def.width,
      type: def.type,
      particles: Array.from({ length: 3 + (idx % 3) }, (_, p) => ({
        offset: p * 0.33,
        size: 2.5 + (p % 2) * 1.5,
      })),
    }));

    // Interactive mouse attractor (subtle organic response)
    let mouseX = width * 0.5;
    let mouseY = height * 0.5;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouseX = e.clientX - rect.left;
      targetMouseY = e.clientY - rect.top;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Color definitions
    const colorMap = {
      lime: '#CFFF3D',
      limeGlow: 'rgba(207, 255, 61, 0.45)',
      ink: '#062A3B',
      inkGlow: 'rgba(6, 42, 59, 0.25)',
      pink: '#FF8FA3',
      pinkGlow: 'rgba(255, 143, 163, 0.45)',
      cyan: '#38BDF8',
      cyanGlow: 'rgba(56, 189, 248, 0.35)',
    };

    let tick = 0;

    // Render loop
    const render = () => {
      tick += 1;
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Draw flowing connection paths
      streams.forEach((stream) => {
        const from = nodes[stream.fromIndex];
        const to = nodes[stream.toIndex];

        const x1 = from.x * width;
        const y1 = from.y * height;
        const x2 = to.x * width;
        const y2 = to.y * height;

        // Curved architectural spline
        const midX = (x1 + x2) * 0.5;
        const midY = (y1 + y2) * 0.5 - Math.sin(tick * 0.02 + stream.fromIndex) * 15;

        // Subtle displacement from cursor
        const dx = midX - mouseX;
        const dy = midY - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, (220 - dist) / 220);
        const curveMidX = midX + (dx / (dist || 1)) * influence * 25;
        const curveMidY = midY + (dy / (dist || 1)) * influence * 25;

        // Base flow trail
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(curveMidX, curveMidY, x2, y2);

        if (stream.type === 'lime') {
          ctx.strokeStyle = 'rgba(207, 255, 61, 0.38)';
        } else if (stream.type === 'pink') {
          ctx.strokeStyle = 'rgba(255, 143, 163, 0.35)';
        } else if (stream.type === 'cyan') {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        } else {
          ctx.strokeStyle = 'rgba(6, 42, 59, 0.16)';
        }

        ctx.lineWidth = stream.width;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Animate flow particles along curve
        if (!prefersReducedMotion) {
          stream.particles.forEach((p) => {
            const t = (stream.progress + p.offset) % 1;
            // Quadratic Bezier formula: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
            const px = Math.pow(1 - t, 2) * x1 + 2 * (1 - t) * t * curveMidX + Math.pow(t, 2) * x2;
            const py = Math.pow(1 - t, 2) * y1 + 2 * (1 - t) * t * curveMidY + Math.pow(t, 2) * y2;

            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, Math.PI * 2);
            ctx.fillStyle = colorMap[stream.type];
            ctx.fill();

            // Glow aura for primary lime and pink recovery particles
            if (stream.type === 'lime' || stream.type === 'pink') {
              ctx.beginPath();
              ctx.arc(px, py, p.size * 2.2, 0, Math.PI * 2);
              ctx.fillStyle = stream.type === 'lime' ? colorMap.limeGlow : colorMap.pinkGlow;
              ctx.fill();
            }
          });

          stream.progress = (stream.progress + stream.speed) % 1;
        }
      });

      // Draw protocol nodes
      nodes.forEach((node, idx) => {
        const nx = node.x * width;
        const ny = node.y * height;

        // Base node circle
        ctx.beginPath();
        const baseRadius = node.type === 'settlement' || node.type === 'recovery' ? 10 : 8;
        ctx.arc(nx, ny, baseRadius, 0, Math.PI * 2);

        if (node.type === 'recovery') {
          ctx.fillStyle = '#FF8FA3';
        } else if (node.type === 'settlement') {
          ctx.fillStyle = '#062A3B';
        } else if (node.type === 'discovery') {
          ctx.fillStyle = '#CFFF3D';
        } else {
          ctx.fillStyle = '#FFFFFF';
        }

        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#062A3B';
        ctx.stroke();

        // Node Label
        ctx.font = '700 11px "JetBrains Mono", monospace';
        ctx.fillStyle = '#062A3B';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, nx, ny + 22);

        // Gentle node pulse
        if (!prefersReducedMotion) {
          const pulse = Math.sin(tick * 0.04 + idx) * 4;
          ctx.beginPath();
          ctx.arc(nx, ny, baseRadius + 4 + pulse, 0, Math.PI * 2);
          ctx.strokeStyle = node.type === 'recovery' ? 'rgba(255, 143, 163, 0.3)' : 'rgba(207, 255, 61, 0.4)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      });

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [prefersReducedMotion]);

  return (
    <div className="economic-flow-canvas-container" aria-hidden="true">
      <canvas ref={canvasRef} className="economic-flow-canvas" />
      <div className="flow-canvas-legend">
        <div className="legend-item">
          <span className="legend-dot lime"></span>
          <span>Economic Allocation (Lime)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot ink"></span>
          <span>Settlement Fabric (Ink)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot pink"></span>
          <span>Value Recovery (Pink)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot cyan"></span>
          <span>Flow Accent</span>
        </div>
      </div>
    </div>
  );
};

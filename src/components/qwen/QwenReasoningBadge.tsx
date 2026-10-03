import React from 'react';
import { Sparkles, BrainCircuit } from 'lucide-react';

interface QwenReasoningBadgeProps {
  label?: string;
  size?: 'sm' | 'md';
}

export const QwenReasoningBadge: React.FC<QwenReasoningBadgeProps> = ({
  label = 'QWEN 3.8 MAX ADVISOR',
  size = 'sm',
}) => {
  const isSm = size === 'sm';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: isSm ? '10px' : '11.5px',
        fontWeight: 700,
        fontFamily: 'monospace',
        padding: isSm ? '2px 7px' : '4px 10px',
        borderRadius: '4px',
        background: 'rgba(168, 85, 247, 0.12)',
        color: '#C084FC',
        border: '1px solid rgba(168, 85, 247, 0.35)',
        letterSpacing: '0.04em',
      }}
    >
      <BrainCircuit size={isSm ? 11 : 13} />
      <span>{label}</span>
    </span>
  );
};

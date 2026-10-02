import React from 'react';
import { Eye, ShieldCheck, Tag } from 'lucide-react';
import { NansenLabel } from '../../integrations/nansen/nansenTypes';

interface NansenBadgeProps {
  label?: string | NansenLabel;
  category?: string;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export const NansenBadge: React.FC<NansenBadgeProps> = ({
  label,
  category,
  onClick,
  size = 'sm',
}) => {
  const text = typeof label === 'string' ? label : label?.label || 'Nansen Profile';
  const cat = typeof label === 'object' ? label?.category || category : category;

  const isSmart = text.toLowerCase().includes('smart') || text.toLowerCase().includes('alpha');
  const isCex = text.toLowerCase().includes('cex') || text.toLowerCase().includes('exchange') || text.toLowerCase().includes('binance');
  const isDex = text.toLowerCase().includes('dex') || text.toLowerCase().includes('trader');
  const isContract = text.toLowerCase().includes('contract');

  let bg = 'rgba(59, 130, 246, 0.12)';
  let color = '#60A5FA';
  let border = '1px solid rgba(59, 130, 246, 0.3)';

  if (isSmart) {
    bg = 'rgba(16, 185, 129, 0.15)';
    color = '#10B981';
    border = '1px solid rgba(16, 185, 129, 0.4)';
  } else if (isCex) {
    bg = 'rgba(245, 158, 11, 0.15)';
    color = '#F59E0B';
    border = '1px solid rgba(245, 158, 11, 0.4)';
  } else if (isDex) {
    bg = 'rgba(139, 92, 246, 0.15)';
    color = '#A78BFA';
    border = '1px solid rgba(139, 92, 246, 0.4)';
  }

  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: size === 'sm' ? '2px 7px' : '4px 10px',
        borderRadius: '6px',
        fontSize: size === 'sm' ? '10px' : '11px',
        fontFamily: 'var(--font-mono, monospace)',
        fontWeight: 600,
        background: bg,
        color,
        border,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
      }}
      title={`Nansen Intelligence: ${text}${cat ? ` (${cat})` : ''}`}
    >
      <Tag size={size === 'sm' ? 10 : 12} />
      <span>{text}</span>
      {onClick && <Eye size={10} style={{ marginLeft: '2px', opacity: 0.8 }} />}
    </span>
  );
};

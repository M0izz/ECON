import React from 'react';
import { ExternalLink, Database } from 'lucide-react';
import { getExplorerTxUrl } from '../../integrations/envio/mappers';

interface EnvioProvenanceBadgeProps {
  txHash?: string;
  blockNumber?: number | string;
  compact?: boolean;
}

export const EnvioProvenanceBadge: React.FC<EnvioProvenanceBadgeProps> = ({
  txHash,
  blockNumber,
  compact = false,
}) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(131, 110, 249, 0.08)',
        border: '1px solid rgba(131, 110, 249, 0.28)',
        borderRadius: '4px',
        padding: compact ? '2px 6px' : '4px 8px',
        fontSize: compact ? '9.5px' : '11px',
        fontFamily: 'var(--font-mono)',
        color: '#A78BFA',
      }}
      title="Indexed from Monad Testnet block events via Envio HyperIndex"
    >
      <Database size={compact ? 10 : 12} style={{ color: '#836EF9' }} />
      <span>INDEXED ON MONAD VIA ENVIO</span>
      {blockNumber !== undefined && blockNumber !== 0 && (
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>
          #{blockNumber}
        </span>
      )}
      {txHash && (
        <a
          href={getExplorerTxUrl(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#836EF9',
            display: 'inline-flex',
            alignItems: 'center',
            marginLeft: '2px',
          }}
          title={`View transaction ${txHash} on Monad Explorer`}
        >
          <ExternalLink size={compact ? 9 : 11} />
        </a>
      )}
    </div>
  );
};

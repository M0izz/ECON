import React, { useState } from 'react';
import { Shield, Key, Copy, Check, Lock, RefreshCw, Layers } from 'lucide-react';
import { ECONKeyRole } from '../../integrations/mera/meraTypes';

interface OnePasskeyManyKeysVisualProps {
  accounts?: Record<ECONKeyRole, `0x${string}`>;
  credentialId?: string;
  agentName?: string;
  compact?: boolean;
}

export const OnePasskeyManyKeysVisual: React.FC<OnePasskeyManyKeysVisualProps> = ({
  accounts,
  credentialId,
  agentName = 'ResearchAgent-42',
  compact = false,
}) => {
  const [copiedRole, setCopiedRole] = useState<string | null>(null);

  const copyToClipboard = (role: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedRole(role);
      setTimeout(() => setCopiedRole(null), 2000);
    }
  };

  const defaultAccounts: Record<ECONKeyRole, `0x${string}`> = accounts || {
    operating: '0x938c17F8057A4A4431D3a55C40a9DC992a6ce416',
    treasury: '0x469aCC5597d553F5d7bF080e1e032b4758a5db6c',
    escrow: '0x525831e47883A99c78098bb3aa1f4FC221C69883',
    recovery: '0x4D6A6a56829ACb4D9371ef60943aD8f1834a93F5',
  };

  return (
    <div
      style={{
        background: 'rgba(4, 27, 38, 0.75)',
        border: '1px solid rgba(0, 229, 153, 0.25)',
        borderRadius: '10px',
        padding: compact ? '14px' : '20px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={16} style={{ color: '#00E599' }} />
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#00E599', fontFamily: 'monospace' }}>
            // MERA ARCHITECTURE: ONE PASSKEY, MANY KEYS
          </span>
        </div>
        <span
          style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            padding: '2px 8px',
            borderRadius: '4px',
            background: 'rgba(0, 229, 153, 0.12)',
            color: '#00E599',
            border: '1px solid rgba(0, 229, 153, 0.3)',
          }}
        >
          MONAD TESTNET (10143)
        </span>
      </div>

      {/* Level 1: Passkey Root */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '460px',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(0, 229, 153, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00E599',
            }}
          >
            <Key size={18} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFF' }}>ONE BIOMETRIC PASSKEY</div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.55)', fontFamily: 'monospace' }}>
              {credentialId ? `Credential: ${credentialId.slice(0, 14)}...` : 'Touch ID / Face ID / YubiKey (PRF Root)'}
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            color: '#00E599',
            background: 'rgba(0, 229, 153, 0.1)',
            padding: '3px 8px',
            borderRadius: '4px',
          }}
        >
          WEBAUTHN PRF
        </span>
      </div>

      {/* Down Connector */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '6px 0' }}>
        <div style={{ width: '1px', height: '14px', background: 'rgba(0, 229, 153, 0.4)' }}></div>
        <span
          style={{
            fontSize: '9px',
            fontFamily: 'monospace',
            color: 'rgba(255, 255, 255, 0.6)',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '1px 8px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          DETERMINISTIC HKDF-SHA256 DERIVATION
        </span>
        <div style={{ width: '1px', height: '14px', background: 'rgba(0, 229, 153, 0.4)' }}></div>
      </div>

      {/* Level 2: Economic Identity */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(0, 229, 153, 0.08), rgba(4, 27, 38, 0.8))',
          border: '1px solid rgba(0, 229, 153, 0.35)',
          borderRadius: '8px',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '460px',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers size={18} style={{ color: '#00E599' }} />
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#FFF' }}>
              ECONOMIC IDENTITY: {agentName}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'monospace' }}>
              Sovereign Operating Entity • Policy Governed
            </div>
          </div>
        </div>
        <span style={{ fontSize: '10px', color: '#00E599', fontFamily: 'monospace', fontWeight: 700 }}>
          4 PURPOSE ROLES
        </span>
      </div>

      {/* Branching Connector */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 12px 0' }}>
        <div style={{ width: '85%', height: '1px', background: 'rgba(0, 229, 153, 0.35)', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '12%', top: '0', width: '1px', height: '12px', background: 'rgba(0, 229, 153, 0.35)' }}></div>
          <div style={{ position: 'absolute', left: '37%', top: '0', width: '1px', height: '12px', background: 'rgba(0, 229, 153, 0.35)' }}></div>
          <div style={{ position: 'absolute', left: '63%', top: '0', width: '1px', height: '12px', background: 'rgba(0, 229, 153, 0.35)' }}></div>
          <div style={{ position: 'absolute', left: '88%', top: '0', width: '1px', height: '12px', background: 'rgba(0, 229, 153, 0.35)' }}></div>
        </div>
      </div>

      {/* Level 3: 4 Purpose-Specific Accounts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
        }}
      >
        {/* Operating */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(0, 229, 153, 0.2)',
            borderRadius: '6px',
            padding: '10px 12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#00E599', fontFamily: 'monospace' }}>
              1. OPERATING
            </span>
            <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.5)' }}>Daily Commerce</span>
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', margin: '4px 0' }}>
            Compute, APIs, spot trades
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '4px 6px',
              borderRadius: '4px',
              marginTop: '6px',
            }}
          >
            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#FFF' }}>
              {defaultAccounts.operating.slice(0, 6)}...{defaultAccounts.operating.slice(-4)}
            </span>
            <button
              onClick={() => copyToClipboard('operating', defaultAccounts.operating)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00E599', padding: '2px' }}
              title="Copy address"
            >
              {copiedRole === 'operating' ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        {/* Treasury */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(130, 80, 223, 0.3)',
            borderRadius: '6px',
            padding: '10px 12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#A78BFA', fontFamily: 'monospace' }}>
              2. TREASURY
            </span>
            <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.5)' }}>Reserve Vault</span>
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', margin: '4px 0' }}>
            High-value custody, reserves
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '4px 6px',
              borderRadius: '4px',
              marginTop: '6px',
            }}
          >
            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#FFF' }}>
              {defaultAccounts.treasury.slice(0, 6)}...{defaultAccounts.treasury.slice(-4)}
            </span>
            <button
              onClick={() => copyToClipboard('treasury', defaultAccounts.treasury)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A78BFA', padding: '2px' }}
              title="Copy address"
            >
              {copiedRole === 'treasury' ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        {/* Escrow */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '6px',
            padding: '10px 12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#60A5FA', fontFamily: 'monospace' }}>
              3. ESCROW
            </span>
            <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.5)' }}>Conditional Lock</span>
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', margin: '4px 0' }}>
            Smart contract value locks
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '4px 6px',
              borderRadius: '4px',
              marginTop: '6px',
            }}
          >
            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#FFF' }}>
              {defaultAccounts.escrow.slice(0, 6)}...{defaultAccounts.escrow.slice(-4)}
            </span>
            <button
              onClick={() => copyToClipboard('escrow', defaultAccounts.escrow)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#60A5FA', padding: '2px' }}
              title="Copy address"
            >
              {copiedRole === 'escrow' ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        {/* Recovery */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(236, 72, 153, 0.3)',
            borderRadius: '6px',
            padding: '10px 12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#F472B6', fontFamily: 'monospace' }}>
              4. RECOVERY
            </span>
            <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.5)' }}>Economic GC</span>
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', margin: '4px 0' }}>
            Recycles stranded value
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '4px 6px',
              borderRadius: '4px',
              marginTop: '6px',
            }}
          >
            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#FFF' }}>
              {defaultAccounts.recovery.slice(0, 6)}...{defaultAccounts.recovery.slice(-4)}
            </span>
            <button
              onClick={() => copyToClipboard('recovery', defaultAccounts.recovery)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F472B6', padding: '2px' }}
              title="Copy address"
            >
              {copiedRole === 'recovery' ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { isDynamicConfigured } from '../../integrations/dynamic';
import { Shield, Sparkles, LogIn, AlertCircle } from 'lucide-react';

interface DynamicAuthButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'compact';
  onConnected?: () => void;
}

const ConfiguredDynamicButton: React.FC<DynamicAuthButtonProps> = ({
  className = '',
  variant = 'primary',
  onConnected,
}) => {
  const { setShowAuthFlow, primaryWallet, user } = useDynamicContext();

  const handleClick = () => {
    setShowAuthFlow(true);
    if (onConnected) onConnected();
  };

  const isConnected = !!primaryWallet;

  if (isConnected) {
    const addr = primaryWallet.address;
    const shortAddr = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    return (
      <button
        onClick={handleClick}
        className={`btn-econ ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(59, 130, 246, 0.12)',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          color: '#60A5FA',
          padding: variant === 'compact' ? '4px 8px' : '8px 14px',
          fontSize: variant === 'compact' ? '11px' : '12px',
          borderRadius: '6px',
          fontWeight: 600,
        }}
        title={`Dynamic Controller: ${addr}`}
      >
        <Sparkles size={13} style={{ color: '#60A5FA' }} />
        <span>Dynamic: {shortAddr}</span>
      </button>
    );
  }

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: variant === 'compact' ? '11px' : '12px',
    borderRadius: '6px',
    padding: variant === 'compact' ? '4px 10px' : '8px 16px',
    transition: 'all 0.2s ease',
  };

  if (variant === 'primary') {
    return (
      <button
        onClick={handleClick}
        className={className}
        style={{
          ...baseStyle,
          background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
          color: '#FFFFFF',
          border: '1px solid #3B82F6',
          boxShadow: '0 2px 10px rgba(37, 99, 235, 0.35)',
        }}
      >
        <Sparkles size={13} />
        <span>Connect via Dynamic</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={className}
      style={{
        ...baseStyle,
        background: 'rgba(59, 130, 246, 0.08)',
        color: '#93C5FD',
        border: '1px solid rgba(59, 130, 246, 0.3)',
      }}
    >
      <LogIn size={13} />
      <span>Dynamic Onboarding</span>
    </button>
  );
};

const UnconfiguredDynamicButton: React.FC<DynamicAuthButtonProps> = ({
  className = '',
  variant = 'primary',
}) => {
  const handleClick = () => {
    alert(
      'Dynamic Environment ID not set.\n\nTo enable Dynamic embedded wallets and social onboarding, set:\nVITE_DYNAMIC_ENVIRONMENT_ID=your_dynamic_env_id\nin your .env file.'
    );
  };

  return (
    <button
      onClick={handleClick}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px dashed rgba(255, 255, 255, 0.2)',
        color: 'var(--text-secondary)',
        padding: variant === 'compact' ? '4px 8px' : '8px 14px',
        fontSize: variant === 'compact' ? '11px' : '12px',
        borderRadius: '6px',
        cursor: 'pointer',
      }}
      title="Dynamic is not configured. Click for setup instructions."
    >
      <AlertCircle size={13} style={{ color: '#F59E0B' }} />
      <span>Dynamic (Set Env ID)</span>
    </button>
  );
};

export const DynamicAuthButton: React.FC<DynamicAuthButtonProps> = (props) => {
  const configured = isDynamicConfigured();
  if (!configured) {
    return <UnconfiguredDynamicButton {...props} />;
  }
  return <ConfiguredDynamicButton {...props} />;
};

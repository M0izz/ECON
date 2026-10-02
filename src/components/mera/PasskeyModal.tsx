import React, { useState } from 'react';
import { X, Key, Shield, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { ECON } from '../../sdk/client';
import { defaultMeraClient } from '../../integrations/mera/meraClient';
import { ECONPasskeyIdentity, ECONPasskeyPublicMetadata } from '../../integrations/mera/meraTypes';
import { OnePasskeyManyKeysVisual } from './OnePasskeyManyKeysVisual';
import { MonadSettlementAdapter } from '../../settlement/MonadSettlementAdapter';

interface PasskeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  econ: ECON;
  onSuccess?: (identity: ECONPasskeyIdentity, agentId: string) => void;
  initialMode?: 'CREATE' | 'SIGNIN';
}

export const PasskeyModal: React.FC<PasskeyModalProps> = ({
  isOpen,
  onClose,
  econ,
  onSuccess,
  initialMode = 'CREATE',
}) => {
  const [mode, setMode] = useState<'CREATE' | 'SIGNIN'>(initialMode);
  const [agentName, setAgentName] = useState('ResearchAgent-42');
  const [agentPurpose, setAgentPurpose] = useState('Autonomous economic research, data acquisition, and compute leasing.');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    identity: ECONPasskeyIdentity;
    metadata: ECONPasskeyPublicMetadata;
    agentId: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleCreateWithPasskey = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { identity, publicMetadata } = await defaultMeraClient.createEconomicIdentity({
        agentName,
      });

      const uniqueId = `econ_mera_${agentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Math.random()
        .toString(36)
        .substring(2, 6)}`;

      // Register agent in ECON with Mera purpose-specific accounts
      const agent = econ.createPasskeyAgent({
        id: uniqueId,
        name: agentName,
        purpose: agentPurpose,
        credentialId: identity.credentialId,
        accounts: publicMetadata.addresses,
        initialBalanceMon: 50,
        policy: {
          maxPerTransaction: 20,
          dailySpendingLimit: 60,
          minRetainedBalance: 10,
          requireApprovalAbove: 20,
          autoRecoveryEnabled: true,
          autoTransferEnabled: true,
        },
      });

      // Connect MonadSettlementAdapter with the Mera operating signer for live Monad transactions
      const currentAdapter = econ.getSettlementAdapter();
      if (currentAdapter instanceof MonadSettlementAdapter) {
        currentAdapter.setMeraAccount(identity.accounts.operating.viemAccount);
      } else {
        const monadAdapter = new MonadSettlementAdapter(econ.store, econ.events);
        monadAdapter.setMeraAccount(identity.accounts.operating.viemAccount);
        econ.setSettlementAdapter(monadAdapter);
      }

      setSuccessResult({
        identity,
        metadata: publicMetadata,
        agentId: agent.id,
      });

      if (onSuccess) {
        onSuccess(identity, agent.id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Passkey ceremony failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInWithPasskey = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { identity, publicMetadata } = await defaultMeraClient.signInWithPasskey();

      // Find existing agent matching credential or operating address
      let agent = econ.store.getAllAgents().find(
        (a) => a.passkeyCredentialId === identity.credentialId || a.walletAddress === publicMetadata.addresses.operating
      );

      let agentId = agent?.id;

      if (!agent) {
        agentId = `econ_mera_restored_${identity.credentialId.slice(0, 8)}`;
        agent = econ.createPasskeyAgent({
          id: agentId,
          name: 'RestoredPasskeyAgent',
          purpose: 'Restored from biometric passkey PRF root.',
          credentialId: identity.credentialId,
          accounts: publicMetadata.addresses,
          initialBalanceMon: 50,
          policy: {
            maxPerTransaction: 20,
            dailySpendingLimit: 60,
            minRetainedBalance: 10,
            requireApprovalAbove: 20,
            autoRecoveryEnabled: true,
            autoTransferEnabled: true,
          },
        });
      }

      // Configure Monad settlement adapter with the restored Mera operating signer
      const currentAdapter = econ.getSettlementAdapter();
      if (currentAdapter instanceof MonadSettlementAdapter) {
        currentAdapter.setMeraAccount(identity.accounts.operating.viemAccount);
      } else {
        const monadAdapter = new MonadSettlementAdapter(econ.store, econ.events);
        monadAdapter.setMeraAccount(identity.accounts.operating.viemAccount);
        econ.setSettlementAdapter(monadAdapter);
      }

      setSuccessResult({
        identity,
        metadata: publicMetadata,
        agentId: agent.id,
      });

      if (onSuccess) {
        onSuccess(identity, agent.id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Passkey sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(2, 14, 20, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div
        style={{
          background: '#041B26',
          border: '1px solid rgba(0, 229, 153, 0.3)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: successResult ? '680px' : '520px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={18} style={{ color: '#00E599' }} />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFF', letterSpacing: '0.04em' }}>
              {successResult
                ? 'ECONOMIC IDENTITY CREATED'
                : mode === 'CREATE'
                ? 'CREATE YOUR ECONOMIC IDENTITY'
                : 'SIGN IN WITH PASSKEY'}
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {successResult ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <CheckCircle2 size={24} style={{ color: '#00E599' }} />
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFF', margin: 0 }}>
                    {agentName}
                  </h3>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'monospace' }}>
                    Control: Biometric Passkey (Mera PRF) • Monad Testnet (10143)
                  </div>
                </div>
              </div>

              {/* Visual Component */}
              <OnePasskeyManyKeysVisual
                accounts={successResult.metadata.addresses}
                credentialId={successResult.metadata.credentialId}
                agentName={agentName}
                compact={false}
              />

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  onClick={onClose}
                  style={{
                    background: '#00E599',
                    color: '#041B26',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Open Economic Identity</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Mode switch */}
              <div
                style={{
                  display: 'flex',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  padding: '3px',
                  marginBottom: '20px',
                }}
              >
                <button
                  onClick={() => { setMode('CREATE'); setErrorMessage(null); }}
                  style={{
                    flex: 1,
                    background: mode === 'CREATE' ? 'rgba(0, 229, 153, 0.15)' : 'transparent',
                    color: mode === 'CREATE' ? '#00E599' : 'rgba(255, 255, 255, 0.6)',
                    border: mode === 'CREATE' ? '1px solid rgba(0, 229, 153, 0.4)' : '1px solid transparent',
                    borderRadius: '4px',
                    padding: '8px 0',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Create with Passkey
                </button>
                <button
                  onClick={() => { setMode('SIGNIN'); setErrorMessage(null); }}
                  style={{
                    flex: 1,
                    background: mode === 'SIGNIN' ? 'rgba(0, 229, 153, 0.15)' : 'transparent',
                    color: mode === 'SIGNIN' ? '#00E599' : 'rgba(255, 255, 255, 0.6)',
                    border: mode === 'SIGNIN' ? '1px solid rgba(0, 229, 153, 0.4)' : '1px solid transparent',
                    borderRadius: '4px',
                    padding: '8px 0',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Sign in Existing Passkey
                </button>
              </div>

              {mode === 'CREATE' ? (
                <div>
                  <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.75)', lineHeight: '1.5', marginTop: 0 }}>
                    Give your autonomous entity a persistent economic identity without managing a seed phrase.
                  </p>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)', marginBottom: '6px' }}>
                      ENTITY / AGENT NAME
                    </label>
                    <input
                      type="text"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="e.g. ResearchAgent-42"
                      style={{
                        width: '100%',
                        background: 'rgba(2, 14, 20, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        color: '#FFF',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)', marginBottom: '6px' }}>
                      ECONOMIC PURPOSE
                    </label>
                    <input
                      type="text"
                      value={agentPurpose}
                      onChange={(e) => setAgentPurpose(e.target.value)}
                      placeholder="e.g. Autonomous data acquisition and compute leasing"
                      style={{
                        width: '100%',
                        background: 'rgba(2, 14, 20, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        color: '#FFF',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.75)', lineHeight: '1.5', marginTop: 0 }}>
                    Authenticate with your biometric passkey to reconstruct your economic identity. The same passkey deterministically restores your operating, treasury, escrow, and recovery accounts.
                  </p>
                  <div
                    style={{
                      background: 'rgba(0, 229, 153, 0.05)',
                      border: '1px solid rgba(0, 229, 153, 0.2)',
                      borderRadius: '6px',
                      padding: '12px',
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '20px',
                    }}
                  >
                    Your ECON accounts can be recovered through the same passkey on supported passkey providers.
                  </div>
                </div>
              )}

              {/* Error box */}
              {errorMessage && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: '12px', color: '#FCA5A5' }}>{errorMessage}</span>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={mode === 'CREATE' ? handleCreateWithPasskey : handleSignInWithPasskey}
                disabled={isLoading || (mode === 'CREATE' && !agentName.trim())}
                style={{
                  width: '100%',
                  background: '#00E599',
                  color: '#041B26',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Evaluating Passkey Ceremony...</span>
                  </>
                ) : (
                  <>
                    <Key size={16} />
                    <span>{mode === 'CREATE' ? 'Continue with Passkey' : 'Authenticate with Passkey'}</span>
                  </>
                )}
              </button>

              {/* Security Footnote */}
              <div
                style={{
                  marginTop: '16px',
                  textAlign: 'center',
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  lineHeight: '1.4',
                }}
              >
                <div style={{ color: '#00E599', fontWeight: 600, marginBottom: '2px' }}>
                  Secured by a passkey
                </div>
                Your passkey derives your ECON accounts locally via Mera PRF.
                <br />
                ECON never receives or stores your private keys.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

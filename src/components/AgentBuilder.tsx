import React, { useState, useEffect } from 'react';
import { ECON } from '../sdk/client';
import { AGENT_TEMPLATES, AgentTemplate } from '../sdk/agent/templates';
import { ModelProvider, AgentCapabilities, Agent } from '../sdk/types';
import { DEFAULT_AGENT_CAPABILITIES } from '../sdk/agent/capabilities';
import { MonadAgentPublisher } from '../settlement/MonadAgentPublisher';
import {
  Cpu,
  PlusCircle,
  Code,
  Shield,
  Zap,
  CheckCircle2,
  Sparkles,
  Terminal,
  ExternalLink,
  Layers,
  Key,
  Lock,
  Loader2,
} from 'lucide-react';
import { defaultMeraClient } from '../integrations/mera/meraClient';
import { globalMeraSession } from '../integrations/mera/meraSession';
import { ECONPasskeyIdentity } from '../integrations/mera/meraTypes';
import { OnePasskeyManyKeysVisual } from './mera/OnePasskeyManyKeysVisual';
import { MonadSettlementAdapter } from '../settlement/MonadSettlementAdapter';
import { globalDynamicWallet } from '../integrations/dynamic';
import { DynamicAuthButton } from './dynamic/DynamicAuthButton';

interface AgentBuilderProps {
  econ: ECON;
  onAgentCreated: (agent: Agent) => void;
}

export const AgentBuilder: React.FC<AgentBuilderProps> = ({ econ, onAgentCreated }) => {
  const [activePath, setActivePath] = useState<'NATIVE' | 'EXTERNAL'>('NATIVE');

  // Native Agent Form State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('TEMPLATE_RESEARCH');
  const [agentName, setAgentName] = useState('ResearchAgent-99');
  const [agentPurpose, setAgentPurpose] = useState(
    'Autonomous satellite imagery intelligence and geospatial dataset synthesis.'
  );
  const [selectedModel, setSelectedModel] = useState<ModelProvider>('GEMINI');
  const [initialFundingMon, setInitialFundingMon] = useState<number>(100);

  // Policy Settings
  const [maxPerTx, setMaxPerTx] = useState<number>(20);
  const [dailyLimit, setDailyLimit] = useState<number>(100);
  const [minReserve, setMinReserve] = useState<number>(25);
  const [requireApprovalAbove, setRequireApprovalAbove] = useState<number>(20);
  const [autoRecovery, setAutoRecovery] = useState<boolean>(true);

  // Capabilities Checklists
  const [capabilities, setCapabilities] = useState<AgentCapabilities>(DEFAULT_AGENT_CAPABILITIES);

  // External Agent Form State
  const [extAgentId, setExtAgentId] = useState('my-python-researcher');
  const [extAgentName, setExtAgentName] = useState('Production Satellite Scraper (Python)');
  const [extLanguageTab, setExtLanguageTab] = useState<'PYTHON' | 'TYPESCRIPT'>('PYTHON');
  const [extInitialFunding, setExtInitialFunding] = useState<number>(50);

  // Economic Control State: Passkey (Mera PRF) vs Dynamic vs Existing Wallet
  const [controlMethod, setControlMethod] = useState<'PASSKEY' | 'DYNAMIC' | 'EXTERNAL_WALLET'>('PASSKEY');
  const [passkeyIdentity, setPasskeyIdentity] = useState<ECONPasskeyIdentity | null>(
    () => globalMeraSession.getActiveIdentity()
  );
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  // Dynamic Controller state
  const [dynamicWalletState, setDynamicWalletState] = useState(() => globalDynamicWallet.getConnectedWallet());

  useEffect(() => {
    const unsub = globalDynamicWallet.subscribe((details) => {
      setDynamicWalletState(details);
    });
    return () => unsub();
  }, []);

  // Status message
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [metadataUri, setMetadataUri] = useState('');
  const [publishedIdentity, setPublishedIdentity] = useState<{
    agentId?: string;
    transactionHash: string;
  } | null>(null);

  const applyTemplate = (tmpl: AgentTemplate) => {
    setSelectedTemplateId(tmpl.id);
    setAgentName(tmpl.name);
    setAgentPurpose(tmpl.description);
    setSelectedModel(tmpl.defaultModel);
    setInitialFundingMon(tmpl.defaultBudgetMon);
    setMaxPerTx(tmpl.policy.maxPerTransaction);
    setDailyLimit(tmpl.policy.dailySpendingLimit);
    setMinReserve(tmpl.policy.minRetainedBalance);
    setRequireApprovalAbove(tmpl.policy.requireApprovalAbove);
    setAutoRecovery(tmpl.policy.autoRecoveryEnabled);
    setCapabilities({ ...tmpl.capabilities });
  };

  const handlePasskeyCeremony = async () => {
    setIsPasskeyLoading(true);
    setPasskeyError(null);
    try {
      const { identity } = await defaultMeraClient.createEconomicIdentity({
        agentName,
      });
      setPasskeyIdentity(identity);
    } catch (err: any) {
      setPasskeyError(err.message || 'Passkey ceremony failed.');
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  const handleCreateNativeAgent = async () => {
    setPasskeyError(null);

    // If Passkey method is chosen but not yet created, trigger ceremony
    let activePasskey = passkeyIdentity;
    if (controlMethod === 'PASSKEY' && !activePasskey) {
      setIsPasskeyLoading(true);
      try {
        const { identity } = await defaultMeraClient.createEconomicIdentity({
          agentName,
        });
        activePasskey = identity;
        setPasskeyIdentity(identity);
      } catch (err: any) {
        setPasskeyError(err.message || 'Passkey authentication failed.');
        setIsPasskeyLoading(false);
        return;
      } finally {
        setIsPasskeyLoading(false);
      }
    }

    const uniqueId = controlMethod === 'PASSKEY'
      ? `econ_mera_${agentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Math.random().toString(36).substring(2, 6)}`
      : `econ_${agentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Math.random().toString(36).substring(2, 6)}`;

    let agent: Agent;

    if (controlMethod === 'DYNAMIC') {
      const connectedDynamic = dynamicWalletState || globalDynamicWallet.getConnectedWallet();
      const dynamicAddress = (connectedDynamic?.address || '0x0000000000000000000000000000000000000000') as `0x${string}`;
      const uniqueId = `econ_dynamic_${agentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Math.random().toString(36).substring(2, 6)}`;

      agent = econ.createDynamicAgent({
        id: uniqueId,
        name: agentName,
        purpose: agentPurpose,
        modelProvider: selectedModel,
        initialBalanceMon: initialFundingMon,
        walletAddress: dynamicAddress,
        connector: connectedDynamic?.connectorName || 'Dynamic EVM',
        isEmbedded: !!connectedDynamic?.isEmbedded,
        networkChainId: connectedDynamic?.networkChainId || 10143,
        policy: {
          maxPerTransaction: maxPerTx,
          dailySpendingLimit: dailyLimit,
          minRetainedBalance: minReserve,
          requireApprovalAbove: requireApprovalAbove,
          autoRecoveryEnabled: autoRecovery,
          autoTransferEnabled: autoRecovery,
        },
        capabilities,
      });

      globalDynamicWallet.getWalletClient().then((dynamicClient) => {
        const currentAdapter = econ.getSettlementAdapter();
        if (dynamicClient && currentAdapter instanceof MonadSettlementAdapter) {
          currentAdapter.setWalletClient(dynamicClient);
        }
      });

      setSuccessMessage(`Dynamic Economic Identity deployed: ${agent.name} (Controller: ${dynamicAddress}) on Monad Testnet`);
    } else if (controlMethod === 'PASSKEY' && activePasskey) {
      agent = econ.createPasskeyAgent({
        id: uniqueId,
        name: agentName,
        purpose: agentPurpose,
        modelProvider: selectedModel,
        initialBalanceMon: initialFundingMon,
        credentialId: activePasskey.credentialId,
        accounts: {
          operating: activePasskey.accounts.operating.address,
          treasury: activePasskey.accounts.treasury.address,
          escrow: activePasskey.accounts.escrow.address,
          recovery: activePasskey.accounts.recovery.address,
        },
        policy: {
          maxPerTransaction: maxPerTx,
          dailySpendingLimit: dailyLimit,
          minRetainedBalance: minReserve,
          requireApprovalAbove: requireApprovalAbove,
          autoRecoveryEnabled: autoRecovery,
          autoTransferEnabled: autoRecovery,
        },
        capabilities,
      });

      // Connect MonadSettlementAdapter with the live Mera operating signer
      const currentAdapter = econ.getSettlementAdapter();
      if (currentAdapter instanceof MonadSettlementAdapter) {
        currentAdapter.setMeraAccount(activePasskey.accounts.operating.viemAccount);
      } else {
        const monadAdapter = new MonadSettlementAdapter(econ.store, econ.events);
        monadAdapter.setMeraAccount(activePasskey.accounts.operating.viemAccount);
        econ.setSettlementAdapter(monadAdapter);
      }

      setSuccessMessage(`Mera Passkey Economic Identity deployed: ${agent.name} with 4 derived accounts on Monad Testnet`);
    } else {
      agent = econ.createNativeAgent({
        id: uniqueId,
        name: agentName,
        purpose: agentPurpose,
        modelProvider: selectedModel,
        initialBalanceMon: initialFundingMon,
        policy: {
          maxPerTransaction: maxPerTx,
          dailySpendingLimit: dailyLimit,
          minRetainedBalance: minReserve,
          requireApprovalAbove: requireApprovalAbove,
          autoRecoveryEnabled: autoRecovery,
          autoTransferEnabled: autoRecovery,
        },
        capabilities,
      });

      setSuccessMessage(`Native agent deployed: ${agent.name} with Economic ID ${agent.id}`);
    }

    onAgentCreated(agent);
  };

  const handlePublishOnMonad = async () => {
    setPublishError(null);
    setSuccessMessage(null);
    setPublishedIdentity(null);
    setIsPublishing(true);
    try {
      const uri = metadataUri.trim() || `data:application/json,${encodeURIComponent(JSON.stringify({
        type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
        name: agentName,
        description: agentPurpose,
        services: [
          { name: 'ECON protocol', endpoint: 'https://github.com/M0izz/ECON' },
          { name: 'credit recycling', endpoint: 'econ://credit-vault' },
        ],
        capabilities: Object.entries(capabilities)
          .filter(([, enabled]) => enabled)
          .map(([name]) => name),
        supportedTrust: ['reputation', 'crypto-economic'],
        network: 'eip155:10143',
      }))}`;
      const publication = await new MonadAgentPublisher().publishAgent(uri);
      setPublishedIdentity(publication);
      const uniqueId = `erc8004_${publication.agentId || publication.transactionHash.slice(-8)}`;
      const agent = econ.createNativeAgent({
        id: uniqueId,
        name: agentName,
        purpose: agentPurpose,
        modelProvider: selectedModel,
        initialBalanceMon: initialFundingMon,
        controller: publication.account,
        walletAddress: publication.account,
        onChainAgentId: publication.agentId,
        onChainTxHash: publication.transactionHash,
        metadataURI: uri,
        policy: {
          maxPerTransaction: maxPerTx,
          dailySpendingLimit: dailyLimit,
          minRetainedBalance: minReserve,
          requireApprovalAbove,
          autoRecoveryEnabled: autoRecovery,
          autoTransferEnabled: autoRecovery,
        },
        capabilities,
      });
      setSuccessMessage(
        `Published ${agent.name} on Monad Testnet${publication.agentId ? ` as ERC-8004 agent #${publication.agentId}` : ''}.`
      );
      onAgentCreated(agent);
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : 'Monad publication failed');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleConnectExternalAgent = () => {
    const agent = econ.connectExternalAgent({
      id: extAgentId,
      name: extAgentName,
      initialBalanceMon: extInitialFunding,
      purpose: 'External Python / LangGraph agent connected via @econ/sdk',
      policy: {
        maxPerTransaction: 25,
        minRetainedBalance: 15,
      },
    });

    setSuccessMessage(`External agent connected: ${agent.name} with Economic ID ${agent.id}`);
    onAgentCreated(agent);
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner & Path Switcher */}
      <div className="panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <div className="panel-title" style={{ fontSize: '13px' }}>
              <Sparkles size={14} className="text-mint" />
              <span>ECON Autonomous Agent Operating Layer</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Give autonomous entities persistent economic identities, programmable objects, and settlement authority
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-app)', padding: '2px', borderRadius: '3px' }}>
            <button
              className={`settlement-toggle-btn ${activePath === 'NATIVE' ? 'active' : ''}`}
              onClick={() => setActivePath('NATIVE')}
            >
              <div className="indicator-dot" />
              <span>CREATE NATIVE AGENT</span>
            </button>
            <button
              className={`settlement-toggle-btn ${activePath === 'EXTERNAL' ? 'active' : ''}`}
              onClick={() => setActivePath('EXTERNAL')}
            >
              <div className="indicator-dot" />
              <span>BRING YOUR AGENT (SDK)</span>
            </button>
          </div>
        </div>

        {/* Path Explanation */}
        <div
          style={{
            padding: '10px 14px',
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            borderRadius: '2px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-secondary)',
          }}
        >
          {activePath === 'NATIVE' ? (
            <span>
              <strong className="text-mint">PATH A: NATIVE ECON AGENT</strong> — Configure an autonomous agent directly within ECON. ECON provisions an Economic Identity, assigns intelligence runtime hooks, and grants calibrated economic authority.
            </span>
          ) : (
            <span>
              <strong className="text-blue">PATH B: BRING YOUR OWN AGENT</strong> — Already running a custom Python, LangGraph, or AutoGen agent? Connect it via <code className="text-mint">@econ/sdk</code> or <code className="text-mint">pip install econ-sdk</code> without replacing its intelligence.
            </span>
          )}
        </div>
      </div>

      {successMessage && (
        <div
          style={{
            padding: '10px 14px',
            background: 'var(--bg-panel-secondary)',
            border: '1px solid var(--accent-mint)',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11.5px',
            color: 'var(--accent-mint)',
          }}
        >
          <CheckCircle2 size={14} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>{successMessage}</span>
            {publishedIdentity && (
              <a
                href={`https://testnet.monadscan.com/tx/${publishedIdentity.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono"
                style={{ color: 'var(--accent-blue)', fontSize: '10px' }}
              >
                View confirmed Monad receipt ↗
              </a>
            )}
          </div>
        </div>
      )}

      {publishError && (
        <div
          style={{
            padding: '10px 14px',
            background: 'var(--bg-panel-secondary)',
            border: '1px solid var(--signal-pink)',
            borderRadius: '2px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11.5px',
            color: 'var(--signal-pink)',
          }}
        >
          {publishError}
        </div>
      )}

      {/* Path A: Native Agent Creation Wizard */}
      {activePath === 'NATIVE' && (
        <div className="grid-2">
          {/* Left Column: Configuration Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Template Selector */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <Layers size={13} className="text-mint" />
                  <span>1. Select Agent Archetype</span>
                </div>
              </div>
              <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {AGENT_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => applyTemplate(tmpl)}
                    style={{
                      padding: '10px',
                      background:
                        selectedTemplateId === tmpl.id
                          ? 'var(--bg-panel-secondary)'
                          : 'var(--bg-app)',
                      border: `1px solid ${
                        selectedTemplateId === tmpl.id
                          ? 'var(--accent-mint)'
                          : 'var(--border-color)'
                      }`,
                      borderRadius: '2px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '11.5px', color: 'var(--text-primary)' }}>
                      {tmpl.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                      {tmpl.role}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Core Identity & Model */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <Cpu size={13} className="text-blue" />
                  <span>2. Identity & Intelligence Layer</span>
                </div>
              </div>
              <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label className="font-mono text-muted" style={{ fontSize: '10px' }}>AGENT IDENTIFIER / NAME</label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      padding: '6px 10px',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      borderRadius: '2px',
                      marginTop: '4px',
                    }}
                  />
                </div>

                <div>
                  <label className="font-mono text-muted" style={{ fontSize: '10px' }}>OBJECTIVE & PURPOSE</label>
                  <textarea
                    rows={2}
                    value={agentPurpose}
                    onChange={(e) => setAgentPurpose(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      padding: '6px 10px',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      borderRadius: '2px',
                      marginTop: '4px',
                      resize: 'none',
                    }}
                  />
                </div>

                <div>
                  <label className="font-mono text-muted" style={{ fontSize: '10px' }}>
                    ON-CHAIN METADATA URI (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    value={metadataUri}
                    onChange={(e) => setMetadataUri(e.target.value)}
                    placeholder="ipfs://... or https://... (data URI generated if empty)"
                    style={{
                      width: '100%',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      padding: '6px 10px',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      borderRadius: '2px',
                      marginTop: '4px',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="font-mono text-muted" style={{ fontSize: '10px' }}>AI MODEL BACKEND</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value as ModelProvider)}
                      style={{
                        width: '100%',
                        background: 'var(--bg-app)',
                        border: '1px solid var(--border-color)',
                        padding: '6px 8px',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        marginTop: '4px',
                      }}
                    >
                      <option value="GEMINI">Google Gemini 1.5 Flash</option>
                      <option value="ANTHROPIC">Anthropic Claude 3.5</option>
                      <option value="OPENAI">OpenAI GPT-4o</option>
                      <option value="LOCAL">Local Open-Weights Model</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-mono text-muted" style={{ fontSize: '10px' }}>INITIAL TREASURY (MON)</label>
                    <input
                      type="number"
                      value={initialFundingMon}
                      onChange={(e) => setInitialFundingMon(parseFloat(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        background: 'var(--bg-app)',
                        border: '1px solid var(--border-color)',
                        padding: '6px 8px',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        marginTop: '4px',
                        textAlign: 'right',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Economic Control Authority: Passkey vs Existing Wallet */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <Key size={13} className="text-mint" />
                  <span>3. Economic Control Authority</span>
                </div>
              </div>
              <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div
                    onClick={() => setControlMethod('PASSKEY')}
                    style={{
                      padding: '12px',
                      background: controlMethod === 'PASSKEY' ? 'rgba(0, 229, 153, 0.08)' : 'var(--bg-app)',
                      border: `1px solid ${controlMethod === 'PASSKEY' ? '#00E599' : 'var(--border-color)'}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px', color: '#FFF' }}>
                      <Key size={14} style={{ color: '#00E599' }} />
                      <span>Biometric Passkey</span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>
                      Mera PRF derives 4 purpose-specific accounts. Seedless.
                    </div>
                  </div>

                  <div
                    onClick={() => setControlMethod('DYNAMIC')}
                    style={{
                      padding: '12px',
                      background: controlMethod === 'DYNAMIC' ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-app)',
                      border: `1px solid ${controlMethod === 'DYNAMIC' ? '#3B82F6' : 'var(--border-color)'}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px', color: '#FFF' }}>
                      <Sparkles size={14} style={{ color: '#60A5FA' }} />
                      <span>Dynamic Onboarding</span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>
                      Embedded EVM or social/email login on Monad Testnet.
                    </div>
                  </div>

                  <div
                    onClick={() => setControlMethod('EXTERNAL_WALLET')}
                    style={{
                      padding: '12px',
                      background: controlMethod === 'EXTERNAL_WALLET' ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-app)',
                      border: `1px solid ${controlMethod === 'EXTERNAL_WALLET' ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px', color: '#FFF' }}>
                      <Shield size={14} style={{ color: 'var(--accent-blue)' }} />
                      <span>External Wallet</span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>
                      MetaMask, Rabby, Coinbase via Reown AppKit.
                    </div>
                  </div>
                </div>

                {controlMethod === 'PASSKEY' && (
                  <div style={{ marginTop: '4px' }}>
                    {passkeyIdentity ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#00E599', fontWeight: 700, fontFamily: 'monospace' }}>
                            ✓ PASSKEY AUTHENTICATED: 4 ACCOUNTS READY
                          </span>
                          <button
                            className="btn-econ"
                            onClick={handlePasskeyCeremony}
                            style={{ fontSize: '10px', padding: '3px 8px' }}
                          >
                            Re-authenticate
                          </button>
                        </div>
                        <OnePasskeyManyKeysVisual
                          accounts={{
                            operating: passkeyIdentity.accounts.operating.address,
                            treasury: passkeyIdentity.accounts.treasury.address,
                            escrow: passkeyIdentity.accounts.escrow.address,
                            recovery: passkeyIdentity.accounts.recovery.address,
                          }}
                          credentialId={passkeyIdentity.credentialId}
                          agentName={agentName}
                          compact={true}
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          background: 'rgba(0, 229, 153, 0.04)',
                          border: '1px dashed rgba(0, 229, 153, 0.3)',
                          borderRadius: '6px',
                          padding: '14px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#FFF', marginBottom: '4px' }}>
                          Passkey Root Not Yet Generated
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                          Click below to trigger the WebAuthn passkey ceremony (Face ID, Touch ID, or security key).
                        </p>
                        <button
                          className="btn-econ btn-econ-primary"
                          onClick={handlePasskeyCeremony}
                          disabled={isPasskeyLoading}
                          style={{ margin: '0 auto', fontSize: '12px' }}
                        >
                          {isPasskeyLoading ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>Evaluating WebAuthn PRF...</span>
                            </>
                          ) : (
                            <>
                              <Key size={13} />
                              <span>Generate Passkey Accounts</span>
                            </>
                          )}
                        </button>
                        {passkeyError && (
                          <div style={{ color: 'var(--signal-pink)', fontSize: '11px', marginTop: '8px' }}>
                            {passkeyError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {controlMethod === 'DYNAMIC' && (
                  <div style={{ marginTop: '4px' }}>
                    {dynamicWalletState ? (
                      <div
                        style={{
                          background: 'rgba(59, 130, 246, 0.08)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '6px',
                          padding: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#60A5FA', fontWeight: 700, fontFamily: 'monospace' }}>
                            ✓ DYNAMIC CONTROLLER CONNECTED ({dynamicWalletState.connectorName})
                          </span>
                          {dynamicWalletState.isEmbedded && (
                            <span
                              style={{
                                fontSize: '9px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'rgba(147, 51, 234, 0.2)',
                                color: '#C084FC',
                                border: '1px solid rgba(147, 51, 234, 0.4)',
                              }}
                            >
                              EMBEDDED EVM
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#FFF' }}>
                          Controller Address: <span style={{ color: '#93C5FD' }}>{dynamicWalletState.address}</span>
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Network: Monad Testnet (Chain ID {dynamicWalletState.networkChainId}) • All economic spending is authorized by the ECON Policy Engine prior to Monad signing.
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          background: 'rgba(59, 130, 246, 0.04)',
                          border: '1px dashed rgba(59, 130, 246, 0.3)',
                          borderRadius: '6px',
                          padding: '14px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#FFF', marginBottom: '4px' }}>
                          Dynamic Wallet Not Connected
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                          Connect an embedded EVM wallet or sign in via email/social through Dynamic on Monad Testnet.
                        </p>
                        <DynamicAuthButton variant="primary" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Economic Capabilities */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <Zap size={13} className="text-amber" />
                  <span>3. Calibrated Economic Authority</span>
                </div>
              </div>
              <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div className="font-mono text-muted" style={{ fontSize: '10px', marginBottom: '6px' }}>
                    TRANSACTION & SETTLEMENT CAPABILITIES
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={capabilities.canPurchaseServices}
                        onChange={(e) => setCapabilities({ ...capabilities, canPurchaseServices: e.target.checked })}
                      />
                      <span>Purchase Services</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={capabilities.canSellAssets}
                        onChange={(e) => setCapabilities({ ...capabilities, canSellAssets: e.target.checked })}
                      />
                      <span>Sell Assets</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={capabilities.canUseEscrow}
                        onChange={(e) => setCapabilities({ ...capabilities, canUseEscrow: e.target.checked })}
                      />
                      <span>Lock Escrow Contracts</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={capabilities.canRecoverValue}
                        onChange={(e) => setCapabilities({ ...capabilities, canRecoverValue: e.target.checked })}
                      />
                      <span>Recover Stranded Value (GC)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <div className="font-mono text-muted" style={{ fontSize: '10px', marginBottom: '6px' }}>
                    DATA & AUTONOMY
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={capabilities.autonomousTransactions}
                        onChange={(e) => setCapabilities({ ...capabilities, autonomousTransactions: e.target.checked })}
                      />
                      <span>Autonomous Settlement</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={capabilities.canSearchDatasets}
                        onChange={(e) => setCapabilities({ ...capabilities, canSearchDatasets: e.target.checked })}
                      />
                      <span>Search Discovery Network</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Spending Policy Bounds & Live Economic Card Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Policy Limits */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <Shield size={13} className="text-mint" />
                  <span>4. Spending Policy Bounds (Policy Engine)</span>
                </div>
              </div>
              <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-mono text-secondary" style={{ fontSize: '11px' }}>Max Single Transaction</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      value={maxPerTx}
                      onChange={(e) => setMaxPerTx(parseFloat(e.target.value) || 0)}
                      style={{ width: '65px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', padding: '3px 6px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '11px', textAlign: 'right' }}
                    />
                    <span className="font-mono text-muted" style={{ fontSize: '10.5px' }}>MON</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-mono text-secondary" style={{ fontSize: '11px' }}>Daily Spending Allowance</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(parseFloat(e.target.value) || 0)}
                      style={{ width: '65px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', padding: '3px 6px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '11px', textAlign: 'right' }}
                    />
                    <span className="font-mono text-muted" style={{ fontSize: '10.5px' }}>MON</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-mono text-secondary" style={{ fontSize: '11px' }}>Minimum Retained Reserve Floor</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      value={minReserve}
                      onChange={(e) => setMinReserve(parseFloat(e.target.value) || 0)}
                      style={{ width: '65px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', padding: '3px 6px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '11px', textAlign: 'right' }}
                    />
                    <span className="font-mono text-muted" style={{ fontSize: '10.5px' }}>MON</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-mono text-secondary" style={{ fontSize: '11px' }}>Require Approval Above</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      value={requireApprovalAbove}
                      onChange={(e) => setRequireApprovalAbove(parseFloat(e.target.value) || 0)}
                      style={{ width: '65px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', padding: '3px 6px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '11px', textAlign: 'right' }}
                    />
                    <span className="font-mono text-muted" style={{ fontSize: '10.5px' }}>MON</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Economic Identity Card Preview */}
            <div className="panel" style={{ border: '1px solid var(--accent-mint)' }}>
              <div className="panel-header" style={{ background: 'var(--bg-panel-secondary)' }}>
                <div className="panel-title">
                  <span className="text-mint">ECONOMIC IDENTITY SPECIFICATION</span>
                </div>
                <span className="badge badge-mint font-mono">READY TO PROVISION</span>
              </div>

              <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                    {agentName}
                  </div>
                  <div className="font-mono text-muted" style={{ fontSize: '10.5px' }}>
                    ID: econ_7F82...91A0 • Model: {selectedModel}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div style={{ background: 'var(--bg-app)', padding: '8px', border: '1px solid var(--border-color)' }}>
                    <div className="text-muted font-mono" style={{ fontSize: '9px' }}>TREASURY</div>
                    <div className="font-mono text-mint" style={{ fontSize: '14px', fontWeight: 600 }}>
                      {initialFundingMon.toFixed(1)} MON
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-app)', padding: '8px', border: '1px solid var(--border-color)' }}>
                    <div className="text-muted font-mono" style={{ fontSize: '9px' }}>MAX / TX</div>
                    <div className="font-mono" style={{ fontSize: '14px', fontWeight: 600 }}>
                      {maxPerTx.toFixed(1)} MON
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-app)', padding: '8px', border: '1px solid var(--border-color)' }}>
                    <div className="text-muted font-mono" style={{ fontSize: '9px' }}>AUTONOMY</div>
                    <div className="font-mono" style={{ fontSize: '14px', fontWeight: 600 }}>
                      HIGH
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {agentPurpose}
                </div>

                <button
                  className="btn-econ btn-econ-primary"
                  onClick={handleCreateNativeAgent}
                  style={{ justifyContent: 'center', padding: '10px 16px', marginTop: '6px' }}
                >
                  <PlusCircle size={14} />
                  <span>Deploy & Activate Native Agent</span>
                </button>
                <button
                  className="btn-econ"
                  onClick={handlePublishOnMonad}
                  disabled={isPublishing}
                  style={{ justifyContent: 'center', padding: '10px 16px', marginTop: '2px' }}
                >
                  <ExternalLink size={14} />
                  <span>{isPublishing ? 'Waiting for Monad Receipt...' : 'Publish Identity on Monad Testnet'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Path B: Bring Your Own Agent ("Connect External Agent") */}
      {activePath === 'EXTERNAL' && (
        <div className="grid-2">
          {/* Integration Configuration */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <Terminal size={14} className="text-blue" />
                <span>External Agent Configuration</span>
              </div>
            </div>

            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="font-mono text-muted" style={{ fontSize: '10px' }}>AGENT IDENTIFIER</label>
                <input
                  type="text"
                  value={extAgentId}
                  onChange={(e) => setExtAgentId(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-color)',
                    padding: '6px 10px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    borderRadius: '2px',
                    marginTop: '4px',
                  }}
                />
              </div>

              <div>
                <label className="font-mono text-muted" style={{ fontSize: '10px' }}>AGENT DISPLAY NAME</label>
                <input
                  type="text"
                  value={extAgentName}
                  onChange={(e) => setExtAgentName(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-color)',
                    padding: '6px 10px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    borderRadius: '2px',
                    marginTop: '4px',
                  }}
                />
              </div>

              <div>
                <label className="font-mono text-muted" style={{ fontSize: '10px' }}>INITIAL TREASURY ALLOCATION (MON)</label>
                <input
                  type="number"
                  value={extInitialFunding}
                  onChange={(e) => setExtInitialFunding(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-color)',
                    padding: '6px 10px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    borderRadius: '2px',
                    marginTop: '4px',
                    textAlign: 'right',
                  }}
                />
              </div>

              <div style={{ marginTop: '8px' }}>
                <button
                  className="btn-econ btn-econ-primary"
                  onClick={handleConnectExternalAgent}
                  style={{ width: '100%', justifyContent: 'center', padding: '10px 16px' }}
                >
                  <CheckCircle2 size={14} />
                  <span>Connect & Verify External Agent</span>
                </button>
              </div>
            </div>
          </div>

          {/* Copyable SDK Integration Code Snippet */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <Code size={14} className="text-mint" />
                <span>SDK Integration Boilerplate</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  className={`btn-econ ${extLanguageTab === 'PYTHON' ? 'btn-econ-primary' : ''}`}
                  onClick={() => setExtLanguageTab('PYTHON')}
                  style={{ padding: '2px 8px', fontSize: '10px' }}
                >
                  Python
                </button>
                <button
                  className={`btn-econ ${extLanguageTab === 'TYPESCRIPT' ? 'btn-econ-primary' : ''}`}
                  onClick={() => setExtLanguageTab('TYPESCRIPT')}
                  style={{ padding: '2px 8px', fontSize: '10px' }}
                >
                  TypeScript
                </button>
              </div>
            </div>

            <div className="panel-body">
              {extLanguageTab === 'PYTHON' ? (
                <pre className="terminal-window" style={{ maxHeight: '380px', fontSize: '11px' }}>
{`# 1. Install SDK
pip install econ-sdk

# 2. Connect your existing agent (LangGraph, AutoGen, Custom)
from econ import ECON

econ = ECON.connect(
    agent_id="${extAgentId}",
    network="monad-testnet"
)

# Your agent now has an Economic Identity, Wallet & Policy Guard:
print("Agent Balance:", econ.identity.balance)

# 3. Discover providers and transact with Escrow
providers = econ.discovery.search(
    capability="satellite-imagery",
    budget=20.0
)

# 4. Propose purchase (Policy Engine automatically validates)
transaction = econ.engine.buy(
    provider=providers[0].id,
    object_id="OBJ-SAT-01",
    amount=12.0
)

# 5. Economic Garbage Collector detects and recovers stranded value
stranded = econ.gc.scan()
if stranded:
    plan = econ.gc.plan(stranded[0])
    econ.recovery.execute(plan)`}
                </pre>
              ) : (
                <pre className="terminal-window" style={{ maxHeight: '380px', fontSize: '11px' }}>
{`// 1. Install SDK
npm install @econ/sdk

// 2. Connect external agent
import { ECON } from '@econ/sdk';

const econ = new ECON();
const agent = econ.connectExternalAgent({
  id: "${extAgentId}",
  name: "${extAgentName}",
  initialBalanceMon: ${extInitialFunding}
});

// 3. Dispatch action through the ECON Agent Runtime
const runtime = econ.getRuntime(agent.id);

const result = await runtime.dispatchAction({
  type: 'PURCHASE',
  params: {
    sellerId: '<provider-agent-id>',
    objectId: '<economic-object-id>',
    amountMon: 12.0
  },
  reasoning: 'Acquiring satellite coverage for Mumbai'
});

console.log("Action Outcome:", result.auditSummary);`}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

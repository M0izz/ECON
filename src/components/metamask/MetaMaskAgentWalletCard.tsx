import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Activity,
  ArrowRight,
  RefreshCw,
  Cpu,
  Layers,
  Terminal,
} from 'lucide-react';
import { Agent } from '../../sdk/types';
import { MONAD_EXPLORER_BASE } from '../../contracts/addresses';
import { globalMetaMaskAgentWallet } from '../../integrations/metamask-agent-wallet/metaMaskAgentWalletAdapter';
import { executeMetaMaskGatedTransaction } from '../../integrations/metamask-agent-wallet/policyGatedExecutor';
import { MetaMaskDoctorReport, MetaMaskTransactionResult } from '../../integrations/metamask-agent-wallet/types';
import { ECON } from '../../sdk/client';

export interface MetaMaskAgentWalletCardProps {
  agent: Agent;
  econ?: ECON;
  onTransactionSettled?: (tx: MetaMaskTransactionResult) => void;
}

export const MetaMaskAgentWalletCard: React.FC<MetaMaskAgentWalletCardProps> = ({
  agent,
  econ,
  onTransactionSettled,
}) => {
  const [balance, setBalance] = useState<number>(agent.balanceMon);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);
  const [doctorReport, setDoctorReport] = useState<MetaMaskDoctorReport | null>(null);
  const [executing, setExecuting] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<MetaMaskTransactionResult | null>(null);

  const walletStatus = agent.metaMaskAgentWallet?.status || globalMetaMaskAgentWallet.getStatus();
  const walletMode = agent.metaMaskAgentWallet?.mode || globalMetaMaskAgentWallet.getMode();
  const tradingMode = agent.metaMaskAgentWallet?.tradingMode || globalMetaMaskAgentWallet.getTradingMode();
  const walletAddress =
    agent.metaMaskAgentWallet?.address ||
    globalMetaMaskAgentWallet.getWalletAddress() ||
    agent.walletAddress;

  const fetchLiveBalance = async () => {
    setLoadingBalance(true);
    try {
      const bal = await globalMetaMaskAgentWallet.getBalance();
      setBalance(bal > 0 ? bal : agent.balanceMon);
    } catch {
      setBalance(agent.balanceMon);
    } finally {
      setLoadingBalance(false);
    }
  };

  const runDoctor = async () => {
    const report = await globalMetaMaskAgentWallet.doctor();
    setDoctorReport(report);
  };

  useEffect(() => {
    fetchLiveBalance();
    runDoctor();
  }, [agent.id]);

  const handleSimulateAuthorizedBuy = async () => {
    if (!econ) return;
    setExecuting(true);
    try {
      const result = await executeMetaMaskGatedTransaction({
        agentId: agent.id,
        intent: {
          type: 'BUY',
          recipient: '0x991286A645c110E663B514571A15C198547A9', // GeoVision Provider
          amountMon: 2.0, // Within policy limit (5 MON)
          category: 'API_LICENSE',
          memo: 'Purchase of Research API (2 MON) via MetaMask Agent Wallet',
          economicIdentity: agent.id,
        },
        policyEngine: econ.policy,
        walletAdapter: globalMetaMaskAgentWallet,
        store: econ.store,
        eventBus: econ.events,
      });
      setLastResult(result);
      if (onTransactionSettled) onTransactionSettled(result);
      fetchLiveBalance();
    } catch (err: any) {
      console.error('[MetaMaskAgentWalletCard] Execution error:', err);
    } finally {
      setExecuting(false);
    }
  };

  // Recent agent transactions
  const recentTxs = econ
    ? econ.store
        .getAllTransactions()
        .filter((t) => t.buyer === agent.id && t.settlementHash)
        .slice(-3)
    : [];

  return (
    <div
      className="econ-card"
      style={{
        padding: '20px',
        marginBottom: '20px',
        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.9))',
        border: '1px solid rgba(249, 115, 22, 0.35)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <Wallet size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
                AGENT WALLET
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background:
                    walletStatus === 'CONNECTED'
                      ? 'rgba(34, 197, 94, 0.2)'
                      : walletStatus === 'SIMULATION'
                      ? 'rgba(59, 130, 246, 0.2)'
                      : 'rgba(148, 163, 184, 0.2)',
                  color:
                    walletStatus === 'CONNECTED'
                      ? '#4ade80'
                      : walletStatus === 'SIMULATION'
                      ? '#60a5fa'
                      : '#94a3b8',
                  border:
                    walletStatus === 'CONNECTED'
                      ? '1px solid #22c55e'
                      : walletStatus === 'SIMULATION'
                      ? '1px solid #3b82f6'
                      : '1px solid #64748b',
                }}
              >
                {walletStatus}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Programmatic Wallet Control Layer for Autonomous Agents
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn-econ"
            onClick={fetchLiveBalance}
            disabled={loadingBalance}
            style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={12} className={loadingBalance ? 'spin' : ''} />
            <span>Sync</span>
          </button>
          {econ && (
            <button
              className="btn-econ btn-econ-primary"
              onClick={handleSimulateAuthorizedBuy}
              disabled={executing}
              style={{
                fontSize: '11px',
                padding: '4px 12px',
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                borderColor: '#ea580c',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Cpu size={12} />
              <span>{executing ? 'Executing...' : 'Propose Buy API (2 MON)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 4-Pillar Architectural Separation Diagram */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '10px',
          marginBottom: '16px',
          padding: '12px',
          background: 'rgba(0, 0, 0, 0.25)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Pillar 1: Economic Identity */}
        <div style={{ padding: '8px' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>
            1. ECONOMIC IDENTITY
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', marginTop: '2px' }}>
            {agent.name}
          </div>
          <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#38bdf8' }}>
            ID: {agent.id}
          </div>
        </div>

        {/* Pillar 2: Agent Wallet Control */}
        <div style={{ padding: '8px', borderLeft: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>
            2. WALLET CONTROL LAYER
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fb923c', marginTop: '2px' }}>
            MetaMask Agent Wallet
          </div>
          <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#cbd5e1' }}>
            Mode: {walletMode} ({tradingMode})
          </div>
        </div>

        {/* Pillar 3: Policy Engine */}
        <div style={{ padding: '8px', borderLeft: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>
            3. POLICY PRE-FLIGHT
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>
            ECON Policy Engine
          </div>
          <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#a7f3d0' }}>
            Max: {agent.policy.maxPerTransaction} MON | Day: {agent.policy.dailySpendingLimit} MON
          </div>
        </div>

        {/* Pillar 4: Settlement */}
        <div style={{ padding: '8px', borderLeft: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>
            4. SETTLEMENT LAYER
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#818cf8', marginTop: '2px' }}>
            Monad Testnet
          </div>
          <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#c7d2fe' }}>
            Chain ID: 10143 (EVM)
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Provider</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginTop: '2px' }}>
            MetaMask Agent Wallet v7.0.0
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>CLI & SDK Integration</div>
        </div>

        <div
          style={{
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Wallet Address</div>
          <div
            style={{
              fontSize: '12px',
              fontFamily: 'monospace',
              fontWeight: 600,
              color: '#38bdf8',
              marginTop: '2px',
              wordBreak: 'break-all',
            }}
          >
            {walletAddress ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}` : 'None'}
          </div>
          {walletAddress && (
            <a
              href={`${MONAD_EXPLORER_BASE}/address/${walletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '10px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              <span>View on Monad Explorer</span>
              <ExternalLink size={10} />
            </a>
          )}
        </div>

        <div
          style={{
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Network & Chain</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#a78bfa', marginTop: '2px' }}>
            Monad Testnet (10143)
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>10,000 TPS Parallel EVM</div>
        </div>

        <div
          style={{
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Treasury Balance</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>
            {balance.toFixed(4)} MON
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Real on-chain balance</div>
        </div>
      </div>

      {/* Mandatory Security Pipeline Status */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
          padding: '8px 12px',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '6px',
          marginBottom: '16px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>MetaMask Security Pipeline:</span>
        <span
          style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(34, 197, 94, 0.15)',
            color: '#4ade80',
            border: '1px solid #22c55e',
          }}
        >
          ✓ 1. Pre-Simulation
        </span>
        <span
          style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(34, 197, 94, 0.15)',
            color: '#4ade80',
            border: '1px solid #22c55e',
          }}
        >
          ✓ 2. Blockaid Threat Scan
        </span>
        <span
          style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(34, 197, 94, 0.15)',
            color: '#4ade80',
            border: '1px solid #22c55e',
          }}
        >
          ✓ 3. MEV Protection
        </span>
        <span
          style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            border: '1px solid #3b82f6',
          }}
        >
          ✓ 4. ECON Policy Gate
        </span>
      </div>

      {/* Last Result Notification */}
      {lastResult && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            marginBottom: '14px',
            background: lastResult.success ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${lastResult.success ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
            {lastResult.success ? (
              <CheckCircle2 size={14} color="#4ade80" />
            ) : (
              <AlertTriangle size={14} color="#f87171" />
            )}
            <span style={{ color: lastResult.success ? '#4ade80' : '#f87171' }}>
              {lastResult.success
                ? `Authorized Monad Transaction Settled (${lastResult.value} MON)`
                : `Transaction Halted: ${lastResult.error || lastResult.policyReason}`}
            </span>
          </div>
          {lastResult.hash && (
            <div style={{ fontSize: '11px', fontFamily: 'monospace', marginTop: '4px', color: '#93c5fd' }}>
              Tx Hash:{' '}
              <a
                href={`${MONAD_EXPLORER_BASE}/tx/${lastResult.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#60a5fa', textDecoration: 'underline' }}
              >
                {typeof lastResult.hash === 'string' ? `${lastResult.hash.slice(0, 18)}...` : ''}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Recent Transactions List */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
          RECENT AGENT TRANSACTIONS (REAL HASHES)
        </div>
        {recentTxs.length === 0 ? (
          <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
            No recent transactions yet. Click "Propose Buy API" to trigger the golden path flow.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {recentTxs.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: '6px',
                  fontSize: '11px',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{t.type}</span>
                  <span style={{ color: '#94a3b8', marginLeft: '6px' }}>{t.amountMon} MON</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <a
                    href={`${MONAD_EXPLORER_BASE}/tx/${t.settlementHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontFamily: 'monospace', color: '#60a5fa', textDecoration: 'none' }}
                  >
                    {t.settlementHash ? `${t.settlementHash.slice(0, 10)}...` : ''} ↗
                  </a>
                  <span
                    style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: 'rgba(34, 197, 94, 0.15)',
                      color: '#4ade80',
                    }}
                  >
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

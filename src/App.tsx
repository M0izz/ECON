import React, { useState, useEffect } from 'react';
import { ECON } from './sdk/client';
import { LocalSettlementAdapter } from './settlement/LocalSettlementAdapter';
import { MonadSettlementAdapter } from './settlement/MonadSettlementAdapter';
import { SettlementMode } from './sdk/types';
import { LandingPage } from './components/landing/LandingPage';
import { ConsoleLayout, ConsoleTab } from './components/console/ConsoleLayout';
import { ConsoleOverview } from './components/console/ConsoleOverview';
import { ConsoleRecoveryEngine } from './components/console/ConsoleRecoveryEngine';
import { EntitiesView } from './components/EntitiesView';
import { DiscoveryView } from './components/DiscoveryView';
import { PolicyControlView } from './components/PolicyControlView';
import { AgentBuilder } from './components/AgentBuilder';
import { AuditLedger } from './components/AuditLedger';
import { EscrowContractsView } from './components/EscrowContractsView';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useBalance, useSwitchChain } from 'wagmi';
import { monadTestnet } from './config/wagmi';

export type AppViewMode = 'LANDING' | 'CONSOLE';

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<AppViewMode>('LANDING');
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>('OVERVIEW');
  const [, setRenderTrigger] = useState(0);

  // Genuine Reown AppKit & Wagmi EVM hooks
  const { open } = useAppKit();
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();

  // Retrieve the REAL live MON balance from the connected controller on Monad Testnet (Chain ID 10143)
  const { data: balanceData } = useBalance({
    address,
    chainId: monadTestnet.id,
  });

  const isWrongNetwork = isConnected && chain?.id !== monadTestnet.id;
  const formattedBalance = balanceData
    ? `${Number(balanceData.formatted).toFixed(2)} ${balanceData.symbol}`
    : undefined;

  const [econ] = useState(() => new ECON());

  // Automatically activate Monad Testnet settlement mode when controller wallet connects
  useEffect(() => {
    if (isConnected && address) {
      econ.store.setSettlementMode('MONAD_TESTNET');
    }
  }, [isConnected, address, econ]);

  // Subscribe to reactive store and event updates
  useEffect(() => {
    const unsubStore = econ.store.subscribe(() => {
      setRenderTrigger((prev) => prev + 1);
    });

    const unsubEvents = econ.events.subscribe('*', () => {
      setRenderTrigger((prev) => prev + 1);
    });

    return () => {
      unsubStore();
      unsubEvents();
    };
  }, [econ]);

  const agents = econ.store.getAllAgents();
  const objects = econ.store.getAllObjects();
  const services = econ.discovery.search({});
  const events = econ.events.getHistory();
  const plans = econ.store.getAllRecoveryPlans();
  const escrows = econ.store.getAllEscrows();

  const handleToggleSettlement = (mode: SettlementMode) => {
    econ.store.setSettlementMode(mode);
    setRenderTrigger((prev) => prev + 1);
  };

  const handleUpdatePolicy = (agentId: string, updates: any) => {
    econ.identity.updatePolicy(agentId, updates);
  };

  const handleTriggerScan = () => {
    econ.gc.scan();
    setRenderTrigger((p) => p + 1);
  };

  const handleEnterConsole = (targetTab?: string) => {
    if (targetTab) {
      setConsoleTab(targetTab as ConsoleTab);
    }
    setViewMode('CONSOLE');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSwitchToMonad = () => {
    if (switchChain) {
      switchChain({ chainId: monadTestnet.id });
    } else {
      open({ view: 'Networks' });
    }
  };

  // Public Editorial Website Experience
  if (viewMode === 'LANDING') {
    return (
      <LandingPage
        store={econ.store}
        onEnterConsole={handleEnterConsole}
      />
    );
  }

  // Authenticated Autonomous Operating System Console Experience
  return (
    <ConsoleLayout
      store={econ.store}
      currentTab={consoleTab}
      onSelectTab={setConsoleTab}
      onSwitchToLanding={() => setViewMode('LANDING')}
      onToggleSettlement={handleToggleSettlement}
      walletAddress={address}
      walletBalance={formattedBalance}
      isWrongNetwork={isWrongNetwork}
      onSwitchToMonad={handleSwitchToMonad}
      onOpenAccount={() => open({ view: 'Account' })}
      onConnectWallet={() => open()}
    >
      {consoleTab === 'OVERVIEW' && (
        <ConsoleOverview
          store={econ.store}
          events={events}
          onNavigate={(tab) => setConsoleTab(tab as ConsoleTab)}
          walletAddress={address}
          walletBalance={formattedBalance}
          isConnected={isConnected}
          isWrongNetwork={isWrongNetwork}
          onConnectWallet={() => open()}
          onSwitchNetwork={handleSwitchToMonad}
          onOpenAccount={() => open({ view: 'Account' })}
        />
      )}

      {consoleTab === 'AGENTS' && (
        <EntitiesView agents={agents} objects={objects} />
      )}

      {consoleTab === 'AGENT_BUILDER' && (
        <AgentBuilder
          econ={econ}
          onAgentCreated={() => setRenderTrigger((p) => p + 1)}
        />
      )}

      {consoleTab === 'ASSETS' && (
        <EntitiesView agents={agents} objects={objects} />
      )}

      {consoleTab === 'MARKETPLACE' && (
        <DiscoveryView services={services} />
      )}

      {consoleTab === 'TRANSACTIONS' && (
        <AuditLedger events={events} />
      )}

      {consoleTab === 'ESCROW' && (
        <EscrowContractsView
          econ={econ}
          agents={agents}
          escrows={escrows}
          onRefresh={() => setRenderTrigger((p) => p + 1)}
        />
      )}

      {consoleTab === 'RECOVERY' && (
        <ConsoleRecoveryEngine
          econ={econ}
          objects={objects}
          plans={plans}
          onTriggerScan={handleTriggerScan}
          onRefresh={() => setRenderTrigger((p) => p + 1)}
        />
      )}

      {consoleTab === 'POLICIES' && (
        <PolicyControlView
          agents={agents}
          events={events}
          onUpdatePolicy={handleUpdatePolicy}
        />
      )}

      {consoleTab === 'API_SDK' && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <span className="font-mono text-mint" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>
              // DEVELOPER INTEGRATION SPECIFICATIONS
            </span>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '8px 0 6px 0', color: '#FFF' }}>
              ECON PROTOCOL & AGENT BACKEND APIS
            </h2>
            <p className="text-secondary" style={{ maxWidth: '720px', fontSize: '13px' }}>
              Connect autonomous agents through our client SDKs or deploy sovereign execution nodes using the dedicated agent backend. Settles natively on Monad Parallel EVM (Chain ID: 10143).
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* TypeScript SDK */}
            <div className="panel" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span className="font-mono text-mint" style={{ fontSize: '12px', fontWeight: 800 }}>
                  TypeScript SDK: @econ/sdk
                </span>
                <span className="badge badge-mint font-mono">v1.0.0</span>
              </div>
              <pre className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-app)', padding: '14px', borderRadius: '4px', overflowX: 'auto', lineHeight: '1.6' }}>
{`// 1. Install and Initialize
import { ECON } from '@econ/sdk';

const econ = new ECON();

// 2. Register Sovereign Economic Identity
const agent = econ.createNativeAgent({
  id: 'ArbitrageBot-1',
  name: 'Arbitrage Strategy Agent',
  initialBalanceMon: 25.0,
  policy: {
    maxPerTransaction: 5.0,
    dailySpendingLimit: 20.0,
    minRetainedBalance: 2.0,
    autoRecoveryEnabled: true,
  },
});

// 3. Conditional Escrow Lock
const escrow = await econ.escrow.createEscrow(
  'ArbitrageBot-1',
  '0xComputeProvider',
  4.5,
  'Batch inference SLA 99.8%'
);`}
              </pre>
            </div>

            {/* Backend REST API */}
            <div className="panel" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span className="font-mono" style={{ fontSize: '12px', fontWeight: 800, color: '#CFFF3D' }}>
                  Agent Backend API (backend/)
                </span>
                <span className="badge badge-cyan font-mono">PORT 3001</span>
              </div>
              <pre className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-app)', padding: '14px', borderRadius: '4px', overflowX: 'auto', lineHeight: '1.6' }}>
{`# Health Check
GET /health
-> { "status": "ok", "uptime": 1204 }

# Agent Metadata & Verification
GET /metadata
-> { "name": "ECON Agent Node", "erc8004": true }

# Execute Idempotent Task
POST /run
Headers:
  X-Request-ID: <uuid>
Body:
  {
    "task": "analyze_orderbook",
    "wallet": "0x123...abc",
    "credits": 5
  }
-> { "status": "completed", "creditsConsumed": 5 }`}
              </pre>
            </div>
          </div>

          {/* Smart Contract Reference */}
          <div className="panel" style={{ padding: '16px' }}>
            <span className="font-mono text-muted" style={{ fontSize: '11px', fontWeight: 700 }}>
              VERIFIED MONAD TESTNET SMART CONTRACTS
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '12px' }}>
              <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 600, fontSize: '12px', color: '#FFF' }}>ECONEscrow.sol</div>
                <div className="font-mono text-mint" style={{ fontSize: '11px', marginTop: '4px' }}>0x62B9D90e964C108779951664c39832B6F9A27F03</div>
                <div className="font-mono text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>Conditional value locks & releases</div>
              </div>

              <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 600, fontSize: '12px', color: '#FFF' }}>ECONCreditVault.sol</div>
                <div className="font-mono text-mint" style={{ fontSize: '11px', marginTop: '4px' }}>0x7E3a8451D879F439fDa744747B0593B6Eda30022</div>
                <div className="font-mono text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>Recyclable credit reserves & allocations</div>
              </div>

              <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 600, fontSize: '12px', color: '#FFF' }}>ECONIdentity (ERC-8004)</div>
                <div className="font-mono text-mint" style={{ fontSize: '11px', marginTop: '4px' }}>0x8004A818b43A4F469612C57cEC58c9735D1e1234</div>
                <div className="font-mono text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>Cryptographic agent passport registry</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConsoleLayout>
  );
};

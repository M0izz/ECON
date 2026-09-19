import React, { useState, useEffect } from 'react';
import { ECON } from './sdk/client';
import { LandingPage } from './components/landing/LandingPage';
import { ConsoleLayout, ConsoleTab } from './components/console/ConsoleLayout';
import { ConsoleOverview } from './components/console/ConsoleOverview';
import { ConsoleRecoveryEngine } from './components/console/ConsoleRecoveryEngine';
import { EntitiesView } from './components/EntitiesView';
import { DiscoveryView } from './components/DiscoveryView';
import { PolicyControlView } from './components/PolicyControlView';
import { AgentBuilder } from './components/AgentBuilder';
import { AuditLedger } from './components/AuditLedger';
import { MonadAgentPublisher } from './settlement/MonadAgentPublisher';
import { MonadAgentDirectory } from './settlement/MonadAgentDirectory';

export type AppViewMode = 'LANDING' | 'CONSOLE';

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<AppViewMode>('LANDING');
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>('OVERVIEW');
  const [, setRenderTrigger] = useState(0);
  const [walletAddress, setWalletAddress] = useState<string>();
  const [walletError, setWalletError] = useState<string>();
  const [directory] = useState(() => new MonadAgentDirectory());
  const [directoryStatus, setDirectoryStatus] = useState('Loading published agents from Monad...');

  const [econ] = useState(() => new ECON());

  const syncPublishedAgents = async () => {
    try {
      const publishedAgents = await directory.listPublishedAgents();
      publishedAgents.forEach((agent) => econ.store.setAgent(agent));
      setDirectoryStatus(`${publishedAgents.length} published agents found on Monad Testnet`);
    } catch (error) {
      setDirectoryStatus(error instanceof Error ? error.message : 'Could not read Monad agent registry');
    }
  };

  useEffect(() => {
    void syncPublishedAgents();
  }, [directory]);

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

  const agents = econ.store.getAllAgents().filter((agent) => agent.onChainAgentId);
  const objects = econ.store.getAllObjects();
  const services = econ.discovery.search({});
  const events = econ.events.getHistory();
  const plans = econ.store.getAllRecoveryPlans();

  const handleConnectWallet = async () => {
    setWalletError(undefined);
    try {
      const account = await new MonadAgentPublisher().connect();
      setWalletAddress(account);
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Wallet connection failed');
    }
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
      walletAddress={walletAddress}
      walletError={walletError}
      onConnectWallet={handleConnectWallet}
    >
      {consoleTab === 'OVERVIEW' && (
        <ConsoleOverview
          store={econ.store}
          events={events}
          directoryStatus={directoryStatus}
          onNavigate={(tab) => setConsoleTab(tab as ConsoleTab)}
        />
      )}

      {consoleTab === 'AGENTS' && (
        <EntitiesView agents={agents} objects={objects} />
      )}

      {consoleTab === 'AGENT_BUILDER' && (
        <AgentBuilder
          econ={econ}
            onAgentCreated={(agent) => {
              directory.rememberPublishedAgent(agent);
              setRenderTrigger((p) => p + 1);
              void syncPublishedAgents();
            }}
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
        <EntitiesView agents={agents} objects={objects} />
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
        <div className="econ-card">
          <span className="econ-eyebrow">// DEVELOPER INTEGRATION SPECIFICATION</span>
          <h2 className="econ-title-lg" style={{ margin: '8px 0 16px 0' }}>
            ECON PROTOCOL SDK ARCHITECTURE
          </h2>
          <p className="text-secondary" style={{ maxWidth: '640px', marginBottom: '24px' }}>
            Install the sovereign agent layer directly into your TypeScript or Python agents.
            Settles natively on Monad Parallel EVM (Chain ID: 10143).
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="econ-card" style={{ backgroundColor: '#03141C', border: '1px solid #0F3B4F' }}>
              <span className="font-mono text-lime" style={{ fontSize: '12px', fontWeight: 800 }}>
                TypeScript SDK: @econ/sdk
              </span>
              <pre className="font-mono text-muted" style={{ fontSize: '11px', marginTop: '12px' }}>
{`npm install @econ/sdk

import { EconClient } from '@econ/sdk';
const econ = new EconClient({
  network: 'monad-testnet',
  chainId: 10143
});`}
              </pre>
            </div>

            <div className="econ-card" style={{ backgroundColor: '#03141C', border: '1px solid #0F3B4F' }}>
              <span className="font-mono text-lime" style={{ fontSize: '12px', fontWeight: 800 }}>
                Python SDK: econ-sdk
              </span>
              <pre className="font-mono text-muted" style={{ fontSize: '11px', marginTop: '12px' }}>
{`pip install econ-sdk

from econ import EconClient
econ = EconClient(network="monad-testnet")
agent = econ.register_agent("ResearchBot")`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </ConsoleLayout>
  );
};

import React, { useState, useEffect } from 'react';
import { defaultEcon } from './sdk/client';
import { initializeDemoSeed } from './demo/seed';
import { EconomicLoopSimulation } from './demo/scenarios';
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
import { SimulationSlice } from './components/SimulationSlice';
import { AgentBuilder } from './components/AgentBuilder';
import { AuditLedger } from './components/AuditLedger';

export type AppViewMode = 'LANDING' | 'CONSOLE';

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<AppViewMode>('LANDING');
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>('OVERVIEW');
  const [, setRenderTrigger] = useState(0);

  // Initialize persistent singletons
  const [econ] = useState(() => {
    initializeDemoSeed(defaultEcon);
    return defaultEcon;
  });

  const [sim] = useState(() => new EconomicLoopSimulation(econ));

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

  const handleToggleSettlement = (mode: SettlementMode) => {
    if (mode === 'LOCAL_SIMULATION') {
      econ.setSettlementAdapter(new LocalSettlementAdapter(econ.store, econ.events));
    } else {
      econ.setSettlementAdapter(new MonadSettlementAdapter(econ.store, econ.events));
    }
    setRenderTrigger((p) => p + 1);
  };

  const handleResetSeed = () => {
    initializeDemoSeed(econ);
    setRenderTrigger((p) => p + 1);
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
      onToggleSettlement={handleToggleSettlement}
    >
      {consoleTab === 'OVERVIEW' && (
        <ConsoleOverview
          store={econ.store}
          onNavigate={(tab) => setConsoleTab(tab as ConsoleTab)}
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

      {consoleTab === 'SIMULATION' && (
        <SimulationSlice
          econ={econ}
          sim={sim}
          onStateChange={() => setRenderTrigger((p) => p + 1)}
          onResetSeed={handleResetSeed}
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

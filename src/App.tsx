import React, { useState, useEffect } from 'react';
import { defaultEcon } from './sdk/client';
import { initializeDemoSeed } from './demo/seed';
import { EconomicLoopSimulation } from './demo/scenarios';
import { LocalSettlementAdapter } from './settlement/LocalSettlementAdapter';
import { MonadSettlementAdapter } from './settlement/MonadSettlementAdapter';
import { SettlementMode } from './sdk/types';
import { Navigation, NavTab } from './components/Navigation';
import { CommandCenter } from './components/CommandCenter';
import { EntitiesView } from './components/EntitiesView';
import { DiscoveryView } from './components/DiscoveryView';
import { RecoveryView } from './components/RecoveryView';
import { PolicyControlView } from './components/PolicyControlView';
import { SimulationSlice } from './components/SimulationSlice';
import { AuditLedger } from './components/AuditLedger';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('SIMULATION_SLICE');
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

  const derived = econ.store.getDerivedState();
  const agents = econ.store.getAllAgents();
  const objects = econ.store.getAllObjects();
  const services = econ.discovery.search({});
  const events = econ.events.getHistory();
  const plans = econ.store.getAllRecoveryPlans();
  const currentMode = econ.store.getSettlementMode();

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

  return (
    <div className="app-container">
      {/* Top Header & Telemetry Bar */}
      <header className="top-header">
        <div className="header-left">
          <div className="brand-badge">
            <span className="logo-box">ECON</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              ECONOMIC OPERATING LAYER
            </span>
          </div>

          <div className="header-metrics">
            <div className="metric-pill">
              <span className="label">Treasury</span>
              <span className="val">{derived.totalTreasuryMon.toFixed(1)} MON</span>
            </div>
            <div className="metric-pill">
              <span className="label">Stranded Value</span>
              <span className="val text-pink">{derived.totalStrandedValueMon.toFixed(1)} MON</span>
            </div>
            <div className="metric-pill">
              <span className="label">Recovered</span>
              <span className="val text-mint">+{derived.totalRecoveredValueMon.toFixed(1)} MON</span>
            </div>
            <div className="metric-pill">
              <span className="label">Obligations</span>
              <span className="val">{derived.totalActiveObligationsMon.toFixed(1)} MON</span>
            </div>
          </div>
        </div>

        <div className="header-right">
          {/* Explicit Settlement Mode Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="font-mono text-muted" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
              SETTLEMENT MODE
            </span>
            <div className="settlement-toggle-group">
              <button
                className={`settlement-toggle-btn ${
                  currentMode === 'LOCAL_SIMULATION' ? 'active' : ''
                }`}
                onClick={() => handleToggleSettlement('LOCAL_SIMULATION')}
              >
                <div className="indicator-dot" />
                <span>LOCAL SIMULATION</span>
              </button>

              <button
                className={`settlement-toggle-btn ${
                  currentMode === 'MONAD_TESTNET' ? 'active' : ''
                }`}
                onClick={() => handleToggleSettlement('MONAD_TESTNET')}
              >
                <div className="indicator-dot" />
                <span>MONAD TESTNET</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="main-workspace">
        <Navigation
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          eventCount={events.length}
        />

        <main className="content-area">
          {currentTab === 'SIMULATION_SLICE' && (
            <SimulationSlice
              econ={econ}
              sim={sim}
              onStateChange={() => setRenderTrigger((p) => p + 1)}
              onResetSeed={handleResetSeed}
            />
          )}

          {currentTab === 'COMMAND_CENTER' && (
            <CommandCenter
              derived={derived}
              events={events}
              agents={agents}
              objects={objects}
              onNavigateTab={setCurrentTab}
            />
          )}

          {currentTab === 'ENTITIES' && (
            <EntitiesView agents={agents} objects={objects} />
          )}

          {currentTab === 'DISCOVERY' && (
            <DiscoveryView services={services} />
          )}

          {currentTab === 'RECOVERY' && (
            <RecoveryView
              econ={econ}
              objects={objects}
              plans={plans}
              agents={agents}
              onTriggerScan={handleTriggerScan}
              onRefresh={() => setRenderTrigger((p) => p + 1)}
            />
          )}

          {currentTab === 'POLICY_CONTROL' && (
            <PolicyControlView
              agents={agents}
              events={events}
              onUpdatePolicy={handleUpdatePolicy}
            />
          )}

          {currentTab === 'AUDIT_LOG' && <AuditLedger events={events} />}
        </main>
      </div>
    </div>
  );
};

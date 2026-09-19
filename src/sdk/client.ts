import { EconomicStore, globalStore } from './store';
import { EventBus, globalEventBus } from './events';
import { SettlementAdapter } from '../settlement/interface';
import { LocalSettlementAdapter } from '../settlement/LocalSettlementAdapter';
import { IdentityRegistry } from './identity';
import { DiscoveryRegistry } from './discovery';
import { PolicyEngine } from './policy';
import { EscrowManager } from './escrow';
import { EconomicEngine } from './engine';
import { EconomicGarbageCollector } from './garbageCollector';
import { RecoveryEngine } from './recovery';

export interface ECONConfig {
  store?: EconomicStore;
  eventBus?: EventBus;
  settlement?: SettlementAdapter;
}

export class ECON {
  public readonly store: EconomicStore;
  public readonly events: EventBus;
  public readonly policy: PolicyEngine;
  public readonly identity: IdentityRegistry;
  public readonly discovery: DiscoveryRegistry;
  public readonly escrow: EscrowManager;
  public readonly engine: EconomicEngine;
  public readonly gc: EconomicGarbageCollector;
  public readonly recovery: RecoveryEngine;

  private activeSettlement: SettlementAdapter;

  constructor(config: ECONConfig = {}) {
    this.store = config.store || globalStore;
    this.events = config.eventBus || globalEventBus;

    this.activeSettlement =
      config.settlement || new LocalSettlementAdapter(this.store, this.events);

    this.policy = new PolicyEngine(this.store, this.events);
    this.identity = new IdentityRegistry(this.store, this.events);
    this.discovery = new DiscoveryRegistry(this.store);
    this.escrow = new EscrowManager(this.store, this.activeSettlement, this.events);
    this.engine = new EconomicEngine(this.store, this.activeSettlement, this.policy, this.events);
    this.gc = new EconomicGarbageCollector(this.store, this.policy, this.events);
    this.recovery = new RecoveryEngine(this.store, this.activeSettlement, this.policy, this.events);
  }

  public setSettlementAdapter(adapter: SettlementAdapter): void {
    this.activeSettlement = adapter;
    this.engine.setSettlementAdapter(adapter);
    this.escrow.setSettlementAdapter(adapter);
    this.recovery.setSettlementAdapter(adapter);
    this.store.setSettlementMode(
      adapter.id === 'monad' ? 'MONAD_TESTNET' : 'LOCAL_SIMULATION'
    );
  }

  public getSettlementAdapter(): SettlementAdapter {
    return this.activeSettlement;
  }
}

export const defaultEcon = new ECON();

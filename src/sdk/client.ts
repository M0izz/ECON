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
import { ExternalAgentConnector, ExternalAgentConnectionConfig } from './agent/connect';
import { AgentRuntime } from './agent/runtime';
import { Agent, AgentPolicy, AgentCapabilities, ModelProvider } from './types';
import { DEFAULT_AGENT_POLICY } from './identity';
import { DEFAULT_AGENT_CAPABILITIES } from './agent/capabilities';
import { CreditVault } from './creditVault';

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
  public escrow: EscrowManager;
  public readonly engine: EconomicEngine;
  public readonly gc: EconomicGarbageCollector;
  public readonly recovery: RecoveryEngine;
  public readonly connector: ExternalAgentConnector;
  public readonly credits: CreditVault;

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
    this.connector = new ExternalAgentConnector(this.store, this.events);
    this.credits = new CreditVault(this.store, this.events);
  }

  public connectExternalAgent(config: ExternalAgentConnectionConfig): Agent {
    return this.connector.connect(config);
  }

  public createNativeAgent(config: {
    id: string;
    name: string;
    purpose?: string;
    modelProvider?: ModelProvider;
    initialBalanceMon?: number;
    policy?: Partial<AgentPolicy>;
    capabilities?: Partial<AgentCapabilities>;
    controller?: string;
    walletAddress?: string;
    onChainAgentId?: string;
    onChainTxHash?: string;
    metadataURI?: string;
  }): Agent {
    const wallet = config.controller || `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const agent: Agent = {
      id: config.id,
      name: config.name,
      controller: wallet,
      walletAddress: config.walletAddress || `${wallet.substring(0, 6)}...${wallet.substring(38)}`,
      balanceMon: config.initialBalanceMon !== undefined ? config.initialBalanceMon : 100,
      reputationScore: 98.5,
      active: true,
      registeredAt: Date.now(),
      policy: {
        ...DEFAULT_AGENT_POLICY,
        ...config.policy,
      },
      activeObligations: 0,
      origin: 'NATIVE',
      purpose: config.purpose || 'Autonomous native entity inside ECON',
      modelProvider: config.modelProvider || 'GEMINI',
      capabilities: {
        ...DEFAULT_AGENT_CAPABILITIES,
        ...config.capabilities,
      },
      autonomyLevel: 'FULL',
      onChainAgentId: config.onChainAgentId,
      onChainTxHash: config.onChainTxHash,
      metadataURI: config.metadataURI,
    };

    this.store.setAgent(agent);
    this.events.emit({
      type: 'AGENT_REGISTERED',
      actor: agent.id,
      summary: `Native ECON agent deployed: ${agent.name} (Model: ${agent.modelProvider}, Budget: ${agent.balanceMon} MON)`,
      details: { id: agent.id, name: agent.name, origin: 'NATIVE', model: agent.modelProvider },
    });

    return agent;
  }

  public getRuntime(agentId: string): AgentRuntime {
    return new AgentRuntime(
      agentId,
      this.store,
      this.policy,
      this.engine,
      this.escrow,
      this.gc,
      this.recovery,
      this.events
    );
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

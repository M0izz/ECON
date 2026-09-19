import { Agent, AgentId, AgentPolicy, AgentCapabilities } from '../types';
import { EconomicStore } from '../store';
import { EventBus } from '../events';
import { DEFAULT_AGENT_POLICY } from '../identity';
import { DEFAULT_AGENT_CAPABILITIES } from './capabilities';

export interface ExternalAgentConnectionConfig {
  id: AgentId;
  name: string;
  controller?: string;
  walletAddress?: string;
  initialBalanceMon?: number;
  purpose?: string;
  policy?: Partial<AgentPolicy>;
  capabilities?: Partial<AgentCapabilities>;
}

export class ExternalAgentConnector {
  private store: EconomicStore;
  private eventBus: EventBus;

  constructor(store: EconomicStore, eventBus: EventBus) {
    this.store = store;
    this.eventBus = eventBus;
  }

  public connect(config: ExternalAgentConnectionConfig): Agent {
    const existing = this.store.getAgent(config.id);
    if (existing) {
      // Reconnect existing external agent
      this.eventBus.emit({
        type: 'AGENT_REGISTERED',
        actor: config.id,
        summary: `External agent re-connected to ECON network: ${existing.name}`,
        details: { id: config.id, origin: 'EXTERNAL', status: 'RECONNECTED' },
      });
      return existing;
    }

    const wallet =
      config.walletAddress ||
      `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    const mergedPolicy: AgentPolicy = {
      ...DEFAULT_AGENT_POLICY,
      ...config.policy,
    };

    const mergedCapabilities: AgentCapabilities = {
      ...DEFAULT_AGENT_CAPABILITIES,
      ...config.capabilities,
    };

    const agent: Agent = {
      id: config.id,
      name: config.name,
      controller: config.controller || wallet,
      walletAddress: `${wallet.substring(0, 6)}...${wallet.substring(38)}`,
      balanceMon: config.initialBalanceMon !== undefined ? config.initialBalanceMon : 50.0,
      reputationScore: 98.0,
      active: true,
      registeredAt: Date.now(),
      policy: mergedPolicy,
      activeObligations: 0,
      origin: 'EXTERNAL',
      purpose: config.purpose || 'External custom agent integrated via ECON SDK',
      modelProvider: 'EXTERNAL_RUNTIME',
      capabilities: mergedCapabilities,
      autonomyLevel: 'SEMI_AUTONOMOUS',
    };

    this.store.setAgent(agent);

    this.eventBus.emit({
      type: 'AGENT_REGISTERED',
      actor: config.id,
      summary: `External agent connected via @econ/sdk: ${agent.name} (Wallet: ${agent.walletAddress})`,
      details: {
        id: agent.id,
        name: agent.name,
        origin: 'EXTERNAL',
        initialBalance: agent.balanceMon,
      },
    });

    return agent;
  }
}

import { Agent, AgentId, AgentPolicy } from './types';
import { EconomicStore } from './store';
import { EventBus } from './events';

export const DEFAULT_AGENT_POLICY: AgentPolicy = {
  maxPerTransaction: 20,
  dailySpendingLimit: 100,
  allowedCategories: [
    'GPU_COMPUTE_CREDIT',
    'API_LICENSE',
    'DATA_SUBSCRIPTION',
    'STORAGE_CREDIT',
    'COMPUTE_RESERVATION',
  ],
  requireApprovalAbove: 20,
  autoRecoveryEnabled: true,
  autoTransferEnabled: true,
  minRetainedBalance: 25,
};

export class IdentityRegistry {
  private store: EconomicStore;
  private eventBus: EventBus;

  constructor(store: EconomicStore, eventBus: EventBus) {
    this.store = store;
    this.eventBus = eventBus;
  }

  public registerAgent(
    id: AgentId,
    name: string,
    controller: string,
    walletAddress: string,
    initialBalanceMon: number = 100,
    policy: Partial<AgentPolicy> = {}
  ): Agent {
    const existing = this.store.getAgent(id);
    if (existing) {
      throw new Error(`Agent with ID ${id} is already registered`);
    }

    const mergedPolicy: AgentPolicy = {
      ...DEFAULT_AGENT_POLICY,
      ...policy,
    };

    const agent: Agent = {
      id,
      name,
      controller,
      walletAddress,
      balanceMon: initialBalanceMon,
      reputationScore: 98.0,
      active: true,
      registeredAt: Date.now(),
      policy: mergedPolicy,
      activeObligations: 0,
    };

    this.store.setAgent(agent);

    this.eventBus.emit({
      type: 'AGENT_REGISTERED',
      actor: id,
      summary: `Agent registered: ${name} (${id}) with ${initialBalanceMon} MON`,
      details: { id, name, controller, walletAddress, balanceMon: initialBalanceMon },
    });

    return agent;
  }

  public updatePolicy(id: AgentId, updates: Partial<AgentPolicy>): Agent {
    const agent = this.store.getAgent(id);
    if (!agent) {
      throw new Error(`Agent ${id} not found`);
    }

    agent.policy = { ...agent.policy, ...updates };
    this.store.setAgent(agent);

    this.eventBus.emit({
      type: 'POLICY_UPDATED',
      actor: id,
      summary: `Updated economic policy for ${agent.name}`,
      details: { id, updatedPolicy: agent.policy },
    });

    return agent;
  }

  public updateReputation(id: AgentId, newScore: number): void {
    const agent = this.store.getAgent(id);
    if (agent) {
      agent.reputationScore = Math.max(0, Math.min(100, Math.round(newScore * 10) / 10));
      this.store.setAgent(agent);
    }
  }

  public setActive(id: AgentId, active: boolean): void {
    const agent = this.store.getAgent(id);
    if (agent) {
      agent.active = active;
      this.store.setAgent(agent);
    }
  }
}

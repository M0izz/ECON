import {
  AgentId,
  ObjectId,
  Transaction,
  EscrowRecord,
  RecoveryPlan,
  ServiceOffering,
  EconomicObject,
  Obligation,
  RecoveryStrategy,
} from '../types';
import { EconomicStore } from '../store';
import { PolicyEngine } from '../policy';
import { EconomicEngine } from '../engine';
import { EscrowManager } from '../escrow';
import { EconomicGarbageCollector } from '../garbageCollector';
import { RecoveryEngine } from '../recovery';
import { DiscoveryRegistry } from '../discovery';
import { checkAgentCapability } from './capabilities';

export interface AgentTools {
  discover(params?: { capability?: string; maxPrice?: number; minReputation?: number }): Promise<ServiceOffering[]>;
  quote(params: { serviceId: string; quantity?: number }): Promise<{
    serviceId: string;
    unitPriceMon: number;
    quantity: number;
    totalPriceMon: number;
    providerId: string;
  }>;
  buy(params: { sellerId: string; objectId?: string; amountMon: number; memo?: string }): Promise<Transaction>;
  sell(params: { objectId: string; buyerId?: string; priceMon: number; memo?: string }): Promise<Transaction>;
  exchange(params: { offerObjectId: string; targetObjectId: string }): Promise<{ success: boolean; txId: string; memo: string }>;
  createEscrow(params: { sellerId: string; amountMon: number; condition: string; timeoutBlocks?: number }): Promise<EscrowRecord>;
  checkBalance(params?: { agentId?: string }): Promise<{
    agentId: string;
    balanceMon: number;
    activeObligations: number;
    minRetainedBalance: number;
    availableMon: number;
  }>;
  listAssets(params?: { agentId?: string; status?: string }): Promise<EconomicObject[]>;
  listObligations(params?: { agentId?: string; status?: string }): Promise<Obligation[]>;
  scanRecovery(params?: { agentId?: string }): Promise<RecoveryPlan[]>;
  requestRecovery(params: { objectId: string; strategy?: RecoveryStrategy }): Promise<RecoveryPlan>;
  getTransaction(params: { txId: string }): Promise<Transaction | undefined>;
  getReputation(params?: { agentId?: string }): Promise<{
    agentId: string;
    reputationScore: number;
    registry: string;
    verified: boolean;
  }>;
}

export function createAgentTools(
  agentId: AgentId,
  store: EconomicStore,
  policy: PolicyEngine,
  engine: EconomicEngine,
  escrow: EscrowManager,
  gc: EconomicGarbageCollector,
  recovery: RecoveryEngine,
  discovery?: DiscoveryRegistry
): AgentTools {
  const getAgent = () => {
    const a = store.getAgent(agentId);
    if (!a) throw new Error(`Agent ${agentId} not found`);
    return a;
  };

  return {
    async discover(params = {}) {
      if (discovery) {
        return discovery.search({
          capability: params.capability,
          budget: params.maxPrice,
          reputationMin: params.minReputation,
        });
      }
      let services = store.getAllServices();
      if (params.capability) {
        services = services.filter((s) => s.capability.toLowerCase().includes(params.capability!.toLowerCase()));
      }
      if (params.maxPrice !== undefined) {
        services = services.filter((s) => s.priceMon <= params.maxPrice!);
      }
      if (params.minReputation !== undefined) {
        services = services.filter((s) => s.reputation >= params.minReputation!);
      }
      return services;
    },

    async quote(params) {
      const service = store.getAllServices().find((s) => s.id === params.serviceId);
      if (!service) throw new Error(`Service ${params.serviceId} not found`);
      const quantity = params.quantity || 1;
      const totalPriceMon = Math.round(service.priceMon * quantity * 1000) / 1000;
      return {
        serviceId: service.id,
        unitPriceMon: service.priceMon,
        quantity,
        totalPriceMon,
        providerId: service.providerId,
      };
    },

    async buy(params) {
      const agent = getAgent();
      const capCheck = checkAgentCapability(agent, 'canPurchaseServices');
      if (!capCheck.allowed) throw new Error(`Capability check failed: ${capCheck.reason}`);

      let objId = params.objectId;
      if (!objId) {
        // Create an economic resource placeholder if buying directly from service
        objId = `obj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        store.setObject({
          id: objId,
          owner: params.sellerId,
          type: 'API_LICENSE',
          denomination: 'API Access Pass',
          quantity: 1,
          valueMon: params.amountMon,
          expiryTimestamp: Date.now() + 86400000 * 30,
          transferable: true,
          status: 'ACTIVE',
          metadataHash: `0x${Math.random().toString(16).substring(2, 10)}`,
          createdAt: Date.now(),
          allocationQuantity: 1,
          consumedQuantity: 0,
          utilizationRatePerHour: 0.1,
          projectedRequirement: 1,
        });
      }

      return engine.buy(agentId, params.sellerId, objId, params.amountMon, params.memo || 'Asset Purchase');
    },

    async sell(params) {
      const agent = getAgent();
      const capCheck = checkAgentCapability(agent, 'canSellAssets');
      if (!capCheck.allowed) throw new Error(`Capability check failed: ${capCheck.reason}`);

      return engine.sell(agentId, params.objectId, params.priceMon, params.buyerId, params.memo);
    },

    async exchange(params) {
      const agent = getAgent();
      const capCheck = checkAgentCapability(agent, 'canExchangeAssets');
      if (!capCheck.allowed) throw new Error(`Capability check failed: ${capCheck.reason}`);

      return engine.exchange(agentId, params.offerObjectId, params.targetObjectId);
    },

    async createEscrow(params) {
      const agent = getAgent();
      const capCheck = checkAgentCapability(agent, 'canUseEscrow');
      if (!capCheck.allowed) throw new Error(`Capability check failed: ${capCheck.reason}`);

      const policyCheck = policy.validateTransaction(agentId, params.amountMon);
      if (!policyCheck.allowed) throw new Error(`Policy blocked escrow: ${policyCheck.reason}`);

      return escrow.createEscrow(agentId, params.sellerId, params.amountMon, params.condition);
    },

    async checkBalance(params = {}) {
      const targetId = params.agentId || agentId;
      const agent = store.getAgent(targetId);
      if (!agent) throw new Error(`Agent ${targetId} not found`);
      const minRetained = agent.policy.minRetainedBalance || 0;
      const available = Math.max(0, agent.balanceMon - agent.activeObligations - minRetained);
      return {
        agentId: targetId,
        balanceMon: agent.balanceMon,
        activeObligations: agent.activeObligations,
        minRetainedBalance: minRetained,
        availableMon: Math.round(available * 1000) / 1000,
      };
    },

    async listAssets(params = {}) {
      const targetId = params.agentId || agentId;
      let objects = store.getObjectsByOwner(targetId);
      if (params.status) {
        objects = objects.filter((o) => o.status === params.status);
      }
      return objects;
    },

    async listObligations(params = {}) {
      const targetId = params.agentId || agentId;
      let obligations = store.getObligationsByDebtor(targetId);
      if (params.status) {
        obligations = obligations.filter((o) => o.status === params.status);
      }
      return obligations;
    },

    async scanRecovery(params = {}) {
      const targetId = params.agentId || agentId;
      const stranded = gc.scan(targetId);
      return stranded.map((obj) => gc.plan(obj.id));
    },

    async requestRecovery(params) {
      const agent = getAgent();
      const capCheck = checkAgentCapability(agent, 'canRecoverValue');
      if (!capCheck.allowed) throw new Error(`Capability check failed: ${capCheck.reason}`);

      const plan = gc.plan(params.objectId);
      if (params.strategy) {
        plan.recommendedStrategy = params.strategy;
      }
      await recovery.execute(plan, true);
      return plan;
    },

    async getTransaction(params) {
      return store.getTransaction(params.txId);
    },

    async getReputation(params = {}) {
      const targetId = params.agentId || agentId;
      const agent = store.getAgent(targetId);
      if (!agent) throw new Error(`Agent ${targetId} not found`);
      return {
        agentId: targetId,
        reputationScore: agent.reputationScore,
        registry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
        verified: true,
      };
    },
  };
}

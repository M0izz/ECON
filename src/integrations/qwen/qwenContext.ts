/**
 * Economic Context Builder for Qwen 3.8 Max Reasoning
 */

import { Agent, ServiceOffering, EconomicObject, RecoveryPlan } from '../../sdk/types';
import { EconomicContext } from './qwenTypes';
import { CounterpartyIntelligenceContext } from '../nansen/nansenTypes';

export class EconomicContextBuilder {
  /**
   * Constructs bounded context for marketplace vendor analysis
   */
  public static forMarketplace(params: {
    agent: Agent;
    objective: string;
    services: ServiceOffering[];
    counterpartyIntel?: CounterpartyIntelligenceContext;
    historySnippet?: Array<{ type: string; amountMon?: number; timestamp: number; status: string }>;
  }): EconomicContext {
    const { agent, objective, services, counterpartyIntel, historySnippet } = params;

    return {
      agentId: agent.id,
      agentName: agent.name,
      treasuryBalanceMon: agent.balanceMon,
      policy: {
        maxPerTransaction: agent.policy.maxPerTransaction,
        dailySpendingLimit: agent.policy.dailySpendingLimit,
        minRetainedBalance: agent.policy.minRetainedBalance,
        allowedCategories: agent.policy.allowedCategories,
        requireApprovalAbove: agent.policy.requireApprovalAbove,
        autoRecoveryEnabled: agent.policy.autoRecoveryEnabled,
      },
      objective,
      candidateServices: services.slice(0, 6).map((s) => ({
        id: s.id,
        providerId: s.providerId,
        providerName: s.providerName,
        capability: s.capability,
        priceMon: s.priceMon,
        latencyMs: s.latencyMs,
        reputation: s.reputation,
        minSLA: s.minSLA,
      })),
      counterpartyIntelligence: counterpartyIntel,
      economicHistorySnippet: historySnippet?.slice(0, 5),
    };
  }

  /**
   * Constructs bounded context for Economic Garbage Collector recovery analysis
   */
  public static forRecovery(params: {
    agent: Agent;
    object: EconomicObject;
    plan: RecoveryPlan;
    counterpartyIntel?: CounterpartyIntelligenceContext;
    historySnippet?: Array<{ type: string; amountMon?: number; timestamp: number; status: string }>;
  }): EconomicContext {
    const { agent, object, plan, counterpartyIntel, historySnippet } = params;

    const options = [
      {
        strategy: 'TRANSFER' as const,
        yieldMon: plan.calculations.transferValue,
        label: 'Transfer to Consumer Agent',
        targetRecipient: 'DataAgent-7',
      },
      {
        strategy: 'SELL' as const,
        yieldMon: plan.calculations.sellValue,
        label: 'Sell on Secondary Market',
      },
      {
        strategy: 'KEEP' as const,
        yieldMon: plan.calculations.keepValue,
        label: 'Retain Safety Buffer',
      },
      {
        strategy: 'REFUND' as const,
        yieldMon: plan.calculations.refundValue,
        label: 'Contractual Refund Claim',
      },
    ];

    return {
      agentId: agent.id,
      agentName: agent.name,
      treasuryBalanceMon: agent.balanceMon,
      policy: {
        maxPerTransaction: agent.policy.maxPerTransaction,
        dailySpendingLimit: agent.policy.dailySpendingLimit,
        minRetainedBalance: agent.policy.minRetainedBalance,
        allowedCategories: agent.policy.allowedCategories,
        requireApprovalAbove: agent.policy.requireApprovalAbove,
        autoRecoveryEnabled: agent.policy.autoRecoveryEnabled,
      },
      objective: `Evaluate optimal recovery strategy for stranded ${object.id} (${object.quantity} units, EV = +${plan.expectedRecoveryMon} MON)`,
      recoveryCandidate: {
        objectId: object.id,
        objectType: object.type,
        units: object.quantity,
        decayProbability: 1 - plan.confidenceScore,
        options,
      },
      counterpartyIntelligence: counterpartyIntel,
      economicHistorySnippet: historySnippet?.slice(0, 5),
    };
  }
}

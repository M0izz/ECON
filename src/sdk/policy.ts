import { Agent, AgentId, AgentPolicy, ObjectType, RecoveryPlan } from './types';
import { EconomicStore } from './store';
import { EventBus } from './events';

export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
  violatesRule?: string;
  requiresManualApproval?: boolean;
}

export class PolicyEngine {
  private store: EconomicStore;
  private eventBus: EventBus;

  constructor(store: EconomicStore, eventBus: EventBus) {
    this.store = store;
    this.eventBus = eventBus;
  }

  /**
   * Validate a proposed transaction against an agent's configured policy
   */
  public validateTransaction(
    agentId: AgentId,
    amountMon: number,
    category?: ObjectType
  ): PolicyCheckResult {
    const agent = this.store.getAgent(agentId);
    if (!agent) {
      return { allowed: false, reason: `Agent ${agentId} not found in registry.` };
    }

    const { policy, balanceMon } = agent;

    // Rule 1: Minimum Retained Balance Floor
    if (balanceMon - amountMon < policy.minRetainedBalance) {
      const reason = `Violates minimum retained reserve: Transaction of ${amountMon} MON leaves balance below floor of ${policy.minRetainedBalance} MON (Current: ${balanceMon} MON).`;
      this.recordViolation(agentId, 'MIN_RETAINED_BALANCE', reason, amountMon);
      return { allowed: false, reason, violatesRule: 'MIN_RETAINED_BALANCE' };
    }

    // Rule 2: Max Single Transaction Limit
    if (amountMon > policy.maxPerTransaction) {
      const reason = `Exceeds max transaction limit: ${amountMon} MON exceeds allowed cap of ${policy.maxPerTransaction} MON.`;
      this.recordViolation(agentId, 'MAX_TRANSACTION_LIMIT', reason, amountMon);
      return { allowed: false, reason, violatesRule: 'MAX_TRANSACTION_LIMIT' };
    }

    // Rule 3: Daily Spending Aggregation
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const dailySpent = this.store
      .getAllTransactions()
      .filter((t) => t.buyer === agentId && t.status === 'SETTLED' && t.timestamp >= todayStart)
      .reduce((sum, t) => sum + t.amountMon, 0);

    if (dailySpent + amountMon > policy.dailySpendingLimit) {
      const reason = `Exceeds daily spending limit: ${dailySpent + amountMon} MON exceeds daily cap of ${policy.dailySpendingLimit} MON.`;
      this.recordViolation(agentId, 'DAILY_SPENDING_LIMIT', reason, amountMon);
      return { allowed: false, reason, violatesRule: 'DAILY_SPENDING_LIMIT' };
    }

    // Rule 4: Category Allowlist
    if (category && policy.allowedCategories.length > 0 && !policy.allowedCategories.includes(category)) {
      const reason = `Category not permitted: ${category} is not in allowed categories (${policy.allowedCategories.join(', ')}).`;
      this.recordViolation(agentId, 'CATEGORY_RESTRICTION', reason, amountMon);
      return { allowed: false, reason, violatesRule: 'CATEGORY_RESTRICTION' };
    }

    // Rule 5: Explicit Approval Threshold
    const requiresManualApproval = amountMon > policy.requireApprovalAbove;

    return {
      allowed: true,
      requiresManualApproval,
    };
  }

  /**
   * Validate a proposed Garbage Collection recovery action
   */
  public validateRecovery(plan: RecoveryPlan): PolicyCheckResult {
    const agent = this.store.getAgent(plan.ownerId);
    if (!agent) {
      return { allowed: false, reason: `Owner agent ${plan.ownerId} not found.` };
    }

    const { policy } = agent;

    if (!policy.autoRecoveryEnabled) {
      return {
        allowed: false,
        reason: `Automatic recovery is disabled in ${agent.name}'s policy. Manual operator review required.`,
        violatesRule: 'AUTO_RECOVERY_DISABLED',
      };
    }

    if (plan.recommendedStrategy === 'TRANSFER' && !policy.autoTransferEnabled) {
      return {
        allowed: false,
        reason: `Automatic asset transfer is disabled in ${agent.name}'s policy. Operator confirmation required.`,
        violatesRule: 'AUTO_TRANSFER_DISABLED',
      };
    }

    return { allowed: true };
  }

  public updatePolicy(agentId: AgentId, updates: Partial<AgentPolicy>): void {
    const agent = this.store.getAgent(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    agent.policy = {
      ...agent.policy,
      ...updates,
    };
    this.store.setAgent(agent);
    this.eventBus.emit({
      type: 'POLICY_UPDATED',
      actor: agentId,
      summary: `Policy updated for agent ${agent.name}`,
      details: { agentId, updates },
    });
  }

  private recordViolation(
    agentId: AgentId,
    rule: string,
    reason: string,
    amountMon: number
  ): void {
    this.eventBus.emit({
      type: 'POLICY_BLOCKED',
      actor: agentId,
      summary: `Transaction blocked by policy [${rule}]: ${reason}`,
      details: { agentId, rule, reason, amountMon },
    });
  }
}

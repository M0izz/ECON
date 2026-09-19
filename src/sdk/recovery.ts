import { RecoveryPlan } from './types';
import { EconomicStore } from './store';
import { SettlementAdapter } from '../settlement/interface';
import { PolicyEngine } from './policy';
import { EventBus } from './events';

export class RecoveryEngine {
  private store: EconomicStore;
  private settlement: SettlementAdapter;
  private policyEngine: PolicyEngine;
  private eventBus: EventBus;

  constructor(
    store: EconomicStore,
    settlement: SettlementAdapter,
    policyEngine: PolicyEngine,
    eventBus: EventBus
  ) {
    this.store = store;
    this.settlement = settlement;
    this.policyEngine = policyEngine;
    this.eventBus = eventBus;
  }

  public setSettlementAdapter(adapter: SettlementAdapter): void {
    this.settlement = adapter;
  }

  public async execute(plan: RecoveryPlan, operatorApproved: boolean = false): Promise<RecoveryPlan> {
    const obj = this.store.getObject(plan.objectId);
    if (!obj) {
      throw new Error(`Economic object ${plan.objectId} not found`);
    }

    // Step 1: Policy Check
    const policyResult = this.policyEngine.validateRecovery(plan);
    if (!policyResult.allowed && !operatorApproved) {
      throw new Error(`Recovery execution blocked by policy: ${policyResult.reason}`);
    }

    plan.status = 'EXECUTING';
    this.store.setRecoveryPlan(plan);

    const recoveredAmount = plan.expectedRecoveryMon;

    // Step 2: Strategy-specific settlement execution
    if (plan.recommendedStrategy === 'TRANSFER') {
      const buyerId = plan.targetBuyerId;
      if (!buyerId) {
        throw new Error(`Transfer recovery requires a designated target buyer`);
      }

      // Settle payment from peer buyer to current owner
      const settlementResult = await this.settlement.transfer(
        buyerId,
        plan.ownerId,
        recoveredAmount,
        `Recovery buyout of stranded object ${obj.id}`
      );

      if (!settlementResult.success) {
        plan.status = 'REJECTED';
        this.store.setRecoveryPlan(plan);
        throw new Error(`Recovery transfer settlement failed: ${settlementResult.error}`);
      }

      // Transfer object ownership to peer buyer and restore status
      await this.settlement.transferEconomicObject(obj.id, plan.ownerId, buyerId);
      this.store.updateObjectStatus(obj.id, 'ACTIVE', {
        owner: buyerId,
        consumedQuantity: 0,
        valueMon: recoveredAmount,
      });
    } else if (plan.recommendedStrategy === 'REFUND') {
      // Direct provider credit to agent treasury
      this.store.updateAgentBalance(plan.ownerId, recoveredAmount);
      this.store.updateObjectStatus(obj.id, 'RECOVERED');
    } else if (plan.recommendedStrategy === 'SELL') {
      // Marketplace spot liquidation
      this.store.updateAgentBalance(plan.ownerId, recoveredAmount);
      this.store.updateObjectStatus(obj.id, 'LIQUIDATED');
    } else {
      // KEEP
      this.store.updateObjectStatus(obj.id, 'ACTIVE');
    }

    plan.status = 'EXECUTED';
    plan.executedAt = Date.now();
    this.store.setRecoveryPlan(plan);

    this.eventBus.emit({
      type: 'RECOVERY_EXECUTED',
      actor: plan.ownerId,
      summary: `Successfully executed ${plan.recommendedStrategy} recovery for ${obj.id} (+${recoveredAmount} MON recovered)`,
      details: {
        planId: plan.id,
        objectId: obj.id,
        strategy: plan.recommendedStrategy,
        recoveredAmount,
        targetBuyer: plan.targetBuyerId,
      },
    });

    return plan;
  }
}

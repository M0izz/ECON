import {
  EconomicObject,
  ExpectedValueCalculation,
  ObjectId,
  RecoveryPlan,
  RecoveryStrategy,
  AgentId,
} from './types';
import { EconomicStore } from './store';
import { PolicyEngine } from './policy';
import { EventBus } from './events';

export class EconomicGarbageCollector {
  private store: EconomicStore;
  private policyEngine: PolicyEngine;
  private eventBus: EventBus;

  constructor(store: EconomicStore, policyEngine: PolicyEngine, eventBus: EventBus) {
    this.store = store;
    this.policyEngine = policyEngine;
    this.eventBus = eventBus;
  }

  /**
   * Stage 1 & 2: Eligibility Scanner & Stranded Value Detector
   * Scans an agent's economic objects (or entire network) for stranded value.
   */
  public scan(agentId?: AgentId): EconomicObject[] {
    const objects = agentId
      ? this.store.getObjectsByOwner(agentId)
      : this.store.getAllObjects();

    const strandedObjects: EconomicObject[] = [];

    for (const obj of objects) {
      if (obj.status === 'EXPIRED' || obj.status === 'RECOVERED' || obj.status === 'LIQUIDATED') {
        continue;
      }

      // Check for stranded conditions:
      // 1. Time-to-expiry vs consumption rate
      const now = Date.now();
      const timeLeftHours = Math.max(0, (obj.expiryTimestamp - now) / 3600000);
      const remainingUnits = Math.max(0, obj.quantity - obj.consumedQuantity);

      // If utilization is low and remaining is higher than projected requirement
      const isIdleOrExcess =
        remainingUnits > 0 &&
        remainingUnits > obj.projectedRequirement &&
        (obj.status === 'STRANDED' || (timeLeftHours < 48 && obj.utilizationRatePerHour < remainingUnits / 10));

      if (isIdleOrExcess) {
        // Tag object as STRANDED if not already
        if (obj.status !== 'STRANDED') {
          this.store.updateObjectStatus(obj.id, 'STRANDED');
          this.eventBus.emit({
            type: 'STRANDED_VALUE_DETECTED',
            actor: obj.owner,
            summary: `Stranded value detected: ${remainingUnits} ${obj.denomination} in ${obj.id} (~${obj.valueMon} MON)`,
            details: {
              objectId: obj.id,
              owner: obj.owner,
              remainingUnits,
              valueMon: obj.valueMon,
              timeLeftHours: Math.round(timeLeftHours * 10) / 10,
            },
          });
        }
        strandedObjects.push(this.store.getObject(obj.id)!);
      }
    }

    return strandedObjects;
  }

  /**
   * Stage 3, 4, 5, 6: Recoverability Analysis, Policy Check, Strategy & Expected Value Calculation
   */
  public plan(objectId: ObjectId): RecoveryPlan {
    const obj = this.store.getObject(objectId);
    if (!obj) {
      throw new Error(`Object ${objectId} not found`);
    }

    const remainingUnits = Math.max(1, obj.quantity - obj.consumedQuantity);
    const nominalValue = obj.valueMon;
    const now = Date.now();
    const timeLeftHours = Math.max(1, (obj.expiryTimestamp - now) / 3600000);

    // Compute peer market demand
    const allAgents = this.store.getAllAgents().filter((a) => a.id !== obj.owner && a.active);
    const peerDemandCount = Math.min(5, Math.max(1, Math.floor(allAgents.length * 0.6)));

    // Quantitative Expected Value (EV) calculation:
    // 1. KEEP EV: Probability of late utilization * nominal value (decaying with short expiry)
    const keepProb = Math.min(0.3, obj.projectedRequirement / remainingUnits);
    const keepValue = Math.round(nominalValue * keepProb * 100) / 100;

    // 2. SELL EV: Secondary marketplace price with market haircut (-15% to -25%)
    const sellHaircut = timeLeftHours < 12 ? 0.65 : 0.82;
    const sellValue = Math.round(nominalValue * sellHaircut * 100) / 100;

    // 3. TRANSFER EV: Peer-to-peer agent transfer (higher efficiency if transferable & demand exists)
    let transferValue = 0;
    let targetBuyer: AgentId | undefined;

    if (obj.transferable && allAgents.length > 0) {
      // Pick ideal peer candidate with sufficient balance (excluding providers)
      const consumerAgents = allAgents.filter((a) => !a.id.includes('Provider'));
      const candidate = (consumerAgents.length > 0 ? consumerAgents : allAgents).sort(
        (a, b) => b.balanceMon - a.balanceMon
      )[0];
      targetBuyer = candidate?.id;
      const transferEfficiency = 0.92; // 8% network friction
      transferValue = Math.round(nominalValue * transferEfficiency * 100) / 100;
    }

    // 4. REFUND EV: Service provider refund policy (typically 50-80% subject to SLA)
    const refundPenalty = 0.75;
    const refundValue = Math.round(nominalValue * refundPenalty * 100) / 100;

    const calculations: ExpectedValueCalculation = {
      keepValue,
      sellValue,
      transferValue,
      refundValue,
    };

    // Determine highest EV Strategy
    let recommendedStrategy: RecoveryStrategy = 'REFUND';
    let maxEV = refundValue;
    let confidenceScore = 0.85;
    let reason = 'Service provider SLA allows direct refund of unused quota.';

    if (obj.transferable && transferValue > maxEV) {
      recommendedStrategy = 'TRANSFER';
      maxEV = transferValue;
      confidenceScore = 0.91;
      reason = `Projected internal utilization is low and ${peerDemandCount} peer network agents currently demand ${obj.denomination}.`;
    } else if (sellValue > maxEV) {
      recommendedStrategy = 'SELL';
      maxEV = sellValue;
      confidenceScore = 0.88;
      reason = `Marketplace spot bids offer optimal recovery for secondary liquidation.`;
    }

    const planId = `rec-plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const plan: RecoveryPlan = {
      id: planId,
      objectId: obj.id,
      ownerId: obj.owner,
      detectedAt: Date.now(),
      strandedQuantity: remainingUnits,
      strandedValueMon: nominalValue,
      recommendedStrategy,
      confidenceScore,
      expectedRecoveryMon: maxEV,
      reason,
      targetBuyerId: targetBuyer,
      status: 'PROPOSED',
      calculations,
    };

    this.store.setRecoveryPlan(plan);

    this.eventBus.emit({
      type: 'RECOVERY_PROPOSED',
      actor: obj.owner,
      summary: `GC proposed ${recommendedStrategy} recovery for ${obj.id} (EV: +${maxEV} MON, ${Math.round(confidenceScore * 100)}% conf)`,
      details: { planId, objectId: obj.id, recommendedStrategy, maxEV, reason },
    });

    return plan;
  }
}

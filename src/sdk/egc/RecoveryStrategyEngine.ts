import { Agent, AgentId, EconomicObject, RecoveryPlan } from '../types';
import { RecoveryCandidate, StructuredRecommendation } from './types';
import { RecoveryValuationEngine } from './RecoveryValuationEngine';

export class RecoveryStrategyEngine {
  private valuationEngine: RecoveryValuationEngine;
  private peerAgents: () => Agent[];

  constructor(valuationEngine: RecoveryValuationEngine, peerAgentsSupplier: () => Agent[]) {
    this.valuationEngine = valuationEngine;
    this.peerAgents = peerAgentsSupplier;
  }

  /**
   * Evaluates available valuations and selects the optimal recovery strategy.
   * If all recovery strategies yield less net value than retention (KEEP), or if
   * all recovery options are unavailable, recommends KEEP.
   */
  public generateRecommendation(
    candidate: RecoveryCandidate,
    obj: EconomicObject,
    currentTimeMs: number = Date.now()
  ): StructuredRecommendation {
    const valuations = this.valuationEngine.evaluateValuations(candidate, obj);

    // Pick target peer buyer if TRANSFER is eligible
    const activePeers = this.peerAgents()
      .filter((a) => a.id !== candidate.ownerId && a.active)
      .sort((a, b) => b.balanceMon - a.balanceMon);
    const targetBuyer: AgentId | undefined = activePeers[0]?.id;

    // Compare available net expected values:
    const keepNet = valuations.keep.isAvailable ? valuations.keep.netExpectedMon : 0;
    const sellNet = valuations.sell.isAvailable ? valuations.sell.netExpectedMon : -1;
    const transferNet = valuations.transfer.isAvailable && targetBuyer ? valuations.transfer.netExpectedMon : -1;
    const refundNet = valuations.refund.isAvailable ? valuations.refund.netExpectedMon : -1;

    let proposedStrategy: 'KEEP' | 'SELL' | 'TRANSFER' | 'REFUND' = 'KEEP';
    let chosenValuation = valuations.keep;
    let confidence = candidate.confidence;

    // Determine max EV among eligible external strategies
    if (transferNet > keepNet && transferNet >= sellNet && transferNet >= refundNet) {
      proposedStrategy = 'TRANSFER';
      chosenValuation = valuations.transfer;
      confidence = Math.min(0.95, confidence + 0.05);
    } else if (sellNet > keepNet && sellNet >= transferNet && sellNet >= refundNet) {
      proposedStrategy = 'SELL';
      chosenValuation = valuations.sell;
      confidence = Math.min(0.92, confidence + 0.02);
    } else if (refundNet > keepNet && refundNet >= transferNet && refundNet >= sellNet) {
      proposedStrategy = 'REFUND';
      chosenValuation = valuations.refund;
      confidence = Math.min(0.88, confidence);
    } else {
      proposedStrategy = 'KEEP';
      chosenValuation = valuations.keep;
    }

    const planId = `rec-plan-${currentTimeMs}-${Math.random().toString(36).substring(2, 7)}`;
    const idempotencyKey = `idemp_${candidate.objectId}_${proposedStrategy}_${Math.round(candidate.potentialSurplus)}_${Math.floor(currentTimeMs / 60000)}`;

    const structuredRec: StructuredRecommendation = {
      id: planId,
      objectId: candidate.objectId,
      ownerId: candidate.ownerId,
      proposedStrategy,
      quantity: candidate.potentialSurplus,
      grossExpectedMon: chosenValuation.grossExpectedMon,
      expectedCostsMon: chosenValuation.expectedFeesMon + chosenValuation.executionCostMon,
      netExpectedMon: chosenValuation.netExpectedMon,
      eligibilityEvidence: candidate.evidence,
      reasonCode: candidate.reasonCode,
      confidence,
      provenance: 'DETERMINISTIC_ENGINE',
      lifecycleState: 'RECOMMENDED',
      requiredApproval: chosenValuation.netExpectedMon > 4.0 || candidate.confidence < 0.75,
      expiresAt: currentTimeMs + 3600000 * 2, // 2-hour recommendation expiry
      idempotencyKey,
      targetBuyerId: proposedStrategy === 'TRANSFER' ? targetBuyer : undefined,
      calculations: {
        keepValue: valuations.keep.netExpectedMon,
        sellValue: valuations.sell.netExpectedMon,
        transferValue: valuations.transfer.netExpectedMon,
        refundValue: valuations.refund.netExpectedMon,
      },
      valuations,
    };

    return structuredRec;
  }

  /**
   * Converts StructuredRecommendation to backward-compatible RecoveryPlan.
   */
  public toRecoveryPlan(rec: StructuredRecommendation): RecoveryPlan {
    return {
      id: rec.id,
      objectId: rec.objectId,
      ownerId: rec.ownerId,
      detectedAt: Date.now(),
      strandedQuantity: rec.quantity,
      strandedValueMon: rec.grossExpectedMon,
      recommendedStrategy: rec.proposedStrategy,
      confidenceScore: rec.confidence,
      expectedRecoveryMon: rec.netExpectedMon,
      reason: rec.eligibilityEvidence,
      targetBuyerId: rec.targetBuyerId,
      status: 'PROPOSED',
      calculations: rec.calculations,
    };
  }
}

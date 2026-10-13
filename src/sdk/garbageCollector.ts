import {
  EconomicObject,
  ObjectId,
  RecoveryPlan,
  AgentId,
} from './types';
import { EconomicStore } from './store';
import { PolicyEngine } from './policy';
import { EventBus } from './events';
import {
  EconomicObjectRepository,
  UsageForecastProvider,
  RecoveryEligibilityEngine,
  StrandedValueDetector,
  RecoveryValuationEngine,
  RecoveryStrategyEngine,
  RecoveryCandidate,
  StructuredRecommendation,
} from './egc';

export class EconomicGarbageCollector {
  private store: EconomicStore;
  private policyEngine: PolicyEngine;
  private eventBus: EventBus;

  public readonly repo: EconomicObjectRepository;
  public readonly forecastProvider: UsageForecastProvider;
  public readonly eligibilityEngine: RecoveryEligibilityEngine;
  public readonly detector: StrandedValueDetector;
  public readonly valuationEngine: RecoveryValuationEngine;
  public readonly strategyEngine: RecoveryStrategyEngine;

  constructor(store: EconomicStore, policyEngine: PolicyEngine, eventBus: EventBus) {
    this.store = store;
    this.policyEngine = policyEngine;
    this.eventBus = eventBus;

    this.repo = new EconomicObjectRepository(store);
    this.forecastProvider = new UsageForecastProvider();
    this.eligibilityEngine = new RecoveryEligibilityEngine(this.repo);
    this.detector = new StrandedValueDetector(
      this.repo,
      this.forecastProvider,
      this.eligibilityEngine
    );
    this.valuationEngine = new RecoveryValuationEngine(() => this.store.getAllAgents());
    this.strategyEngine = new RecoveryStrategyEngine(
      this.valuationEngine,
      () => this.store.getAllAgents()
    );
  }

  /**
   * Scans an agent's economic objects (or entire network) for stranded value.
   * Returns matching EconomicObjects with updated STRANDED status in the store.
   */
  public scan(agentId?: AgentId): EconomicObject[] {
    this.eventBus.emit({
      type: 'RECOVERY_SCAN_STARTED',
      actor: agentId || 'NETWORK',
      summary: `EGC Scan initiated for ${agentId || 'entire network'}`,
      details: { agentId, timestamp: Date.now() },
    });

    const candidates = this.detector.detect(agentId);
    const strandedObjects: EconomicObject[] = [];

    for (const cand of candidates) {
      const obj = this.store.getObject(cand.objectId);
      if (!obj) continue;

      if (obj.status !== 'STRANDED') {
        this.store.updateObjectStatus(obj.id, 'STRANDED');
        this.eventBus.emit({
          type: 'STRANDED_VALUE_DETECTED',
          actor: obj.owner,
          summary: `Stranded value detected: ${cand.remainingQuantity} ${obj.denomination} in ${obj.id} (~${cand.nominalValueMon} MON)`,
          details: {
            objectId: obj.id,
            owner: obj.owner,
            remainingUnits: cand.remainingQuantity,
            potentialSurplus: cand.potentialSurplus,
            valueMon: cand.nominalValueMon,
            timeLeftHours: cand.timeLeftHours,
            reasonCode: cand.reasonCode,
          },
        });
      }

      this.eventBus.emit({
        type: 'RECOVERY_CANDIDATE_FOUND',
        actor: obj.owner,
        summary: `Recovery candidate identified: ${obj.id} (${cand.reasonCode})`,
        details: cand,
      });

      strandedObjects.push(this.store.getObject(obj.id)!);
    }

    return strandedObjects;
  }

  /**
   * Scans and returns full rich RecoveryCandidate objects.
   */
  public scanCandidates(agentId?: AgentId): RecoveryCandidate[] {
    return this.detector.detect(agentId);
  }

  /**
   * Produces a structured recovery recommendation with full EV formulation.
   */
  public planStructured(objectId: ObjectId): StructuredRecommendation {
    const obj = this.store.getObject(objectId);
    if (!obj) {
      throw new Error(`Object ${objectId} not found`);
    }

    const candidates = this.detector.detect(obj.owner);
    let candidate = candidates.find((c) => c.objectId === objectId);

    if (!candidate) {
      // Direct candidate evaluation if not caught by bulk scan
      const remaining = Math.max(0, obj.quantity - obj.consumedQuantity);
      const forecast = this.forecastProvider.forecast(obj);
      const eligibility = this.eligibilityEngine.evaluate(obj);
      candidate = {
        objectId: obj.id,
        ownerId: obj.owner,
        resourceType: obj.type,
        remainingQuantity: remaining,
        originalQuantity: obj.quantity,
        nominalValueMon: obj.valueMon,
        projectedRequirement: forecast.estimatedFutureRequirement,
        potentialSurplus: Math.max(0, remaining - forecast.estimatedFutureRequirement),
        expiryTimestamp: obj.expiryTimestamp,
        timeLeftHours: Math.max(0, (obj.expiryTimestamp - Date.now()) / 3600000),
        transferability: eligibility.transferability,
        refundability: eligibility.refundability,
        sellability: eligibility.sellability,
        activeObligations: this.repo.getActiveObligations(obj),
        eligibilityStatus: eligibility.eligible,
        reasonCode: eligibility.reasonCode,
        evidence: `Direct evaluation of object ${objectId}. Reason: ${eligibility.reasonCode}`,
        confidence: forecast.confidence === 'HIGH' ? 0.9 : 0.75,
        detectedAt: Date.now(),
      };
    }

    const recommendation = this.strategyEngine.generateRecommendation(candidate, obj);
    const plan = this.strategyEngine.toRecoveryPlan(recommendation);
    this.store.setRecoveryPlan(plan);

    this.eventBus.emit({
      type: 'RECOVERY_PROPOSED',
      actor: obj.owner,
      summary: `EGC proposed ${recommendation.proposedStrategy} recovery for ${obj.id} (EV: +${recommendation.netExpectedMon} MON, ${Math.round(recommendation.confidence * 100)}% conf)`,
      details: {
        planId: plan.id,
        objectId: obj.id,
        recommendedStrategy: recommendation.proposedStrategy,
        maxEV: recommendation.netExpectedMon,
        reason: recommendation.eligibilityEvidence,
      },
    });

    return recommendation;
  }

  /**
   * Generates a backward-compatible RecoveryPlan.
   */
  public plan(objectId: ObjectId): RecoveryPlan {
    const structured = this.planStructured(objectId);
    return this.strategyEngine.toRecoveryPlan(structured);
  }
}

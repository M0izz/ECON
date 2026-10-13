import { EconomicObject, AgentId } from '../types';
import { EconomicObjectRepository } from './EconomicObjectRepository';
import { UsageForecastProvider } from './UsageForecastProvider';
import { RecoveryEligibilityEngine } from './RecoveryEligibilityEngine';
import { RecoveryCandidate } from './types';

export class StrandedValueDetector {
  private repo: EconomicObjectRepository;
  private forecastProvider: UsageForecastProvider;
  private eligibilityEngine: RecoveryEligibilityEngine;

  constructor(
    repo: EconomicObjectRepository,
    forecastProvider: UsageForecastProvider,
    eligibilityEngine: RecoveryEligibilityEngine
  ) {
    this.repo = repo;
    this.forecastProvider = forecastProvider;
    this.eligibilityEngine = eligibilityEngine;
  }

  /**
   * Scans objects and returns detected stranded candidates.
   */
  public detect(agentId?: AgentId, currentTimeMs: number = Date.now()): RecoveryCandidate[] {
    const objects = agentId
      ? this.repo.getObjectsByOwner(agentId)
      : this.repo.getAllObjects();

    const candidates: RecoveryCandidate[] = [];

    for (const obj of objects) {
      // Skip completed or permanently expired objects
      if (obj.status === 'RECOVERED' || obj.status === 'LIQUIDATED' || obj.status === 'EXPIRED') {
        continue;
      }

      const remainingUnits = Math.max(0, obj.quantity - obj.consumedQuantity);
      if (remainingUnits <= 0) continue;

      const timeLeftHours = Math.max(0, (obj.expiryTimestamp - currentTimeMs) / 3600000);
      const forecast = this.forecastProvider.forecast(obj, currentTimeMs);
      const futureNeed = Math.min(remainingUnits, forecast.estimatedFutureRequirement);
      const potentialSurplus = Math.max(0, remainingUnits - futureNeed);

      // Eligibility check
      const eligibility = this.eligibilityEngine.evaluate(obj, agentId, currentTimeMs);

      // Determine if object is stranded:
      // An object is stranded ONLY IF:
      // 1. There is positive surplus (remaining > future requirement).
      // 2. Either time-to-expiry is short (< 48h) or burn rate is too low to consume remaining units, OR already tagged STRANDED.
      const isStrandedSurplus =
        potentialSurplus > 0 &&
        (obj.status === 'STRANDED' ||
          (timeLeftHours < 48 && obj.utilizationRatePerHour < remainingUnits / 10) ||
          (forecast.confidence === 'HIGH' && potentialSurplus > 0.3 * obj.quantity));

      if (isStrandedSurplus) {
        let confidenceScore = 0.5;
        if (forecast.confidence === 'HIGH') confidenceScore = 0.92;
        else if (forecast.confidence === 'MEDIUM') confidenceScore = 0.82;
        else confidenceScore = 0.65;

        // Evidence summary
        const evidence = `Remaining: ${remainingUnits} ${obj.denomination}, Projected need: ${futureNeed} (Surplus: ${potentialSurplus}). ` +
          `Time remaining: ${timeLeftHours.toFixed(1)}h. Burn provenance: [${forecast.provenance}]. ` +
          `Eligibility: ${eligibility.reasonCode} (${eligibility.message})`;

        candidates.push({
          objectId: obj.id,
          ownerId: obj.owner,
          resourceType: obj.type,
          remainingQuantity: remainingUnits,
          originalQuantity: obj.quantity,
          nominalValueMon: obj.valueMon,
          projectedRequirement: futureNeed,
          potentialSurplus,
          expiryTimestamp: obj.expiryTimestamp,
          timeLeftHours: Math.round(timeLeftHours * 10) / 10,
          transferability: eligibility.transferability,
          refundability: eligibility.refundability,
          sellability: eligibility.sellability,
          activeObligations: this.repo.getActiveObligations(obj),
          eligibilityStatus: eligibility.eligible,
          reasonCode: eligibility.reasonCode,
          evidence,
          confidence: confidenceScore,
          detectedAt: currentTimeMs,
        });
      }
    }

    return candidates;
  }
}

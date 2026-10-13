import { EconomicObject } from '../types';
import { UsageForecast } from './types';

export class UsageForecastProvider {
  /**
   * Forecasts the agent's projected consumption requirement prior to object expiry.
   * If usage history is available, derives hourly consumption rate.
   * If usage history is empty, relies on configured projectedRequirement with honest confidence.
   */
  public forecast(obj: EconomicObject, currentTimeMs: number = Date.now()): UsageForecast {
    const timeLeftHours = Math.max(0, (obj.expiryTimestamp - currentTimeMs) / 3600000);
    const history = (obj as any).usageHistory as Array<{ timestamp: number; unitsUsed: number }> | undefined;

    // Case 1: Rich empirical usage history available
    if (history && history.length >= 3) {
      const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
      const totalUnits = sorted.reduce((sum, pt) => sum + pt.unitsUsed, 0);
      const elapsedHours = Math.max(0.5, (sorted[sorted.length - 1].timestamp - sorted[0].timestamp) / 3600000);
      const empiricalBurnRatePerHour = totalUnits / elapsedHours;
      const forecastUnits = Math.round(empiricalBurnRatePerHour * timeLeftHours * 10) / 10;

      return {
        estimatedFutureRequirement: forecastUnits,
        expectedUsageWindowHours: Math.round(timeLeftHours * 10) / 10,
        confidence: 'HIGH',
        dataPointsUsed: history.length,
        provenance: `Linear regression over ${history.length} historical consumption events (${empiricalBurnRatePerHour.toFixed(2)} units/hr)`,
        isDefensible: true,
      };
    }

    // Case 2: Utilization rate per hour specified on object
    if (obj.utilizationRatePerHour > 0) {
      const forecastUnits = Math.round(obj.utilizationRatePerHour * timeLeftHours * 10) / 10;
      return {
        estimatedFutureRequirement: Math.min(obj.quantity, Math.max(obj.projectedRequirement, forecastUnits)),
        expectedUsageWindowHours: Math.round(timeLeftHours * 10) / 10,
        confidence: 'MEDIUM',
        dataPointsUsed: 1,
        provenance: `Configured object utilization rate of ${obj.utilizationRatePerHour} units/hr over ${timeLeftHours.toFixed(1)} hrs`,
        isDefensible: true,
      };
    }

    // Case 3: Only static projectedRequirement exists without history
    if (obj.projectedRequirement !== undefined) {
      return {
        estimatedFutureRequirement: obj.projectedRequirement,
        expectedUsageWindowHours: Math.round(timeLeftHours * 10) / 10,
        confidence: 'LOW',
        dataPointsUsed: 0,
        provenance: 'Static reservation requirement parameter (no empirical consumption history)',
        isDefensible: false,
      };
    }

    // Case 4: No usage data
    return {
      estimatedFutureRequirement: 0,
      expectedUsageWindowHours: Math.round(timeLeftHours * 10) / 10,
      confidence: 'LOW',
      dataPointsUsed: 0,
      provenance: 'INSUFFICIENT_USAGE_DATA: Zero consumption data or projected demand specified',
      isDefensible: false,
    };
  }
}

import { EconomicObject, Agent } from '../types';
import { RecoveryCandidate, RecoveryValuations, ValuationDetail } from './types';
import { feeEngine, MARKETPLACE_FEE_BPS, RECOVERY_FEE_BPS } from '../fee';

export class RecoveryValuationEngine {
  private peerAgents: () => Agent[];

  constructor(peerAgentsSupplier: () => Agent[]) {
    this.peerAgents = peerAgentsSupplier;
  }

  /**
   * Calculates KEEP, SELL, TRANSFER, and REFUND valuations strictly based on eligibility.
   */
  public evaluateValuations(candidate: RecoveryCandidate, obj: EconomicObject): RecoveryValuations {
    const nominalValue = obj.valueMon;
    const remainingUnits = Math.max(1, candidate.remainingQuantity);
    const surplusFraction = Math.min(1.0, candidate.potentialSurplus / remainingUnits);
    const surplusNominalValue = Math.round(nominalValue * surplusFraction * 1000) / 1000;
    const timeLeftHours = candidate.timeLeftHours;

    // 1. KEEP Strategy Valuation
    // Value derived from projected internal consumption
    const keepProb = candidate.remainingQuantity > 0
      ? Math.min(1.0, candidate.projectedRequirement / remainingUnits)
      : 0;
    const keepNet = Math.round(nominalValue * keepProb * 1000) / 1000;
    const keepValuation: ValuationDetail = {
      grossExpectedMon: keepNet,
      expectedFeesMon: 0,
      executionCostMon: 0,
      netExpectedMon: keepNet,
      evidenceSource: `Internal utilization model: ${Math.round(keepProb * 100)}% projected utility`,
      isAvailable: true,
      assumptions: ['No transfer needed', 'Zero protocol fees on retention'],
    };

    // 2. SELL Strategy Valuation (Secondary Marketplace)
    // Only available if transferability === 'YES' AND sellability === 'YES'
    let sellValuation: ValuationDetail;
    if (candidate.transferability === 'YES' && candidate.sellability === 'YES') {
      // Haircut reflects market liquidity and time-decay:
      // If timeLeftHours < 12, higher urgent liquidation discount
      const liquidityDiscount = timeLeftHours < 12 ? 0.65 : 0.82;
      const grossSellMon = Math.round(surplusNominalValue * liquidityDiscount * 1000) / 1000;
      
      // Marketplace fee: 1.0% (MARKETPLACE_FEE_BPS)
      const marketplaceFeeMon = Math.round((grossSellMon * MARKETPLACE_FEE_BPS) / 10000 * 1000) / 1000;
      const gasCostMon = 0.0002;
      const netSellMon = Math.max(0, Math.round((grossSellMon - marketplaceFeeMon - gasCostMon) * 1000) / 1000);

      sellValuation = {
        grossExpectedMon: grossSellMon,
        expectedFeesMon: marketplaceFeeMon,
        executionCostMon: gasCostMon,
        netExpectedMon: netSellMon,
        evidenceSource: `Marketplace spot bids with ${Math.round((1 - liquidityDiscount) * 100)}% secondary market spread`,
        isAvailable: true,
        assumptions: [
          `Marketplace fee: ${MARKETPLACE_FEE_BPS / 100}%`,
          `Estimated execution gas: ${gasCostMon} MON`,
        ],
      };
    } else {
      sellValuation = {
        grossExpectedMon: 0,
        expectedFeesMon: 0,
        executionCostMon: 0,
        netExpectedMon: 0,
        evidenceSource: `VALUATION_UNAVAILABLE: Object not transferable/sellable (${candidate.transferability})`,
        isAvailable: false,
        assumptions: ['Marketplace listing rejected by entitlement policy'],
      };
    }

    // 3. TRANSFER Strategy Valuation (Peer-to-Peer direct transfer)
    // Only available if transferability === 'YES'
    let transferValuation: ValuationDetail;
    const activePeers = this.peerAgents().filter((a) => a.id !== candidate.ownerId && a.active);

    if (candidate.transferability === 'YES' && activePeers.length > 0) {
      // Peer buyout discount (typically 92% efficiency, 8% counterparty discount)
      const peerEfficiency = 0.92;
      const grossTransferMon = Math.round(surplusNominalValue * peerEfficiency * 1000) / 1000;

      // Recovery fee (feeEngine: 5.0% on recovered value)
      const recoveryFeeCalc = feeEngine.calculateRecoveryFee(grossTransferMon);
      const feeMon = recoveryFeeCalc.feeMon;
      const gasCostMon = 0.0002;
      const netTransferMon = Math.max(0, Math.round((recoveryFeeCalc.netMon - gasCostMon) * 1000) / 1000);

      transferValuation = {
        grossExpectedMon: grossTransferMon,
        expectedFeesMon: feeMon,
        executionCostMon: gasCostMon,
        netExpectedMon: netTransferMon,
        evidenceSource: `Peer transfer agreement with ${activePeers.length} active network peers`,
        isAvailable: true,
        assumptions: [
          `ECON Recovery Success Fee: ${RECOVERY_FEE_BPS / 100}%`,
          `Estimated execution gas: ${gasCostMon} MON`,
        ],
      };
    } else {
      transferValuation = {
        grossExpectedMon: 0,
        expectedFeesMon: 0,
        executionCostMon: 0,
        netExpectedMon: 0,
        evidenceSource: activePeers.length === 0
          ? 'VALUATION_UNAVAILABLE: No active peer consumers in network'
          : `VALUATION_UNAVAILABLE: Transferability is ${candidate.transferability}`,
        isAvailable: false,
        assumptions: ['Peer transfer forbidden or unavailable'],
      };
    }

    // 4. REFUND Strategy Valuation (Issuer SLA)
    const isRefundVerified = candidate.refundability === 'YES';
    const issuerRefundRate = 0.75; // Standard 75% SLA refund benchmark rate
    const grossRefundMon = Math.round(surplusNominalValue * issuerRefundRate * 1000) / 1000;
    const recoveryFeeCalc = feeEngine.calculateRecoveryFee(grossRefundMon);
    const feeMon = recoveryFeeCalc.feeMon;
    const netRefundMon = Math.max(0, recoveryFeeCalc.netMon);

    const refundValuation: ValuationDetail = {
      grossExpectedMon: grossRefundMon,
      expectedFeesMon: feeMon,
      executionCostMon: 0,
      netExpectedMon: netRefundMon,
      evidenceSource: isRefundVerified
        ? 'Service issuer verified SLA refund redemption schedule'
        : `VALUATION_UNAVAILABLE: Refundability unverified (${candidate.refundability}) - theoretical benchmark only`,
      isAvailable: isRefundVerified,
      assumptions: [
        `Issuer SLA retention penalty: ${Math.round((1 - issuerRefundRate) * 100)}%`,
        `ECON Recovery Success Fee: ${RECOVERY_FEE_BPS / 100}%`,
        isRefundVerified ? 'Verified issuer endpoint available' : 'Redemption NOT verified - execution prohibited',
      ],
    };

    return {
      keep: keepValuation,
      sell: sellValuation,
      transfer: transferValuation,
      refund: refundValuation,
    };
  }
}

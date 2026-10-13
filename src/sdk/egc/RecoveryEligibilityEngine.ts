import { EconomicObject, AgentId } from '../types';
import { EconomicObjectRepository } from './EconomicObjectRepository';
import { RecoveryEligibilityReason, EntitlementStatus } from './types';

export interface EligibilityResult {
  eligible: boolean;
  reasonCode: RecoveryEligibilityReason;
  transferable: boolean;
  refundable: boolean;
  sellable: boolean;
  transferability: EntitlementStatus;
  refundability: EntitlementStatus;
  sellability: EntitlementStatus;
  message: string;
}

export class RecoveryEligibilityEngine {
  private repo: EconomicObjectRepository;

  constructor(repo: EconomicObjectRepository) {
    this.repo = repo;
  }

  /**
   * Deterministically validates whether an economic object is eligible for recovery actions.
   */
  public evaluate(
    obj: EconomicObject,
    requesterAgentId?: AgentId,
    currentTimeMs: number = Date.now()
  ): EligibilityResult {
    const transferability = this.repo.getTransferability(obj);
    const refundability = this.repo.getRefundability(obj);
    const sellability = this.repo.getSellability(obj);
    const activeObligations = this.repo.getActiveObligations(obj);
    const remainingUnits = Math.max(0, obj.quantity - obj.consumedQuantity);

    // 1. Terminal lifecycle status checks
    if (obj.status === 'RECOVERED' || obj.status === 'LIQUIDATED') {
      return {
        eligible: false,
        reasonCode: 'ALREADY_RECOVERED',
        transferable: false,
        refundable: false,
        sellable: false,
        transferability,
        refundability,
        sellability,
        message: `Object ${obj.id} has already completed lifecycle terminal state (${obj.status}).`,
      };
    }

    // 2. Ownership verification
    if (requesterAgentId && obj.owner !== requesterAgentId) {
      return {
        eligible: false,
        reasonCode: 'OWNERSHIP_MISMATCH',
        transferable: false,
        refundable: false,
        sellable: false,
        transferability,
        refundability,
        sellability,
        message: `Current agent ${requesterAgentId} does not own object ${obj.id} (owned by ${obj.owner}).`,
      };
    }

    // 3. Expiry verification
    if (obj.expiryTimestamp > 0 && currentTimeMs >= obj.expiryTimestamp) {
      return {
        eligible: false,
        reasonCode: 'OBJECT_EXPIRED',
        transferable: false,
        refundable: false,
        sellable: false,
        transferability,
        refundability,
        sellability,
        message: `Object ${obj.id} expired at ${new Date(obj.expiryTimestamp).toISOString()}.`,
      };
    }

    // 4. Consumed units verification
    if (remainingUnits <= 0) {
      return {
        eligible: false,
        reasonCode: 'CONSUMED_RESOURCE',
        transferable: false,
        refundable: false,
        sellable: false,
        transferability,
        refundability,
        sellability,
        message: `Object ${obj.id} has 0 unconsumed units remaining (${obj.consumedQuantity}/${obj.quantity} used).`,
      };
    }

    // 5. Active contractual obligations / lockups
    if (activeObligations > 0 || obj.status === 'IN_ESCROW') {
      return {
        eligible: false,
        reasonCode: 'ACTIVE_OBLIGATION',
        transferable: false,
        refundable: false,
        sellable: false,
        transferability,
        refundability,
        sellability,
        message: `Object ${obj.id} is bound by ${activeObligations} active contractual obligations or escrow commitments.`,
      };
    }

    // 6. Entitlement checks (strictly refusing to infer YES from UNKNOWN)
    const canTransfer = transferability === 'YES';
    const canSell = sellability === 'YES' && canTransfer;
    const canRefund = refundability === 'YES';

    if (transferability === 'UNKNOWN') {
      return {
        eligible: false,
        reasonCode: 'TRANSFERABILITY_UNKNOWN',
        transferable: false,
        refundable: canRefund,
        sellable: false,
        transferability,
        refundability,
        sellability,
        message: `Object ${obj.id} transferability is UNKNOWN. Protocol forbids automated liquidation without verified rights.`,
      };
    }

    if (!canTransfer && !canRefund) {
      return {
        eligible: false,
        reasonCode: 'NON_TRANSFERABLE',
        transferable: false,
        refundable: false,
        sellable: false,
        transferability,
        refundability,
        sellability,
        message: `Object ${obj.id} is non-transferable and non-refundable. Stranded value cannot be externally recovered.`,
      };
    }

    // 7. Positive eligibility determination
    let reasonCode: RecoveryEligibilityReason = 'ELIGIBLE_FOR_TRANSFER';
    if (canSell) {
      reasonCode = 'ELIGIBLE_FOR_MARKETPLACE';
    } else if (canTransfer) {
      reasonCode = 'ELIGIBLE_FOR_PEER_TRANSFER';
    } else if (canRefund) {
      reasonCode = 'ELIGIBLE_FOR_REFUND';
    }

    return {
      eligible: true,
      reasonCode,
      transferable: canTransfer,
      refundable: canRefund,
      sellable: canSell,
      transferability,
      refundability,
      sellability,
      message: `Object ${obj.id} verified eligible for recovery via ${reasonCode}.`,
    };
  }
}

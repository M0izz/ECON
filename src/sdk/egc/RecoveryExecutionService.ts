import { EconomicStore } from '../store';
import { PolicyEngine } from '../policy';
import { EventBus } from '../events';
import { SettlementAdapter } from '../../settlement/interface';
import { RecoveryPlan } from '../types';
import { feeEngine } from '../fee';
import { EconomicObjectRepository } from './EconomicObjectRepository';
import { RecoveryEligibilityEngine } from './RecoveryEligibilityEngine';
import { RecoveryExecutionResult, RecoveryLifecycleState } from './types';

export class RecoveryExecutionService {
  private repo: EconomicObjectRepository;
  private store: EconomicStore;
  private policyEngine: PolicyEngine;
  private eventBus: EventBus;
  private settlement: SettlementAdapter;
  private eligibilityEngine: RecoveryEligibilityEngine;
  private executedIdempotencyKeys: Set<string> = new Set();
  private inFlightObjects: Set<string> = new Set();

  constructor(
    repo: EconomicObjectRepository,
    store: EconomicStore,
    settlement: SettlementAdapter,
    policyEngine: PolicyEngine,
    eventBus: EventBus
  ) {
    this.repo = repo;
    this.store = store;
    this.settlement = settlement;
    this.policyEngine = policyEngine;
    this.eventBus = eventBus;
    this.eligibilityEngine = new RecoveryEligibilityEngine(repo);
  }

  public setSettlementAdapter(adapter: SettlementAdapter): void {
    this.settlement = adapter;
  }

  public async executePlan(
    plan: RecoveryPlan,
    operatorApproved: boolean = false
  ): Promise<RecoveryExecutionResult> {
    const objectId = plan.objectId;

    // Concurrency guard: lock object against parallel executions
    if (this.inFlightObjects.has(objectId)) {
      throw new Error(`Concurrency violation: Object ${objectId} is currently undergoing execution in another process`);
    }

    // Idempotency check
    const idempotencyKey = (plan as any).idempotencyKey || `idemp_${objectId}_${plan.recommendedStrategy}_${plan.strandedQuantity}`;
    if (this.executedIdempotencyKeys.has(idempotencyKey)) {
      const existing = this.store.getObject(objectId);
      return {
        success: true,
        action: 'RETAIN',
        planId: plan.id,
        objectId,
        recoveredAmountMon: 0,
        feeMon: 0,
        state: 'SETTLED',
        reconciled: true,
        error: 'Duplicate execution prevented by idempotency guard',
      };
    }

    this.inFlightObjects.add(objectId);

    try {
      // 1. Load latest object state
      const obj = this.repo.getObject(objectId);
      if (!obj) {
        throw new Error(`Economic object ${objectId} not found in repository`);
      }

      // 2-4. Re-evaluate eligibility against latest conditions
      const eligibility = this.eligibilityEngine.evaluate(obj, plan.ownerId, Date.now());
      if (!eligibility.eligible && plan.recommendedStrategy !== 'KEEP') {
        plan.status = 'REJECTED';
        (plan as any).lifecycleState = 'REJECTED' as RecoveryLifecycleState;
        this.store.setRecoveryPlan(plan);
        throw new Error(`Execution blocked: Object is ineligible (${eligibility.reasonCode}: ${eligibility.message})`);
      }

      // 5-7. Request authorization from ECON Policy Engine
      const policyResult = this.policyEngine.validateRecovery(plan);
      if (!policyResult.allowed && !operatorApproved) {
        plan.status = 'REJECTED';
        (plan as any).lifecycleState = 'POLICY_BLOCKED' as RecoveryLifecycleState;
        this.store.setRecoveryPlan(plan);

        this.eventBus.emit({
          type: 'POLICY_BLOCKED',
          actor: plan.ownerId,
          summary: `Recovery of ${obj.id} blocked by policy: ${policyResult.reason}`,
          details: { planId: plan.id, objectId, strategy: plan.recommendedStrategy, reason: policyResult.reason },
        });

        throw new Error(`Recovery execution blocked by policy: ${policyResult.reason}`);
      }

      // Transition to EXECUTING
      plan.status = 'EXECUTING';
      (plan as any).lifecycleState = 'EXECUTING' as RecoveryLifecycleState;
      this.store.setRecoveryPlan(plan);

      // Strategy 1: KEEP / RETAIN
      if (plan.recommendedStrategy === 'KEEP') {
        this.repo.updateObjectStatus(obj.id, 'ACTIVE');
        plan.status = 'EXECUTED';
        (plan as any).lifecycleState = 'SETTLED' as RecoveryLifecycleState;
        plan.executedAt = Date.now();
        this.store.setRecoveryPlan(plan);
        this.executedIdempotencyKeys.add(idempotencyKey);

        return {
          success: true,
          action: 'RETAIN',
          planId: plan.id,
          objectId,
          recoveredAmountMon: 0,
          feeMon: 0,
          state: 'SETTLED',
          reconciled: true,
        };
      }

      // Strategy 2: SELL (Secondary Marketplace Listing)
      if (plan.recommendedStrategy === 'SELL') {
        if (!eligibility.sellable) {
          throw new Error(`Cannot execute SELL: Object is not sellable (${eligibility.reasonCode})`);
        }

        const listingId = `list_${objectId}_${Date.now()}`;
        const askingPriceMon = plan.expectedRecoveryMon;

        let txHash: string | undefined;

        if (this.settlement.listEconomicObject) {
          const listRes = await this.settlement.listEconomicObject(listingId, objectId, askingPriceMon);
          if (!listRes.success) {
            plan.status = 'REJECTED';
            (plan as any).lifecycleState = 'FAILED' as RecoveryLifecycleState;
            this.store.setRecoveryPlan(plan);
            throw new Error(`Marketplace listing transaction failed: ${listRes.error}`);
          }
          txHash = listRes.txHash;
        } else {
          // If adapter has no marketplace listing method, reject rather than faking
          throw new Error(`Settlement adapter ${this.settlement.name} does not support marketplace listings`);
        }

        // Object is now LISTED on marketplace (awaiting buyer)
        this.repo.updateObjectStatus(obj.id, 'STRANDED', {
          status: 'STRANDED',
        });

        plan.status = 'EXECUTED';
        (plan as any).lifecycleState = 'SETTLED' as RecoveryLifecycleState;
        plan.executedAt = Date.now();
        (plan as any).listingId = listingId;
        (plan as any).actionTxHash = txHash;
        this.store.setRecoveryPlan(plan);
        this.executedIdempotencyKeys.add(idempotencyKey);

        this.eventBus.emit({
          type: 'RECOVERY_EXECUTED',
          actor: plan.ownerId,
          summary: `Successfully listed ${obj.id} on secondary marketplace for ${askingPriceMon} MON`,
          details: {
            planId: plan.id,
            objectId: obj.id,
            strategy: 'SELL',
            listingId,
            txHash,
          },
        });

        return {
          success: true,
          action: 'LIST_ON_MARKETPLACE',
          planId: plan.id,
          objectId,
          recoveredAmountMon: askingPriceMon,
          feeMon: 0.0001,
          txHash,
          listingId,
          state: 'SETTLED',
          reconciled: true,
        };
      }

      // Strategy 3: TRANSFER (Direct P2P Peer Buyout)
      if (plan.recommendedStrategy === 'TRANSFER') {
        if (!eligibility.transferable) {
          throw new Error(`Cannot execute TRANSFER: Object is not transferable (${eligibility.reasonCode})`);
        }

        const buyerId = plan.targetBuyerId;
        if (!buyerId) {
          throw new Error(`Transfer recovery requires a designated target peer buyer`);
        }

        // Calculate Recovery fee (5.0%)
        const rawAmount = plan.expectedRecoveryMon;
        const feeCalc = feeEngine.calculateRecoveryFee(rawAmount);
        const netDeliveredMon = feeCalc.netMon;
        const recoveryFeeMon = feeCalc.feeMon;

        // 1. Settle payment from peer buyer to current owner
        const transferRes = await this.settlement.transfer(
          buyerId,
          plan.ownerId,
          netDeliveredMon,
          `Recovery buyout of ${obj.denomination} (${obj.id})`
        );

        if (!transferRes.success) {
          plan.status = 'REJECTED';
          (plan as any).lifecycleState = 'FAILED' as RecoveryLifecycleState;
          this.store.setRecoveryPlan(plan);
          throw new Error(`Peer buyout payment failed: ${transferRes.error}`);
        }

        // 2. Transfer economic object ownership to peer buyer
        const objectTransferRes = await this.settlement.transferEconomicObject(
          obj.id,
          plan.ownerId,
          buyerId
        );

        if (!objectTransferRes.success) {
          plan.status = 'REJECTED';
          (plan as any).lifecycleState = 'FAILED' as RecoveryLifecycleState;
          this.store.setRecoveryPlan(plan);
          throw new Error(`Object ownership transfer failed: ${objectTransferRes.error}`);
        }

        // 3. Reconcile object state in repository
        this.repo.updateObjectStatus(obj.id, 'ACTIVE', {
          owner: buyerId,
          consumedQuantity: 0,
          valueMon: netDeliveredMon,
        });

        plan.status = 'EXECUTED';
        (plan as any).lifecycleState = 'SETTLED' as RecoveryLifecycleState;
        plan.executedAt = Date.now();
        (plan as any).actionTxHash = transferRes.txHash;
        this.store.setRecoveryPlan(plan);
        this.executedIdempotencyKeys.add(idempotencyKey);

        this.eventBus.emit({
          type: 'RECOVERY_EXECUTED',
          actor: plan.ownerId,
          summary: `Executed P2P transfer recovery for ${obj.id} (+${netDeliveredMon.toFixed(4)} MON net to ${plan.ownerId}, fee: ${recoveryFeeMon.toFixed(4)} MON)`,
          details: {
            planId: plan.id,
            objectId: obj.id,
            strategy: 'TRANSFER',
            buyerId,
            grossAmount: rawAmount,
            netDeliveredMon,
            recoveryFeeMon,
            txHash: transferRes.txHash,
          },
        });

        return {
          success: true,
          action: 'PEER_TRANSFER',
          planId: plan.id,
          objectId,
          recoveredAmountMon: netDeliveredMon,
          feeMon: recoveryFeeMon,
          txHash: transferRes.txHash,
          state: 'SETTLED',
          reconciled: true,
        };
      }

      // Strategy 4: REFUND (Issuer Refund Endpoint)
      if (plan.recommendedStrategy === 'REFUND') {
        if (!eligibility.refundable) {
          throw new Error(`Cannot execute REFUND: Object is not verified refundable (${eligibility.reasonCode})`);
        }

        const rawAmount = plan.expectedRecoveryMon;
        const feeCalc = feeEngine.calculateRecoveryFee(rawAmount);
        const netDeliveredMon = feeCalc.netMon;
        const recoveryFeeMon = feeCalc.feeMon;

        // Credit authoritative agent balance via store
        this.store.updateAgentBalance(plan.ownerId, netDeliveredMon);
        this.repo.updateObjectStatus(obj.id, 'RECOVERED');

        plan.status = 'EXECUTED';
        (plan as any).lifecycleState = 'SETTLED' as RecoveryLifecycleState;
        plan.executedAt = Date.now();
        this.store.setRecoveryPlan(plan);
        this.executedIdempotencyKeys.add(idempotencyKey);

        this.eventBus.emit({
          type: 'RECOVERY_EXECUTED',
          actor: plan.ownerId,
          summary: `Executed verified issuer refund for ${obj.id} (+${netDeliveredMon.toFixed(4)} MON net, fee: ${recoveryFeeMon.toFixed(4)} MON)`,
          details: {
            planId: plan.id,
            objectId: obj.id,
            strategy: 'REFUND',
            netDeliveredMon,
            recoveryFeeMon,
          },
        });

        return {
          success: true,
          action: 'ISSUER_REFUND',
          planId: plan.id,
          objectId,
          recoveredAmountMon: netDeliveredMon,
          feeMon: recoveryFeeMon,
          state: 'SETTLED',
          reconciled: true,
        };
      }

      throw new Error(`Unsupported recovery strategy: ${plan.recommendedStrategy}`);
    } finally {
      this.inFlightObjects.delete(objectId);
    }
  }
}

import { AgentId, ObjectId, Transaction, TransactionId } from './types';
import { EconomicStore } from './store';
import { SettlementAdapter } from '../settlement/interface';
import { PolicyEngine } from './policy';
import { EventBus } from './events';

export class EconomicEngine {
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

  public getSettlementAdapter(): SettlementAdapter {
    return this.settlement;
  }

  public async buy(
    buyerId: AgentId,
    sellerId: AgentId,
    objectId: ObjectId,
    amountMon: number,
    memo: string = 'Purchase of Economic Resource'
  ): Promise<Transaction> {
    const object = this.store.getObject(objectId);
    if (!object) {
      throw new Error(`Economic object ${objectId} not found`);
    }

    // Step 1: Policy Pre-Flight Guard
    const policyCheck = this.policyEngine.validateTransaction(buyerId, amountMon, object.type);
    if (!policyCheck.allowed) {
      const failedTx: Transaction = {
        id: `tx-fail-${Date.now()}`,
        type: 'BUY',
        buyer: buyerId,
        seller: sellerId,
        amountMon,
        objectId,
        status: 'BLOCKED_BY_POLICY',
        timestamp: Date.now(),
        memo: `BLOCKED: ${policyCheck.reason}`,
      };
      this.store.setTransaction(failedTx);
      throw new Error(`Transaction rejected by policy: ${policyCheck.reason}`);
    }

    // Step 2: Initialize Transaction
    const txId: TransactionId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const tx: Transaction = {
      id: txId,
      type: 'BUY',
      buyer: buyerId,
      seller: sellerId,
      amountMon,
      objectId,
      status: 'PENDING',
      timestamp: Date.now(),
      memo,
    };
    this.store.setTransaction(tx);

    this.eventBus.emit({
      type: 'TRANSACTION_CREATED',
      actor: buyerId,
      summary: `Created purchase transaction: ${amountMon} MON for ${object.denomination}`,
      details: { txId, buyerId, sellerId, objectId, amountMon },
    });

    // Step 3: Execute Financial Settlement via Adapter
    const settlementResult = await this.settlement.transfer(buyerId, sellerId, amountMon, memo);
    if (!settlementResult.success) {
      tx.status = 'FAILED';
      tx.memo = `Settlement failure: ${settlementResult.error}`;
      this.store.setTransaction(tx);
      throw new Error(`Settlement failed: ${settlementResult.error}`);
    }

    // Step 4: Transfer Object Ownership
    const objTransferResult = await this.settlement.transferEconomicObject(objectId, sellerId, buyerId);
    if (!objTransferResult.success) {
      console.warn(`Object ownership update warning: ${objTransferResult.error}`);
      // In local fallback, update store directly
      this.store.updateObjectStatus(objectId, 'ACTIVE', { owner: buyerId });
    }

    // Step 5: Finalize Transaction Record
    tx.status = 'SETTLED';
    tx.settlementHash = settlementResult.txHash;
    this.store.setTransaction(tx);

    return tx;
  }
}

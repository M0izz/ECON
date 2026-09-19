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

  public async sell(
    sellerId: AgentId,
    objectId: ObjectId,
    priceMon: number,
    buyerId?: AgentId,
    memo: string = 'Sale of Economic Resource'
  ): Promise<Transaction> {
    const object = this.store.getObject(objectId);
    if (!object) throw new Error(`Economic object ${objectId} not found`);
    if (object.owner !== sellerId) throw new Error(`Agent ${sellerId} is not the owner of object ${objectId}`);

    // If buyerId not provided, default to liquidity pool / protocol agent or first available agent
    let targetBuyer = buyerId;
    if (!targetBuyer) {
      const agents = this.store.getAllAgents().filter((a) => a.id !== sellerId && a.balanceMon >= priceMon);
      if (agents.length === 0) throw new Error('No solvent counterparty found for listing');
      targetBuyer = agents[0].id;
    }

    const policyCheck = this.policyEngine.validateTransaction(targetBuyer, priceMon, object.type);
    if (!policyCheck.allowed) {
      throw new Error(`Buyer policy rejection: ${policyCheck.reason}`);
    }

    const txId: TransactionId = `tx-sell-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const tx: Transaction = {
      id: txId,
      type: 'SELL',
      buyer: targetBuyer,
      seller: sellerId,
      amountMon: priceMon,
      objectId,
      status: 'PENDING',
      timestamp: Date.now(),
      memo,
    };
    this.store.setTransaction(tx);

    // Settle payment: targetBuyer -> sellerId
    const settlementResult = await this.settlement.transfer(targetBuyer, sellerId, priceMon, memo);
    if (!settlementResult.success) {
      tx.status = 'FAILED';
      tx.memo = `Settlement failure: ${settlementResult.error}`;
      this.store.setTransaction(tx);
      throw new Error(`Settlement failed: ${settlementResult.error}`);
    }

    // Transfer asset
    await this.settlement.transferEconomicObject(objectId, sellerId, targetBuyer);
    this.store.updateObjectStatus(objectId, 'ACTIVE', { owner: targetBuyer });

    tx.status = 'SETTLED';
    tx.settlementHash = settlementResult.txHash;
    this.store.setTransaction(tx);

    this.eventBus.emit({
      type: 'SETTLEMENT_COMPLETED',
      actor: sellerId,
      summary: `Asset ${objectId} sold to ${targetBuyer} for ${priceMon} MON`,
      details: { txId, sellerId, buyerId: targetBuyer, objectId, priceMon },
    });

    return tx;
  }

  public async exchange(
    initiatorId: AgentId,
    offerObjectId: ObjectId,
    targetObjectId: ObjectId
  ): Promise<{ success: boolean; txId: string; memo: string }> {
    const offerObj = this.store.getObject(offerObjectId);
    const targetObj = this.store.getObject(targetObjectId);

    if (!offerObj || !targetObj) throw new Error('One or both objects not found for exchange');
    if (offerObj.owner !== initiatorId) throw new Error(`Initiator does not own object ${offerObjectId}`);
    const counterpartyId = targetObj.owner;
    if (counterpartyId === initiatorId) throw new Error('Cannot exchange object with oneself');

    // Transfer offerObj from initiatorId to counterpartyId
    await this.settlement.transferEconomicObject(offerObjectId, initiatorId, counterpartyId);
    this.store.updateObjectStatus(offerObjectId, 'ACTIVE', { owner: counterpartyId });

    // Transfer targetObj from counterpartyId to initiatorId
    await this.settlement.transferEconomicObject(targetObjectId, counterpartyId, initiatorId);
    this.store.updateObjectStatus(targetObjectId, 'ACTIVE', { owner: initiatorId });

    const txId = `tx-ex-${Date.now()}`;
    const memo = `Atomic exchange: ${offerObjectId} for ${targetObjectId} between ${initiatorId} and ${counterpartyId}`;

    this.eventBus.emit({
      type: 'SETTLEMENT_COMPLETED',
      actor: initiatorId,
      summary: memo,
      details: { txId, initiatorId, counterpartyId, offerObjectId, targetObjectId },
    });

    return { success: true, txId, memo };
  }
}

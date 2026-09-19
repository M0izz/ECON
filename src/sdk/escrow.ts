import { EscrowRecord, EscrowId, AgentId } from './types';
import { EconomicStore } from './store';
import { SettlementAdapter } from '../settlement/interface';
import { EventBus } from './events';

export class EscrowManager {
  private store: EconomicStore;
  private settlement: SettlementAdapter;
  private eventBus: EventBus;

  constructor(store: EconomicStore, settlement: SettlementAdapter, eventBus: EventBus) {
    this.store = store;
    this.settlement = settlement;
    this.eventBus = eventBus;
  }

  public setSettlementAdapter(adapter: SettlementAdapter): void {
    this.settlement = adapter;
  }

  public async createEscrow(
    buyer: AgentId,
    seller: AgentId,
    amountMon: number,
    condition: string,
    deadlineMs: number = Date.now() + 3600000 // 1 hour default
  ): Promise<EscrowRecord> {
    const escrowId: EscrowId = `esc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Invoke settlement adapter to lock funds
    const settlementResult = await this.settlement.lockEscrow(
      escrowId,
      buyer,
      seller,
      amountMon,
      deadlineMs
    );

    if (!settlementResult.success) {
      throw new Error(`Escrow settlement lock failed: ${settlementResult.error}`);
    }

    const record: EscrowRecord = {
      id: escrowId,
      buyer,
      seller,
      amountMon,
      condition,
      status: 'LOCKED',
      createdAt: Date.now(),
      deadline: deadlineMs,
    };

    this.store.setEscrow(record);
    return record;
  }

  public submitDelivery(escrowId: EscrowId, deliveryHash: string): EscrowRecord {
    const escrow = this.store.getEscrow(escrowId);
    if (!escrow) {
      throw new Error(`Escrow ${escrowId} not found`);
    }

    if (escrow.status !== 'LOCKED') {
      throw new Error(`Cannot submit delivery for escrow in state ${escrow.status}`);
    }

    const updated: EscrowRecord = {
      ...escrow,
      status: 'DELIVERED',
      deliveryHash,
    };

    this.store.setEscrow(updated);

    this.eventBus.emit({
      type: 'DELIVERY_SUBMITTED',
      actor: escrow.seller,
      summary: `Delivery submitted for escrow ${escrowId} by provider ${escrow.seller}`,
      details: { escrowId, deliveryHash },
    });

    return updated;
  }

  public async verifyAndRelease(escrowId: EscrowId): Promise<EscrowRecord> {
    const escrow = this.store.getEscrow(escrowId);
    if (!escrow) {
      throw new Error(`Escrow ${escrowId} not found`);
    }

    if (escrow.status !== 'DELIVERED') {
      throw new Error(`Cannot release escrow: current status is ${escrow.status}, expected DELIVERED`);
    }

    // Verify condition hash
    if (!escrow.deliveryHash || !escrow.deliveryHash.startsWith('0x')) {
      throw new Error(`Invalid delivery verification hash: ${escrow.deliveryHash}`);
    }

    // Transition state to VERIFIED
    this.store.setEscrow({ ...escrow, status: 'VERIFIED' });

    this.eventBus.emit({
      type: 'DELIVERY_VERIFIED',
      actor: escrow.buyer,
      summary: `Delivery verified for escrow ${escrowId}. Condition met.`,
      details: { escrowId, deliveryHash: escrow.deliveryHash },
    });

    // Release settlement funds to seller
    const result = await this.settlement.releaseEscrow(escrowId);
    if (!result.success) {
      throw new Error(`Settlement release failed: ${result.error}`);
    }

    const finalized = this.store.getEscrow(escrowId)!;
    return finalized;
  }

  public async refund(escrowId: EscrowId): Promise<EscrowRecord> {
    const escrow = this.store.getEscrow(escrowId);
    if (!escrow) {
      throw new Error(`Escrow ${escrowId} not found`);
    }

    const result = await this.settlement.refundEscrow(escrowId);
    if (!result.success) {
      throw new Error(`Escrow refund settlement failed: ${result.error}`);
    }

    return this.store.getEscrow(escrowId)!;
  }
}

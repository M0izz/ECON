import { SettlementAdapter } from './interface';
import { SettlementResult } from '../sdk/types';
import { EconomicStore } from '../sdk/store';
import { EventBus } from '../sdk/events';

export class LocalSettlementAdapter implements SettlementAdapter {
  public readonly id = 'local' as const;
  public readonly name = 'Local Deterministic Settlement';
  public readonly isConnected = true;

  private store: EconomicStore;
  private eventBus: EventBus;
  private simulatedBlockNumber = 1000;

  constructor(store: EconomicStore, eventBus: EventBus) {
    this.store = store;
    this.eventBus = eventBus;
  }

  public async getBalance(agentId: string): Promise<number> {
    const agent = this.store.getAgent(agentId);
    return agent ? agent.balanceMon : 0;
  }

  public async transfer(
    from: string,
    to: string,
    amount: number,
    memo: string = 'Direct Transfer'
  ): Promise<SettlementResult> {
    const buyer = this.store.getAgent(from);
    const seller = this.store.getAgent(to);

    if (!buyer) {
      return {
        success: false,
        txHash: '',
        blockNumber: this.simulatedBlockNumber,
        settledAt: Date.now(),
        feeMon: 0,
        error: `Sender agent ${from} not found in registry`,
      };
    }

    if (buyer.balanceMon < amount) {
      return {
        success: false,
        txHash: '',
        blockNumber: this.simulatedBlockNumber,
        settledAt: Date.now(),
        feeMon: 0,
        error: `Insufficient balance: ${buyer.name} has ${buyer.balanceMon} MON, needs ${amount} MON`,
      };
    }

    if (!seller) {
      return {
        success: false,
        txHash: '',
        blockNumber: this.simulatedBlockNumber,
        settledAt: Date.now(),
        feeMon: 0,
        error: `Recipient agent ${to} not found in registry`,
      };
    }

    // Atomic balance shift
    this.store.updateAgentBalance(from, -amount);
    this.store.updateAgentBalance(to, amount);

    this.simulatedBlockNumber += 1;
    const txHash = `0xloc${Date.now().toString(16)}${Math.random().toString(16).substring(2, 8)}`;

    this.eventBus.emit({
      type: 'SETTLEMENT_COMPLETED',
      actor: from,
      summary: `Settled ${amount} MON transfer from ${buyer.name} to ${seller.name}`,
      details: { from, to, amount, memo, txHash, blockNumber: this.simulatedBlockNumber },
    });

    return {
      success: true,
      txHash,
      blockNumber: this.simulatedBlockNumber,
      settledAt: Date.now(),
      feeMon: 0.0001,
    };
  }

  public async lockEscrow(
    escrowId: string,
    buyer: string,
    seller: string,
    amount: number,
    deadline: number
  ): Promise<SettlementResult> {
    const buyerAgent = this.store.getAgent(buyer);
    if (!buyerAgent || buyerAgent.balanceMon < amount) {
      return {
        success: false,
        txHash: '',
        blockNumber: this.simulatedBlockNumber,
        settledAt: Date.now(),
        feeMon: 0,
        error: `Buyer ${buyer} has insufficient balance to lock ${amount} MON in escrow`,
      };
    }

    // Deduct buyer funds into escrow status
    this.store.updateAgentBalance(buyer, -amount);

    this.simulatedBlockNumber += 1;
    const txHash = `0xesc_lock_${Date.now().toString(16)}`;

    this.eventBus.emit({
      type: 'ESCROW_LOCKED',
      actor: buyer,
      summary: `Locked ${amount} MON into escrow ${escrowId} for provider ${seller}`,
      details: { escrowId, buyer, seller, amount, deadline, txHash },
    });

    return {
      success: true,
      txHash,
      blockNumber: this.simulatedBlockNumber,
      settledAt: Date.now(),
      feeMon: 0.0001,
    };
  }

  public async releaseEscrow(escrowId: string): Promise<SettlementResult> {
    const escrow = this.store.getEscrow(escrowId);
    if (!escrow) {
      return {
        success: false,
        txHash: '',
        blockNumber: this.simulatedBlockNumber,
        settledAt: Date.now(),
        feeMon: 0,
        error: `Escrow ${escrowId} does not exist`,
      };
    }

    // Credit seller
    this.store.updateAgentBalance(escrow.seller, escrow.amountMon);
    this.store.setEscrow({
      ...escrow,
      status: 'RELEASED',
      releasedAt: Date.now(),
    });

    this.simulatedBlockNumber += 1;
    const txHash = `0xesc_rel_${Date.now().toString(16)}`;

    this.eventBus.emit({
      type: 'SETTLEMENT_COMPLETED',
      actor: escrow.seller,
      summary: `Released ${escrow.amountMon} MON from escrow ${escrowId} to provider ${escrow.seller}`,
      details: { escrowId, seller: escrow.seller, amount: escrow.amountMon, txHash },
    });

    return {
      success: true,
      txHash,
      blockNumber: this.simulatedBlockNumber,
      settledAt: Date.now(),
      feeMon: 0.0001,
    };
  }

  public async refundEscrow(escrowId: string): Promise<SettlementResult> {
    const escrow = this.store.getEscrow(escrowId);
    if (!escrow) {
      return {
        success: false,
        txHash: '',
        blockNumber: this.simulatedBlockNumber,
        settledAt: Date.now(),
        feeMon: 0,
        error: `Escrow ${escrowId} not found`,
      };
    }

    // Refund buyer
    this.store.updateAgentBalance(escrow.buyer, escrow.amountMon);
    this.store.setEscrow({
      ...escrow,
      status: 'REFUNDED',
    });

    this.simulatedBlockNumber += 1;
    const txHash = `0xesc_ref_${Date.now().toString(16)}`;

    return {
      success: true,
      txHash,
      blockNumber: this.simulatedBlockNumber,
      settledAt: Date.now(),
      feeMon: 0.0001,
    };
  }

  public async transferEconomicObject(
    objectId: string,
    fromOwner: string,
    toOwner: string
  ): Promise<SettlementResult> {
    const obj = this.store.getObject(objectId);
    if (!obj) {
      return {
        success: false,
        txHash: '',
        blockNumber: this.simulatedBlockNumber,
        settledAt: Date.now(),
        feeMon: 0,
        error: `Economic object ${objectId} not found`,
      };
    }

    if (obj.owner !== fromOwner) {
      return {
        success: false,
        txHash: '',
        blockNumber: this.simulatedBlockNumber,
        settledAt: Date.now(),
        feeMon: 0,
        error: `Agent ${fromOwner} is not the owner of object ${objectId}`,
      };
    }

    if (!obj.transferable) {
      return {
        success: false,
        txHash: '',
        blockNumber: this.simulatedBlockNumber,
        settledAt: Date.now(),
        feeMon: 0,
        error: `Economic object ${objectId} is marked non-transferable`,
      };
    }

    this.store.updateObjectStatus(objectId, 'ACTIVE', { owner: toOwner });

    this.simulatedBlockNumber += 1;
    const txHash = `0xobj_xfer_${Date.now().toString(16)}`;

    this.eventBus.emit({
      type: 'OBJECT_CREATED',
      actor: toOwner,
      summary: `Transferred ownership of ${obj.denomination} (${obj.id}) from ${fromOwner} to ${toOwner}`,
      details: { objectId, fromOwner, toOwner, txHash },
    });

    return {
      success: true,
      txHash,
      blockNumber: this.simulatedBlockNumber,
      settledAt: Date.now(),
      feeMon: 0.0001,
    };
  }
}

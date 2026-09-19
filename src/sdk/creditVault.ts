import {
  AgentId,
  CreditRequest,
  CreditReservation,
  CreditReservationId,
  CreditRequestId,
} from './types';
import { EconomicStore } from './store';
import { EventBus } from './events';

export interface CreditVaultSummary {
  totalBalances: number;
  totalReserved: number;
  totalPool: number;
  openRequests: number;
}

function roundAmount(amount: number): number {
  return Math.round(amount * 1000) / 1000;
}

function assertPositive(amount: number, label: string): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} must be greater than zero`);
  }
}

export class CreditVault {
  private readonly store: EconomicStore;
  private readonly eventBus: EventBus;

  constructor(store: EconomicStore, eventBus: EventBus) {
    this.store = store;
    this.eventBus = eventBus;
  }

  public grant(agentId: AgentId, assetType: string, amount: number, actor: AgentId = agentId): void {
    assertPositive(amount, 'Credit grant');
    this.requireAgent(agentId);
    const nextBalance = roundAmount(this.store.getCreditBalance(agentId, assetType) + amount);
    this.store.setCreditBalance(agentId, assetType, nextBalance);
    this.eventBus.emit({
      type: 'CREDIT_GRANTED',
      actor,
      summary: `Granted ${amount} ${assetType} credits to ${agentId}`,
      details: { agentId, assetType, amount, balance: nextBalance },
    });
  }

  public reserve(
    agentId: AgentId,
    assetType: string,
    amount: number,
    purpose: string,
    expiresAt: number,
    transferable: boolean = true
  ): CreditReservation {
    assertPositive(amount, 'Reservation amount');
    if (!purpose.trim()) throw new Error('Reservation purpose is required');
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      throw new Error('Reservation expiry must be in the future');
    }
    this.requireAgent(agentId);

    const balance = this.store.getCreditBalance(agentId, assetType);
    if (balance < amount) {
      throw new Error(`Insufficient ${assetType} credits for ${agentId}`);
    }

    this.store.setCreditBalance(agentId, assetType, roundAmount(balance - amount));
    const reservation: CreditReservation = {
      id: `credit-res-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ownerId: agentId,
      assetType,
      amount,
      remainingAmount: amount,
      purpose,
      createdAt: Date.now(),
      expiresAt,
      transferable,
      status: 'RESERVED',
    };
    this.store.setCreditReservation(reservation);
    this.eventBus.emit({
      type: 'CREDIT_RESERVED',
      actor: agentId,
      summary: `Reserved ${amount} ${assetType} credits for ${purpose}`,
      details: { reservationId: reservation.id, agentId, assetType, amount, expiresAt },
    });
    return reservation;
  }

  public consume(reservationId: CreditReservationId, amount: number, actor: AgentId): CreditReservation {
    assertPositive(amount, 'Consumption amount');
    const reservation = this.requireReservation(reservationId);
    if (reservation.status === 'RECYCLED' || reservation.status === 'RELEASED') {
      throw new Error(`Reservation ${reservationId} is no longer active`);
    }
    if (amount > reservation.remainingAmount) {
      throw new Error(`Consumption exceeds remaining reservation for ${reservationId}`);
    }

    const remainingAmount = roundAmount(reservation.remainingAmount - amount);
    const updated: CreditReservation = {
      ...reservation,
      remainingAmount,
      status: remainingAmount === 0 ? 'CONSUMED' : 'PARTIALLY_CONSUMED',
    };
    this.store.setCreditReservation(updated);
    this.eventBus.emit({
      type: 'CREDIT_CONSUMED',
      actor,
      summary: `Consumed ${amount} ${reservation.assetType} credits from ${reservationId}`,
      details: { reservationId, amount, remainingAmount, assetType: reservation.assetType },
    });
    return updated;
  }

  public release(reservationId: CreditReservationId, actor: AgentId): number {
    const reservation = this.requireReservation(reservationId);
    if (reservation.status === 'RECYCLED' || reservation.status === 'RELEASED') {
      return 0;
    }
    const releasedAmount = reservation.remainingAmount;
    if (releasedAmount > 0) {
      const balance = this.store.getCreditBalance(reservation.ownerId, reservation.assetType);
      this.store.setCreditBalance(
        reservation.ownerId,
        reservation.assetType,
        roundAmount(balance + releasedAmount)
      );
    }
    this.store.setCreditReservation({ ...reservation, remainingAmount: 0, status: 'RELEASED' });
    this.eventBus.emit({
      type: 'CREDIT_RELEASED',
      actor,
      summary: `Released ${releasedAmount} ${reservation.assetType} credits from ${reservationId}`,
      details: { reservationId, releasedAmount, ownerId: reservation.ownerId },
    });
    return releasedAmount;
  }

  public recycle(reservationId: CreditReservationId, actor: AgentId): number {
    const reservation = this.requireReservation(reservationId);
    if (!reservation.transferable) {
      throw new Error(`Reservation ${reservationId} is not transferable`);
    }
    if (reservation.status === 'RECYCLED' || reservation.status === 'RELEASED') {
      return 0;
    }

    const recycledAmount = reservation.remainingAmount;
    const pool = this.store.getCreditPool(reservation.assetType);
    this.store.setCreditPool(reservation.assetType, roundAmount(pool + recycledAmount));
    this.store.setCreditReservation({ ...reservation, remainingAmount: 0, status: 'RECYCLED' });
    this.eventBus.emit({
      type: 'CREDIT_RECYCLED',
      actor,
      summary: `Recycled ${recycledAmount} ${reservation.assetType} credits into the shared pool`,
      details: {
        reservationId,
        ownerId: reservation.ownerId,
        assetType: reservation.assetType,
        recycledAmount,
        poolBalance: roundAmount(pool + recycledAmount),
      },
    });
    return recycledAmount;
  }

  public request(agentId: AgentId, assetType: string, amount: number): CreditRequest {
    assertPositive(amount, 'Credit request');
    this.requireAgent(agentId);
    const request: CreditRequest = {
      id: `credit-req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      agentId,
      assetType,
      requestedAmount: amount,
      fulfilledAmount: 0,
      createdAt: Date.now(),
      status: 'OPEN',
    };
    this.store.setCreditRequest(request);
    this.eventBus.emit({
      type: 'CREDIT_REQUESTED',
      actor: agentId,
      summary: `${agentId} requested ${amount} ${assetType} credits`,
      details: { requestId: request.id, agentId, assetType, amount },
    });
    return request;
  }

  public fulfill(requestId: CreditRequestId, amount?: number, actor: AgentId = 'credit-vault'): CreditRequest {
    const request = this.store.getCreditRequest(requestId);
    if (!request) throw new Error(`Credit request ${requestId} not found`);
    if (request.status !== 'OPEN') throw new Error(`Credit request ${requestId} is not open`);

    const outstanding = roundAmount(request.requestedAmount - request.fulfilledAmount);
    const pool = this.store.getCreditPool(request.assetType);
    const allocation = Math.min(amount ?? outstanding, outstanding, pool);
    if (allocation <= 0) throw new Error(`No ${request.assetType} credits available in the shared pool`);

    this.store.setCreditPool(request.assetType, roundAmount(pool - allocation));
    this.grant(request.agentId, request.assetType, allocation, actor);
    const fulfilledAmount = roundAmount(request.fulfilledAmount + allocation);
    const updated: CreditRequest = {
      ...request,
      fulfilledAmount,
      status: fulfilledAmount >= request.requestedAmount ? 'FULFILLED' : 'OPEN',
    };
    this.store.setCreditRequest(updated);
    this.eventBus.emit({
      type: 'CREDIT_ALLOCATED',
      actor,
      summary: `Allocated ${allocation} ${request.assetType} credits to ${request.agentId}`,
      details: { requestId, agentId: request.agentId, assetType: request.assetType, allocation },
    });
    return updated;
  }

  public getSummary(): CreditVaultSummary {
    const totalBalances = this.store
      .getAllCreditBalances()
      .reduce((total, balance) => total + balance.amount, 0);
    const totalReserved = this.store
      .getAllCreditReservations()
      .filter((reservation) => reservation.status === 'RESERVED' || reservation.status === 'PARTIALLY_CONSUMED')
      .reduce((total, reservation) => total + reservation.remainingAmount, 0);
    const totalPool = Object.values(this.store.getAllCreditPool()).reduce((total, amount) => total + amount, 0);
    const openRequests = this.store.getAllCreditRequests().filter((request) => request.status === 'OPEN').length;
    return {
      totalBalances: roundAmount(totalBalances),
      totalReserved: roundAmount(totalReserved),
      totalPool: roundAmount(totalPool),
      openRequests,
    };
  }

  private requireAgent(agentId: AgentId): void {
    if (!this.store.getAgent(agentId)) throw new Error(`Agent ${agentId} not found`);
  }

  private requireReservation(id: CreditReservationId): CreditReservation {
    const reservation = this.store.getCreditReservation(id);
    if (!reservation) throw new Error(`Credit reservation ${id} not found`);
    return reservation;
  }
}

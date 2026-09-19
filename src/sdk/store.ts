import {
  Agent,
  AgentId,
  EconomicObject,
  ObjectId,
  ServiceOffering,
  Transaction,
  TransactionId,
  EscrowRecord,
  EscrowId,
  RecoveryPlan,
  RecoveryId,
  SettlementMode,
  CreditBalance,
  CreditReservation,
  CreditReservationId,
  CreditRequest,
  CreditRequestId,
} from './types';

export interface ProtocolState {
  agents: Map<AgentId, Agent>;
  objects: Map<ObjectId, EconomicObject>;
  services: Map<string, ServiceOffering>;
  transactions: Map<TransactionId, Transaction>;
  escrows: Map<EscrowId, EscrowRecord>;
  recoveryPlans: Map<RecoveryId, RecoveryPlan>;
  creditBalances: Map<string, CreditBalance>;
  creditReservations: Map<CreditReservationId, CreditReservation>;
  creditRequests: Map<CreditRequestId, CreditRequest>;
  creditPool: Map<string, number>;
}

export interface DerivedState {
  totalTreasuryMon: number;
  totalCirculatingObjects: number;
  totalStrandedValueMon: number;
  totalRecoveredValueMon: number;
  totalActiveObligationsMon: number;
  activeAgentsCount: number;
  completedTransactionsCount: number;
}

export type StateListener = () => void;

export class EconomicStore {
  private state: ProtocolState;
  private listeners: Set<StateListener> = new Set();
  private settlementMode: SettlementMode = 'LOCAL_SIMULATION';

  constructor() {
    this.state = {
      agents: new Map(),
      objects: new Map(),
      services: new Map(),
      transactions: new Map(),
      escrows: new Map(),
      recoveryPlans: new Map(),
      creditBalances: new Map(),
      creditReservations: new Map(),
      creditRequests: new Map(),
      creditPool: new Map(),
    };
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  // Settlement Mode
  public getSettlementMode(): SettlementMode {
    return this.settlementMode;
  }

  public setSettlementMode(mode: SettlementMode): void {
    this.settlementMode = mode;
    this.notify();
  }

  // Agents
  public getAgent(id: AgentId): Agent | undefined {
    return this.state.agents.get(id);
  }

  public getAllAgents(): Agent[] {
    return Array.from(this.state.agents.values());
  }

  public setAgent(agent: Agent): void {
    this.state.agents.set(agent.id, { ...agent });
    this.notify();
  }

  public updateAgentBalance(id: AgentId, deltaMon: number): boolean {
    const agent = this.state.agents.get(id);
    if (!agent) return false;
    agent.balanceMon = Math.round((agent.balanceMon + deltaMon) * 1000) / 1000;
    this.state.agents.set(id, { ...agent });
    this.notify();
    return true;
  }

  // Economic Objects
  public getObject(id: ObjectId): EconomicObject | undefined {
    return this.state.objects.get(id);
  }

  public getAllObjects(): EconomicObject[] {
    return Array.from(this.state.objects.values());
  }

  public getObjectsByOwner(ownerId: AgentId): EconomicObject[] {
    return Array.from(this.state.objects.values()).filter((obj) => obj.owner === ownerId);
  }

  public setObject(object: EconomicObject): void {
    this.state.objects.set(object.id, { ...object });
    this.notify();
  }

  public updateObjectStatus(
    id: ObjectId,
    status: EconomicObject['status'],
    partialUpdates?: Partial<EconomicObject>
  ): boolean {
    const obj = this.state.objects.get(id);
    if (!obj) return false;
    this.state.objects.set(id, {
      ...obj,
      ...partialUpdates,
      status,
    });
    this.notify();
    return true;
  }

  // Services
  public getAllServices(): ServiceOffering[] {
    return Array.from(this.state.services.values());
  }

  public setService(service: ServiceOffering): void {
    this.state.services.set(service.id, { ...service });
    this.notify();
  }

  // Transactions
  public getTransaction(id: TransactionId): Transaction | undefined {
    return this.state.transactions.get(id);
  }

  public getAllTransactions(): Transaction[] {
    return Array.from(this.state.transactions.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  public setTransaction(tx: Transaction): void {
    this.state.transactions.set(tx.id, { ...tx });
    this.notify();
  }

  // Escrows
  public getEscrow(id: EscrowId): EscrowRecord | undefined {
    return this.state.escrows.get(id);
  }

  public getAllEscrows(): EscrowRecord[] {
    return Array.from(this.state.escrows.values());
  }

  public setEscrow(escrow: EscrowRecord): void {
    this.state.escrows.set(escrow.id, { ...escrow });
    this.notify();
  }

  // Recovery Plans
  public getRecoveryPlan(id: RecoveryId): RecoveryPlan | undefined {
    return this.state.recoveryPlans.get(id);
  }

  public getAllRecoveryPlans(): RecoveryPlan[] {
    return Array.from(this.state.recoveryPlans.values()).sort((a, b) => b.detectedAt - a.detectedAt);
  }

  public setRecoveryPlan(plan: RecoveryPlan): void {
    this.state.recoveryPlans.set(plan.id, { ...plan });
    this.notify();
  }

  // Recyclable credit ledger
  private creditKey(agentId: string, assetType: string): string {
    return `${agentId}::${assetType}`;
  }

  public getCreditBalance(agentId: string, assetType: string): number {
    return this.state.creditBalances.get(this.creditKey(agentId, assetType))?.amount || 0;
  }

  public setCreditBalance(agentId: string, assetType: string, amount: number): void {
    this.state.creditBalances.set(this.creditKey(agentId, assetType), {
      agentId,
      assetType,
      amount,
    });
    this.notify();
  }

  public getAllCreditBalances(): CreditBalance[] {
    return Array.from(this.state.creditBalances.values()).map((balance) => ({ ...balance }));
  }

  public getCreditReservation(id: CreditReservationId): CreditReservation | undefined {
    return this.state.creditReservations.get(id);
  }

  public getAllCreditReservations(): CreditReservation[] {
    return Array.from(this.state.creditReservations.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public setCreditReservation(reservation: CreditReservation): void {
    this.state.creditReservations.set(reservation.id, { ...reservation });
    this.notify();
  }

  public getCreditRequest(id: CreditRequestId): CreditRequest | undefined {
    return this.state.creditRequests.get(id);
  }

  public getAllCreditRequests(): CreditRequest[] {
    return Array.from(this.state.creditRequests.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public setCreditRequest(request: CreditRequest): void {
    this.state.creditRequests.set(request.id, { ...request });
    this.notify();
  }

  public getCreditPool(assetType: string): number {
    return this.state.creditPool.get(assetType) || 0;
  }

  public setCreditPool(assetType: string, amount: number): void {
    this.state.creditPool.set(assetType, amount);
    this.notify();
  }

  public getAllCreditPool(): Record<string, number> {
    return Object.fromEntries(this.state.creditPool.entries());
  }

  // Derived State Aggregations
  public getDerivedState(): DerivedState {
    const agents = this.getAllAgents();
    const objects = this.getAllObjects();
    const transactions = this.getAllTransactions();
    const escrows = this.getAllEscrows();
    const recoveryPlans = this.getAllRecoveryPlans();

    const totalTreasuryMon = agents.reduce((acc, a) => acc + a.balanceMon, 0);
    const totalCirculatingObjects = objects.filter((o) => o.status !== 'EXPIRED' && o.status !== 'LIQUIDATED').length;
    const totalStrandedValueMon = objects
      .filter((o) => o.status === 'STRANDED')
      .reduce((acc, o) => acc + o.valueMon, 0);

    const totalRecoveredValueMon = recoveryPlans
      .filter((p) => p.status === 'EXECUTED')
      .reduce((acc, p) => acc + p.expectedRecoveryMon, 0);

    const totalActiveObligationsMon = escrows
      .filter((e) => e.status === 'LOCKED' || e.status === 'DELIVERED' || e.status === 'VERIFIED')
      .reduce((acc, e) => acc + e.amountMon, 0);

    const activeAgentsCount = agents.filter((a) => a.active).length;
    const completedTransactionsCount = transactions.filter((t) => t.status === 'SETTLED').length;

    return {
      totalTreasuryMon: Math.round(totalTreasuryMon * 100) / 100,
      totalCirculatingObjects,
      totalStrandedValueMon: Math.round(totalStrandedValueMon * 100) / 100,
      totalRecoveredValueMon: Math.round(totalRecoveredValueMon * 100) / 100,
      totalActiveObligationsMon: Math.round(totalActiveObligationsMon * 100) / 100,
      activeAgentsCount,
      completedTransactionsCount,
    };
  }

  public reset(): void {
    this.state = {
      agents: new Map(),
      objects: new Map(),
      services: new Map(),
      transactions: new Map(),
      escrows: new Map(),
      recoveryPlans: new Map(),
      creditBalances: new Map(),
      creditReservations: new Map(),
      creditRequests: new Map(),
      creditPool: new Map(),
    };
    this.notify();
  }
}

export const globalStore = new EconomicStore();

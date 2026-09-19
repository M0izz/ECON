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
  Obligation,
  ObligationId,
  SettlementMode,
} from './types';

export interface ProtocolState {
  agents: Map<AgentId, Agent>;
  objects: Map<ObjectId, EconomicObject>;
  services: Map<string, ServiceOffering>;
  transactions: Map<TransactionId, Transaction>;
  escrows: Map<EscrowId, EscrowRecord>;
  recoveryPlans: Map<RecoveryId, RecoveryPlan>;
  obligations: Map<ObligationId, Obligation>;
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
      obligations: new Map(),
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

  // Obligations
  public getObligation(id: ObligationId): Obligation | undefined {
    return this.state.obligations.get(id);
  }

  public getAllObligations(): Obligation[] {
    return Array.from(this.state.obligations.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getObligationsByDebtor(debtor: AgentId): Obligation[] {
    return Array.from(this.state.obligations.values()).filter((o) => o.debtor === debtor);
  }

  public getObligationsByCreditor(creditor: AgentId): Obligation[] {
    return Array.from(this.state.obligations.values()).filter((o) => o.creditor === creditor);
  }

  public setObligation(obligation: Obligation): void {
    this.state.obligations.set(obligation.id, { ...obligation });
    // Update debtor active obligations summary count
    const agent = this.state.agents.get(obligation.debtor);
    if (agent && (obligation.status === 'PENDING' || obligation.status === 'DUE')) {
      const activeMon = this.getObligationsByDebtor(obligation.debtor)
        .filter((o) => o.status === 'PENDING' || o.status === 'DUE')
        .reduce((sum, o) => sum + o.amountMon, 0);
      agent.activeObligations = activeMon;
    }
    this.notify();
  }

  public updateObligationStatus(
    id: ObligationId,
    status: Obligation['status'],
    partialUpdates?: Partial<Obligation>
  ): boolean {
    const ob = this.state.obligations.get(id);
    if (!ob) return false;
    const updated: Obligation = {
      ...ob,
      ...partialUpdates,
      status,
      fulfilledAt: status === 'FULFILLED' ? Date.now() : ob.fulfilledAt,
    };
    this.state.obligations.set(id, updated);

    // Refresh agent active obligations
    const agent = this.state.agents.get(ob.debtor);
    if (agent) {
      const activeMon = this.getObligationsByDebtor(ob.debtor)
        .filter((o) => o.status === 'PENDING' || o.status === 'DUE')
        .reduce((sum, o) => sum + o.amountMon, 0);
      agent.activeObligations = activeMon;
    }

    this.notify();
    return true;
  }

  // Derived State Aggregations
  public getDerivedState(): DerivedState {
    const agents = this.getAllAgents();
    const objects = this.getAllObjects();
    const transactions = this.getAllTransactions();
    const escrows = this.getAllEscrows();
    const recoveryPlans = this.getAllRecoveryPlans();
    const obligations = this.getAllObligations();

    const totalTreasuryMon = agents.reduce((acc, a) => acc + a.balanceMon, 0);
    const totalCirculatingObjects = objects.filter((o) => o.status !== 'EXPIRED' && o.status !== 'LIQUIDATED').length;
    const totalStrandedValueMon = objects
      .filter((o) => o.status === 'STRANDED')
      .reduce((acc, o) => acc + o.valueMon, 0);

    const totalRecoveredValueMon = recoveryPlans
      .filter((p) => p.status === 'EXECUTED')
      .reduce((acc, p) => acc + p.expectedRecoveryMon, 0);

    const escrowObligations = escrows
      .filter((e) => e.status === 'LOCKED' || e.status === 'DELIVERED' || e.status === 'VERIFIED')
      .reduce((acc, e) => acc + e.amountMon, 0);
    const directObligations = obligations
      .filter((o) => o.status === 'PENDING' || o.status === 'DUE')
      .reduce((acc, o) => acc + o.amountMon, 0);
    const totalActiveObligationsMon = escrowObligations + directObligations;

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
      obligations: new Map(),
    };
    this.notify();
  }
}

export const globalStore = new EconomicStore();

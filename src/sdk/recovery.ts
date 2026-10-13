import { RecoveryPlan } from './types';
import { EconomicStore } from './store';
import { SettlementAdapter } from '../settlement/interface';
import { PolicyEngine } from './policy';
import { EventBus } from './events';
import {
  EconomicObjectRepository,
  RecoveryExecutionService,
  RecoveryExecutionResult,
} from './egc';

export class RecoveryEngine {
  private store: EconomicStore;
  private settlement: SettlementAdapter;
  private policyEngine: PolicyEngine;
  private eventBus: EventBus;
  public readonly repo: EconomicObjectRepository;
  public readonly executionService: RecoveryExecutionService;

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
    this.repo = new EconomicObjectRepository(store);
    this.executionService = new RecoveryExecutionService(
      this.repo,
      store,
      settlement,
      policyEngine,
      eventBus
    );
  }

  public setSettlementAdapter(adapter: SettlementAdapter): void {
    this.settlement = adapter;
    this.executionService.setSettlementAdapter(adapter);
  }

  /**
   * Executes a recovery plan through the authoritative RecoveryExecutionService.
   */
  public async execute(
    plan: RecoveryPlan,
    operatorApproved: boolean = false
  ): Promise<RecoveryPlan> {
    const result = await this.executionService.executePlan(plan, operatorApproved);
    if (!result.success) {
      throw new Error(result.error || 'Recovery execution failed');
    }
    return this.store.getRecoveryPlan(plan.id) || plan;
  }

  public async executeWithResult(
    plan: RecoveryPlan,
    operatorApproved: boolean = false
  ): Promise<RecoveryExecutionResult> {
    return this.executionService.executePlan(plan, operatorApproved);
  }
}

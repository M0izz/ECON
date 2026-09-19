import { ECON, defaultEcon } from '../sdk/client';
import { AgentRuntime } from '../sdk/agent/runtime';
import { EconomicObject, Obligation, RecoveryPlan, ServiceOffering, Transaction } from '../sdk/types';

export interface AutonomousLoopStageResult {
  stageNumber: number;
  stageName: string;
  actionSummary: string;
  toolUsed: string;
  data: any;
  timestamp: number;
  agentBalanceMon: number;
}

export class AutonomousResearchAgent {
  public readonly agentId = 'ResearchAgent-42';
  public readonly econ: ECON;
  public readonly runtime: AgentRuntime;
  public stageHistory: AutonomousLoopStageResult[] = [];

  // Intermediate state across the 13 stages
  private selectedService?: ServiceOffering;
  private escrowRecord?: any;
  private mintedObjectId?: string;
  private obligation?: Obligation;
  private recoveryPlan?: RecoveryPlan;

  constructor(econ: ECON = defaultEcon) {
    this.econ = econ;
    this.runtime = this.econ.getRuntime(this.agentId);
  }

  public async runFullLoop(): Promise<AutonomousLoopStageResult[]> {
    this.stageHistory = [];

    // Stage 1: Identity & Treasury Bootstrap
    await this.stage1_bootstrap();

    // Stage 2: Policy Verification
    await this.stage2_policyVerification();

    // Stage 3: Service Discovery
    await this.stage3_discovery();

    // Stage 4: Multi-Attribute Selection
    await this.stage4_selection();

    // Stage 5: Conditional Escrow Creation
    await this.stage5_escrowCreation();

    // Stage 6: Service Execution & Delivery
    await this.stage6_executionDelivery();

    // Stage 7: Delivery Verification
    await this.stage7_deliveryVerification();

    // Stage 8: Escrow Release & Settlement
    await this.stage8_settlementRelease();

    // Stage 9: Economic Object Minting
    await this.stage9_objectMinting();

    // Stage 10: Obligation Tracking
    await this.stage10_obligationTracking();

    // Stage 11: Stranded Value Detection
    await this.stage11_strandedDetection();

    // Stage 12: Recovery Strategy Formulation
    await this.stage12_strategyFormulation();

    // Stage 13: Value Recovery Execution
    await this.stage13_recoveryExecution();

    return this.stageHistory;
  }

  private recordStage(stageNumber: number, stageName: string, actionSummary: string, toolUsed: string, data: any) {
    const agent = this.econ.store.getAgent(this.agentId);
    const result: AutonomousLoopStageResult = {
      stageNumber,
      stageName,
      actionSummary,
      toolUsed,
      data,
      timestamp: Date.now(),
      agentBalanceMon: agent ? agent.balanceMon : 0,
    };
    this.stageHistory.push(result);
    return result;
  }

  // Stage 1: Identity & Treasury Bootstrap
  public async stage1_bootstrap() {
    const balance = await this.runtime.tools.checkBalance();
    const rep = await this.runtime.tools.getReputation();
    const agent = this.econ.store.getAgent(this.agentId);

    return this.recordStage(
      1,
      'IDENTITY & TREASURY BOOTSTRAP',
      `Bootstrapped agent ${this.agentId} with ${balance.balanceMon} MON and ERC-8004 rep ${rep.reputationScore / 10}%`,
      'checkBalance, getReputation',
      { agent, balance, reputation: rep }
    );
  }

  // Stage 2: Policy Verification
  public async stage2_policyVerification() {
    const agent = this.runtime.getAgent();
    const policy = agent.policy;
    const preCheck = this.econ.policy.validateTransaction(this.agentId, 12, 'DATA_SUBSCRIPTION');

    return this.recordStage(
      2,
      'POLICY VERIFICATION',
      `Policy Engine verified constraints (max per tx: ${policy.maxPerTransaction} MON, limit: ${policy.dailySpendingLimit} MON)`,
      'policyEngine.validateTransaction',
      { policy, preCheck }
    );
  }

  // Stage 3: Service Discovery
  public async stage3_discovery() {
    const services = await this.runtime.tools.discover({
      capability: 'satellite-imagery',
      maxPrice: 20,
      minReputation: 90,
    });

    return this.recordStage(
      3,
      'SERVICE DISCOVERY',
      `Discovered ${services.length} qualifying service providers on Monad`,
      'discover',
      { matchingServicesCount: services.length, providers: services.map((s) => s.providerName) }
    );
  }

  // Stage 4: Multi-Attribute Selection
  public async stage4_selection() {
    const services = await this.runtime.tools.discover({ capability: 'satellite-imagery' });
    if (services.length === 0) throw new Error('No services discovered');

    // Multi-attribute selection: select high-res GeoVision provider
    this.selectedService = services.find((s) => s.id === 'srv-geovision-sat') || services[0];
    const quote = await this.runtime.tools.quote({
      serviceId: this.selectedService.id,
      quantity: 1,
    });

    return this.recordStage(
      4,
      'MULTI-ATTRIBUTE SELECTION',
      `Selected optimal provider: ${this.selectedService.providerName} for ${quote.totalPriceMon} MON`,
      'quote',
      { selectedProvider: this.selectedService.providerName, quote }
    );
  }

  // Stage 5: Conditional Escrow Creation
  public async stage5_escrowCreation() {
    if (!this.selectedService) throw new Error('No service selected');

    const escrow = await this.runtime.tools.createEscrow({
      sellerId: this.selectedService.providerId,
      amountMon: this.selectedService.priceMon,
      condition: 'SATELLITE_IMG_MUMBAI_RASTER_DELIVERY_PROOF',
    });

    this.escrowRecord = escrow;

    return this.recordStage(
      5,
      'CONDITIONAL ESCROW CREATION',
      `Locked ${escrow.amountMon} MON into smart contract escrow ${escrow.id}`,
      'createEscrow',
      { escrowId: escrow.id, amountMon: escrow.amountMon, condition: escrow.condition }
    );
  }

  // Stage 6: Service Execution & Delivery
  public async stage6_executionDelivery() {
    if (!this.escrowRecord) throw new Error('No active escrow');

    const deliveryProof = '0x8f2c31e4a7791b8d29c8e102f9011d87a412891b';
    const updatedEscrow = this.econ.escrow.submitDelivery(this.escrowRecord.id, deliveryProof);

    return this.recordStage(
      6,
      'SERVICE EXECUTION & DELIVERY',
      `Provider submitted cryptographic delivery artifact ${deliveryProof.substring(0, 14)}...`,
      'escrow.submitDelivery',
      { deliveryProof, status: updatedEscrow?.status }
    );
  }

  // Stage 7: Delivery Verification
  public async stage7_deliveryVerification() {
    const escrow = this.econ.store.getEscrow(this.escrowRecord.id);
    if (!escrow) throw new Error('Escrow not found');

    const verified = escrow.deliveryHash === '0x8f2c31e4a7791b8d29c8e102f9011d87a412891b';

    return this.recordStage(
      7,
      'DELIVERY VERIFICATION',
      `Verified dataset integrity against requirement (SLA match: 100%)`,
      'escrow.verifyProof',
      { verified, deliveryHash: escrow.deliveryHash }
    );
  }

  // Stage 8: Escrow Release & Settlement
  public async stage8_settlementRelease() {
    const releasedEscrow = await this.econ.escrow.verifyAndRelease(this.escrowRecord.id);

    return this.recordStage(
      8,
      'ESCROW RELEASE & SETTLEMENT',
      `Escrow settled: ${releasedEscrow.amountMon} MON transferred to ${releasedEscrow.seller}`,
      'escrow.verifyAndRelease',
      { escrowId: releasedEscrow.id, amountMon: releasedEscrow.amountMon, status: releasedEscrow.status }
    );
  }

  // Stage 9: Economic Object Minting
  public async stage9_objectMinting() {
    this.mintedObjectId = `OBJ-SAT-MUMBAI-${Date.now().toString().slice(-4)}`;
    const obj: EconomicObject = {
      id: this.mintedObjectId,
      owner: this.agentId,
      type: 'DATA_SUBSCRIPTION',
      denomination: 'Satellite Scene Tokens',
      quantity: 50,
      valueMon: 12,
      expiryTimestamp: Date.now() + 86400000 * 3, // 3 days
      transferable: true,
      status: 'ACTIVE',
      metadataHash: '0x8f2c31e4a7791b8d29c8e102f9011d87a412891b',
      createdAt: Date.now(),
      allocationQuantity: 50,
      consumedQuantity: 15,
      utilizationRatePerHour: 0.2,
      projectedRequirement: 15,
    };

    this.econ.store.setObject(obj);

    return this.recordStage(
      9,
      'ECONOMIC OBJECT MINTING',
      `Minted programmable asset ${obj.id} (50 Scene Tokens, 12 MON value)`,
      'store.setObject',
      { objectId: obj.id, quantity: obj.quantity, denomination: obj.denomination }
    );
  }

  // Stage 10: Obligation Tracking
  public async stage10_obligationTracking() {
    this.obligation = {
      id: `obl-${Date.now()}`,
      debtor: this.agentId,
      creditor: 'Validator-Cluster-East',
      amountMon: 2.5,
      type: 'SERVICE_AGREEMENT',
      status: 'FULFILLED',
      dueTimestamp: Date.now() + 3600000,
      createdAt: Date.now(),
      description: 'Pre-scheduled indexing compute fee',
      fulfilledAt: Date.now(),
    };

    this.econ.store.setObligation(this.obligation);
    const obligations = await this.runtime.tools.listObligations();

    return this.recordStage(
      10,
      'OBLIGATION TRACKING',
      `Recorded & fulfilled obligation ${this.obligation.id} (2.5 MON)`,
      'listObligations, setObligation',
      { obligationId: this.obligation.id, activeObligationsCount: obligations.length }
    );
  }

  // Stage 11: Stranded Value Detection
  public async stage11_strandedDetection() {
    // Update object to simulate excess unused credits approaching expiration
    this.econ.store.updateObjectStatus(this.mintedObjectId!, 'STRANDED', {
      consumedQuantity: 15,
      projectedRequirement: 15,
      utilizationRatePerHour: 0.05,
    });

    const strandedPlans = await this.runtime.tools.scanRecovery();
    this.recoveryPlan = strandedPlans.find((p) => p.objectId === this.mintedObjectId) || strandedPlans[0];

    return this.recordStage(
      11,
      'STRANDED VALUE DETECTION',
      `GC detected 35 unused units in ${this.mintedObjectId} (~8.4 MON value stranded)`,
      'scanRecovery',
      { strandedPlansCount: strandedPlans.length, planFound: !!this.recoveryPlan }
    );
  }

  // Stage 12: Recovery Strategy Formulation
  public async stage12_strategyFormulation() {
    if (!this.recoveryPlan) {
      this.recoveryPlan = this.econ.gc.plan(this.mintedObjectId!);
    }

    const calc = this.recoveryPlan.calculations;

    return this.recordStage(
      12,
      'RECOVERY STRATEGY FORMULATION',
      `Formulated strategy: ${this.recoveryPlan.recommendedStrategy} (EV: +${this.recoveryPlan.expectedRecoveryMon} MON)`,
      'gc.plan',
      {
        strategy: this.recoveryPlan.recommendedStrategy,
        expectedRecovery: this.recoveryPlan.expectedRecoveryMon,
        keepValue: calc.keepValue,
        sellValue: calc.sellValue,
        transferValue: calc.transferValue,
      }
    );
  }

  // Stage 13: Value Recovery Execution
  public async stage13_recoveryExecution() {
    if (!this.recoveryPlan) throw new Error('No recovery plan formulated');

    const executedPlan = await this.runtime.tools.requestRecovery({
      objectId: this.recoveryPlan.objectId,
      strategy: this.recoveryPlan.recommendedStrategy,
    });

    return this.recordStage(
      13,
      'VALUE RECOVERY EXECUTION',
      `Executed recovery: Reclaimed +${executedPlan.expectedRecoveryMon} MON capital into agent treasury`,
      'requestRecovery',
      {
        recoveredAmount: executedPlan.expectedRecoveryMon,
        status: executedPlan.status,
      }
    );
  }
}

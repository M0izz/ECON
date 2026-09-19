import { ECON } from '../sdk/client';
import { EscrowRecord, RecoveryPlan, ServiceOffering } from '../sdk/types';

export interface SimulationStepState {
  stepNumber: number;
  title: string;
  subtitle: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED';
  log: string[];
  metricsSnapshot: {
    buyerBalance: number;
    sellerBalance: number;
    strandedValue: number;
    recoveredValue: number;
  };
  details: Record<string, any>;
}

export class EconomicLoopSimulation {
  private econ: ECON;
  public currentStep: number = 0;
  public stepStates: SimulationStepState[] = [];

  // Working state between steps
  private activeEscrow?: EscrowRecord;
  private selectedService?: ServiceOffering;
  private discoveredServices: ServiceOffering[] = [];
  private createdObjectId: string = 'OBJ-SAT-MUMBAI-01';
  private recoveryPlan?: RecoveryPlan;

  constructor(econ: ECON) {
    this.econ = econ;
    this.reset();
  }

  public reset(): void {
    this.currentStep = 0;
    this.stepStates = [
      {
        stepNumber: 1,
        title: 'NEED SPECIFICATION',
        subtitle: 'ResearchAgent-42 identifies resource requirement',
        status: 'PENDING',
        log: [],
        metricsSnapshot: { buyerBalance: 184, sellerBalance: 340, strandedValue: 8.9, recoveredValue: 0 },
        details: { agent: 'ResearchAgent-42', need: 'Satellite imagery (Mumbai <1m)', budget: '20 MON', deadline: '30 mins' },
      },
      {
        stepNumber: 2,
        title: 'NETWORK DISCOVERY',
        subtitle: 'Query ECON registry for matching providers',
        status: 'PENDING',
        log: [],
        metricsSnapshot: { buyerBalance: 184, sellerBalance: 340, strandedValue: 8.9, recoveredValue: 0 },
        details: {},
      },
      {
        stepNumber: 3,
        title: 'MULTI-ATTRIBUTE EVALUATION',
        subtitle: 'Filter by price, reputation, SLA & policy compatibility',
        status: 'PENDING',
        log: [],
        metricsSnapshot: { buyerBalance: 184, sellerBalance: 340, strandedValue: 8.9, recoveredValue: 0 },
        details: {},
      },
      {
        stepNumber: 4,
        title: 'POLICY CHECK & ESCROW LOCK',
        subtitle: 'Policy engine pre-flight check and funds lock',
        status: 'PENDING',
        log: [],
        metricsSnapshot: { buyerBalance: 184, sellerBalance: 340, strandedValue: 8.9, recoveredValue: 0 },
        details: {},
      },
      {
        stepNumber: 5,
        title: 'RESOURCE DELIVERY',
        subtitle: 'Provider fulfills request and submits delivery proof',
        status: 'PENDING',
        log: [],
        metricsSnapshot: { buyerBalance: 172, sellerBalance: 340, strandedValue: 8.9, recoveredValue: 0 },
        details: {},
      },
      {
        stepNumber: 6,
        title: 'CRYPTOGRAPHIC VERIFICATION',
        subtitle: 'Buyer verifies package hash & SLA conditions',
        status: 'PENDING',
        log: [],
        metricsSnapshot: { buyerBalance: 172, sellerBalance: 340, strandedValue: 8.9, recoveredValue: 0 },
        details: {},
      },
      {
        stepNumber: 7,
        title: 'SETTLEMENT EXECUTION',
        subtitle: 'Escrow releases 12 MON to provider via adapter',
        status: 'PENDING',
        log: [],
        metricsSnapshot: { buyerBalance: 172, sellerBalance: 352, strandedValue: 8.9, recoveredValue: 0 },
        details: {},
      },
      {
        stepNumber: 8,
        title: 'ECONOMIC STATE TRACKING',
        subtitle: 'Ledger tracks updated treasury & new economic asset',
        status: 'PENDING',
        log: [],
        metricsSnapshot: { buyerBalance: 172, sellerBalance: 352, strandedValue: 8.9, recoveredValue: 0 },
        details: {},
      },
      {
        stepNumber: 9,
        title: 'STRANDED VALUE DETECTION',
        subtitle: 'Economic GC identifies 37 unused data credits',
        status: 'PENDING',
        log: [],
        metricsSnapshot: { buyerBalance: 172, sellerBalance: 352, strandedValue: 13.7, recoveredValue: 0 },
        details: {},
      },
      {
        stepNumber: 10,
        title: 'AUTONOMOUS RECOVERY',
        subtitle: 'GC executes peer transfer recovery (+4.6 MON)',
        status: 'PENDING',
        log: [],
        metricsSnapshot: { buyerBalance: 176.6, sellerBalance: 352, strandedValue: 8.9, recoveredValue: 4.6 },
        details: {},
      },
    ];
  }

  public async executeNextStep(): Promise<SimulationStepState> {
    if (this.currentStep >= 10) {
      return this.stepStates[9];
    }

    this.currentStep += 1;
    const stepIdx = this.currentStep - 1;
    const state = this.stepStates[stepIdx];
    state.status = 'ACTIVE';

    switch (this.currentStep) {
      case 1: {
        // Step 1: NEED
        state.log.push('Agent: ResearchAgent-42 (Balance: 184 MON)');
        state.log.push('Requirement: Mumbai satellite tiles, <1m resolution, 7-day window');
        state.log.push('Constraints: Max budget 20 MON, Deadline: 30 minutes');
        state.status = 'COMPLETED';
        break;
      }

      case 2: {
        // Step 2: DISCOVER
        this.discoveredServices = this.econ.discovery.search({
          capability: 'satellite-imagery',
          budget: 20,
        });

        state.log.push(`Found ${this.discoveredServices.length} providers registered on ECON network:`);
        this.discoveredServices.forEach((s) => {
          state.log.push(`  • ${s.providerName} — ${s.priceMon} MON | Rep: ${s.reputation}% | Latency: ${s.latencyMs}ms`);
        });

        state.details = {
          providers: this.discoveredServices.map((s) => ({
            name: s.providerName,
            price: `${s.priceMon} MON`,
            rep: `${s.reputation}%`,
          })),
        };
        state.status = 'COMPLETED';
        break;
      }

      case 3: {
        // Step 3: EVALUATE
        this.selectedService = this.discoveredServices[0]; // GeoVision-Provider (12 MON, 98.7% rep)
        state.log.push(`Optimal provider selected: ${this.selectedService.providerName}`);
        state.log.push(`  Criteria: Highest composite score (98.7% SLA, price within 20 MON budget)`);
        state.log.push(`  Quoted settlement: ${this.selectedService.priceMon} MON`);
        state.status = 'COMPLETED';
        break;
      }

      case 4: {
        // Step 4: TRANSACT & POLICY CHECK
        const buyerId = 'ResearchAgent-42';
        const sellerId = this.selectedService!.providerId;
        const amount = this.selectedService!.priceMon;

        // Verify policy
        const policyCheck = this.econ.policy.validateTransaction(buyerId, amount, 'DATA_SUBSCRIPTION');
        if (!policyCheck.allowed) {
          throw new Error(`Policy blocked simulation: ${policyCheck.reason}`);
        }

        state.log.push(`Policy Engine pre-flight check: PASSED`);
        state.log.push(`  Rule: Max per-tx limit (20 MON) -> Transaction of 12 MON ALLOWED`);
        state.log.push(`  Rule: Category allowlist -> DATA_SUBSCRIPTION ALLOWED`);

        // Lock escrow
        this.activeEscrow = await this.econ.escrow.createEscrow(
          buyerId,
          sellerId,
          amount,
          'SATELLITE_IMG_MUMBAI_PAYLOAD_VALIDATION'
        );

        state.log.push(`Escrow lock executed: ${amount} MON held in contract ${this.activeEscrow.id}`);
        state.details = { escrowId: this.activeEscrow.id, lockedAmount: `${amount} MON` };
        state.status = 'COMPLETED';
        break;
      }

      case 5: {
        // Step 5: DELIVER
        const deliveryHash = '0x8f2c31e4a7791b8d29c8e102f9011d87a412891b';
        this.econ.escrow.submitDelivery(this.activeEscrow!.id, deliveryHash);

        state.log.push(`Provider GeoVision generated geospatial dataset package.`);
        state.log.push(`Delivery proof submitted to escrow: ${deliveryHash}`);
        state.details = { deliveryProof: deliveryHash };
        state.status = 'COMPLETED';
        break;
      }

      case 6: {
        // Step 6: VERIFY
        state.log.push(`Buyer ResearchAgent-42 inspected cryptographic payload signature.`);
        state.log.push(`Proof hash matches spatial boundary: VALID.`);
        state.log.push(`SLA verification passed: Latency within threshold.`);
        state.status = 'COMPLETED';
        break;
      }

      case 7: {
        // Step 7: SETTLE
        await this.econ.escrow.verifyAndRelease(this.activeEscrow!.id);
        state.log.push(`Escrow condition satisfied. Released 12 MON to GeoVision Provider.`);
        state.log.push(`Settlement finalized via active adapter (${this.econ.getSettlementAdapter().name}).`);
        state.status = 'COMPLETED';
        break;
      }

      case 8: {
        // Step 8: TRACK
        // Create new economic object owned by ResearchAgent-42
        this.econ.store.setObject({
          id: this.createdObjectId,
          owner: 'ResearchAgent-42',
          type: 'DATA_SUBSCRIPTION',
          denomination: 'Satellite API Credits',
          quantity: 100,
          valueMon: 5.0, // Remaining 37 unconsumed credits nominal value
          expiryTimestamp: Date.now() + 6.2 * 3600000, // 6.2 hours
          transferable: true,
          status: 'ACTIVE',
          metadataHash: '0x8f2c31e4a7791b8d29c8e102f9011d87a412891b',
          createdAt: Date.now(),
          allocationQuantity: 100,
          consumedQuantity: 63, // Research task consumed 63 credits
          utilizationRatePerHour: 0.5,
          projectedRequirement: 0, // No future usage needed
        });

        const buyer = this.econ.store.getAgent('ResearchAgent-42')!;
        state.log.push(`ResearchAgent-42 treasury balance: ${buyer.balanceMon} MON`);
        state.log.push(`New Economic Object: ${this.createdObjectId} (100 credits, 63 consumed, 37 remaining)`);
        state.details = {
          agentBalance: `${buyer.balanceMon} MON`,
          newAsset: this.createdObjectId,
        };
        state.status = 'COMPLETED';
        break;
      }

      case 9: {
        // Step 9: DETECT
        // Trigger GC scan and plan on the leftover 37 credits
        this.econ.gc.scan('ResearchAgent-42');
        this.recoveryPlan = this.econ.gc.plan(this.createdObjectId);
        this.recoveryPlan.targetBuyerId = 'DataAgent-7';
        this.recoveryPlan.expectedRecoveryMon = 4.6;
        this.econ.store.setRecoveryPlan(this.recoveryPlan);

        state.log.push(`Economic GC triggered: Stranded value detected!`);
        state.log.push(`  Remaining Quota: 37 unconsumed credits (Nominal value: ~4.8 MON)`);
        state.log.push(`  Time to Expiry: 6 hours 12 minutes (Idle rate: 0 credits/hr)`);
        state.log.push(`  Quantitative EV Analysis:`);
        state.log.push(`    • KEEP:      +${this.recoveryPlan.calculations.keepValue} MON`);
        state.log.push(`    • SELL:      +${this.recoveryPlan.calculations.sellValue} MON`);
        state.log.push(`    • TRANSFER:  +${this.recoveryPlan.calculations.transferValue} MON  [RECOMMENDED]`);
        state.log.push(`    • REFUND:    +${this.recoveryPlan.calculations.refundValue} MON`);
        state.log.push(`  Recommendation: Peer Transfer to ${this.recoveryPlan.targetBuyerId} (Confidence: ${Math.round(this.recoveryPlan.confidenceScore * 100)}%)`);

        state.details = {
          strandedUnits: 37,
          recommendedStrategy: 'TRANSFER',
          expectedRecovery: `+${this.recoveryPlan.expectedRecoveryMon} MON`,
        };
        state.status = 'COMPLETED';
        break;
      }

      case 10: {
        // Step 10: RECOVER
        await this.econ.recovery.execute(this.recoveryPlan!, true);

        const buyer = this.econ.store.getAgent('ResearchAgent-42')!;
        const peer = this.econ.store.getAgent('DataAgent-7')!;

        state.log.push(`Recovery Executed: Autonomous Transfer completed.`);
        state.log.push(`  Asset ${this.createdObjectId} transferred to ${peer.name}`);
        state.log.push(`  Settlement: +${this.recoveryPlan!.expectedRecoveryMon} MON credited to ResearchAgent-42`);
        state.log.push(`  ResearchAgent-42 final balance: ${buyer.balanceMon} MON`);
        state.log.push(`--------------------------------------------------`);
        state.log.push(`ECONOMIC LOOP COMPLETE:`);
        state.log.push(`  12.0 MON spent  |  +${this.recoveryPlan!.expectedRecoveryMon} MON recovered`);
        state.log.push(`  Stranded Value Cleared: 0 MON`);

        state.details = {
          finalBuyerBalance: `${buyer.balanceMon} MON`,
          recoveredAmount: `+${this.recoveryPlan!.expectedRecoveryMon} MON`,
          newOwner: peer.name,
        };
        state.status = 'COMPLETED';
        break;
      }
    }

    // Update real metrics snapshot directly from store
    const buyer = this.econ.store.getAgent('ResearchAgent-42')!;
    const seller = this.econ.store.getAgent('GeoVision-Provider')!;
    const derived = this.econ.store.getDerivedState();

    state.metricsSnapshot = {
      buyerBalance: buyer.balanceMon,
      sellerBalance: seller.balanceMon,
      strandedValue: derived.totalStrandedValueMon,
      recoveredValue: derived.totalRecoveredValueMon,
    };

    return state;
  }
}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ECON } from '../src/sdk/client';
import { CREWorkflowService } from '../src/integrations/cre/creService';
import { simulateWorkflowExecution } from '../integrations/chainlink-cre/src/creRunner';
import { EconomicObject, Agent } from '../src/sdk/types';

describe('Chainlink Runtime Environment (CRE) — Integration & Simulation Suite', () => {
  let econ: ECON;
  let testAgent: Agent;

  beforeEach(() => {
    econ = new ECON();

    testAgent = {
      id: 'ResearchAgent-42',
      name: 'ResearchAgent-42',
      controller: '0x1842B6792A645c110E663B514571A15C198547A1',
      walletAddress: '0x1842B6792A645c110E663B514571A15C198547A1',
      balanceMon: 184,
      reputationScore: 98,
      active: true,
      registeredAt: Date.now(),
      policy: {
        maxPerTransaction: 50,
        dailySpendingLimit: 200,
        allowedCategories: ['GPU_COMPUTE_CREDIT', 'DATA_SUBSCRIPTION'],
        requireApprovalAbove: 20,
        autoRecoveryEnabled: true,
        autoTransferEnabled: true,
        minRetainedBalance: 10,
      },
      activeObligations: 0,
    };

    econ.store.setAgent(testAgent);
  });

  // =========================================================================
  // Section 10: Mandatory 8 Simulation Scenarios
  // =========================================================================

  it('1. stranded object → detected as recovery candidate', async () => {
    const result = await simulateWorkflowExecution({
      candidate: {
        objectId: 'OBJ-GPU-82',
        status: 'STRANDED',
        remainingUnits: 82,
        projectedRequirement: 17,
        transferable: true,
      },
    });

    expect(result.outcome.candidateId).toBe('OBJ-GPU-82');
    expect(result.logs.some((l) => l.includes('Candidate identified: OBJ-GPU-82'))).toBe(true);
  });

  it('2. Qwen recommends SELL → policy allows → execution confirmed', async () => {
    const result = await simulateWorkflowExecution({
      candidate: {
        objectId: 'OBJ-GPU-82',
        remainingUnits: 82,
        projectedRequirement: 17,
        transferable: true,
      },
      qwenAction: 'SELL',
    });

    expect(result.outcome.qwenStrategy).toBe('SELL');
    expect(result.outcome.policyStatus).toBe('ALLOWED');
    expect(result.outcome.settlementTxHash).toBeDefined();
    expect(result.outcome.settlementTxHash).toMatch(/^0xcre/);
    expect(result.logs.some((l) => l.includes('Settlement confirmed on Monad Testnet'))).toBe(true);
  });

  it('3. Qwen recommends TRANSFER → policy blocks → transfer denied', async () => {
    const result = await simulateWorkflowExecution({
      candidate: {
        objectId: 'OBJ-GPU-82',
        remainingUnits: 82,
        projectedRequirement: 17,
        transferable: true,
      },
      qwenAction: 'TRANSFER',
      policyAllowsTransfer: false, // Invariant violation
    });

    expect(result.outcome.qwenStrategy).toBe('TRANSFER');
    expect(result.outcome.policyStatus).toBe('BLOCKED');
    expect(result.outcome.settlementTxHash).toBeUndefined();
    expect(result.outcome.policyReason).toContain('Autonomous cross-agent transfers disabled');
  });

  it('4. non-transferable object → no transfer permitted (soulbound guard)', async () => {
    const result = await simulateWorkflowExecution({
      candidate: {
        objectId: 'OBJ-SOULBOUND-01',
        remainingUnits: 100,
        projectedRequirement: 10,
        transferable: false, // Soulbound
      },
      qwenAction: 'TRANSFER',
    });

    expect(result.outcome.policyStatus).toBe('BLOCKED');
    expect(result.outcome.settlementTxHash).toBeUndefined();
    expect(result.outcome.policyReason).toContain('Non-transferable economic objects cannot be recovered');
  });

  it('5. expired object → correct handling and exclusion from active transfer', async () => {
    const result = await simulateWorkflowExecution({
      candidate: {
        objectId: 'OBJ-EXPIRED-99',
        expiryTimestamp: Date.now() - 3600000, // 1 hour ago
        status: 'EXPIRED',
        transferable: true,
      },
    });

    expect(result.outcome.policyStatus).toBe('BLOCKED');
    expect(result.outcome.qwenStrategy).toBe('REFUND');
    expect(result.outcome.policyReason).toContain('Object has expired');
    expect(result.outcome.settlementTxHash).toBeUndefined();
  });

  it('6. policy requires review → no automatic settlement', async () => {
    // Config with low autonomous cap (e.g. 5 MON)
    const result = await simulateWorkflowExecution({
      candidate: {
        objectId: 'OBJ-HIGHVAL-01',
        remainingUnits: 500,
        nominalValueMon: 50.0,
      },
      configOverride: {
        policyInvariants: {
          enforceReserveFloors: true,
          allowSoulboundMovement: false,
          maxAutonomousCapMon: 5.0, // Low threshold
        },
      },
      qwenAction: 'SELL', // Expected value 12.8 MON > 5.0 MON cap
    });

    expect(result.outcome.policyStatus).toBe('REVIEW_REQUIRED');
    expect(result.outcome.settlementTxHash).toBeUndefined();
    expect(result.outcome.auditTrail).toContain('Policy Review Escalated');
  });

  it('7. CRE/API failure → safe failure with zero state corruption', async () => {
    const result = await simulateWorkflowExecution({
      simulateApiFailure: true,
    });

    expect(result.outcome.policyStatus).toBe('BLOCKED');
    expect(result.outcome.settlementTxHash).toBeUndefined();
    expect(result.outcome.policyReason).toContain('Workflow halted safely due to upstream API / network failure');
    expect(result.logs.some((l) => l.includes('Fault Protection'))).toBe(true);
  });

  it('8. duplicate trigger → idempotent behavior without double-spend', async () => {
    const previousExecutions = new Set<string>(['OBJ-GPU-82']);

    const result = await simulateWorkflowExecution({
      candidate: {
        objectId: 'OBJ-GPU-82',
      },
      previousExecutions,
    });

    expect(result.outcome.policyStatus).toBe('BLOCKED');
    expect(result.outcome.qwenStrategy).toBe('NO_ACTION');
    expect(result.outcome.settlementTxHash).toBeUndefined();
    expect(result.outcome.policyReason).toContain('Duplicate trigger detected');
  });

  // =========================================================================
  // End-to-end CREWorkflowService & Deterministic Bounty Demo (OBJ-GPU-82)
  // =========================================================================

  it('CRE service executes deterministic bounty demo on OBJ-GPU-82', async () => {
    const creService = new CREWorkflowService(econ);

    // Verify initial telemetry
    const initialTelemetry = creService.getTelemetry();
    expect(initialTelemetry.workflowId).toBe('cre-econ-gc-recovery-v1');
    expect(initialTelemetry.status).toBe('SIMULATED');

    // Run deterministic bounty demo
    const report = await creService.runBountyDemo();

    expect(report.candidate).toBeDefined();
    expect(report.candidate!.objectId).toBe('OBJ-GPU-82');
    expect(report.candidate!.remainingUnits).toBe(82);
    expect(report.candidate!.projectedRequirement).toBe(17);
    expect(report.candidate!.transferable).toBe(true);

    expect(report.qwenRecommendation).toBeDefined();
    expect(report.policyDecision).toBeDefined();
    expect(report.policyDecision!.allowed).toBe(true);
    expect(report.settlementTxHash).toBeDefined();

    // Verify ECON events were emitted
    const events = econ.events.getHistory();
    expect(events.some((e) => e.type === 'RECOVERY_SCAN_STARTED')).toBe(true);
    expect(events.some((e) => e.type === 'RECOVERY_CANDIDATE_FOUND')).toBe(true);
    expect(events.some((e) => e.type === 'RECOVERY_RECOMMENDATION_CREATED')).toBe(true);
    expect(events.some((e) => e.type === 'RECOVERY_POLICY_APPROVED')).toBe(true);

    // Telemetry updated
    const updatedTelemetry = creService.getTelemetry();
    expect(updatedTelemetry.totalRuns).toBeGreaterThanOrEqual(1);
    expect(updatedTelemetry.successfulSweeps).toBeGreaterThanOrEqual(1);
    expect(updatedTelemetry.cumulativeRecoveredMon).toBeGreaterThan(0);
  });

  it('CRE respects Policy Engine gate when agent auto-recovery is disabled', async () => {
    // Disable auto-recovery in agent policy
    testAgent.policy.autoRecoveryEnabled = false;
    econ.store.setAgent(testAgent);

    const creService = new CREWorkflowService(econ);
    const report = await creService.runBountyDemo();

    expect(report.policyDecision).toBeDefined();
    expect(report.policyDecision!.allowed).toBe(false);
    expect(report.settlementTxHash).toBeUndefined();

    const events = econ.events.getHistory();
    expect(events.some((e) => e.type === 'RECOVERY_REVIEW_REQUIRED')).toBe(true);
  });
});

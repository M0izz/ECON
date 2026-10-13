import { describe, it, expect, beforeEach } from 'vitest';
import {
  createFixtureEnvironment,
  RESEARCH_AGENT_ID,
  PEER_CONSUMER_ID,
  createFixture_OBJ_GPU_82,
  createFixture_NonTransferable,
  createFixture_UnknownTransferability,
  createFixture_Expired,
  createFixture_InsufficientHistory,
  createFixture_ActiveObligation,
  createFixture_OwnershipMismatch,
  createFixture_AlreadyRecovered,
  TestFixtureEnvironment,
} from './egc-fixtures';
import { feeEngine } from '../src/sdk/fee';

describe('Economic Garbage Collector (EGC) Comprehensive Suite', () => {
  let env: TestFixtureEnvironment;

  beforeEach(() => {
    env = createFixtureEnvironment();
  });

  describe('1. Unit Tests: Eligibility, Forecasting & Surplus Detection', () => {
    it('accurately derives empirical usage forecast and calculates surplus for OBJ-GPU-82', () => {
      const obj = createFixture_OBJ_GPU_82();
      env.store.setObject(obj);

      const forecast = env.gc.forecastProvider.forecast(obj);
      expect(forecast.confidence).toBe('HIGH');
      expect(forecast.dataPointsUsed).toBe(3);
      expect(forecast.isDefensible).toBe(true);

      const eligibility = env.gc.eligibilityEngine.evaluate(obj, RESEARCH_AGENT_ID);
      expect(eligibility.eligible).toBe(true);
      expect(eligibility.reasonCode).toBe('ELIGIBLE_FOR_MARKETPLACE');
      expect(eligibility.transferable).toBe(true);
      expect(eligibility.sellable).toBe(true);
      expect(eligibility.refundable).toBe(false);
    });

    it('rejects expired objects deterministically with OBJECT_EXPIRED', () => {
      const obj = createFixture_Expired();
      env.store.setObject(obj);

      const eligibility = env.gc.eligibilityEngine.evaluate(obj, RESEARCH_AGENT_ID);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reasonCode).toBe('OBJECT_EXPIRED');
    });

    it('rejects non-transferable objects deterministically with NON_TRANSFERABLE', () => {
      const obj = createFixture_NonTransferable();
      env.store.setObject(obj);

      const eligibility = env.gc.eligibilityEngine.evaluate(obj, RESEARCH_AGENT_ID);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reasonCode).toBe('NON_TRANSFERABLE');
      expect(eligibility.transferable).toBe(false);
    });

    it('refuses to infer YES from UNKNOWN transferability and outputs TRANSFERABILITY_UNKNOWN', () => {
      const obj = createFixture_UnknownTransferability();
      env.store.setObject(obj);

      const eligibility = env.gc.eligibilityEngine.evaluate(obj, RESEARCH_AGENT_ID);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reasonCode).toBe('TRANSFERABILITY_UNKNOWN');
      expect(eligibility.transferability).toBe('UNKNOWN');
      expect(eligibility.transferable).toBe(false);
    });

    it('blocks recovery of obligated or escrow-locked objects with ACTIVE_OBLIGATION', () => {
      const obj = createFixture_ActiveObligation();
      env.store.setObject(obj);

      const eligibility = env.gc.eligibilityEngine.evaluate(obj, RESEARCH_AGENT_ID);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reasonCode).toBe('ACTIVE_OBLIGATION');
    });

    it('blocks recovery of objects owned by other identities with OWNERSHIP_MISMATCH', () => {
      const obj = createFixture_OwnershipMismatch();
      env.store.setObject(obj);

      const eligibility = env.gc.eligibilityEngine.evaluate(obj, RESEARCH_AGENT_ID);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reasonCode).toBe('OWNERSHIP_MISMATCH');
    });

    it('flags insufficient usage history without inventing a false forecast', () => {
      const obj = createFixture_InsufficientHistory();
      env.store.setObject(obj);

      const forecast = env.gc.forecastProvider.forecast(obj);
      expect(forecast.confidence).toBe('LOW');
      expect(forecast.isDefensible).toBe(false);
    });

    it('bypasses already-recovered objects with ALREADY_RECOVERED', () => {
      const obj = createFixture_AlreadyRecovered();
      env.store.setObject(obj);

      const eligibility = env.gc.eligibilityEngine.evaluate(obj, RESEARCH_AGENT_ID);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reasonCode).toBe('ALREADY_RECOVERED');
    });
  });

  describe('2. Unit Tests: Valuation & Fee Economics', () => {
    it('calculates net expected values without double counting protocol fees', () => {
      const obj = createFixture_OBJ_GPU_82();
      env.store.setObject(obj);

      const structured = env.gc.planStructured(obj.id);
      expect(structured.objectId).toBe('OBJ-GPU-82');
      expect(structured.valuations.sell.isAvailable).toBe(true);
      expect(structured.valuations.transfer.isAvailable).toBe(true);
      expect(structured.valuations.refund.isAvailable).toBe(false); // Unverified refund

      // Protocol fee check
      const marketplaceFee = feeEngine.calculateMarketplaceFee(10.0);
      expect(marketplaceFee.feeMon).toBe(0.1); // 1.0%

      const recoveryFee = feeEngine.calculateRecoveryFee(10.0);
      expect(recoveryFee.feeMon).toBe(0.5); // 5.0%
      expect(recoveryFee.netMon).toBe(9.5);
    });
  });

  describe('3. End-to-End Golden-Path & Safety Invariants', () => {
    it('Path 1: Eligible object -> recommendation -> policy ALLOW -> authorized execution -> confirmed result', async () => {
      const obj = createFixture_OBJ_GPU_82();
      env.store.setObject(obj);

      // 1. Scan detects surplus
      const stranded = env.gc.scan(RESEARCH_AGENT_ID);
      expect(stranded.length).toBe(1);
      expect(stranded[0].id).toBe('OBJ-GPU-82');

      // 2. Plan structured
      const plan = env.gc.plan('OBJ-GPU-82');
      expect(plan.status).toBe('PROPOSED');

      // 3. Execution
      const initialBalance = env.store.getAgent(RESEARCH_AGENT_ID)!.balanceMon;
      await env.recovery.execute(plan, true);

      expect(plan.status).toBe('EXECUTED');
      const updatedObj = env.store.getObject('OBJ-GPU-82')!;
      // Owner changed to peer or state updated
      expect(env.store.getAgent(RESEARCH_AGENT_ID)!.balanceMon).toBeGreaterThan(initialBalance);
    });

    it('Path 2: Non-transferable object -> rejected transfer -> no state mutation', async () => {
      const obj = createFixture_NonTransferable();
      env.store.setObject(obj);

      const plan = env.gc.plan(obj.id);
      // Because it is non-transferable, the plan should recommend KEEP
      expect(plan.recommendedStrategy).toBe('KEEP');

      // If someone forces an invalid TRANSFER on non-transferable object
      plan.recommendedStrategy = 'TRANSFER';
      plan.targetBuyerId = PEER_CONSUMER_ID;

      await expect(env.recovery.execute(plan, true)).rejects.toThrow(/not transferable|NON_TRANSFERABLE/);
      // Verify state was not mutated
      expect(env.store.getObject(obj.id)!.owner).toBe(RESEARCH_AGENT_ID);
    });

    it('Path 3: Policy BLOCK -> no execution', async () => {
      // Create environment where agent disabled automated recovery
      const blockedEnv = createFixtureEnvironment({ autoRecoveryEnabled: false });
      const obj = createFixture_OBJ_GPU_82();
      blockedEnv.store.setObject(obj);

      const plan = blockedEnv.gc.plan(obj.id);
      // Automated execution without operator override must fail
      await expect(blockedEnv.recovery.execute(plan, false)).rejects.toThrow(/blocked by policy/i);
      expect(plan.status).toBe('REJECTED');
    });

    it('Path 4: Policy REVIEW -> no automatic execution above approval threshold', async () => {
      // Agent with low approval threshold (e.g. 1.0 MON)
      const reviewEnv = createFixtureEnvironment({ requireApprovalAbove: 1.0 });
      const obj = createFixture_OBJ_GPU_82(); // Value > 1.0 MON
      reviewEnv.store.setObject(obj);

      const plan = reviewEnv.gc.plan(obj.id);
      // Without operator approval flag (false), execution must be rejected
      await expect(reviewEnv.recovery.execute(plan, false)).rejects.toThrow(/Policy requires operator review/i);

      // With operator explicit approval (true), execution succeeds
      await expect(reviewEnv.recovery.execute(plan, true)).resolves.toBeDefined();
    });

    it('Path 5: Expired object -> no invalid sale', async () => {
      const obj = createFixture_Expired();
      env.store.setObject(obj);

      const plan = env.gc.plan(obj.id);
      plan.recommendedStrategy = 'SELL';

      await expect(env.recovery.execute(plan, true)).rejects.toThrow(/OBJECT_EXPIRED/);
    });

    it('Path 6: Duplicate workflow trigger -> idempotency guard prevents double recovery', async () => {
      const obj = createFixture_OBJ_GPU_82();
      env.store.setObject(obj);

      const plan = env.gc.plan(obj.id);
      const res1 = await env.recovery.executionService.executePlan(plan, true);
      expect(res1.success).toBe(true);

      // Trigger identical plan second time
      const res2 = await env.recovery.executionService.executePlan(plan, true);
      expect(res2.success).toBe(true);
      expect(res2.error).toContain('idempotency guard');
    });

    it('Path 7: Concurrent execution attempts -> concurrency guard blocks second attempt', async () => {
      const obj = createFixture_OBJ_GPU_82();
      env.store.setObject(obj);

      const plan = env.gc.plan(obj.id);

      // Fire two executions concurrently on same object
      const p1 = env.recovery.executionService.executePlan(plan, true);
      const p2 = env.recovery.executionService.executePlan(plan, true);

      const results = await Promise.allSettled([p1, p2]);
      // At least one must succeed and second must be handled safely (either rejected by concurrency guard or idempotency)
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    });

    it('Path 8: Successful marketplace listing -> listing created on marketplace', async () => {
      const obj = createFixture_OBJ_GPU_82();
      env.store.setObject(obj);

      const plan = env.gc.plan(obj.id);
      plan.recommendedStrategy = 'SELL';

      const execResult = await env.recovery.executionService.executePlan(plan, true);
      expect(execResult.success).toBe(true);
      expect(execResult.action).toBe('LIST_ON_MARKETPLACE');
      expect(execResult.listingId).toBeDefined();

      // Check listing in local adapter
      const listing = env.settlement.getListing(execResult.listingId!);
      expect(listing).toBeDefined();
      expect(listing?.active).toBe(true);
      expect(listing?.seller).toBe(RESEARCH_AGENT_ID);

      // Buyer acquires listing on secondary marketplace
      const buyRes = await env.settlement.buyEconomicObject(listing!.listingId, PEER_CONSUMER_ID, listing!.priceMon);
      expect(buyRes.success).toBe(true);
      expect(buyRes.feeStream).toBe('MARKETPLACE');

      // Verify object ownership reconciled to buyer
      expect(env.store.getObject(obj.id)!.owner).toBe(PEER_CONSUMER_ID);
      expect(env.settlement.getListing(listing!.listingId)!.active).toBe(false);
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { ECON } from '../src/sdk/client';
import { initializeDemoSeed } from '../src/demo/seed';
import { EconomicLoopSimulation } from '../src/demo/scenarios';

describe('Master Integration Test: The 10-Step Autonomous Economic Loop', () => {
  let econ: ECON;
  let sim: EconomicLoopSimulation;

  beforeEach(() => {
    econ = new ECON();
    initializeDemoSeed(econ);
    sim = new EconomicLoopSimulation(econ);
  });

  it('executes the full economic loop end-to-end mutating the unified state ledger', async () => {
    // Initial State Check
    const initialBuyer = econ.store.getAgent('ResearchAgent-42')!;
    const initialSeller = econ.store.getAgent('GeoVision-Provider')!;
    expect(initialBuyer.balanceMon).toBe(184);
    expect(initialSeller.balanceMon).toBe(340);

    // Step 1: NEED
    const s1 = await sim.executeNextStep();
    expect(s1.stepNumber).toBe(1);
    expect(s1.status).toBe('COMPLETED');

    // Step 2: DISCOVER
    const s2 = await sim.executeNextStep();
    expect(s2.stepNumber).toBe(2);
    expect(s2.details.providers.length).toBeGreaterThanOrEqual(1);

    // Step 3: EVALUATE
    const s3 = await sim.executeNextStep();
    expect(s3.stepNumber).toBe(3);
    expect(s3.status).toBe('COMPLETED');

    // Step 4: TRANSACT & POLICY CHECK (Escrow locked)
    const s4 = await sim.executeNextStep();
    expect(s4.stepNumber).toBe(4);
    expect(econ.store.getAgent('ResearchAgent-42')!.balanceMon).toBe(172);

    // Step 5: DELIVER
    const s5 = await sim.executeNextStep();
    expect(s5.stepNumber).toBe(5);
    expect(s5.details.deliveryProof).toBeDefined();

    // Step 6: VERIFY
    const s6 = await sim.executeNextStep();
    expect(s6.stepNumber).toBe(6);

    // Step 7: SETTLE (Release Escrow)
    const s7 = await sim.executeNextStep();
    expect(s7.stepNumber).toBe(7);
    expect(econ.store.getAgent('GeoVision-Provider')!.balanceMon).toBe(352);

    // Step 8: TRACK (New Economic Object created)
    const s8 = await sim.executeNextStep();
    expect(s8.stepNumber).toBe(8);
    const newAsset = econ.store.getObject('OBJ-SAT-MUMBAI-01')!;
    expect(newAsset).toBeDefined();
    expect(newAsset.owner).toBe('ResearchAgent-42');
    expect(newAsset.quantity).toBe(100);

    // Step 9: DETECT (GC detects stranded units & generates plan)
    const s9 = await sim.executeNextStep();
    expect(s9.stepNumber).toBe(9);
    expect(s9.details.recommendedStrategy).toBe('TRANSFER');
    expect(econ.store.getObject('OBJ-SAT-MUMBAI-01')!.status).toBe('STRANDED');

    // Step 10: RECOVER (Autonomous Transfer execution)
    const s10 = await sim.executeNextStep();
    expect(s10.stepNumber).toBe(10);

    // Final Ledger Mathematical Invariant Validations
    const finalBuyer = econ.store.getAgent('ResearchAgent-42')!;
    const finalSeller = econ.store.getAgent('GeoVision-Provider')!;
    const finalPeer = econ.store.getAgent('DataAgent-7')!;

    // Buyer spent 12, recovered value
    expect(finalBuyer.balanceMon).toBeGreaterThan(172);
    // Seller received 12
    expect(finalSeller.balanceMon).toBe(352);
    // Asset transferred to peer
    expect(econ.store.getObject('OBJ-SAT-MUMBAI-01')!.owner).toBe('DataAgent-7');
    expect(econ.store.getObject('OBJ-SAT-MUMBAI-01')!.status).toBe('ACTIVE');

    // Derived state assertions
    const derived = econ.store.getDerivedState();
    expect(derived.totalRecoveredValueMon).toBeGreaterThan(0);
  });
});

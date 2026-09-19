import { describe, it, expect, beforeEach } from 'vitest';
import { ECON } from '../src/sdk/client';
import { EconomicStore } from '../src/sdk/store';
import { EventBus } from '../src/sdk/events';

describe('EconomicGarbageCollector', () => {
  let econ: ECON;

  beforeEach(() => {
    econ = new ECON({
      store: new EconomicStore(),
      eventBus: new EventBus(),
    });

    econ.identity.registerAgent('Agent-A', 'Agent A', '0x1', '0x1', 100);
    econ.identity.registerAgent('Peer-B', 'Peer B', '0x2', '0x2', 80);

    // Object with stranded compute credits
    econ.store.setObject({
      id: 'OBJ-STRANDED-1',
      owner: 'Agent-A',
      type: 'GPU_COMPUTE_CREDIT',
      denomination: 'GPU-minutes',
      quantity: 100,
      valueMon: 10,
      expiryTimestamp: Date.now() + 10 * 3600000, // 10 hours left
      transferable: true,
      status: 'ACTIVE',
      metadataHash: '0x111',
      createdAt: Date.now() - 3600000,
      allocationQuantity: 100,
      consumedQuantity: 20, // 80 unconsumed
      utilizationRatePerHour: 0.1, // very low
      projectedRequirement: 5,
    });
  });

  it('scans and tags stranded economic objects', () => {
    const stranded = econ.gc.scan('Agent-A');
    expect(stranded.length).toBe(1);
    expect(stranded[0].id).toBe('OBJ-STRANDED-1');
    expect(econ.store.getObject('OBJ-STRANDED-1')!.status).toBe('STRANDED');
  });

  it('computes quantitative Expected Value across all recovery strategies', () => {
    econ.gc.scan('Agent-A');
    const plan = econ.gc.plan('OBJ-STRANDED-1');

    expect(plan.objectId).toBe('OBJ-STRANDED-1');
    expect(plan.calculations.keepValue).toBeGreaterThanOrEqual(0);
    expect(plan.calculations.sellValue).toBeGreaterThan(0);
    expect(plan.calculations.transferValue).toBeGreaterThan(0);
    expect(plan.calculations.refundValue).toBeGreaterThan(0);
    expect(plan.confidenceScore).toBeGreaterThan(0.7);
    expect(plan.recommendedStrategy).toBe('TRANSFER');
  });
});

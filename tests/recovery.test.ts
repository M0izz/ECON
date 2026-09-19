import { describe, it, expect, beforeEach } from 'vitest';
import { ECON } from '../src/sdk/client';
import { EconomicStore } from '../src/sdk/store';
import { EventBus } from '../src/sdk/events';

describe('RecoveryEngine', () => {
  let econ: ECON;

  beforeEach(() => {
    econ = new ECON({
      store: new EconomicStore(),
      eventBus: new EventBus(),
    });

    econ.identity.registerAgent('Agent-Owner', 'Owner', '0x1', '0x1', 50, {
      autoRecoveryEnabled: true,
      autoTransferEnabled: true,
    });
    econ.identity.registerAgent('Agent-Buyer', 'Buyer', '0x2', '0x2', 100);

    econ.store.setObject({
      id: 'OBJ-REC-1',
      owner: 'Agent-Owner',
      type: 'GPU_COMPUTE_CREDIT',
      denomination: 'GPU-minutes',
      quantity: 50,
      valueMon: 10,
      expiryTimestamp: Date.now() + 12 * 3600000,
      transferable: true,
      status: 'STRANDED',
      metadataHash: '0x222',
      createdAt: Date.now(),
      allocationQuantity: 50,
      consumedQuantity: 0,
      utilizationRatePerHour: 0,
      projectedRequirement: 0,
    });
  });

  it('executes peer transfer recovery and rebalances accounts', async () => {
    const plan = econ.gc.plan('OBJ-REC-1');
    expect(plan.recommendedStrategy).toBe('TRANSFER');

    await econ.recovery.execute(plan);

    expect(plan.status).toBe('EXECUTED');
    // Owner recovered MON
    expect(econ.store.getAgent('Agent-Owner')!.balanceMon).toBeGreaterThan(50);
    // Object now owned by peer buyer
    expect(econ.store.getObject('OBJ-REC-1')!.owner).toBe('Agent-Buyer');
    expect(econ.store.getObject('OBJ-REC-1')!.status).toBe('ACTIVE');
  });

  it('blocks automated recovery if agent policy disables it', async () => {
    econ.identity.updatePolicy('Agent-Owner', { autoRecoveryEnabled: false });
    const plan = econ.gc.plan('OBJ-REC-1');

    await expect(econ.recovery.execute(plan, false)).rejects.toThrow(/blocked by policy/);

    // Can be executed with explicit operator approval
    await expect(econ.recovery.execute(plan, true)).resolves.toBeDefined();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { ECON } from '../src/sdk/client';
import { EconomicStore } from '../src/sdk/store';
import { EventBus } from '../src/sdk/events';

describe('EconomicEngine', () => {
  let econ: ECON;

  beforeEach(() => {
    econ = new ECON({
      store: new EconomicStore(),
      eventBus: new EventBus(),
    });

    econ.identity.registerAgent('BuyerAgent', 'Buyer', '0x1', '0x1', 100, {
      maxPerTransaction: 50,
      allowedCategories: ['GPU_COMPUTE_CREDIT'],
    });

    econ.identity.registerAgent('SellerAgent', 'Seller', '0x2', '0x2', 50);

    econ.store.setObject({
      id: 'OBJ-TEST-1',
      owner: 'SellerAgent',
      type: 'GPU_COMPUTE_CREDIT',
      denomination: 'GPU-minutes',
      quantity: 60,
      valueMon: 15,
      expiryTimestamp: Date.now() + 86400000,
      transferable: true,
      status: 'ACTIVE',
      metadataHash: '0xabc',
      createdAt: Date.now(),
      allocationQuantity: 60,
      consumedQuantity: 0,
      utilizationRatePerHour: 5,
      projectedRequirement: 50,
    });
  });

  it('executes atomic purchase and updates balances and object ownership', async () => {
    const tx = await econ.engine.buy('BuyerAgent', 'SellerAgent', 'OBJ-TEST-1', 15);

    expect(tx.status).toBe('SETTLED');
    expect(econ.store.getAgent('BuyerAgent')!.balanceMon).toBe(85);
    expect(econ.store.getAgent('SellerAgent')!.balanceMon).toBe(65);

    const obj = econ.store.getObject('OBJ-TEST-1')!;
    expect(obj.owner).toBe('BuyerAgent');
  });

  it('fails purchase if policy rejects transaction', async () => {
    econ.identity.updatePolicy('BuyerAgent', { maxPerTransaction: 10 });

    await expect(
      econ.engine.buy('BuyerAgent', 'SellerAgent', 'OBJ-TEST-1', 15)
    ).rejects.toThrow(/Transaction rejected by policy/);

    // Assert balances did not change
    expect(econ.store.getAgent('BuyerAgent')!.balanceMon).toBe(100);
    expect(econ.store.getAgent('SellerAgent')!.balanceMon).toBe(50);
  });
});

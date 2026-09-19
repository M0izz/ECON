import { describe, it, expect, beforeEach } from 'vitest';
import { ECON } from '../src/sdk/client';
import { EconomicStore } from '../src/sdk/store';
import { EventBus } from '../src/sdk/events';

describe('EscrowManager', () => {
  let econ: ECON;

  beforeEach(() => {
    econ = new ECON({
      store: new EconomicStore(),
      eventBus: new EventBus(),
    });

    econ.identity.registerAgent('Buyer', 'Buyer', '0x1', '0x1', 100);
    econ.identity.registerAgent('Seller', 'Seller', '0x2', '0x2', 50);
  });

  it('handles complete escrow lifecycle: lock, deliver, verify, and release', async () => {
    // 1. Lock funds
    const escrow = await econ.escrow.createEscrow('Buyer', 'Seller', 20, 'DELIVERY_HASH_CHECK');
    expect(escrow.status).toBe('LOCKED');
    expect(econ.store.getAgent('Buyer')!.balanceMon).toBe(80);

    // 2. Deliver
    econ.escrow.submitDelivery(escrow.id, '0xdeadbeef1234');
    expect(econ.store.getEscrow(escrow.id)!.status).toBe('DELIVERED');

    // 3. Verify & Release
    const finalized = await econ.escrow.verifyAndRelease(escrow.id);
    expect(finalized.status).toBe('RELEASED');
    expect(econ.store.getAgent('Seller')!.balanceMon).toBe(70);
  });

  it('refunds buyer when escrow conditions fail or expire', async () => {
    const escrow = await econ.escrow.createEscrow('Buyer', 'Seller', 25, 'CONDITION');
    expect(econ.store.getAgent('Buyer')!.balanceMon).toBe(75);

    await econ.escrow.refund(escrow.id);
    expect(econ.store.getAgent('Buyer')!.balanceMon).toBe(100);
    expect(econ.store.getEscrow(escrow.id)!.status).toBe('REFUNDED');
  });
});

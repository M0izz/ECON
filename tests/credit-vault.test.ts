import { beforeEach, describe, expect, it } from 'vitest';
import { ECON } from '../src/sdk/client';
import { EconomicStore } from '../src/sdk/store';
import { EventBus } from '../src/sdk/events';

function createEcon(): ECON {
  const econ = new ECON({
    store: new EconomicStore(),
    eventBus: new EventBus(),
  });
  econ.identity.registerAgent('Agent-A', 'Provider Agent', '0x1', '0x1', 10);
  econ.identity.registerAgent('Agent-B', 'Consumer Agent', '0x2', '0x2', 10);
  return econ;
}

describe('CreditVault', () => {
  it('conserves credits through reservation, consumption, and release', () => {
    const econ = createEcon();
    econ.credits.grant('Agent-A', 'GPU_MINUTE', 100);

    const reservation = econ.credits.reserve(
      'Agent-A',
      'GPU_MINUTE',
      40,
      'inference batch',
      Date.now() + 60_000
    );
    econ.credits.consume(reservation.id, 12, 'Agent-A');
    econ.credits.release(reservation.id, 'Agent-A');

    expect(econ.store.getCreditBalance('Agent-A', 'GPU_MINUTE')).toBe(88);
    expect(econ.store.getCreditReservation(reservation.id)?.status).toBe('RELEASED');
    expect(econ.credits.getSummary()).toMatchObject({
      totalBalances: 88,
      totalReserved: 0,
      totalPool: 0,
    });
  });

  it('recycles unused credits and fulfills another agent request without minting', () => {
    const econ = createEcon();
    econ.credits.grant('Agent-A', 'GPU_MINUTE', 100);
    const reservation = econ.credits.reserve(
      'Agent-A',
      'GPU_MINUTE',
      40,
      'unused capacity',
      Date.now() + 60_000
    );
    econ.credits.consume(reservation.id, 12, 'Agent-A');
    econ.credits.recycle(reservation.id, 'Agent-A');

    const request = econ.credits.request('Agent-B', 'GPU_MINUTE', 28);
    const fulfilled = econ.credits.fulfill(request.id);

    expect(fulfilled.status).toBe('FULFILLED');
    expect(econ.store.getCreditBalance('Agent-A', 'GPU_MINUTE')).toBe(60);
    expect(econ.store.getCreditBalance('Agent-B', 'GPU_MINUTE')).toBe(28);
    expect(econ.store.getCreditPool('GPU_MINUTE')).toBe(0);
    expect(econ.credits.getSummary().totalBalances).toBe(88);
  });

  it('rejects reservations that exceed an agent balance', () => {
    const econ = createEcon();
    econ.credits.grant('Agent-A', 'GPU_MINUTE', 10);

    expect(() =>
      econ.credits.reserve('Agent-A', 'GPU_MINUTE', 11, 'oversized job', Date.now() + 60_000)
    ).toThrow(/Insufficient GPU_MINUTE credits/);
  });
});

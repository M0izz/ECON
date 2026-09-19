import { describe, it, expect, beforeEach } from 'vitest';
import { ECON } from '../src/sdk/client';
import { EconomicStore } from '../src/sdk/store';
import { EventBus } from '../src/sdk/events';

describe('PolicyEngine', () => {
  let econ: ECON;

  beforeEach(() => {
    econ = new ECON({
      store: new EconomicStore(),
      eventBus: new EventBus(),
    });

    econ.identity.registerAgent('TestAgent-1', 'Agent 1', '0x1', '0x1', 100, {
      maxPerTransaction: 20,
      dailySpendingLimit: 50,
      allowedCategories: ['GPU_COMPUTE_CREDIT', 'API_LICENSE'],
      minRetainedBalance: 20,
    });
  });

  it('permits valid transactions under spending caps', () => {
    const check = econ.policy.validateTransaction('TestAgent-1', 15, 'GPU_COMPUTE_CREDIT');
    expect(check.allowed).toBe(true);
  });

  it('blocks transactions exceeding maxPerTransaction', () => {
    const check = econ.policy.validateTransaction('TestAgent-1', 25, 'GPU_COMPUTE_CREDIT');
    expect(check.allowed).toBe(false);
    expect(check.violatesRule).toBe('MAX_TRANSACTION_LIMIT');
  });

  it('blocks transactions violating minimum retained reserve floor', () => {
    // Current balance: 100 MON. Floor: 20 MON. Transaction of 85 leaves 15 (< 20 floor).
    // Note: maxPerTransaction would trigger first if higher than 20, so let's adjust policy for this test:
    econ.identity.updatePolicy('TestAgent-1', { maxPerTransaction: 90 });
    const check = econ.policy.validateTransaction('TestAgent-1', 85, 'GPU_COMPUTE_CREDIT');
    expect(check.allowed).toBe(false);
    expect(check.violatesRule).toBe('MIN_RETAINED_BALANCE');
  });

  it('blocks unapproved categories', () => {
    const check = econ.policy.validateTransaction('TestAgent-1', 10, 'STORAGE_CREDIT');
    expect(check.allowed).toBe(false);
    expect(check.violatesRule).toBe('CATEGORY_RESTRICTION');
  });
});

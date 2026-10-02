import { describe, it, expect, beforeEach } from 'vitest';
import { ECON } from '../src/sdk/client';
import { EconomicStore } from '../src/sdk/store';
import { EventBus } from '../src/sdk/events';
import { CounterpartyIntelligenceContext, EconomicIntelligence } from '../src/integrations/nansen/nansenTypes';

describe('Nansen + ECON Policy Engine Integration', () => {
  let econ: ECON;

  beforeEach(() => {
    econ = new ECON({
      store: new EconomicStore(),
      eventBus: new EventBus(),
    });

    econ.identity.registerAgent(
      'ResearchAgent-42',
      'ResearchAgent-42',
      '0x1842B6792A645c110E663B514571A15C198547A1',
      '0x1842...47A1',
      100,
      {
        maxPerTransaction: 20,
        dailySpendingLimit: 50,
        allowedCategories: ['GPU_COMPUTE_CREDIT', 'API_LICENSE'],
        minRetainedBalance: 20,
        requireApprovalAbove: 15,
      }
    );
  });

  const createMockIntelligence = (
    labels: { label: string; category?: string }[],
    available = true
  ): EconomicIntelligence => ({
    address: '0x777286A645c110E663B514571A15C198547A7',
    chain: 'monad',
    labels: labels.map((l) => ({ ...l, source: 'nansen' })),
    balances: [{ tokenSymbol: 'MON', symbol: 'MON', balance: 50, balanceFormatted: 50, chain: 'monad' }],
    recentTransactions: [],
    counterparties: [],
    relatedWallets: [],
    fetchedAt: new Date().toISOString(),
    expiresAt: Date.now() + 300000,
    source: 'nansen',
    available,
  });

  it('1. Nansen context successfully reaches policy layer', () => {
    const intel = createMockIntelligence([{ label: 'Verified DEX Trader', category: 'behavior' }]);
    const context: CounterpartyIntelligenceContext = {
      targetAddress: '0x777286A645c110E663B514571A15C198547A7',
      targetRole: 'SELLER',
      intelligence: intel,
      evaluatedAt: Date.now(),
    };

    const check = econ.policy.validateTransaction('ResearchAgent-42', 10, 'GPU_COMPUTE_CREDIT', context);
    expect(check.allowed).toBe(true);
    expect(check.intelligenceContext).toBeDefined();
    expect(check.intelligenceContext?.verifiedSource).toBe('nansen');
    expect(check.intelligenceContext?.address).toBe('0x777286A645c110E663B514571A15C198547A7');
    expect(check.intelligenceContext?.labelsCount).toBe(1);
  });

  it('2. Nansen cannot directly execute transactions (read-only context)', () => {
    const intel = createMockIntelligence([{ label: 'Verified Whale', category: 'entity' }]);
    const context: CounterpartyIntelligenceContext = {
      targetAddress: '0x777286A645c110E663B514571A15C198547A7',
      targetRole: 'SELLER',
      intelligence: intel,
      evaluatedAt: Date.now(),
    };

    // Even if Nansen data is pristine, Policy Engine validates spending floor
    const checkOverFloor = econ.policy.validateTransaction('ResearchAgent-42', 85, 'GPU_COMPUTE_CREDIT', context);
    expect(checkOverFloor.allowed).toBe(false);
    expect(checkOverFloor.violatesRule).toBe('MIN_RETAINED_BALANCE');
  });

  it('3. High-risk or exploit labels detected by Nansen escalate to mandatory manual approval', () => {
    const suspiciousIntel = createMockIntelligence([
      { label: 'Reported Phishing Drainer', category: 'exploit' },
    ]);
    const context: CounterpartyIntelligenceContext = {
      targetAddress: '0xBadActor12345678901234567890123456789012',
      targetRole: 'SELLER',
      intelligence: suspiciousIntel,
      evaluatedAt: Date.now(),
    };

    const check = econ.policy.validateTransaction('ResearchAgent-42', 5, 'GPU_COMPUTE_CREDIT', context);
    expect(check.requiresManualApproval).toBe(true);
    expect(check.violatesRule).toBe('COUNTERPARTY_FLAGGED');
    expect(check.intelligenceContext?.flags).toContain('SUSPICIOUS_COUNTERPARTY');
    expect(check.reason).toContain('Flagged counterparty detected via Nansen intelligence');
  });

  it('4. Nansen failure or unavailability does not bypass policy', () => {
    const unavailableIntel = createMockIntelligence([], false);
    unavailableIntel.error = 'Nansen 503 unavailable';

    const context: CounterpartyIntelligenceContext = {
      targetAddress: '0x777286A645c110E663B514571A15C198547A7',
      targetRole: 'SELLER',
      intelligence: unavailableIntel,
      evaluatedAt: Date.now(),
    };

    // Transaction that exceeds maxPerTransaction (cap = 20 MON)
    const checkExceed = econ.policy.validateTransaction('ResearchAgent-42', 25, 'GPU_COMPUTE_CREDIT', context);
    expect(checkExceed.allowed).toBe(false);
    expect(checkExceed.violatesRule).toBe('MAX_TRANSACTION_LIMIT');

    // Transaction within caps evaluates safely with standard policy constraints
    const checkValid = econ.policy.validateTransaction('ResearchAgent-42', 10, 'GPU_COMPUTE_CREDIT', context);
    expect(checkValid.allowed).toBe(true);
    expect(checkValid.intelligenceContext?.note).toContain('evaluated with standard policy constraints');
  });

  it('5. Threshold-based approval rule coexists with Nansen intelligence', () => {
    const cleanIntel = createMockIntelligence([{ label: 'Monad Builder', category: 'entity' }]);
    const context: CounterpartyIntelligenceContext = {
      targetAddress: '0x777286A645c110E663B514571A15C198547A7',
      targetRole: 'SELLER',
      intelligence: cleanIntel,
      evaluatedAt: Date.now(),
    };

    // Policy requires manual approval above 15 MON. 18 MON is under maxPerTx (20), but requires review
    const check = econ.policy.validateTransaction('ResearchAgent-42', 18, 'GPU_COMPUTE_CREDIT', context);
    expect(check.allowed).toBe(true);
    expect(check.requiresManualApproval).toBe(true);
  });
});

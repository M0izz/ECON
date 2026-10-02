import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ECON } from '../src/sdk/client';
import { EconomicStore } from '../src/sdk/store';
import { EventBus } from '../src/sdk/events';
import { NansenService } from '../src/integrations/nansen/nansenService';
import { NansenClient } from '../src/integrations/nansen/nansenClient';

describe('Nansen Integration End-to-End Operational Flows', () => {
  let econ: ECON;
  let client: NansenClient;
  let service: NansenService;

  beforeEach(() => {
    econ = new ECON({
      store: new EconomicStore(),
      eventBus: new EventBus(),
    });

    client = new NansenClient({
      apiBaseUrl: '/api/nansen',
      cacheTtlMs: 5000,
    });
    service = new NansenService(client);

    // Register seller and buyer agents
    econ.identity.registerAgent(
      'ComputeAgent-3',
      'ComputeAgent-3',
      '0x333286A645c110E663B514571A15C198547A3',
      '0x3332...47A3',
      200,
      {
        maxPerTransaction: 50,
        dailySpendingLimit: 200,
        allowedCategories: ['GPU_COMPUTE_CREDIT'],
        minRetainedBalance: 20,
      }
    );

    econ.identity.registerAgent(
      'DataAgent-7',
      'DataAgent-7',
      '0x777286A645c110E663B514571A15C198547A7',
      '0x7772...47A7',
      100,
      {
        maxPerTransaction: 30,
        dailySpendingLimit: 100,
        allowedCategories: ['GPU_COMPUTE_CREDIT', 'API_LICENSE'],
        minRetainedBalance: 15,
        autoRecoveryEnabled: true,
        autoTransferEnabled: true,
      }
    );
  });

  it('1. Marketplace flow: queries seller wallet intelligence before transacting', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        available: true,
        data: {
          labels: [
            { label: 'Verified Compute Provider', category: 'entity' },
            { label: 'High Volume Monad DEX', category: 'behavior' },
          ],
          data: [
            { token: 'MON', symbol: 'MON', balance: '210.0', chain: 'monad' },
          ],
        },
      }),
    } as Response);

    const context = await service.getCounterpartyIntelligence(
      '0x333286A645c110E663B514571A15C198547A3',
      'SELLER',
      'monad'
    );

    expect(context.targetRole).toBe('SELLER');
    expect(context.intelligence.available).toBe(true);
    expect(context.intelligence.labels).toHaveLength(2);
    expect(context.intelligence.labels[0].label).toBe('Verified Compute Provider');

    // Context flows into Policy Engine
    const policyResult = econ.policy.validateTransaction(
      'DataAgent-7',
      25,
      'GPU_COMPUTE_CREDIT',
      context
    );
    expect(policyResult.allowed).toBe(true);
    expect(policyResult.intelligenceContext?.verifiedSource).toBe('nansen');
  });

  it('2. Recovery flow: evaluates target recipient intelligence prior to GC recommendation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        available: true,
        data: {
          labels: [{ label: 'Active Consumer Agent', category: 'agent' }],
          counterparties: [
            { address: '0x1842B6792A645c110E663B514571A15C198547A1', count: 8 },
          ],
        },
      }),
    } as Response);

    const recoveryContext = await service.getCounterpartyIntelligence(
      '0x777286A645c110E663B514571A15C198547A7',
      'RECOVERY_TARGET',
      'monad'
    );

    expect(recoveryContext.targetRole).toBe('RECOVERY_TARGET');
    expect(recoveryContext.intelligence.labels[0].label).toBe('Active Consumer Agent');
    expect(recoveryContext.intelligence.counterparties).toHaveLength(1);

    // GC recovery plan validation: Nansen does NOT execute transaction directly
    const plan = {
      id: 'rec_plan_001',
      objectId: 'OBJ-COMP-0042',
      ownerId: 'DataAgent-7',
      detectedAt: Date.now(),
      strandedQuantity: 37,
      strandedValueMon: 4.6,
      status: 'PROPOSED' as const,
      calculations: {
        keepValue: 0,
        sellValue: 4.2,
        transferValue: 4.6,
        refundValue: 0,
      },
      confidenceScore: 0.95,
      recommendedStrategy: 'TRANSFER' as const,
      expectedRecoveryMon: 4.6,
      reason: 'Idle compute units detected',
    };

    const recoveryValidation = econ.policy.validateRecovery(plan);
    expect(recoveryValidation.allowed).toBe(true);
  });

  it('3. Agent intelligence: queries agent wallet profiling with Monad-specific balances', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        available: true,
        data: {
          labels: [{ label: 'Autonomous Research Node', category: 'agent' }],
          data: [{ token: 'MON', symbol: 'MON', balance: '184.0', chain: 'monad' }],
        },
      }),
    } as Response);

    const agentIntel = await client.getAddressProfile('0x1842B6792A645c110E663B514571A15C198547A1');
    expect(agentIntel.address).toBe('0x1842b6792a645c110e663b514571a15c198547a1');
    expect(agentIntel.chain).toBe('monad');
    expect(agentIntel.balances).toHaveLength(1);
    expect(agentIntel.balances[0].tokenSymbol).toBe('MON');
  });

  it('4. Handles empty / insufficient data state without creating fake entries', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Address not found on index' }),
    } as Response);

    const context = await service.getCounterpartyIntelligence(
      '0x0000000000000000000000000000000000000001',
      'GENERAL',
      'monad'
    );

    // Shows empty state, never fabricates labels or balances
    expect(context.intelligence.available).toBe(true);
    expect(context.intelligence.status).toBe(404);
    expect(context.intelligence.labels).toEqual([]);
    expect(context.intelligence.balances).toEqual([]);
    expect(context.intelligence.recentTransactions).toEqual([]);
  });

  it('5. Handles service unavailable (503/500) state gracefully: ECON protocol continues functioning', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Service Unavailable' }),
    } as Response);

    const context = await service.getCounterpartyIntelligence(
      '0x333286A645c110E663B514571A15C198547A3',
      'SELLER',
      'monad'
    );

    expect(context.intelligence.available).toBe(false);
    expect(context.intelligence.error).toBeDefined();

    // Standard transactions are NOT halted solely because Nansen is temporarily down
    const check = econ.policy.validateTransaction('DataAgent-7', 10, 'GPU_COMPUTE_CREDIT', context);
    expect(check.allowed).toBe(true);
  });
});

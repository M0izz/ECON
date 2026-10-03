import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ECON } from '../src/sdk/client';
import { QwenProvider } from '../src/integrations/qwen/qwenProvider';
import { QwenClient } from '../src/integrations/qwen/qwenClient';
import { EconomicContextBuilder } from '../src/integrations/qwen/qwenContext';
import { Agent, ServiceOffering, EconomicObject, RecoveryPlan } from '../src/sdk/types';
import { AgentRuntime } from '../src/sdk/agent/runtime';

describe('Qwen 3.8 Max — Agent Runtime & Policy Boundary Tests', () => {
  let econ: ECON;
  let testAgent: Agent;

  beforeEach(() => {
    econ = new ECON();

    testAgent = {
      id: 'ResearchAgent-42',
      name: 'ResearchAgent-42',
      controller: '0x1842B6792A645c110E663B514571A15C198547A1',
      walletAddress: '0x1842B6792A645c110E663B514571A15C198547A1',
      balanceMon: 184,
      reputationScore: 98,
      active: true,
      registeredAt: Date.now(),
      policy: {
        maxPerTransaction: 20, // Max 20 MON per tx
        dailySpendingLimit: 100,
        allowedCategories: ['DATA_SUBSCRIPTION', 'API_LICENSE'],
        requireApprovalAbove: 20,
        autoRecoveryEnabled: true,
        autoTransferEnabled: true,
        minRetainedBalance: 10, // Must keep 10 MON in treasury
      },
      activeObligations: 0,
    };

    econ.store.setAgent(testAgent);
  });

  it('runtime emits QWEN_REASONING_PRODUCED event when reasoning completes', async () => {
    const mockClient = new QwenClient();
    vi.spyOn(mockClient, 'generateReasoning').mockResolvedValue({
      available: true,
      modelUsed: 'qwen3.8-max',
      durationMs: 380,
      rawText: JSON.stringify({
        action: 'BUY',
        target: 'GeoVision',
        amountMon: 12,
        confidence: 0.93,
        reason: 'Optimal pricing and high reputation track record',
      }),
    });

    const qwenProvider = new QwenProvider(mockClient);
    const runtime = new AgentRuntime(
      testAgent.id,
      econ.store,
      econ.policy,
      econ.engine,
      econ.escrow,
      econ.gc,
      econ.recovery,
      econ.events,
      qwenProvider
    );

    const emittedEvents: any[] = [];
    econ.events.subscribe('QWEN_REASONING_PRODUCED', (evt) => {
      emittedEvents.push(evt);
    });

    const context = EconomicContextBuilder.forMarketplace({
      agent: testAgent,
      objective: 'Acquire satellite imagery under 20 MON',
      services: [
        {
          id: 'srv-1',
          providerId: 'GeoVision-Provider',
          providerName: 'GeoVision',
          description: 'High-resolution optical satellite imagery feed',
          capability: 'satellite-imagery',
          priceMon: 12,
          latencyMs: 120,
          reputation: 98,
          minSLA: 99,
          unit: 'per query',
          availability: true,
        },
      ],
    });

    const result = await runtime.reasonEconomicAction(context);

    expect(result.available).toBe(true);
    expect(result.intent.action).toBe('BUY');
    expect(emittedEvents.length).toBe(1);
    expect(emittedEvents[0].type).toBe('QWEN_REASONING_PRODUCED');
    expect(emittedEvents[0].actor).toBe('ResearchAgent-42');
    expect(emittedEvents[0].details.intent.action).toBe('BUY');
  });

  it('policy engine ALLOWS recommendation conforming to spending constraints', () => {
    // Qwen recommends buying GeoVision for 12 MON (<= 20 MON cap)
    const check = econ.policy.validateTransaction(testAgent.id, 12, 'DATA_SUBSCRIPTION');
    expect(check.allowed).toBe(true);
    expect(check.violatesRule).toBeUndefined();
  });

  it('policy engine BLOCKS recommendation exceeding maxPerTransaction constraint regardless of Qwen confidence', () => {
    // Qwen returns 35 MON transaction with 99% confidence
    const highConfidenceAmount = 35; // Exceeds 20 MON cap

    const check = econ.policy.validateTransaction(testAgent.id, highConfidenceAmount, 'DATA_SUBSCRIPTION');

    expect(check.allowed).toBe(false);
    expect(check.violatesRule).toBe('MAX_TRANSACTION_LIMIT');
    expect(check.reason).toContain('exceeds allowed cap of 20 MON');
  });

  it('policy engine BLOCKS recommendation violating minimum retained treasury reserve', () => {
    // Agent has 184 MON. If amount is 178 MON, remaining is 6 MON (< min 10 MON reserve)
    // Even if Qwen highly recommends it:
    const check = econ.policy.validateTransaction(testAgent.id, 178, 'DATA_SUBSCRIPTION');

    expect(check.allowed).toBe(false);
    expect(check.violatesRule).toBe('MIN_RETAINED_BALANCE');
    expect(check.reason).toContain('floor of 10 MON');
  });

  it('correctly incorporates Nansen counterparty intelligence and Envio history into EconomicContext', () => {
    const mockNansenIntel = {
      targetAddress: '0x777286A645c110E663B514571A15C198547A7',
      targetRole: 'RECOVERY_TARGET' as const,
      intelligence: {
        address: '0x777286A645c110E663B514571A15C198547A7',
        chain: 'monad',
        labels: [{ label: 'High Volume Consumer', category: 'activity' }],
        balances: [{ symbol: 'MON', tokenSymbol: 'MON', balance: 312.45, balanceFormatted: 312.45, balanceUsd: 1249.8, chain: 'monad' }],
        recentTransactions: [],
        counterparties: [],
        relatedWallets: [],
        fetchedAt: new Date().toISOString(),
        expiresAt: Date.now() + 600000,
        source: 'nansen' as const,
        available: true,
      },
      evaluatedAt: Date.now(),
    };

    const mockEnvioHistory = [
      { type: 'SWEEP_COMPLETED', amountMon: 4.60, timestamp: Date.now() - 3600000, status: 'SETTLED' },
      { type: 'PURCHASE_COMPLETED', amountMon: 12.0, timestamp: Date.now() - 7200000, status: 'SETTLED' },
    ];

    const testObject: EconomicObject = {
      id: 'OBJ-API-002',
      owner: testAgent.id,
      type: 'API_LICENSE',
      denomination: 'units',
      quantity: 37,
      valueMon: 7.29,
      expiryTimestamp: Date.now() + 32400000,
      transferable: true,
      status: 'STRANDED',
      metadataHash: '0xabc',
      createdAt: Date.now() - 64800000,
      allocationQuantity: 37,
      consumedQuantity: 0,
      utilizationRatePerHour: 0.18,
      projectedRequirement: 0,
    };

    const testPlan: RecoveryPlan = {
      id: 'PLAN-001',
      objectId: testObject.id,
      ownerId: testAgent.id,
      detectedAt: Date.now() - 10000,
      strandedQuantity: 37,
      strandedValueMon: 7.29,
      recommendedStrategy: 'TRANSFER',
      confidenceScore: 0.91,
      reason: 'Idle API units with high recovery probability',
      expectedRecoveryMon: 4.60,
      status: 'PROPOSED',
      calculations: {
        keepValue: 1.80,
        sellValue: 4.20,
        transferValue: 4.60,
        refundValue: 3.70,
      },
    };

    const recoveryContext = EconomicContextBuilder.forRecovery({
      agent: testAgent,
      object: testObject,
      plan: testPlan,
      counterpartyIntel: mockNansenIntel,
      historySnippet: mockEnvioHistory,
    });

    expect(recoveryContext.recoveryCandidate?.objectId).toBe('OBJ-API-002');
    expect(recoveryContext.counterpartyIntelligence?.targetAddress).toBe('0x777286A645c110E663B514571A15C198547A7');
    expect(recoveryContext.economicHistorySnippet?.length).toBe(2);
    expect(recoveryContext.treasuryBalanceMon).toBe(184);
  });
});

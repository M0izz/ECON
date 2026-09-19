import { describe, it, expect, beforeEach } from 'vitest';
import { ECON } from '../src/sdk/client';
import { EconomicStore } from '../src/sdk/store';
import { EventBus } from '../src/sdk/events';
import { AGENT_TEMPLATES } from '../src/sdk/agent/templates';

describe('Agent Layer & Dual-Path Agent Builder', () => {
  let econ: ECON;

  beforeEach(() => {
    econ = new ECON({
      store: new EconomicStore(),
      eventBus: new EventBus(),
    });
  });

  it('creates native ECON agent with customized capabilities and policy bounds', () => {
    const agent = econ.createNativeAgent({
      id: 'NativeAgent-01',
      name: 'Geospatial Research Drone',
      purpose: 'Autonomous survey and satellite data synthesis',
      modelProvider: 'GEMINI',
      initialBalanceMon: 120,
      policy: {
        maxPerTransaction: 15,
        minRetainedBalance: 20,
      },
      capabilities: {
        canPurchaseServices: true,
        canSellAssets: false,
      },
    });

    expect(agent.id).toBe('NativeAgent-01');
    expect(agent.origin).toBe('NATIVE');
    expect(agent.balanceMon).toBe(120);
    expect(agent.policy.maxPerTransaction).toBe(15);
    expect(agent.capabilities?.canPurchaseServices).toBe(true);
    expect(agent.capabilities?.canSellAssets).toBe(false);

    // Stored in economic store
    expect(econ.store.getAgent('NativeAgent-01')).toBeDefined();
  });

  it('connects external agent (Bring Your Own Agent path)', () => {
    const externalAgent = econ.connectExternalAgent({
      id: 'external-python-agent-7',
      name: 'Custom Python LangGraph Agent',
      walletAddress: '0x9999888877776666555544443333222211110000',
      initialBalanceMon: 75,
      purpose: 'Trading agent running on AWS EC2',
      policy: {
        maxPerTransaction: 25,
      },
    });

    expect(externalAgent.id).toBe('external-python-agent-7');
    expect(externalAgent.origin).toBe('EXTERNAL');
    expect(externalAgent.balanceMon).toBe(75);
    expect(externalAgent.walletAddress).toBe('0x9999...0000');
  });

  it('enforces capability permissions in AgentRuntime before calling policy engine', async () => {
    // Create restricted agent that CANNOT purchase
    const restricted = econ.createNativeAgent({
      id: 'ReadOnlyAgent',
      name: 'Read Only Watcher',
      initialBalanceMon: 100,
      capabilities: {
        canPurchaseServices: false,
      },
    });

    const runtime = econ.getRuntime(restricted.id);

    // Register a seller and object
    econ.identity.registerAgent('Seller', 'Provider', '0x1', '0x1', 50);
    econ.store.setObject({
      id: 'OBJ-TEST',
      owner: 'Seller',
      type: 'DATA_SUBSCRIPTION',
      denomination: 'Tiles',
      quantity: 10,
      valueMon: 10,
      expiryTimestamp: Date.now() + 86400000,
      transferable: true,
      status: 'ACTIVE',
      metadataHash: '0x1',
      createdAt: Date.now(),
      allocationQuantity: 10,
      consumedQuantity: 0,
      utilizationRatePerHour: 0,
      projectedRequirement: 0,
    });

    const result = await runtime.dispatchAction({
      type: 'PURCHASE',
      params: {
        sellerId: 'Seller',
        objectId: 'OBJ-TEST',
        amountMon: 10,
        memo: 'Attempted unauthorized purchase',
      },
      reasoning: 'Model requested purchase',
    });

    expect(result.success).toBe(false);
    expect(result.blockedBy).toBe('CAPABILITIES');
    expect(result.error).toContain("lacks capability 'canPurchaseServices'");
  });

  it('validates curated agent templates', () => {
    expect(AGENT_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    const researchTmpl = AGENT_TEMPLATES.find((t) => t.id === 'TEMPLATE_RESEARCH')!;
    expect(researchTmpl.policy.maxPerTransaction).toBe(20);
    expect(researchTmpl.capabilities.canPurchaseServices).toBe(true);

    const computeTmpl = AGENT_TEMPLATES.find((t) => t.id === 'TEMPLATE_COMPUTE')!;
    expect(computeTmpl.capabilities.canSellAssets).toBe(true);
    expect(computeTmpl.capabilities.canPurchaseServices).toBe(false);
  });
});

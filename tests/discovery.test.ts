import { describe, it, expect, beforeEach } from 'vitest';
import { ECON } from '../src/sdk/client';
import { EconomicStore } from '../src/sdk/store';
import { EventBus } from '../src/sdk/events';

describe('DiscoveryRegistry', () => {
  let econ: ECON;

  beforeEach(() => {
    econ = new ECON({
      store: new EconomicStore(),
      eventBus: new EventBus(),
    });

    econ.discovery.registerService({
      id: 's1',
      providerId: 'p1',
      providerName: 'High-Res Geo',
      capability: 'satellite-imagery',
      description: 'Satellite optical feed',
      priceMon: 12,
      unit: 'per tile',
      latencyMs: 150,
      reputation: 98.5,
      availability: true,
      minSLA: 99.0,
    });

    econ.discovery.registerService({
      id: 's2',
      providerId: 'p2',
      providerName: 'Budget Sat',
      capability: 'satellite-imagery',
      description: 'Satellite optical feed budget',
      priceMon: 8,
      unit: 'per tile',
      latencyMs: 400,
      reputation: 92.0,
      availability: true,
      minSLA: 95.0,
    });

    econ.discovery.registerService({
      id: 's3',
      providerId: 'p3',
      providerName: 'Deep GPU',
      capability: 'gpu-cluster',
      description: 'H100 GPU compute',
      priceMon: 25,
      unit: 'per hr',
      latencyMs: 50,
      reputation: 99.0,
      availability: true,
      minSLA: 99.9,
    });
  });

  it('filters providers by capability and budget', () => {
    const results = econ.discovery.search({
      capability: 'satellite-imagery',
      budget: 10,
    });

    expect(results.length).toBe(1);
    expect(results[0].id).toBe('s2');
  });

  it('ranks multi-attribute results correctly', () => {
    const results = econ.discovery.search({
      capability: 'satellite-imagery',
      budget: 20,
    });

    expect(results.length).toBe(2);
    // Provider s1 has higher reputation (98.5 vs 92) and lower latency
    expect(results[0].id).toBe('s1');
  });
});

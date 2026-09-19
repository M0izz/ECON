import { describe, it, expect, beforeEach } from 'vitest';
import { ECON } from '../src/sdk/client';
import { seedInitialNetworkState } from '../src/demo/seed';
import { X402SatelliteServer } from '../src/integrations/x402/server';
import { X402Client } from '../src/integrations/x402/client';

describe('x402 (v2) Machine Micropayment Protocol Flow', () => {
  let econ: ECON;
  let server: X402SatelliteServer;
  let client: X402Client;

  beforeEach(() => {
    econ = new ECON();
    seedInitialNetworkState(econ);
    server = new X402SatelliteServer();
    const runtime = econ.getRuntime('ResearchAgent-42');
    client = new X402Client(runtime, econ.store, econ.policy, server);
  });

  it('handles 402 challenge, policy verification, and successful settlement retrieval', async () => {
    const initialAgent = econ.store.getAgent('ResearchAgent-42');
    const initialBalance = initialAgent!.balanceMon;

    // Direct server call without auth triggers 402
    const unauthResponse = server.handleGetScene('scene-mumbai-4k');
    expect(unauthResponse.status).toBe(402);
    if (unauthResponse.status === 402) {
      expect(unauthResponse.challenge.error).toBe('Payment Required');
      expect(unauthResponse.challenge.scheme).toBe('x402-v2');
      expect(unauthResponse.challenge.amountMon).toBe(0.5);
    }

    // Client executes full automated flow: challenge -> policy check -> settlement -> retrieval
    const result = await client.fetchSatelliteScene('scene-mumbai-4k');

    expect(result.success).toBe(true);
    expect(result.policyApproved).toBe(true);
    expect(result.amountPaidMon).toBe(0.5);
    expect(result.scene).toBeDefined();
    expect(result.scene?.sceneId).toBe('scene-mumbai-4k');
    expect(result.scene?.spectralBands).toContain('B02-Blue');

    // Verify payer balance decremented by 0.5 MON
    const updatedAgent = econ.store.getAgent('ResearchAgent-42');
    expect(updatedAgent!.balanceMon).toBe(initialBalance - 0.5);
  });

  it('rejects payment if policy limit is exceeded', async () => {
    // Set daily spending limit lower than resource price
    econ.policy.updatePolicy('ResearchAgent-42', {
      maxPerTransaction: 0.1,
      dailySpendingLimit: 0.1,
    });

    const result = await client.fetchSatelliteScene('scene-mumbai-4k');

    expect(result.success).toBe(false);
    expect(result.policyApproved).toBe(false);
    expect(result.error).toContain('rejected');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { ECON } from '../src/sdk/client';
import { seedInitialNetworkState } from '../src/demo/seed';
import { AutonomousResearchAgent } from '../src/demo/autonomousAgent';

describe('Autonomous Agent 13-Stage Master Economic Loop', () => {
  let econ: ECON;
  let agent: AutonomousResearchAgent;

  beforeEach(() => {
    econ = new ECON();
    seedInitialNetworkState(econ);
    agent = new AutonomousResearchAgent(econ);
  });

  it('executes all 13 stages sequentially with real tools and balance updates', async () => {
    const initialAgent = econ.store.getAgent(agent.agentId);
    expect(initialAgent).toBeDefined();
    const initialBalance = initialAgent!.balanceMon;

    const stageResults = await agent.runFullLoop();

    expect(stageResults).toHaveLength(13);

    // Stage 1: Identity & Bootstrap
    expect(stageResults[0].stageNumber).toBe(1);
    expect(stageResults[0].data.balance.balanceMon).toBe(initialBalance);

    // Stage 2: Policy Verification
    expect(stageResults[1].stageNumber).toBe(2);
    expect(stageResults[1].data.preCheck.allowed).toBe(true);

    // Stage 3: Discovery
    expect(stageResults[2].stageNumber).toBe(3);
    expect(stageResults[2].data.matchingServicesCount).toBeGreaterThan(0);

    // Stage 4: Selection
    expect(stageResults[3].stageNumber).toBe(4);
    expect(stageResults[3].data.quote.totalPriceMon).toBe(12);

    // Stage 5: Escrow Lock
    expect(stageResults[4].stageNumber).toBe(5);
    expect(stageResults[4].data.amountMon).toBe(12);
    // Escrow created decreased agent balance at Stage 5
    expect(stageResults[4].agentBalanceMon).toBe(initialBalance - 12);

    // Stage 6: Delivery
    expect(stageResults[5].stageNumber).toBe(6);
    expect(stageResults[5].data.status).toBe('DELIVERED');

    // Stage 7: Delivery Verification
    expect(stageResults[6].stageNumber).toBe(7);
    expect(stageResults[6].data.verified).toBe(true);

    // Stage 8: Settlement Release
    expect(stageResults[7].stageNumber).toBe(8);
    expect(stageResults[7].data.escrowId).toBeDefined();
    expect(stageResults[7].data.status).toBe('RELEASED');

    // Stage 9: Mint Object
    expect(stageResults[8].stageNumber).toBe(9);
    const mintedObj = econ.store.getObject(stageResults[8].data.objectId);
    expect(mintedObj).toBeDefined();
    expect(mintedObj!.id).toBe(stageResults[8].data.objectId);

    // Stage 10: Obligation Tracking
    expect(stageResults[9].stageNumber).toBe(10);
    const ob = econ.store.getObligation(stageResults[9].data.obligationId);
    expect(ob).toBeDefined();

    // Stage 11: Stranded Detection
    expect(stageResults[10].stageNumber).toBe(11);
    expect(stageResults[10].data.planFound).toBe(true);

    // Stage 12: Recovery Strategy Formulation
    expect(stageResults[11].stageNumber).toBe(12);
    expect(stageResults[11].data.expectedRecovery).toBeGreaterThan(0);

    // Stage 13: Value Recovery Execution
    expect(stageResults[12].stageNumber).toBe(13);
    expect(stageResults[12].data.status).toBe('EXECUTED');

    // Final agent balance should have recovered value added back!
    const finalAgent = econ.store.getAgent(agent.agentId);
    expect(finalAgent!.balanceMon).toBeGreaterThan(initialBalance - 12);
  });
});

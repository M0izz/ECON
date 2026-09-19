import { describe, it, expect, beforeEach } from 'vitest';
import { ECON } from '../src/sdk/client';
import { EconomicStore } from '../src/sdk/store';
import { EventBus } from '../src/sdk/events';

describe('IdentityRegistry', () => {
  let econ: ECON;

  beforeEach(() => {
    econ = new ECON({
      store: new EconomicStore(),
      eventBus: new EventBus(),
    });
  });

  it('registers a new autonomous agent with default policy and initial balance', () => {
    const agent = econ.identity.registerAgent(
      'Agent-Alpha',
      'Agent Alpha Research',
      '0x1111222233334444555566667777888899990000',
      '0x1111...0000',
      150,
      { maxPerTransaction: 25 }
    );

    expect(agent.id).toBe('Agent-Alpha');
    expect(agent.balanceMon).toBe(150);
    expect(agent.policy.maxPerTransaction).toBe(25);
    expect(agent.reputationScore).toBe(98.0);
    expect(agent.active).toBe(true);
  });

  it('rejects duplicate agent registration', () => {
    econ.identity.registerAgent('Agent-Dup', 'First', '0x1', '0x1', 100);
    expect(() => {
      econ.identity.registerAgent('Agent-Dup', 'Duplicate', '0x2', '0x2', 100);
    }).toThrow(/already registered/);
  });

  it('updates agent policy and reputation', () => {
    econ.identity.registerAgent('Agent-Beta', 'Beta', '0x1', '0x1', 100);
    econ.identity.updatePolicy('Agent-Beta', { maxPerTransaction: 40 });
    econ.identity.updateReputation('Agent-Beta', 99.5);

    const updated = econ.store.getAgent('Agent-Beta')!;
    expect(updated.policy.maxPerTransaction).toBe(40);
    expect(updated.reputationScore).toBe(99.5);
  });
});

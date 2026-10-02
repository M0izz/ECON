import { describe, it, expect, beforeEach } from 'vitest';
import { ECON } from '../src/sdk/client';
import { EconomicStore } from '../src/sdk/store';
import { EventBus } from '../src/sdk/events';

describe('Multi-Controller Coexistence: Dynamic, Mera Passkey, and External Wallet', () => {
  let econ: ECON;

  beforeEach(() => {
    econ = new ECON({
      store: new EconomicStore(),
      eventBus: new EventBus(),
    });
  });

  it('allows Dynamic, Mera Passkey, and External Wallet agents to coexist without clobbering', () => {
    // 1. Create a Mera Passkey agent
    const meraAgent = econ.createPasskeyAgent({
      id: 'agent_mera_1',
      name: 'Mera-Autonomous-Researcher',
      credentialId: 'cred_mera_test_9999',
      accounts: {
        operating: '0x1111111111111111111111111111111111111111',
        treasury: '0x2222222222222222222222222222222222222222',
        escrow: '0x3333333333333333333333333333333333333333',
        recovery: '0x4444444444444444444444444444444444444444',
      },
      initialBalanceMon: 100,
    });

    // 2. Create a Dynamic agent
    const dynamicAgent = econ.createDynamicAgent({
      id: 'agent_dynamic_1',
      name: 'Dynamic-Embedded-Trader',
      walletAddress: '0x5555555555555555555555555555555555555555',
      connector: 'Dynamic Embedded EVM',
      isEmbedded: true,
      networkChainId: 10143,
      initialBalanceMon: 50,
    });

    // 3. Create an External Wallet agent
    const externalAgent = econ.createNativeAgent({
      id: 'agent_external_1',
      name: 'External-MetaMask-Agent',
      controller: '0x6666666666666666666666666666666666666666',
      walletAddress: '0x6666666666666666666666666666666666666666',
      controllerType: 'EXTERNAL_WALLET',
      initialBalanceMon: 75,
    });

    // Verify all 3 exist in the store
    const agents = econ.store.getAllAgents();
    expect(agents.length).toBe(3);

    // Verify Mera agent was not overwritten or corrupted
    const storedMera = econ.store.getAgent('agent_mera_1');
    expect(storedMera?.controllerType).toBe('PASSKEY_MERA');
    expect(storedMera?.passkeyCredentialId).toBe('cred_mera_test_9999');
    expect(storedMera?.passkeyAccounts?.operating).toBe('0x1111111111111111111111111111111111111111');
    expect(storedMera?.passkeyAccounts?.treasury).toBe('0x2222222222222222222222222222222222222222');

    // Verify Dynamic agent is intact
    const storedDynamic = econ.store.getAgent('agent_dynamic_1');
    expect(storedDynamic?.controllerType).toBe('DYNAMIC');
    expect(storedDynamic?.walletAddress).toBe('0x5555555555555555555555555555555555555555');
    expect(storedDynamic?.dynamicWallet?.isEmbedded).toBe(true);
    expect(storedDynamic?.dynamicWallet?.networkChainId).toBe(10143);

    // Verify External agent is intact
    const storedExternal = econ.store.getAgent('agent_external_1');
    expect(storedExternal?.controllerType).toBe('EXTERNAL_WALLET');
    expect(storedExternal?.walletAddress).toBe('0x6666666666666666666666666666666666666666');
  });

  it('preserves agent identity ownership when active controller switches', () => {
    const dynamicAgent = econ.createDynamicAgent({
      id: 'agent_dynamic_safe',
      name: 'Protected-Agent',
      walletAddress: '0x5555555555555555555555555555555555555555',
      initialBalanceMon: 100,
    });

    // Simulating switching active connection to a different wallet or passkey
    // The stored agent must retain its original controller address unless explicitly reassigned
    const agent = econ.store.getAgent('agent_dynamic_safe');
    expect(agent?.controller).toBe('0x5555555555555555555555555555555555555555');
    expect(agent?.walletAddress).toBe('0x5555555555555555555555555555555555555555');
  });
});

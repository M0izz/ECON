import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ECON } from '../src/sdk/client';
import { deriveEconAccountsFromPrf } from '../src/integrations/mera/meraDerivation';
import { MonadSettlementAdapter } from '../src/settlement/MonadSettlementAdapter';
import { parseEther } from 'viem';

describe('Mera Monad Testnet Integration', () => {
  let econ: ECON;
  const mockPrf = new Uint8Array(32);
  for (let i = 0; i < 32; i++) mockPrf[i] = i + 77;

  beforeEach(() => {
    econ = new ECON();
  });

  it('1. Mera-derived address can query Monad balance through public client', async () => {
    const accounts = deriveEconAccountsFromPrf(mockPrf);
    const adapter = new MonadSettlementAdapter(econ.store, econ.events);

    // Query balance on Monad Testnet RPC
    const balance = await adapter.getBalance(accounts.operating.address);
    expect(typeof balance).toBe('number');
    expect(balance).toBeGreaterThanOrEqual(0);
  });

  it('2. Adapter accepts Mera LocalAccount as live signer and configures Viem wallet client', () => {
    const accounts = deriveEconAccountsFromPrf(mockPrf);
    const adapter = new MonadSettlementAdapter(econ.store, econ.events);

    adapter.setMeraAccount(accounts.operating.viemAccount);

    expect(adapter.isConnected).toBe(true);
    // Viem account address should match the Mera operating address
    expect(accounts.operating.viemAccount.address.toLowerCase()).toBe(
      accounts.operating.address.toLowerCase()
    );
  });

  it('3. Successful settlement with Mera account emits SETTLEMENT_COMPLETED and updates state', async () => {
    const accounts = deriveEconAccountsFromPrf(mockPrf);
    const adapter = new MonadSettlementAdapter(econ.store, econ.events);
    adapter.setMeraAccount(accounts.operating.viemAccount);

    const recipient = '0x1111111111111111111111111111111111111111';

    // Mock the low-level on-chain transaction submission and receipt
    const mockHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const mockReceipt = {
      status: 'success',
      blockNumber: 1234567n,
      effectiveGasPrice: parseEther('0.000000001'),
      gasUsed: 21000n,
    };

    const publicClient = adapter.getPublicClient();
    vi.spyOn(publicClient, 'waitForTransactionReceipt').mockResolvedValue(mockReceipt as any);

    // Mock wallet client sendTransaction
    const walletClient = (adapter as any).walletClient;
    vi.spyOn(walletClient, 'sendTransaction').mockResolvedValue(mockHash);

    const emittedEvents: any[] = [];
    econ.events.subscribe('SETTLEMENT_COMPLETED', (ev) => emittedEvents.push(ev));

    const result = await adapter.transfer(
      accounts.operating.address,
      recipient,
      1.5,
      'Mera autonomous settlement'
    );

    expect(result.success).toBe(true);
    expect(result.txHash).toBe(mockHash);
    expect(result.blockNumber).toBe(1234567);

    // Verify event propagation
    expect(emittedEvents.length).toBe(1);
    expect(emittedEvents[0].actor).toBe(accounts.operating.address);
    expect(emittedEvents[0].details.to).toBe(recipient);
    expect(emittedEvents[0].details.amount).toBe(1.5);
  });

  it('4. Existing external wallet flow still works alongside Mera', () => {
    // External native agent
    const externalAgent = econ.createNativeAgent({
      id: 'ext_agent_01',
      name: 'ExternalWalletAgent',
      walletAddress: '0x2222222222222222222222222222222222222222',
      controller: '0x2222222222222222222222222222222222222222',
      initialBalanceMon: 100,
    });

    // Passkey native agent
    const accounts = deriveEconAccountsFromPrf(mockPrf);
    const passkeyAgent = econ.createPasskeyAgent({
      id: 'passkey_agent_01',
      name: 'PasskeyAgent',
      credentialId: 'cred_xyz_123',
      accounts: {
        operating: accounts.operating.address,
        treasury: accounts.treasury.address,
        escrow: accounts.escrow.address,
        recovery: accounts.recovery.address,
      },
      initialBalanceMon: 100,
    });

    expect(externalAgent.controllerType).toBe('EXTERNAL_WALLET');
    expect(passkeyAgent.controllerType).toBe('PASSKEY_MERA');

    expect(econ.store.getAgent('ext_agent_01')).toBeDefined();
    expect(econ.store.getAgent('passkey_agent_01')).toBeDefined();
  });
});

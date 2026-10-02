import { describe, it, expect, beforeEach } from 'vitest';
import { deriveEconAccountsFromPrf } from '../src/integrations/mera/meraDerivation';
import { MeraSessionManager } from '../src/integrations/mera/meraSession';
import { ECONPasskeyIdentity } from '../src/integrations/mera/meraTypes';

describe('Mera Session Management & Security', () => {
  let sessionManager: MeraSessionManager;
  let identity: ECONPasskeyIdentity;

  const mockPrfOutput = new Uint8Array(32);
  for (let i = 0; i < 32; i++) mockPrfOutput[i] = i + 42;

  beforeEach(() => {
    sessionManager = new MeraSessionManager();
    const accounts = deriveEconAccountsFromPrf(mockPrfOutput);
    identity = {
      credentialId: 'test_cred_base64url_12345',
      accounts,
      createdAt: Date.now(),
    };
  });

  it('1. Active session can sign digests and messages', async () => {
    sessionManager.setActiveIdentity(identity);
    const operatingAccount = sessionManager.getViemAccount('operating')!;
    expect(operatingAccount).toBeDefined();

    const signature = await operatingAccount.signMessage({ message: 'ECON Policy Intent' });
    expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
  });

  it('2. Ended session cannot sign and throws SESSION_ENDED', async () => {
    sessionManager.setActiveIdentity(identity);
    const operatingAccount = sessionManager.getAccount('operating')!;

    // Explicitly end the underlying Mera signing session
    operatingAccount.session.end();

    await expect(
      operatingAccount.viemAccount.signMessage({ message: 'Unauthorized intent' })
    ).rejects.toThrow();

    // Verify error code is SESSION_ENDED
    try {
      await operatingAccount.viemAccount.signMessage({ message: 'Unauthorized intent' });
    } catch (err: any) {
      expect(err.code).toBe('SESSION_ENDED');
    }
  });

  it('3. Disconnect clears active session state and ends all role sessions', async () => {
    sessionManager.setActiveIdentity(identity);
    expect(sessionManager.isConnected()).toBe(true);

    const accounts = [
      sessionManager.getAccount('operating')!,
      sessionManager.getAccount('treasury')!,
      sessionManager.getAccount('escrow')!,
      sessionManager.getAccount('recovery')!,
    ];

    sessionManager.disconnect();

    expect(sessionManager.isConnected()).toBe(false);
    expect(sessionManager.getActiveIdentity()).toBeNull();
    expect(sessionManager.getAccount('operating')).toBeNull();

    // Verify all 4 sessions are ended
    for (const acc of accounts) {
      await expect(acc.viemAccount.signMessage({ message: 'Test' })).rejects.toThrow();
    }
  });

  it('4. Public metadata never exposes PRF output or private keys', () => {
    sessionManager.setActiveIdentity(identity);
    const meta = sessionManager.getPublicMetadata()!;

    expect(meta).toBeDefined();
    expect(meta.credentialId).toBe('test_cred_base64url_12345');
    expect(meta.addresses.operating).toBe(identity.accounts.operating.address);
    expect(meta.addresses.treasury).toBe(identity.accounts.treasury.address);
    expect(meta.addresses.escrow).toBe(identity.accounts.escrow.address);
    expect(meta.addresses.recovery).toBe(identity.accounts.recovery.address);

    // Verify absence of sensitive properties
    expect((meta as any).prfOutput).toBeUndefined();
    expect((meta as any).privateKey).toBeUndefined();
    expect((meta as any).secret).toBeUndefined();
    expect((meta as any).seed).toBeUndefined();
  });

  it('5. Session subscriber notifications fire on set and disconnect', () => {
    let notifiedState: any = null;
    let callCount = 0;

    const unsub = sessionManager.subscribe((id) => {
      notifiedState = id;
      callCount++;
    });

    sessionManager.setActiveIdentity(identity);
    expect(callCount).toBe(1);
    expect(notifiedState).toBe(identity);

    sessionManager.disconnect();
    expect(callCount).toBe(2);
    expect(notifiedState).toBeNull();

    unsub();
  });
});

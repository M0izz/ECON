import { describe, it, expect } from 'vitest';
import { MeraClient } from '../src/integrations/mera/meraClient';
import { MeraSessionManager } from '../src/integrations/mera/meraSession';
import { MeraError } from '@category-labs/mera';

describe('Mera Client & UI Error Normalization', () => {
  const client = new MeraClient(new MeraSessionManager());

  it('1. PRF_UNAVAILABLE maps to helpful provider guidance', () => {
    const error = new MeraError('PRF_UNAVAILABLE', 'Authenticator returned no PRF output');
    const message = client.normalizeError(error);

    expect(message).toContain('Your current passkey provider does not support the required WebAuthn PRF security feature');
    expect(message).toContain('Chrome, Brave, 1Password, or YubiKey');
    // Verify no internal stack traces or raw keys leaked
    expect(message).not.toContain('stack');
  });

  it('2. PASSKEY_OPERATION_FAILED maps to user-friendly retry message', () => {
    const error = new MeraError('PASSKEY_OPERATION_FAILED', 'WebAuthn cancelled');
    const message = client.normalizeError(error);

    expect(message).toBe('Passkey verification was cancelled or failed. Please try again.');
  });

  it('3. CRYPTO_UNAVAILABLE maps to HTTPS/secure context message', () => {
    const error = new MeraError('CRYPTO_UNAVAILABLE', 'Web Crypto unavailable');
    const message = client.normalizeError(error);

    expect(message).toBe('Passkey accounts require a secure browser context. Use HTTPS or localhost.');
  });

  it('4. SESSION_ENDED maps to session expired message', () => {
    const error = new MeraError('SESSION_ENDED', 'Signing after session.end()');
    const message = client.normalizeError(error);

    expect(message).toBe('Your passkey session has expired. Authenticate again to continue.');
  });

  it('5. Mock WebAuthnClient creates identity and reproduces identical accounts on sign-in', async () => {
    const mockFixedPrf = new Uint8Array(32);
    for (let i = 0; i < 32; i++) mockFixedPrf[i] = (i * 7 + 3) % 256;

    const mockWebAuthnClient = {
      createCredential: async () => ({
        credentialId: new Uint8Array([1, 2, 3, 4, 5]),
        prfEnabled: true,
        prfOutput: mockFixedPrf,
        transports: ['internal'] as const,
      }),
      getCredential: async () => ({
        credentialId: new Uint8Array([1, 2, 3, 4, 5]),
        prfOutput: mockFixedPrf,
      }),
    };

    const sessionManager = new MeraSessionManager();
    const testClient = new MeraClient(sessionManager);

    // 1. Create with passkey
    const created = await testClient.createEconomicIdentity({
      agentName: 'ResearchAgent-42',
      webAuthnClient: mockWebAuthnClient as any,
    });

    expect(created.identity).toBeDefined();
    expect(created.publicMetadata.addresses.operating).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(created.publicMetadata.addresses.treasury).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(created.publicMetadata.addresses.escrow).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(created.publicMetadata.addresses.recovery).toMatch(/^0x[a-fA-F0-9]{40}$/);

    const firstOperatingAddress = created.publicMetadata.addresses.operating;
    const firstTreasuryAddress = created.publicMetadata.addresses.treasury;

    // 2. Disconnect session
    sessionManager.disconnect();
    expect(sessionManager.isConnected()).toBe(false);

    // 3. Sign in with the same passkey (Cross-device / Returning user flow)
    const signedIn = await testClient.signInWithPasskey({
      webAuthnClient: mockWebAuthnClient as any,
    });

    expect(signedIn.publicMetadata.addresses.operating).toBe(firstOperatingAddress);
    expect(signedIn.publicMetadata.addresses.treasury).toBe(firstTreasuryAddress);
    expect(sessionManager.isConnected()).toBe(true);
  });
});

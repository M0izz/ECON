import { describe, it, expect } from 'vitest';
import { deriveEconAccountsFromPrf } from '../src/integrations/mera/meraDerivation';
import { ECON_KEY_ROLES, ECONKeyRole } from '../src/integrations/mera/meraTypes';

describe('Mera One Passkey, Many Keys — Derivation Architecture', () => {
  // Deterministic 32-byte mock PRF output
  const mockPrfOutput1 = new Uint8Array(32);
  for (let i = 0; i < 32; i++) mockPrfOutput1[i] = i + 1;

  const mockPrfOutput2 = new Uint8Array(32);
  for (let i = 0; i < 32; i++) mockPrfOutput2[i] = (i + 1) * 3;

  it('1. Same PRF root + same purpose = identical address', () => {
    const runA = deriveEconAccountsFromPrf(mockPrfOutput1);
    const runB = deriveEconAccountsFromPrf(mockPrfOutput1);

    expect(runA.operating.address).toBe(runB.operating.address);
    expect(runA.treasury.address).toBe(runB.treasury.address);
    expect(runA.escrow.address).toBe(runB.escrow.address);
    expect(runA.recovery.address).toBe(runB.recovery.address);
  });

  it('2. Same PRF root + different purpose = distinct addresses', () => {
    const accounts = deriveEconAccountsFromPrf(mockPrfOutput1);
    const addresses = [
      accounts.operating.address,
      accounts.treasury.address,
      accounts.escrow.address,
      accounts.recovery.address,
    ];

    const uniqueAddresses = new Set(addresses);
    expect(uniqueAddresses.size).toBe(4);
  });

  it('3. Same passkey across sign-in = same addresses (Reproducibility)', () => {
    // Simulating user returning on another day or device with the same passkey PRF output
    const registrationSession = deriveEconAccountsFromPrf(mockPrfOutput1);
    const returningSession = deriveEconAccountsFromPrf(mockPrfOutput1);

    for (const role of ECON_KEY_ROLES) {
      expect(registrationSession[role].address).toBe(returningSession[role].address);
      expect(registrationSession[role].accountIndex).toBe(returningSession[role].accountIndex);
    }
  });

  it('4. Operating ≠ Treasury', () => {
    const accounts = deriveEconAccountsFromPrf(mockPrfOutput1);
    expect(accounts.operating.address.toLowerCase()).not.toBe(
      accounts.treasury.address.toLowerCase()
    );
  });

  it('5. Treasury ≠ Escrow', () => {
    const accounts = deriveEconAccountsFromPrf(mockPrfOutput1);
    expect(accounts.treasury.address.toLowerCase()).not.toBe(
      accounts.escrow.address.toLowerCase()
    );
  });

  it('6. Escrow ≠ Recovery', () => {
    const accounts = deriveEconAccountsFromPrf(mockPrfOutput1);
    expect(accounts.escrow.address.toLowerCase()).not.toBe(
      accounts.recovery.address.toLowerCase()
    );
  });

  it('7. Different passkeys derive completely different accounts', () => {
    const passkeyA = deriveEconAccountsFromPrf(mockPrfOutput1);
    const passkeyB = deriveEconAccountsFromPrf(mockPrfOutput2);

    for (const role of ECON_KEY_ROLES) {
      expect(passkeyA[role].address.toLowerCase()).not.toBe(
        passkeyB[role].address.toLowerCase()
      );
    }
  });

  it('8. Validates valid 42-character EVM address formatting (EIP-55)', () => {
    const accounts = deriveEconAccountsFromPrf(mockPrfOutput1);
    for (const role of ECON_KEY_ROLES) {
      const addr = accounts[role].address;
      expect(addr).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(addr.length).toBe(42);
    }
  });

  it('9. Rejects invalid PRF outputs with proper error', () => {
    expect(() => deriveEconAccountsFromPrf(new Uint8Array(16))).toThrow(
      'Invalid PRF output: must be exactly 32 bytes.'
    );
    expect(() => deriveEconAccountsFromPrf(null as any)).toThrow();
  });
});

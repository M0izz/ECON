import {
  createPasskeyWithPrfOutput,
  getPasskeyPrfOutput,
  isMeraError,
  MeraError,
} from '@category-labs/mera';
import {
  CreatePasskeyIdentityOptions,
  SignInPasskeyOptions,
  ECONPasskeyIdentity,
  ECONPasskeyPublicMetadata,
} from './meraTypes';
import { deriveEconAccountsFromPrf } from './meraDerivation';
import { globalMeraSession, MeraSessionManager } from './meraSession';

function getRelyingPartyId(): string {
  if (typeof window !== 'undefined' && window.location.hostname) {
    return window.location.hostname;
  }
  return 'localhost';
}

/**
 * High-level client for creating and managing Mera passkey-derived Economic Identities.
 */
export class MeraClient {
  private sessionManager: MeraSessionManager;

  constructor(sessionManager: MeraSessionManager = globalMeraSession) {
    this.sessionManager = sessionManager;
  }

  /**
   * Prompts the user to register a new WebAuthn passkey with the PRF extension,
   * derives the 4 purpose-specific ECON accounts (operating, treasury, escrow, recovery),
   * and initializes an active in-memory signing session.
   */
  public async createEconomicIdentity(
    options: CreatePasskeyIdentityOptions
  ): Promise<{
    identity: ECONPasskeyIdentity;
    publicMetadata: ECONPasskeyPublicMetadata;
  }> {
    const rpId = options.rpId || getRelyingPartyId();
    const rpName = options.rpName || 'ECON Protocol';

    try {
      const result = await createPasskeyWithPrfOutput({
        rp: {
          id: rpId,
          name: rpName,
        },
        user: {
          name: options.agentName,
          displayName: options.displayName || options.agentName,
        },
        timeout: options.timeout,
        webAuthnClient: options.webAuthnClient,
      });

      // Deterministically derive 4 purpose-specific accounts from the PRF root
      const accounts = deriveEconAccountsFromPrf(result.prfOutput);

      const identity: ECONPasskeyIdentity = {
        credentialId: result.credentialId,
        transports: result.transports,
        accounts,
        createdAt: Date.now(),
      };

      this.sessionManager.setActiveIdentity(identity);
      const publicMetadata = this.sessionManager.getPublicMetadata()!;

      return { identity, publicMetadata };
    } catch (err) {
      throw new Error(this.normalizeError(err));
    }
  }

  /**
   * Prompts a returning user to authenticate with their existing passkey.
   * Reproduces the identical PRF output and re-derives the identical 4 ECON accounts.
   */
  public async signInWithPasskey(
    options: SignInPasskeyOptions = {}
  ): Promise<{
    identity: ECONPasskeyIdentity;
    publicMetadata: ECONPasskeyPublicMetadata;
  }> {
    const rpId = options.rpId || getRelyingPartyId();

    try {
      const result = await getPasskeyPrfOutput({
        rpId,
        credential: options.credentialId
          ? { credentialId: options.credentialId }
          : undefined,
        timeout: options.timeout,
        webAuthnClient: options.webAuthnClient,
      });

      // Re-derive the identical accounts from the evaluated PRF output
      const accounts = deriveEconAccountsFromPrf(result.prfOutput);

      const identity: ECONPasskeyIdentity = {
        credentialId: result.credentialId,
        accounts,
        createdAt: Date.now(),
      };

      this.sessionManager.setActiveIdentity(identity);
      const publicMetadata = this.sessionManager.getPublicMetadata()!;

      return { identity, publicMetadata };
    } catch (err) {
      throw new Error(this.normalizeError(err));
    }
  }

  /**
   * Translates technical WebAuthn / Mera errors into user-friendly ECON messages.
   * Ensures that raw PRF bytes, keys, and cryptographic stack traces are never exposed.
   */
  public normalizeError(error: unknown): string {
    if (isMeraError(error)) {
      switch (error.code) {
        case 'PRF_UNAVAILABLE':
          return 'Your current passkey provider does not support the required WebAuthn PRF security feature. Try a supported passkey provider (Chrome, Brave, 1Password, or YubiKey) or use an external wallet.';
        case 'PASSKEY_OPERATION_FAILED':
          return 'Passkey verification was cancelled or failed. Please try again.';
        case 'CRYPTO_UNAVAILABLE':
          return 'Passkey accounts require a secure browser context. Use HTTPS or localhost.';
        case 'SESSION_ENDED':
          return 'Your passkey session has expired. Authenticate again to continue.';
        case 'INPUT_INVALID':
          return 'Invalid passkey credential input.';
        default:
          return `Passkey authentication encountered an error (${error.code}).`;
      }
    }

    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('user cancelled') || msg.includes('notallowederror')) {
        return 'Passkey ceremony was cancelled by the user.';
      }
      if (msg.includes('securityerror')) {
        return 'Passkey accounts require a secure context (HTTPS or localhost).';
      }
      return error.message;
    }

    return 'An unexpected passkey error occurred. Please try again or use an external wallet.';
  }
}

export const defaultMeraClient = new MeraClient();

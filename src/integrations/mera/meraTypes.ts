import type { LocalAccount } from 'viem';
import type { Secp256k1SigningSession, PasskeyCredentialTransport } from '@category-labs/mera';

export type ECONKeyRole = 'operating' | 'treasury' | 'escrow' | 'recovery';

export const ECON_KEY_ROLES: readonly ECONKeyRole[] = [
  'operating',
  'treasury',
  'escrow',
  'recovery',
] as const;

export interface ECONPasskeyAccount {
  address: `0x${string}`;
  keyRole: ECONKeyRole;
  accountIndex: number;
  session: Secp256k1SigningSession;
  viemAccount: LocalAccount<'mera'>;
}

export interface ECONPasskeyIdentity {
  credentialId: string;
  transports?: readonly PasskeyCredentialTransport[];
  accounts: Record<ECONKeyRole, ECONPasskeyAccount>;
  createdAt: number;
}

/**
 * Safe public representation of an ECON Economic Identity controlled by Mera.
 * Contains ZERO secret bytes, ZERO PRF outputs, and ZERO private keys.
 */
export interface ECONPasskeyPublicMetadata {
  credentialId: string;
  transports?: readonly string[];
  addresses: Record<ECONKeyRole, `0x${string}`>;
  createdAt: number;
}

export interface CreatePasskeyIdentityOptions {
  agentName: string;
  displayName?: string;
  rpId?: string;
  rpName?: string;
  timeout?: number;
  webAuthnClient?: any;
}

export interface SignInPasskeyOptions {
  credentialId?: string;
  rpId?: string;
  timeout?: number;
  webAuthnClient?: any;
}

export type ECONMeraErrorCode =
  | 'PRF_UNAVAILABLE'
  | 'PASSKEY_OPERATION_FAILED'
  | 'CRYPTO_UNAVAILABLE'
  | 'SESSION_ENDED'
  | 'UNKNOWN_ERROR';

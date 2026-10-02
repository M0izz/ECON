import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import {
  createSecp256k1SigningSession,
  getEvmAddress,
} from '@category-labs/mera';
import { toViemAccount } from '@category-labs/mera/viem';
import {
  ECONKeyRole,
  ECONPasskeyAccount,
  ECON_KEY_ROLES,
} from './meraTypes';

const DERIVATION_SALT = new TextEncoder().encode('ECON_MERA_DERIVATION_V1');

const ROLE_INFO_MAP: Record<ECONKeyRole, { info: Uint8Array; index: number }> = {
  operating: {
    info: new TextEncoder().encode('ECON_OPERATING_ACCOUNT_V1'),
    index: 0,
  },
  treasury: {
    info: new TextEncoder().encode('ECON_TREASURY_ACCOUNT_V1'),
    index: 1,
  },
  escrow: {
    info: new TextEncoder().encode('ECON_ESCROW_ACCOUNT_V1'),
    index: 2,
  },
  recovery: {
    info: new TextEncoder().encode('ECON_RECOVERY_ACCOUNT_V1'),
    index: 3,
  },
};

// secp256k1 curve order n
const SECP256K1_N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');

function bytesToBigInt(bytes: Uint8Array): bigint {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return BigInt(`0x${hex}`);
}

/**
 * Deterministically derives 4 purpose-specific ECON accounts from a single Mera PRF output root.
 *
 * One Passkey -> Root PRF Secret -> HKDF-SHA256 ->
 *   - Operating Account (Role 0)
 *   - Treasury Account  (Role 1)
 *   - Escrow Account    (Role 2)
 *   - Recovery Account  (Role 3)
 *
 * Memory Safety: Derived private key buffers are zeroed immediately after
 * creating their respective Mera signing sessions.
 */
export function deriveEconAccountsFromPrf(
  prfOutput: Uint8Array
): Record<ECONKeyRole, ECONPasskeyAccount> {
  if (!prfOutput || prfOutput.length !== 32) {
    throw new Error('Invalid PRF output: must be exactly 32 bytes.');
  }

  const accounts: Partial<Record<ECONKeyRole, ECONPasskeyAccount>> = {};

  for (const role of ECON_KEY_ROLES) {
    const { info, index } = ROLE_INFO_MAP[role];

    let counter = 0;
    let keyScalar: bigint = 0n;
    let privateKeyBytes: Uint8Array = new Uint8Array(32);

    // Derive a valid 32-byte non-zero scalar strictly less than curve order n
    while (counter < 256) {
      const iterationInfo = counter === 0
        ? info
        : new Uint8Array([...info, counter]);

      privateKeyBytes = hkdf(sha256, prfOutput, DERIVATION_SALT, iterationInfo, 32);
      keyScalar = bytesToBigInt(privateKeyBytes);

      if (keyScalar > 0n && keyScalar < SECP256K1_N) {
        break;
      }
      counter++;
    }

    if (keyScalar === 0n || keyScalar >= SECP256K1_N) {
      throw new Error(`Failed to derive valid secp256k1 scalar for role: ${role}`);
    }

    // Instantiate a Mera Secp256k1SigningSession
    const session = createSecp256k1SigningSession({ privateKey: privateKeyBytes });

    // Wipe the raw private key bytes from memory immediately
    privateKeyBytes.fill(0);

    // Derive EVM address using Mera's EIP-55 checksum generator
    const address = getEvmAddress(session.publicKey) as `0x${string}`;

    // Adapt session to a Viem LocalAccount<'mera'>
    const viemAccount = toViemAccount(session);

    accounts[role] = {
      address,
      keyRole: role,
      accountIndex: index,
      session,
      viemAccount,
    };
  }

  return accounts as Record<ECONKeyRole, ECONPasskeyAccount>;
}

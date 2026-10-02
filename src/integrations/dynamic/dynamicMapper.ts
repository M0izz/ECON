import type { Address } from 'viem';
import { DynamicWalletDetails, DynamicEconomicIdentity } from './dynamicTypes';

/**
 * Normalizes an arbitrary address string into a standard lowercased 0x EVM address.
 */
export function normalizeEvmAddress(address: string): Address | null {
  if (!address || typeof address !== 'string') return null;
  const clean = address.trim().toLowerCase();
  if (/^0x[a-f0-9]{40}$/.test(clean)) {
    return clean as Address;
  }
  return null;
}

export function normalizeEVMAddress(address: string): Address {
  const norm = normalizeEvmAddress(address);
  if (!norm) {
    throw new Error(`Invalid EVM address: ${address}`);
  }
  return norm;
}

/**
 * Maps a Dynamic wallet into a safe public ECON Economic Identity representation.
 * GUARANTEE: Never extracts, handles, or stores private keys, seeds, or session secrets.
 */
export function mapDynamicWalletToIdentity(
  wallet: DynamicWalletDetails | any,
  agentId?: string,
  isEmbedded?: boolean
): DynamicEconomicIdentity {
  const rawAddr = wallet.address || '';
  const address = normalizeEvmAddress(rawAddr) || (rawAddr.toLowerCase() as Address);
  const connectorName = wallet.connectorName || wallet.connector?.name || 'Dynamic EVM';
  const embedded = isEmbedded !== undefined ? isEmbedded : Boolean(wallet.isEmbedded || wallet.isEmbeddedWallet);
  let walletType: 'embedded' | 'external' | 'social' = 'external';
  if (embedded) {
    walletType = 'embedded';
  } else if (connectorName.toLowerCase().includes('social') || wallet.email) {
    walletType = 'social';
  }

  const chainId = Number(wallet.chainId || wallet.chain || 10143);

  return {
    controllerAddress: address,
    walletAddress: address,
    provider: 'DYNAMIC',
    controlProvider: 'DYNAMIC',
    walletType,
    agentId,
    isEmbedded: embedded,
    connectorName,
    networkChainId: chainId,
    network: 'Monad Testnet',
    chainId: 10143,
    createdAt: Date.now(),
  };
}

/**
 * Truncates an EVM address for UI display.
 */
export function formatAddress(address: string, lead: number = 6, tail: number = 4): string {
  if (!address) return '';
  if (address.length <= lead + tail) return address;
  return `${address.slice(0, lead)}...${address.slice(-tail)}`;
}

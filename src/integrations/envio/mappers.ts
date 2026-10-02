import { MONAD_EXPLORER_BASE } from '../../contracts/addresses';
import { IndexedEconomicEvent, FormattedEconomicEvent } from './types';

/**
 * Converts Wei (string, bigint, or number) to MON as a standard floating point number.
 */
export function formatWeiToMon(value: string | bigint | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  try {
    const str = typeof value === 'bigint' ? value.toString() : String(value);
    const bn = BigInt(str);
    const whole = bn / 1000000000000000000n;
    const remainder = bn % 1000000000000000000n;
    const fraction = Number(remainder) / 1e18;
    return Number(whole) + fraction;
  } catch {
    return 0;
  }
}

/**
 * Formats a 0x hex address or hash for compact display.
 */
export function formatHash(hash: string, lead: number = 6, tail: number = 4): string {
  if (!hash) return '';
  if (hash.length <= lead + tail) return hash;
  return `${hash.slice(0, lead)}...${hash.slice(-tail)}`;
}

/**
 * Returns the Monad Testnet explorer URL for a given transaction hash.
 */
export function getExplorerTxUrl(txHash: string): string {
  if (!txHash) return MONAD_EXPLORER_BASE;
  const cleanHash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
  return `${MONAD_EXPLORER_BASE}/tx/${cleanHash}`;
}

/**
 * Returns the Monad Testnet explorer URL for a given address.
 */
export function getExplorerAddressUrl(address: string): string {
  if (!address) return MONAD_EXPLORER_BASE;
  const cleanAddress = address.startsWith('0x') ? address : `0x${address}`;
  return `${MONAD_EXPLORER_BASE}/address/${cleanAddress}`;
}

/**
 * Formats a block timestamp (in seconds or ms) to a human-readable relative time string.
 */
export function formatRelativeTime(timestampSecondsOrMs: number | string | bigint): string {
  if (!timestampSecondsOrMs) return 'just now';
  let ts = Number(timestampSecondsOrMs);
  // If timestamp is in seconds, convert to ms
  if (ts < 100000000000) {
    ts *= 1000;
  }

  const now = Date.now();
  const diffSec = Math.floor((now - ts) / 1000);

  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Maps an indexed raw Envio event into a strongly-typed, display-ready FormattedEconomicEvent.
 */
export function mapIndexedEventToFormatted(e: IndexedEconomicEvent): FormattedEconomicEvent {
  const tsSec = Number(e.timestamp);
  const tsMs = tsSec > 100000000000 ? tsSec : tsSec * 1000;
  const date = new Date(tsMs);

  return {
    id: e.id,
    type: e.type,
    actor: e.actor,
    actorShort: formatHash(e.actor, 8, 6),
    counterparty: e.counterparty || null,
    counterpartyShort: e.counterparty ? formatHash(e.counterparty, 8, 6) : null,
    amountMon: formatWeiToMon(e.amount),
    summary: e.summary,
    contractAddress: e.contractAddress,
    txHash: e.txHash,
    txHashShort: formatHash(e.txHash, 10, 8),
    blockNumber: Number(e.blockNumber),
    timestamp: tsMs,
    relativeTime: formatRelativeTime(tsSec),
    exactTime: date.toLocaleTimeString(),
    explorerUrl: getExplorerTxUrl(e.txHash),
    isEnvioIndexed: true,
  };
}

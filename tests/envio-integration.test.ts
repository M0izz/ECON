import { describe, it, expect } from 'vitest';
import {
  formatWeiToMon,
  formatHash,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  formatRelativeTime,
  mapIndexedEventToFormatted,
} from '../src/integrations/envio/mappers';
import { IndexedEconomicEvent } from '../src/integrations/envio/types';
import { EnvioIndexerClient } from '../src/integrations/envio/client';

describe('Envio HyperIndex Mappers & Data Integrity Tests', () => {
  it('formatWeiToMon converts wei strings and bigints accurately', () => {
    expect(formatWeiToMon('1000000000000000000')).toBe(1);
    expect(formatWeiToMon(1000000000000000000n)).toBe(1);
    expect(formatWeiToMon('4600000000000000000')).toBe(4.6);
    expect(formatWeiToMon('78000000000000000')).toBe(0.078);
    expect(formatWeiToMon(0)).toBe(0);
    expect(formatWeiToMon(null)).toBe(0);
    expect(formatWeiToMon(undefined)).toBe(0);
    expect(formatWeiToMon('')).toBe(0);
    expect(formatWeiToMon('invalid')).toBe(0);
  });

  it('formatHash shortens addresses and transaction hashes correctly', () => {
    const address = '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720';
    expect(formatHash(address, 6, 4)).toBe('0xa0Ee...9720');
    expect(formatHash(address, 8, 6)).toBe('0xa0Ee7A...a79720');

    const short = '0x123';
    expect(formatHash(short, 6, 4)).toBe('0x123');
    expect(formatHash('')).toBe('');
  });

  it('getExplorerTxUrl constructs verified Monad Testnet explorer URL', () => {
    const tx = '0xabc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    expect(getExplorerTxUrl(tx)).toBe(`https://testnet.monadexplorer.com/tx/${tx}`);

    // If missing 0x prefix, prepends 0x
    expect(getExplorerTxUrl('abc1234')).toBe('https://testnet.monadexplorer.com/tx/0xabc1234');
  });

  it('getExplorerAddressUrl constructs verified Monad Testnet address URL', () => {
    const addr = '0x8004A818b43A4F469612C57cEC58c9735D1e1234';
    expect(getExplorerAddressUrl(addr)).toBe(`https://testnet.monadexplorer.com/address/${addr}`);
  });

  it('formatRelativeTime formats seconds and ms gracefully', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    expect(formatRelativeTime(nowSec)).toBe('just now');
    expect(formatRelativeTime(nowSec - 30)).toBe('30s ago');
    expect(formatRelativeTime(nowSec - 120)).toBe('2m ago');
    expect(formatRelativeTime(nowSec - 7200)).toBe('2h ago');
    expect(formatRelativeTime(nowSec - 86400 * 3)).toBe('3d ago');
    expect(formatRelativeTime(0)).toBe('just now');
  });

  it('mapIndexedEventToFormatted preserves exact transaction hash and block number', () => {
    const raw: IndexedEconomicEvent = {
      id: '0xtx1_0',
      type: 'ESCROW_RELEASED',
      actor: '0xBuyer000000000000000000000000000000000001',
      counterparty: '0xSeller00000000000000000000000000000000002',
      amount: '12000000000000000000', // 12 MON
      summary: 'Escrow released to seller',
      contractAddress: '0x62B9D90e964C108779951664c39832B6F9A27F03',
      txHash: '0x9999999999999999999999999999999999999999999999999999999999999999',
      blockNumber: '12345678',
      timestamp: '1735689600',
      relatedEscrowId: '0xescrow1',
    };

    const formatted = mapIndexedEventToFormatted(raw);
    expect(formatted.id).toBe(raw.id);
    expect(formatted.type).toBe('ESCROW_RELEASED');
    expect(formatted.amountMon).toBe(12);
    expect(formatted.txHash).toBe('0x9999999999999999999999999999999999999999999999999999999999999999');
    expect(formatted.blockNumber).toBe(12345678);
    expect(formatted.isEnvioIndexed).toBe(true);
    expect(formatted.explorerUrl).toContain('0x9999999999999999999999999999999999999999999999999999999999999999');
  });

  it('No Fake Data Rule: Envio client fails gracefully to empty state without fabricating hashes', async () => {
    // Point to non-existent endpoint to simulate network down
    const offlineClient = new EnvioIndexerClient({
      endpoint: 'http://127.0.0.1:9999/graphql-does-not-exist',
      timeoutMs: 100,
    });

    const res = await offlineClient.getRecentEconomicEvents();
    expect(res.isLive).toBe(false);
    expect(res.events).toEqual([]); // Must be strictly empty, never fake arrays
    expect(res.total).toBe(0);

    const mkt = await offlineClient.getMarketplaceActivity();
    expect(mkt.isLive).toBe(false);
    expect(mkt.listings).toEqual([]);
    expect(mkt.totalVolumeMon).toBe(0);

    const esc = await offlineClient.getEscrowActivity();
    expect(esc.isLive).toBe(false);
    expect(esc.escrows).toEqual([]);
    expect(esc.totalLockedMon).toBe(0);

    const rec = await offlineClient.getRecoveryHistory();
    expect(rec.isLive).toBe(false);
    expect(rec.recoveries).toEqual([]);
    expect(rec.totalRecoveredMon).toBe(0);
  });
});

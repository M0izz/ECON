import { describe, it, expect } from 'vitest';
import {
  mapNansenLabels,
  mapNansenBalances,
  mapNansenTransactions,
  mapNansenCounterparties,
  mapNansenRelatedWallets,
  mapToEconomicIntelligence,
} from '../src/integrations/nansen/nansenMapper';

describe('Nansen Mapper & Types', () => {
  const sampleAddress = '0x1842B6792A645c110E663B514571A15C198547A1';

  it('maps raw Nansen labels correctly without inventing data', () => {
    const rawData = {
      labels: [
        { label: 'Heavy DEX Trader', category: 'behavior', source: 'nansen' },
        { label: 'Monad Whale', category: 'entity', source: 'nansen' },
      ],
    };

    const mapped = mapNansenLabels(rawData);
    expect(mapped).toHaveLength(2);
    expect(mapped[0].label).toBe('Heavy DEX Trader');
    expect(mapped[0].category).toBe('behavior');
    expect(mapped[1].label).toBe('Monad Whale');
  });

  it('handles empty or missing raw labels gracefully', () => {
    expect(mapNansenLabels(null)).toEqual([]);
    expect(mapNansenLabels({})).toEqual([]);
    expect(mapNansenLabels({ data: [] })).toEqual([]);
  });

  it('maps current token balances correctly', () => {
    const rawData = {
      data: [
        { token: 'MON', symbol: 'MON', balance: '184.50', valueUsd: 1845.0, chain: 'monad' },
        { token: 'USDC', symbol: 'USDC', balance: '500.00', valueUsd: 500.0, chain: 'monad' },
      ],
    };

    const balances = mapNansenBalances(rawData);
    expect(balances).toHaveLength(2);
    expect(balances[0].symbol).toBe('MON');
    expect(balances[0].balanceFormatted).toBe(184.5);
    expect(balances[0].chain).toBe('monad');
    expect(balances[1].symbol).toBe('USDC');
  });

  it('handles missing balances without fabricating numbers', () => {
    const balances = mapNansenBalances({});
    expect(balances).toEqual([]);
  });

  it('maps transactions preserving hash, amounts, and dates', () => {
    const rawData = {
      transactions: [
        {
          hash: '0xabc123',
          timestamp: '2026-10-01T12:00:00Z',
          from: sampleAddress,
          to: '0x777286A645c110E663B514571A15C198547A7',
          value: '4.6',
          token: 'MON',
        },
      ],
    };

    const txs = mapNansenTransactions(rawData);
    expect(txs).toHaveLength(1);
    expect(txs[0].hash).toBe('0xabc123');
    expect(txs[0].from).toBe(sampleAddress);
    expect(txs[0].value).toBe(4.6);
  });

  it('maps counterparties and interaction frequencies', () => {
    const rawData = {
      counterparties: [
        {
          address: '0x777286A645c110E663B514571A15C198547A7',
          label: 'DataAgent Sentinel',
          interactionCount: 14,
          volumeUsd: 3200,
        },
      ],
    };

    const counterparties = mapNansenCounterparties(rawData);
    expect(counterparties).toHaveLength(1);
    expect(counterparties[0].address).toBe('0x777286A645c110E663B514571A15C198547A7');
    expect(counterparties[0].label).toBe('DataAgent Sentinel');
    expect(counterparties[0].interactionCount).toBe(14);
  });

  it('maps related wallets correctly', () => {
    const rawData = {
      related_wallets: [
        {
          address: '0x333286A645c110E663B514571A15C198547A3',
          confidence: 0.95,
          reason: 'Common funding source',
        },
      ],
    };

    const related = mapNansenRelatedWallets(rawData);
    expect(related).toHaveLength(1);
    expect(related[0].address).toBe('0x333286A645c110E663B514571A15C198547A3');
    expect(related[0].confidence).toBe(0.95);
  });

  it('aggregates all mapped components into unified EconomicIntelligence', () => {
    const rawData = {
      labels: [{ label: 'Verified Protocol', category: 'entity' }],
      data: [{ token: 'MON', symbol: 'MON', balance: '100', chain: 'monad' }],
      transactions: [{ hash: '0x123', value: '10', token: 'MON' }],
      counterparties: [{ address: '0x456', interactionCount: 2 }],
      related: [{ address: '0x789' }],
    };

    const intel = mapToEconomicIntelligence(sampleAddress, 'monad', rawData);

    expect(intel.address).toBe(sampleAddress.toLowerCase());
    expect(intel.chain).toBe('monad');
    expect(intel.source).toBe('nansen');
    expect(intel.available).toBe(true);
    expect(intel.labels).toHaveLength(1);
    expect(intel.balances).toHaveLength(1);
    expect(intel.recentTransactions).toHaveLength(1);
    expect(intel.counterparties).toHaveLength(1);
    expect(intel.relatedWallets).toHaveLength(1);
    expect(intel.expiresAt).toBeGreaterThan(Date.now());
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnvioIndexerClient } from '../src/integrations/envio/client';
import { formatWeiToMon, formatHash, getExplorerTxUrl } from '../src/integrations/envio/mappers';

describe('EnvioIndexerClient Unit Tests', () => {
  let client: EnvioIndexerClient;

  beforeEach(() => {
    client = new EnvioIndexerClient({
      endpoint: 'https://indexer.bigdevenergy.com/8004a81/v1/graphql',
      timeoutMs: 2000,
    });
    vi.restoreAllMocks();
  });

  it('initializes with specified endpoint and configuration', () => {
    expect(client.getEndpoint()).toBe('https://indexer.bigdevenergy.com/8004a81/v1/graphql');
    client.setEndpoint('http://localhost:8080/v1/graphql');
    expect(client.getEndpoint()).toBe('http://localhost:8080/v1/graphql');
  });

  it('getRecentEconomicEvents returns formatted events when GraphQL query succeeds', async () => {
    const testHash = '0xabc0000000000000000000000000000000000000000000000000000000000001';
    const mockGraphQLResponse = {
      EconomicEvent: [
        {
          id: '0xtx1_0',
          type: 'OBJECT_PURCHASED',
          actor: '0xBuyer11111111111111111111111111111111111',
          counterparty: '0xSeller2222222222222222222222222222222222',
          amount: '7800000000000000000', // 7.8 MON
          summary: 'Purchased compute unit',
          contractAddress: '0x49B3C8e7456dE1279A818D5D5d78F49F1823d041',
          txHash: testHash,
          blockNumber: '1048576',
          timestamp: '1735689600',
          relatedObjectId: '0xobj1',
        },
      ],
    };

    vi.spyOn(client, 'executeQuery').mockResolvedValue(mockGraphQLResponse);

    const res = await client.getRecentEconomicEvents({ limit: 10 });
    expect(res.isLive).toBe(true);
    expect(res.events.length).toBe(1);
    expect(res.events[0].type).toBe('OBJECT_PURCHASED');
    expect(res.events[0].amountMon).toBe(7.8);
    expect(res.events[0].blockNumber).toBe(1048576);
    expect(res.events[0].txHash).toBe(testHash);
    expect(res.events[0].explorerUrl).toBe(
      `https://testnet.monadexplorer.com/tx/${testHash}`
    );
  });

  it('getRecentEconomicEvents returns safe empty state on network failure', async () => {
    vi.spyOn(client, 'executeQuery').mockResolvedValue(null);

    const res = await client.getRecentEconomicEvents();
    expect(res.isLive).toBe(false);
    expect(res.events).toEqual([]);
    expect(res.total).toBe(0);
  });

  it('getAgentHistory returns agent passport and timeline', async () => {
    const mockAgentResponse = {
      Agent_by_pk: {
        id: 'agent_42',
        controller: '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
        metadataHash: '0xmeta',
        agentURI: 'ipfs://agent42',
        active: true,
        registeredAt: '1735689600',
        registeredBlock: '1000',
        transactionCount: '5',
        totalVolumeMon: '50000000000000000000',
        txHash: '0xregTx',
      },
      events: [
        {
          id: '0xev1',
          type: 'AGENT_REGISTERED',
          actor: '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
          amount: '0',
          summary: 'Registered passport',
          contractAddress: '0x8004A818b43A4F469612C57cEC58c9735D1e1234',
          txHash: '0xregTx',
          blockNumber: '1000',
          timestamp: '1735689600',
        },
      ],
      creditReservations: [],
    };

    vi.spyOn(client, 'executeQuery').mockResolvedValue(mockAgentResponse);

    const res = await client.getAgentHistory('agent_42');
    expect(res.isLive).toBe(true);
    expect(res.agent?.id).toBe('agent_42');
    expect(res.agent?.active).toBe(true);
    expect(res.events.length).toBe(1);
    expect(res.events[0].type).toBe('AGENT_REGISTERED');
  });

  it('getMarketplaceActivity calculates volume and protocol fees correctly', async () => {
    const mockMarketResponse = {
      MarketplaceListing: [
        {
          id: '0xl1',
          objectId: '0xobj1',
          seller: '0xSeller',
          buyer: '0xBuyer',
          price: '10000000000000000000', // 10 MON
          fee: '100000000000000000', // 0.1 MON (1%)
          active: false,
          listedAt: '1000',
          purchasedAt: '1050',
          txHash: '0xtx1',
        },
      ],
      events: [],
    };

    vi.spyOn(client, 'executeQuery').mockResolvedValue(mockMarketResponse);

    const res = await client.getMarketplaceActivity(10);
    expect(res.isLive).toBe(true);
    expect(res.totalVolumeMon).toBe(10);
    expect(res.totalFeesMon).toBe(0.1);
  });

  it('getEscrowActivity accurately separates locked vs settled escrows', async () => {
    const mockEscrowResponse = {
      EscrowRecord: [
        {
          id: '0xesc1',
          buyer: '0xBuyer',
          seller: '0xSeller',
          amount: '12000000000000000000', // 12 MON
          conditionHash: '0xcond',
          deadline: '2000',
          status: 'LOCKED',
          createdAt: '1000',
          txHash: '0xlock',
          blockNumber: '500',
        },
        {
          id: '0xesc2',
          buyer: '0xBuyer',
          seller: '0xSeller',
          amount: '5000000000000000000', // 5 MON
          conditionHash: '0xcond2',
          deadline: '2000',
          status: 'RELEASED',
          createdAt: '1000',
          releasedAt: '1200',
          txHash: '0xrelease',
          blockNumber: '600',
        },
      ],
      events: [],
    };

    vi.spyOn(client, 'executeQuery').mockResolvedValue(mockEscrowResponse);

    const res = await client.getEscrowActivity(10);
    expect(res.isLive).toBe(true);
    expect(res.totalLockedMon).toBe(12);
    expect(res.totalSettledMon).toBe(5);
  });

  it('getRecoveryHistory calculates total reclaimed value accurately', async () => {
    const mockRecoveryResponse = {
      RecoveryRecord: [
        {
          id: '0xrec1',
          objectId: '0xobj1',
          agent: 'ComputeAgent-7',
          recoveryType: 'STRANDED_YIELD_RECLAMATION',
          recoveredValue: '4600000000000000000', // 4.6 MON
          status: 'EXECUTED',
          txHash: '0xrecTx',
          blockNumber: '700',
          timestamp: '1735689900',
        },
      ],
      events: [],
    };

    vi.spyOn(client, 'executeQuery').mockResolvedValue(mockRecoveryResponse);

    const res = await client.getRecoveryHistory(10);
    expect(res.isLive).toBe(true);
    expect(res.totalRecoveredMon).toBe(4.6);
  });
});

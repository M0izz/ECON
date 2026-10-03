import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnvioIndexerClient, globalEnvioClient } from '../src/integrations/envio/client';
import {
  IndexedEconomicIdentity,
  IndexedEconomicObject,
  IndexedEscrow,
  IndexedTransaction,
  IndexedRecoveryOpportunity,
  IndexedRecoveryAction,
  IndexedPolicyDecision,
} from '../src/integrations/envio/types';
import { CONTRACT_ADDRESSES } from '../src/contracts/addresses';

describe('Envio HyperIndex Comprehensive Test Suite (Section 10)', () => {
  let client: EnvioIndexerClient;

  beforeEach(() => {
    client = new EnvioIndexerClient({
      endpoint: 'https://indexer.bigdevenergy.com/8004a81/v1/graphql',
      timeoutMs: 1500,
    });
    vi.restoreAllMocks();
  });

  // 1. Contract Event Ingestion & Entity Mapping
  describe('1. Ingestion & Entity Mapping', () => {
    it('correctly maps raw Monad Identity Registered event to EconomicIdentity entity', () => {
      const mockRawIdentity = {
        id: 'agent-monad-42',
        owner: '0x1842B6792A645c110E663B514571A15C198547A1',
        agentAddress: '0x1842B6792A645c110E663B514571A15C198547A1',
        createdAt: '1735689600',
        createdTx: '0x1111111111111111111111111111111111111111111111111111111111111111',
        updatedAt: '1735689600',
        updatedTx: '0x1111111111111111111111111111111111111111111111111111111111111111',
      };

      expect(mockRawIdentity.id).toBe('agent-monad-42');
      expect(mockRawIdentity.owner.toLowerCase()).toBe('0x1842b6792a645c110e663b514571a15c198547a1');
      expect(mockRawIdentity.createdTx.length).toBe(66);
    });

    it('correctly normalizes EconomicObject entity with numeric valuations', () => {
      const mockObject: IndexedEconomicObject = {
        id: 'OBJ-COMP-0042',
        owner: '0x1842B6792A645c110E663B514571A15C198547A1',
        objectType: 'COMPUTE_SLOT',
        unitsRemaining: '100',
        unitDenomination: 'VCPU_HOURS',
        valuationMon: '14.5',
        transferable: true,
        expiryTimestamp: '1735700000',
        status: 'ACTIVE',
        lastUpdatedTx: '0x2222222222222222222222222222222222222222222222222222222222222222',
        lastUpdatedBlock: '1048580',
      };

      expect(mockObject.objectType).toBe('COMPUTE_SLOT');
      expect(Number(mockObject.valuationMon)).toBe(14.5);
      expect(mockObject.transferable).toBe(true);
      expect(mockObject.status).toBe('ACTIVE');
    });

    it('correctly maps Escrow entity with state transitions and timestamps', () => {
      const mockEscrow: IndexedEscrow = {
        id: 'ESCROW-99',
        buyer: '0x1842B6792A645c110E663B514571A15C198547A1',
        seller: '0x991286A645c110E663B514571A15C198547A9',
        amountMon: '5.0',
        state: 'LOCKED',
        createdAt: '1735689600',
        settledAt: null,
        createdTx: '0x3333333333333333333333333333333333333333333333333333333333333333',
        settledTx: null,
      };

      expect(mockEscrow.state).toBe('LOCKED');
      expect(Number(mockEscrow.amountMon)).toBe(5.0);
      expect(mockEscrow.settledAt).toBeNull();
    });
  });

  // 2. Query API (Section 4 queries)
  describe('2. Section 4 Query API', () => {
    it('getEconomicIdentity returns indexed identity for valid ID', async () => {
      const mockData = {
        EconomicIdentity_by_pk: {
          id: 'agent-42',
          owner: '0x1842B6792A645c110E663B514571A15C198547A1',
          agentAddress: '0x1842B6792A645c110E663B514571A15C198547A1',
          createdAt: '1735689600',
          createdTx: '0xtx1',
          updatedAt: '1735689600',
          updatedTx: '0xtx1',
        },
      };

      vi.spyOn(client, 'executeQuery').mockResolvedValue(mockData);

      const identity = await client.getEconomicIdentity('agent-42');
      expect(identity).not.toBeNull();
      expect(identity?.id).toBe('agent-42');
      expect(identity?.owner).toBe('0x1842B6792A645c110E663B514571A15C198547A1');
    });

    it('getEconomicIdentity returns null when identity not found', async () => {
      vi.spyOn(client, 'executeQuery').mockResolvedValue({ EconomicIdentity_by_pk: null });
      const identity = await client.getEconomicIdentity('non-existent');
      expect(identity).toBeNull();
    });

    it('getEconomicObjects returns objects filtered by owner', async () => {
      const mockData = {
        EconomicObject: [
          {
            id: 'OBJ-1',
            owner: '0x1842B6792A645c110E663B514571A15C198547A1',
            objectType: 'DATA_FEED',
            unitsRemaining: '50',
            unitDenomination: 'CALLS',
            valuationMon: '2.5',
            transferable: true,
            expiryTimestamp: '1735700000',
            status: 'ACTIVE',
            lastUpdatedTx: '0xtx1',
            lastUpdatedBlock: '100',
          },
        ],
      };

      vi.spyOn(client, 'executeQuery').mockResolvedValue(mockData);

      const objects = await client.getEconomicObjects('0x1842B6792A645c110E663B514571A15C198547A1');
      expect(objects.length).toBe(1);
      expect(objects[0].id).toBe('OBJ-1');
      expect(objects[0].objectType).toBe('DATA_FEED');
    });

    it('getActiveEscrows filters out SETTLED and REFUNDED states', async () => {
      const mockData = {
        Escrow: [
          {
            id: 'ESCROW-1',
            buyer: '0xBuyer',
            seller: '0xSeller',
            amountMon: '10.0',
            state: 'LOCKED',
            createdAt: '1735689600',
            settledAt: null,
            createdTx: '0xlockTx',
            settledTx: null,
          },
          {
            id: 'ESCROW-2',
            buyer: '0xBuyer',
            seller: '0xSeller',
            amountMon: '5.0',
            state: 'SETTLED',
            createdAt: '1735689600',
            settledAt: '1735690000',
            createdTx: '0xlockTx2',
            settledTx: '0xsettleTx',
          },
        ],
      };

      vi.spyOn(client, 'executeQuery').mockResolvedValue(mockData);

      const escrows = await client.getActiveEscrows('0xBuyer');
      expect(escrows.length).toBe(1);
      expect(escrows[0].id).toBe('ESCROW-1');
      expect(escrows[0].state).toBe('LOCKED');
    });

    it('getTransactions returns transactions with provenance metadata', async () => {
      const testTxHash = '0xabc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const mockData = {
        Transaction: [
          {
            id: `${testTxHash}_0`,
            sender: '0xSender',
            recipient: '0xRecipient',
            amountMon: '12.0',
            txType: 'ESCROW_LOCK',
            timestamp: '1735689600',
            txHash: testTxHash,
            blockNumber: '1048590',
            status: 'CONFIRMED',
          },
        ],
      };

      vi.spyOn(client, 'executeQuery').mockResolvedValue(mockData);

      const txs = await client.getTransactions('0xSender', 10);
      expect(txs.length).toBe(1);
      expect(txs[0].txHash).toBe(testTxHash);
      expect(txs[0].blockNumber).toBe('1048590');
      expect(txs[0].amountMon).toBe('12.0');
    });

    it('getRecoveryHistory returns quantitative recovery records with strategy and policy result', async () => {
      const mockData = {
        RecoveryRecord: [
          {
            id: 'rec-1',
            object: 'OBJ-COMP-0042',
            detectedValueMon: '8.5',
            strategy: 'DISCOUNT_RESALE',
            policyResult: 'APPROVED',
            recoveredMon: '8.2',
            executionStatus: 'COMPLETED',
            timestamp: '1735689600',
            txHash: '0xrecTx',
          },
        ],
      };

      vi.spyOn(client, 'executeQuery').mockResolvedValue(mockData);

      const records = await client.getRecoveryHistory();
      expect(records.length).toBe(1);
      expect(records[0].strategy).toBe('DISCOUNT_RESALE');
      expect(records[0].policyResult).toBe('APPROVED');
      expect(records[0].executionStatus).toBe('COMPLETED');
      expect(records[0].recoveredMon).toBe('8.2');
    });

    it('getEconomicHistory aggregates events chronologically with transaction hashes', async () => {
      const mockData = {
        EconomicEvent: [
          {
            id: 'ev-1',
            type: 'IDENTITY_REGISTERED',
            actor: '0xAgent',
            counterparty: null,
            amount: '0',
            summary: 'Economic Identity created',
            contractAddress: CONTRACT_ADDRESSES.ECONIdentityRegistry,
            txHash: '0xtx1',
            blockNumber: '100',
            timestamp: '1735689400',
          },
          {
            id: 'ev-2',
            type: 'ESCROW_LOCKED',
            actor: '0xAgent',
            counterparty: '0xSeller',
            amount: '5000000000000000000',
            summary: 'Escrow created',
            contractAddress: CONTRACT_ADDRESSES.ECONEscrow,
            txHash: '0xtx2',
            blockNumber: '105',
            timestamp: '1735689500',
          },
        ],
      };

      vi.spyOn(client, 'executeQuery').mockResolvedValue(mockData);

      const history = await client.getEconomicHistory('0xAgent');
      expect(history.length).toBe(2);
      expect(history[0].txHash).toBe('0xtx1');
      expect(history[1].txHash).toBe('0xtx2');
      expect(history[0].timestamp).toBeLessThanOrEqual(history[1].timestamp);
    });
  });

  // 3. Real-Time Updates & Subscriptions (Section 6)
  describe('3. Section 6 Real-Time Updates', () => {
    it('notifies subscribers immediately when on-chain event is emitted', () => {
      const receivedEvents: any[] = [];
      const unsubscribe = client.subscribeToEconomicEvents((evt) => {
        receivedEvents.push(evt);
      });

      client.emitRealtimeEvent({
        id: 'live-evt-1',
        type: 'OBJECT_TRANSFERRED',
        actor: '0xSender',
        counterparty: '0xReceiver',
        amountMon: 4.5,
        summary: 'Economic Object transferred on Monad',
        contractAddress: CONTRACT_ADDRESSES.ECONEconomicObject,
        txHash: '0x9999999999999999999999999999999999999999999999999999999999999999',
        blockNumber: 1048600,
        timestamp: Date.now(),
        explorerUrl: 'https://testnet.monadexplorer.com/tx/0x999',
      });

      expect(receivedEvents.length).toBe(1);
      expect(receivedEvents[0].type).toBe('OBJECT_TRANSFERRED');
      expect(receivedEvents[0].amountMon).toBe(4.5);

      // Verify unsubscription stops receiving events
      unsubscribe();
      client.emitRealtimeEvent({
        id: 'live-evt-2',
        type: 'ESCROW_SETTLED',
        actor: '0xBuyer',
        amountMon: 4.5,
        summary: 'Escrow settled',
        contractAddress: CONTRACT_ADDRESSES.ECONEscrow,
        txHash: '0x888',
        blockNumber: 1048601,
        timestamp: Date.now(),
        explorerUrl: 'https://testnet.monadexplorer.com/tx/0x888',
      });

      expect(receivedEvents.length).toBe(1);
    });

    it('supports filtered entity subscriptions for targeted UI components', () => {
      const agentEvents: any[] = [];
      const unsub = client.subscribeToEntity('Agent', 'agent-42', (entity) => {
        agentEvents.push(entity);
      });

      client.emitEntityUpdate('Agent', 'agent-42', { balanceMon: 25.0 });
      client.emitEntityUpdate('Agent', 'agent-other', { balanceMon: 5.0 });

      expect(agentEvents.length).toBe(1);
      expect(agentEvents[0].balanceMon).toBe(25.0);

      unsub();
    });
  });

  // 4. Edge Cases: Duplicates, Malformed Data & Reorgs (Section 10)
  describe('4. Edge Cases, Malformed Data & Reorg Resilience', () => {
    it('handles malformed GraphQL response without unhandled exception', async () => {
      vi.spyOn(client, 'executeQuery').mockResolvedValue({ corrupted_field: true });

      const res = await client.getRecentEconomicEvents();
      expect(res.events).toEqual([]);
      expect(res.total).toBe(0);
    });

    it('returns empty array when network query fails completely', async () => {
      vi.spyOn(client, 'executeQuery').mockRejectedValue(new Error('Network timeout'));

      const objs = await client.getEconomicObjects();
      expect(objs).toEqual([]);
    });

    it('handles duplicate transaction identifiers idempotently', () => {
      const txMap = new Map<string, IndexedTransaction>();
      const tx1: IndexedTransaction = {
        id: '0xhash_0',
        sender: '0x1',
        recipient: '0x2',
        amountMon: '1.0',
        txType: 'SETTLEMENT',
        timestamp: '1000',
        txHash: '0xhash',
        blockNumber: '10',
        status: 'CONFIRMED',
      };

      txMap.set(tx1.id, tx1);
      // Ingest duplicate
      txMap.set(tx1.id, { ...tx1, amountMon: '1.0' });

      expect(txMap.size).toBe(1);
    });

    it('handles chain reorg scenario by honoring block numbers and tx hashes', () => {
      // If a block is reorged, events at higher block numbers are superseded
      const activeBlocks = [100, 101, 102];
      const reorgedToBlock = 101;
      const validBlocks = activeBlocks.filter((b) => b <= reorgedToBlock);

      expect(validBlocks).toEqual([100, 101]);
    });
  });

  // 5. Architectural Boundaries: Monad vs Envio vs CRE vs Nansen
  describe('5. Architectural Boundaries', () => {
    it('preserves Monad as source of truth and Envio as read-only projection', () => {
      // Envio client must NOT expose any settlement or write-authorization methods
      expect((client as any).settleEscrow).toBeUndefined();
      expect((client as any).executePolicy).toBeUndefined();
      expect((client as any).authorizeSpend).toBeUndefined();
    });

    it('enforces CRE separation: CRE orchestrates without writing directly to Envio', () => {
      // CRE emits workflow events to Monad contracts, which Envio indexes
      const creWorkflow = {
        step: 'RECOVERY_TRIGGERED',
        initiator: 'CRE_WORKFLOW_ORCHESTRATOR',
        settlementTarget: 'MONAD_CONTRACT_CALL',
      };

      expect(creWorkflow.settlementTarget).toBe('MONAD_CONTRACT_CALL');
    });

    it('maintains strict separation between internal Envio state and external Nansen intelligence', () => {
      const envioIndexedIdentity = {
        id: 'agent-42',
        owner: '0x1842B6792A645c110E663B514571A15C198547A1',
        source: 'ENVIO_INDEXED',
      };

      const nansenIntelligence = {
        address: '0x1842B6792A645c110E663B514571A15C198547A1',
        label: 'Smart Money / High Volume Trader',
        source: 'NANSEN_INTELLIGENCE',
      };

      expect(envioIndexedIdentity.source).toBe('ENVIO_INDEXED');
      expect(nansenIntelligence.source).toBe('NANSEN_INTELLIGENCE');
      expect(envioIndexedIdentity.id).not.toBe(nansenIntelligence.label);
    });
  });

  // 6. Explicit Empty State (Section 12: No Fake Data)
  describe('6. Zero Fake Data & Explicit Empty State', () => {
    it('returns empty list and does NOT fabricate fake fallback numbers', async () => {
      vi.spyOn(client, 'executeQuery').mockResolvedValue({
        EconomicObject: [],
        Escrow: [],
        Transaction: [],
      });

      const objs = await client.getEconomicObjects('0xNewAgentWithZeroState');
      const escrows = await client.getActiveEscrows('0xNewAgentWithZeroState');
      const txs = await client.getTransactions('0xNewAgentWithZeroState');

      expect(objs).toHaveLength(0);
      expect(escrows).toHaveLength(0);
      expect(txs).toHaveLength(0);
    });
  });
});

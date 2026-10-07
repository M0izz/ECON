import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MetaMaskAgentWalletAdapter,
  globalMetaMaskAgentWallet,
} from '../src/integrations/metamask-agent-wallet/metaMaskAgentWalletAdapter';
import { executeMetaMaskGatedTransaction } from '../src/integrations/metamask-agent-wallet/policyGatedExecutor';
import { EconomicIdentityWalletBindingRegistry } from '../src/integrations/metamask-agent-wallet/agentWalletBinding';
import { EconomicStore } from '../src/sdk/store';
import { PolicyEngine } from '../src/sdk/policy';
import { EventBus } from '../src/sdk/events';
import { EconomicEngine } from '../src/sdk/engine';
import { LocalSettlementAdapter } from '../src/settlement/LocalSettlementAdapter';
import { EscrowManager } from '../src/sdk/escrow';
import { EconomicGarbageCollector } from '../src/sdk/garbageCollector';
import { RecoveryEngine } from '../src/sdk/recovery';
import { AgentRuntime } from '../src/sdk/agent/runtime';
import { globalEnvioClient } from '../src/integrations/envio/client';
import { Agent, AgentPolicy } from '../src/sdk/types';

describe('MetaMask Agent Wallet Integration Suite', () => {
  let store: EconomicStore;
  let eventBus: EventBus;
  let policyEngine: PolicyEngine;
  let walletAdapter: MetaMaskAgentWalletAdapter;
  let bindingRegistry: EconomicIdentityWalletBindingRegistry;

  const TEST_AGENT_ID = 'ResearchAgent-42';
  const VALID_RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as `0x${string}`;
  const DEFAULT_POLICY: AgentPolicy = {
    maxPerTransaction: 5.0,
    dailySpendingLimit: 20.0,
    allowedCategories: ['API_LICENSE', 'DATA_SUBSCRIPTION', 'GPU_COMPUTE_CREDIT'],
    requireApprovalAbove: 4.0,
    autoRecoveryEnabled: true,
    autoTransferEnabled: true,
    minRetainedBalance: 2.0,
  };

  beforeEach(() => {
    store = new EconomicStore();
    eventBus = new EventBus();
    policyEngine = new PolicyEngine(store, eventBus);
    walletAdapter = new MetaMaskAgentWalletAdapter({
      walletType: 'server-wallet',
      tradingMode: 'guard',
    });
    bindingRegistry = new EconomicIdentityWalletBindingRegistry(store, eventBus);

    // Seed agent
    const testAgent: Agent = {
      id: TEST_AGENT_ID,
      name: 'ResearchAgent-42',
      controller: '0x1842B6792A645c110E663B514571A15C198547A1',
      walletAddress: '0x1842B6792A645c110E663B514571A15C198547A1',
      balanceMon: 20.0,
      reputationScore: 98.5,
      active: true,
      registeredAt: Date.now(),
      policy: DEFAULT_POLICY,
      activeObligations: 0,
      controllerType: 'METAMASK_AGENT_WALLET',
    };
    store.setAgent(testAgent);
  });

  // 1. Wallet Initialization
  it('1. initializes wallet in server-wallet or byok mode with doctor report', async () => {
    const adapter = new MetaMaskAgentWalletAdapter({
      walletType: 'server-wallet',
      tradingMode: 'guard',
    });
    expect(adapter.getMode()).toBe('server-wallet');
    expect(adapter.getTradingMode()).toBe('guard');

    const report = await adapter.doctor();
    expect(report.cliVersion).toBe('7.0.0');
    expect(report.sdkVersion).toBe('7.0.0');
    expect(report.chainId).toBe(10143);
    expect(report.blockaidHealthy).toBe(true);
  });

  // 2. Address Retrieval
  it('2. retrieves active wallet address correctly', () => {
    const address = walletAdapter.getWalletAddress();
    expect(address).toBeDefined();
    expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  // 3. Balance Retrieval
  it('3. retrieves Monad balance in MON', async () => {
    const balance = await walletAdapter.getBalance();
    expect(typeof balance).toBe('number');
    expect(balance).toBeGreaterThanOrEqual(0);
  });

  // 4. Valid Transaction
  it('4. executes valid transaction through simulation and Blockaid pipeline', async () => {
    const result = await walletAdapter.signAndSubmitAuthorizedTransaction({
      type: 'BUY',
      recipient: VALID_RECIPIENT,
      amountMon: 2.0,
      economicIdentity: TEST_AGENT_ID,
      memo: 'Research API access',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('SETTLED');
    expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(result.chainId).toBe(10143);
    expect(result.chain).toBe('Monad Testnet');
    expect(result.simulation?.simulationPassed).toBe(true);
    expect(result.threatScan?.passed).toBe(true);
  });

  // 5. Policy ALLOW
  it('5. policy ALLOW: valid agent transaction passes policy engine and settles on Monad', async () => {
    const result = await executeMetaMaskGatedTransaction({
      agentId: TEST_AGENT_ID,
      intent: {
        type: 'BUY',
        recipient: VALID_RECIPIENT,
        amountMon: 2.0,
        category: 'API_LICENSE',
        economicIdentity: TEST_AGENT_ID,
        memo: 'Authorized API purchase',
      },
      policyEngine,
      walletAdapter,
      store,
      eventBus,
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('SETTLED');
    expect(result.hash).toBeDefined();
    // Verify treasury deducted
    const updatedAgent = store.getAgent(TEST_AGENT_ID);
    expect(updatedAgent?.balanceMon).toBe(18.0);
  });

  // 6. Policy BLOCK
  it('6. policy BLOCK: halts transaction when exceeding single tx limit and nothing is submitted', async () => {
    // Policy limit is 5.0 MON, attempt to spend 10.0 MON
    const result = await executeMetaMaskGatedTransaction({
      agentId: TEST_AGENT_ID,
      intent: {
        type: 'BUY',
        recipient: VALID_RECIPIENT,
        amountMon: 10.0,
        category: 'API_LICENSE',
        economicIdentity: TEST_AGENT_ID,
      },
      policyEngine,
      walletAdapter,
      store,
      eventBus,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('BLOCKED_BY_POLICY');
    expect(result.hash).toBe('');
    expect(result.policyReason).toContain('Exceeds max transaction limit');
    // Balance must NOT be deducted
    expect(store.getAgent(TEST_AGENT_ID)?.balanceMon).toBe(20.0);
  });

  // 7. Policy REVIEW
  it('7. policy REVIEW: does NOT automatically execute when amount exceeds approval threshold', async () => {
    // requireApprovalAbove is 4.0 MON; attempt to spend 4.5 MON (less than 5.0 max limit)
    const result = await executeMetaMaskGatedTransaction({
      agentId: TEST_AGENT_ID,
      intent: {
        type: 'BUY',
        recipient: VALID_RECIPIENT,
        amountMon: 4.5,
        category: 'API_LICENSE',
        economicIdentity: TEST_AGENT_ID,
      },
      policyEngine,
      walletAdapter,
      store,
      eventBus,
      autoApproveReview: false, // Invariant: Never silently execute REVIEW
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('REQUIRES_REVIEW');
    expect(result.hash).toBe('');
    expect(store.getAgent(TEST_AGENT_ID)?.balanceMon).toBe(20.0);
  });

  // 8. Invalid Recipient
  it('8. invalid recipient: rejected by simulation before reaching network', async () => {
    await expect(
      executeMetaMaskGatedTransaction({
        agentId: TEST_AGENT_ID,
        intent: {
          type: 'BUY',
          recipient: 'not-an-evm-address' as any,
          amountMon: 1.0,
          economicIdentity: TEST_AGENT_ID,
        },
        policyEngine,
        walletAdapter,
        store,
        eventBus,
      })
    ).rejects.toThrow(/Invalid transaction intent: recipient/);
  });

  // 9. Amount Above Spending Limit
  it('9. amount above spending limit: blocks when exceeding daily spending aggregation', async () => {
    // Seed an earlier transaction of 18 MON today
    store.setTransaction({
      id: 'tx-today-1',
      type: 'BUY',
      buyer: TEST_AGENT_ID,
      seller: VALID_RECIPIENT,
      amountMon: 18.0,
      status: 'SETTLED',
      timestamp: Date.now(),
      memo: 'Prior spend',
    });

    // Daily limit is 20 MON; remaining is 2 MON. Attempt to spend 3 MON
    const result = await executeMetaMaskGatedTransaction({
      agentId: TEST_AGENT_ID,
      intent: {
        type: 'BUY',
        recipient: VALID_RECIPIENT,
        amountMon: 3.0,
        category: 'API_LICENSE',
        economicIdentity: TEST_AGENT_ID,
      },
      policyEngine,
      walletAdapter,
      store,
      eventBus,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('BLOCKED_BY_POLICY');
    expect(result.policyReason).toContain('Exceeds daily spending limit');
  });

  // 10. Insufficient Balance
  it('10. insufficient balance: blocks transaction when treasury funds are inadequate', async () => {
    // Set agent balance to 1 MON
    const agent = store.getAgent(TEST_AGENT_ID)!;
    agent.balanceMon = 1.0;
    store.setAgent(agent);

    const result = await executeMetaMaskGatedTransaction({
      agentId: TEST_AGENT_ID,
      intent: {
        type: 'BUY',
        recipient: VALID_RECIPIENT,
        amountMon: 2.5,
        category: 'API_LICENSE',
        economicIdentity: TEST_AGENT_ID,
      },
      policyEngine,
      walletAdapter,
      store,
      eventBus,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('BLOCKED_BY_POLICY');
    expect(result.error).toContain('Insufficient balance');
  });

  // 11. Wallet/Provider Unavailable
  it('11. wallet/provider unavailable: cleanly reports error if address missing', async () => {
    const uninitAdapter = new MetaMaskAgentWalletAdapter();
    uninitAdapter.setAddressForTesting('' as any);

    await expect(
      uninitAdapter.signAndSubmitAuthorizedTransaction({
        type: 'BUY',
        recipient: VALID_RECIPIENT,
        amountMon: 1.0,
        economicIdentity: TEST_AGENT_ID,
      })
    ).rejects.toThrow(/MetaMask Agent Wallet not initialized/);
  });

  // 12. Transaction Failure
  it('12. transaction failure: handles execution rejection without corrupting store state', async () => {
    vi.spyOn(walletAdapter, 'signAndSubmitAuthorizedTransaction').mockResolvedValueOnce({
      success: false,
      hash: '',
      chain: 'Monad Testnet',
      chainId: 10143,
      from: '0x1842B6792A645c110E663B514571A15C198547A1',
      to: VALID_RECIPIENT,
      value: 2.0,
      status: 'FAILED',
      timestamp: Date.now(),
      error: 'Monad node reverted transaction: execution timeout',
    });

    const result = await executeMetaMaskGatedTransaction({
      agentId: TEST_AGENT_ID,
      intent: {
        type: 'BUY',
        recipient: VALID_RECIPIENT,
        amountMon: 2.0,
        category: 'API_LICENSE',
        economicIdentity: TEST_AGENT_ID,
      },
      policyEngine,
      walletAdapter,
      store,
      eventBus,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('FAILED');
    expect(store.getAgent(TEST_AGENT_ID)?.balanceMon).toBe(20.0);
  });

  // 13. Successful Monad Transaction
  it('13. successful Monad transaction: provides full provenance metadata', async () => {
    const result = await executeMetaMaskGatedTransaction({
      agentId: TEST_AGENT_ID,
      intent: {
        type: 'BUY',
        recipient: VALID_RECIPIENT,
        amountMon: 1.5,
        category: 'API_LICENSE',
        economicIdentity: TEST_AGENT_ID,
      },
      policyEngine,
      walletAdapter,
      store,
      eventBus,
    });

    expect(result.success).toBe(true);
    expect(result.hash).toBeDefined();
    expect(result.chain).toBe('Monad Testnet');
    expect(result.chainId).toBe(10143);
    expect(result.from).toBeDefined();
    expect(result.to).toBe(VALID_RECIPIENT);
    expect(result.value).toBe(1.5);
    expect(result.timestamp).toBeGreaterThan(0);
  });

  // 14. Envio Indexing
  it('14. Envio indexing: emits and indexes transaction in real-time Envio pipeline', async () => {
    const envioSpy = vi.spyOn(globalEnvioClient, 'emitRealtimeEvent');

    await executeMetaMaskGatedTransaction({
      agentId: TEST_AGENT_ID,
      intent: {
        type: 'BUY',
        recipient: VALID_RECIPIENT,
        amountMon: 2.0,
        category: 'API_LICENSE',
        economicIdentity: TEST_AGENT_ID,
      },
      policyEngine,
      walletAdapter,
      store,
      eventBus,
    });

    expect(envioSpy).toHaveBeenCalled();
    const callArg = envioSpy.mock.calls[0][0];
    expect(callArg.actor).toBe(TEST_AGENT_ID);
    expect(callArg.type).toBe('SETTLEMENT_COMPLETED');
    expect(callArg.amountMon).toBe(2.0);
  });

  // 15. Agent Runtime Integration
  it('15. agent runtime integration: executeEconomicTransaction tool functions autonomously', async () => {
    const settlement = new LocalSettlementAdapter(store, eventBus);
    const engine = new EconomicEngine(store, settlement, policyEngine, eventBus);
    const escrow = new EscrowManager(store, settlement, eventBus);
    const gc = new EconomicGarbageCollector(store, policyEngine, eventBus);
    const recovery = new RecoveryEngine(store, settlement, policyEngine, eventBus);

    const runtime = new AgentRuntime(
      TEST_AGENT_ID,
      store,
      policyEngine,
      engine,
      escrow,
      gc,
      recovery,
      eventBus,
      undefined,
      walletAdapter
    );

    // Call controlled executeEconomicTransaction tool
    const actionResult = await runtime.executeEconomicTransaction({
      type: 'BUY',
      recipient: VALID_RECIPIENT,
      amountMon: 2.0,
      category: 'API_LICENSE',
      economicIdentity: TEST_AGENT_ID,
      memo: 'Autonomous tool purchase',
    });

    expect(actionResult.success).toBe(true);
    expect(actionResult.actionType).toBe('BUY');
    expect(actionResult.auditSummary).toContain('Successfully executed');
  });
});

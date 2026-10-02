import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ECON } from '../src/sdk/client';
import { EconomicStore } from '../src/sdk/store';
import { EventBus } from '../src/sdk/events';
import { DynamicWalletManager } from '../src/integrations/dynamic/dynamicWallet';
import { executeDynamicGatedTransaction } from '../src/integrations/dynamic/dynamicPolicyExecutor';
import { type Hash, type TransactionReceipt } from 'viem';

describe('Dynamic Gated Transactions & ECON Policy Enforcement', () => {
  let econ: ECON;
  let dynamicWallet: DynamicWalletManager;
  let sendTransactionMock: any;
  let waitForReceiptMock: any;

  beforeEach(() => {
    econ = new ECON({
      store: new EconomicStore(),
      eventBus: new EventBus(),
    });

    dynamicWallet = new DynamicWalletManager();

    // Configure a test Dynamic wallet connected on Monad Testnet (Chain ID 10143)
    dynamicWallet.setActiveWallet({
      address: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942',
      connector: { name: 'Dynamic Embedded EVM' },
      chain: '10143',
      key: 'evm',
    });

    // Mock Dynamic wallet sendTransaction at adapter boundary
    sendTransactionMock = vi.fn().mockResolvedValue({
      success: true,
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hash,
      blockNumber: 1234567,
      settledAt: Date.now(),
      feeMon: 0.00042,
    });

    dynamicWallet.sendTransaction = sendTransactionMock;

    // Register a Dynamic-controlled agent with strict policy limits
    // Max per transaction: 20 MON
    // Daily spending cap: 60 MON
    // Minimum retained reserve floor: 25 MON
    // Initial balance: 100 MON
    econ.createDynamicAgent({
      id: 'agent_dynamic_42',
      name: 'ResearchAgent-42',
      walletAddress: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942',
      initialBalanceMon: 100,
      policy: {
        maxPerTransaction: 20,
        dailySpendingLimit: 60,
        minRetainedBalance: 25,
      },
    });
  });

  it('ALLOWS policy-approved transaction: Dynamic signs and executes on Monad Testnet', async () => {
    const destination = '0x1111111111111111111111111111111111111111';
    const amount = 15; // Within 20 MON max cap

    const result = await executeDynamicGatedTransaction({
      agentId: 'agent_dynamic_42',
      to: destination,
      amountMon: amount,
      policyEngine: econ.policy,
      dynamicWallet,
      store: econ.store,
      eventBus: econ.events,
    });

    // 1. Transaction succeeds
    expect(result.success).toBe(true);
    expect(result.policyBlocked).toBe(false);
    expect(result.transactionHash).toBe('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');

    // 2. Dynamic signer was called exactly once
    expect(sendTransactionMock).toHaveBeenCalledTimes(1);

    // 3. ECON ledger balance updated
    const agent = econ.store.getAgent('agent_dynamic_42');
    expect(agent?.balanceMon).toBe(85); // 100 - 15 = 85 MON

    // 4. Transaction recorded in ECON store
    const transactions = econ.store.getAllTransactions();
    expect(transactions.length).toBe(1);
    expect(transactions[0].buyer).toBe('agent_dynamic_42');
    expect(transactions[0].seller).toBe(destination);
    expect(transactions[0].status).toBe('SETTLED');
  });

  it('BLOCKS transaction exceeding maxPerTransaction: Dynamic signer is NEVER invoked', async () => {
    const destination = '0x1111111111111111111111111111111111111111';
    const amount = 40; // Exceeds 20 MON cap!

    const result = await executeDynamicGatedTransaction({
      agentId: 'agent_dynamic_42',
      to: destination,
      amountMon: amount,
      policyEngine: econ.policy,
      dynamicWallet,
      store: econ.store,
      eventBus: econ.events,
    });

    // 1. Result reflects policy blockage
    expect(result.success).toBe(false);
    expect(result.policyBlocked).toBe(true);
    expect(result.violatesRule).toBe('MAX_TRANSACTION_LIMIT');
    expect(result.reason).toContain('Exceeds max transaction limit');

    // 2. CRITICAL SECURITY ASSERTION: Dynamic was NEVER called to sign!
    expect(sendTransactionMock).not.toHaveBeenCalled();

    // 3. Agent balance remains untouched
    const agent = econ.store.getAgent('agent_dynamic_42');
    expect(agent?.balanceMon).toBe(100);
  });

  it('BLOCKS transaction breaching minimum retained reserve floor: Dynamic signer is NEVER invoked', async () => {
    // Current balance: 100 MON. Floor: 25 MON.
    // If agent policy allows 80 max tx, but transaction of 80 leaves 20 (< 25 floor)
    econ.identity.updatePolicy('agent_dynamic_42', { maxPerTransaction: 100 });

    const destination = '0x1111111111111111111111111111111111111111';
    const amount = 80;

    const result = await executeDynamicGatedTransaction({
      agentId: 'agent_dynamic_42',
      to: destination,
      amountMon: amount,
      policyEngine: econ.policy,
      dynamicWallet,
      store: econ.store,
      eventBus: econ.events,
    });

    expect(result.success).toBe(false);
    expect(result.policyBlocked).toBe(true);
    expect(result.violatesRule).toBe('MIN_RETAINED_BALANCE');
    expect(sendTransactionMock).not.toHaveBeenCalled();
  });

  it('BLOCKS transaction breaching daily spending limit: Dynamic signer is NEVER invoked', async () => {
    // Daily limit: 60 MON. Max tx: 20 MON.
    // First 3 transactions of 20 MON = 60 MON spent.
    const destination = '0x1111111111111111111111111111111111111111';

    // Simulate 3 settled transactions totaling 60 MON today
    for (let i = 0; i < 3; i++) {
      econ.store.setTransaction({
        id: `tx_prior_${i}`,
        timestamp: Date.now(),
        type: 'BUY',
        buyer: 'agent_dynamic_42',
        seller: destination,
        amountMon: 20,
        status: 'SETTLED',
        memo: `Transaction ${i}`,
      });
    }

    // Now attempt a 4th transaction of 5 MON (daily spent would be 65 > 60)
    const result = await executeDynamicGatedTransaction({
      agentId: 'agent_dynamic_42',
      to: destination,
      amountMon: 5,
      policyEngine: econ.policy,
      dynamicWallet,
      store: econ.store,
      eventBus: econ.events,
    });

    expect(result.success).toBe(false);
    expect(result.policyBlocked).toBe(true);
    expect(result.violatesRule).toBe('DAILY_SPENDING_LIMIT');
    expect(sendTransactionMock).not.toHaveBeenCalled();
  });
});

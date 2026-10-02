import { type Hash } from 'viem';
import { PolicyEngine, PolicyCheckResult } from '../../sdk/policy';
import { EconomicStore } from '../../sdk/store';
import { EventBus } from '../../sdk/events';
import { ObjectType } from '../../sdk/types';
import { DynamicWalletManager } from './dynamicWallet';

export interface DynamicPolicyExecutionResult {
  success: boolean;
  policyBlocked: boolean;
  reason?: string;
  violatesRule?: string;
  transactionHash?: Hash | '';
  blockNumber?: number;
  amountMon: number;
  agentId: string;
}

/**
 * Execute an agent economic transaction through Dynamic with strict Policy Engine enforcement.
 * Architectural rule: Policy Engine MUST evaluate and approve BEFORE Dynamic is invoked to sign.
 */
export async function executeDynamicGatedTransaction(params: {
  agentId: string;
  to: `0x${string}`;
  amountMon: number;
  category?: ObjectType;
  description?: string;
  policyEngine: PolicyEngine;
  dynamicWallet: DynamicWalletManager;
  store: EconomicStore;
  eventBus: EventBus;
}): Promise<DynamicPolicyExecutionResult> {
  const { agentId, to, amountMon, category, description, policyEngine, dynamicWallet, store, eventBus } = params;

  // 1. Policy Engine evaluation (MANDATORY FIRST STEP)
  const policyCheck: PolicyCheckResult = policyEngine.validateTransaction(agentId, amountMon, category);

  if (!policyCheck.allowed) {
    eventBus.emit({
      type: 'POLICY_BLOCKED',
      actor: agentId,
      summary: `Dynamic transaction BLOCKED by Policy Engine for ${agentId}: ${policyCheck.reason}`,
      details: {
        agentId,
        amountMon,
        category,
        violatesRule: policyCheck.violatesRule,
        reason: policyCheck.reason,
      },
    });

    return {
      success: false,
      policyBlocked: true,
      reason: policyCheck.reason,
      violatesRule: policyCheck.violatesRule,
      amountMon,
      agentId,
    };
  }

  // 2. Validate Dynamic wallet connection & Monad network
  const connected = dynamicWallet.getConnectedWallet();
  if (!connected) {
    throw new Error('Dynamic wallet is not connected.');
  }

  if (connected.networkChainId !== 10143) {
    throw new Error(`Dynamic wallet is on chain ${connected.networkChainId}, but Monad Testnet (10143) is required.`);
  }

  // 3. Dynamic wallet signs and broadcasts to Monad Testnet
  const sendResult = await dynamicWallet.sendTransaction({
    to,
    valueMon: amountMon,
    memo: description,
  });

  if (!sendResult.success) {
    throw new Error(sendResult.error || 'Dynamic transaction signing failed on Monad Testnet.');
  }

  const txHash = sendResult.txHash;

  // 4. Update ECON ledger and store state
  const agent = store.getAgent(agentId);
  if (agent) {
    store.updateAgentBalance(agentId, -amountMon);
  }

  const txId = `dynamic_tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  store.setTransaction({
    id: txId,
    timestamp: Date.now(),
    type: 'BUY',
    buyer: agentId,
    seller: to,
    amountMon,
    status: 'SETTLED',
    memo: description || `Policy-approved Dynamic transaction to ${to}`,
    settlementHash: txHash,
  });

  eventBus.emit({
    type: 'TRANSACTION_CREATED',
    actor: agentId,
    summary: `Dynamic Monad Testnet tx ${txHash ? txHash.slice(0, 10) : ''}... confirmed (${amountMon} MON to ${to})`,
    details: {
      agentId,
      amountMon,
      to,
      txHash,
      receiptBlock: sendResult.blockNumber,
      signer: connected.address,
    },
  });

  return {
    success: true,
    policyBlocked: false,
    transactionHash: txHash,
    blockNumber: sendResult.blockNumber,
    amountMon,
    agentId,
  };
}

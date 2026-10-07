import { PolicyEngine, PolicyCheckResult } from '../../sdk/policy';
import { EconomicStore } from '../../sdk/store';
import { EventBus } from '../../sdk/events';
import { globalEnvioClient } from '../envio/client';
import { MetaMaskAgentWalletAdapter } from './metaMaskAgentWalletAdapter';
import { MetaMaskTransactionIntent, MetaMaskTransactionResult } from './types';
import { ObjectType, Transaction } from '../../sdk/types';
import { isAddress } from 'viem';

export interface ExecuteMetaMaskGatedParams {
  agentId: string;
  intent: MetaMaskTransactionIntent;
  policyEngine: PolicyEngine;
  walletAdapter: MetaMaskAgentWalletAdapter;
  store: EconomicStore;
  eventBus: EventBus;
  category?: ObjectType;
  description?: string;
  autoApproveReview?: boolean; // Default false: NEVER silently execute REVIEW decisions
}

/**
 * Executes a transaction through MetaMask Agent Wallet with strict ECON Policy Engine gating.
 * Invariant: Policy Engine validates and approves BEFORE the wallet signs or submits anything.
 * If BLOCK: Nothing is signed or submitted.
 * If REVIEW: Halts automatic execution; requires operator confirmation.
 */
export async function executeMetaMaskGatedTransaction(
  params: ExecuteMetaMaskGatedParams
): Promise<MetaMaskTransactionResult> {
  const {
    agentId,
    intent,
    policyEngine,
    walletAdapter,
    store,
    eventBus,
    category,
    description,
    autoApproveReview = false,
  } = params;

  // 1. Structured Schema Validation
  if (!intent || !intent.recipient || !isAddress(intent.recipient)) {
    throw new Error(`Invalid transaction intent: recipient "${intent?.recipient}" is not a valid EVM address.`);
  }

  if (typeof intent.amountMon !== 'number' || isNaN(intent.amountMon) || intent.amountMon <= 0) {
    throw new Error(`Invalid transaction intent: amountMon must be a positive number, received ${intent?.amountMon}.`);
  }

  // 2. Identify Economic Identity
  const agent = store.getAgent(agentId);
  if (!agent) {
    throw new Error(`Economic Identity for agent "${agentId}" not found in registry.`);
  }

  // Check balance
  if (agent.balanceMon < intent.amountMon) {
    const errorMsg = `Insufficient balance in Economic Identity treasury: Agent has ${agent.balanceMon} MON, attempted to spend ${intent.amountMon} MON.`;
    eventBus.emit({
      type: 'POLICY_BLOCKED',
      actor: agentId,
      summary: `Transaction BLOCKED: ${errorMsg}`,
      details: { agentId, amountMon: intent.amountMon, balanceMon: agent.balanceMon },
    });

    return {
      success: false,
      hash: '',
      chain: 'Monad Testnet',
      chainId: 10143,
      from: (walletAdapter.getWalletAddress() || agent.walletAddress) as `0x${string}`,
      to: intent.recipient,
      value: intent.amountMon,
      status: 'BLOCKED_BY_POLICY',
      timestamp: Date.now(),
      error: errorMsg,
      policyReason: errorMsg,
    };
  }

  // 3. ECON Policy Engine Pre-Flight Guard (MANDATORY STEP)
  const resolvedCategory = (category || (intent.category as ObjectType) || 'API_LICENSE') as ObjectType;
  const policyCheck: PolicyCheckResult = policyEngine.validateTransaction(
    agentId,
    intent.amountMon,
    resolvedCategory
  );

  // If Policy BLOCKS:
  if (!policyCheck.allowed) {
    eventBus.emit({
      type: 'POLICY_BLOCKED',
      actor: agentId,
      summary: `MetaMask Agent Wallet operation BLOCKED by ECON Policy: ${policyCheck.reason}`,
      details: {
        agentId,
        amountMon: intent.amountMon,
        category: resolvedCategory,
        violatesRule: policyCheck.violatesRule,
        reason: policyCheck.reason,
      },
    });

    return {
      success: false,
      hash: '',
      chain: 'Monad Testnet',
      chainId: 10143,
      from: (walletAdapter.getWalletAddress() || agent.walletAddress) as `0x${string}`,
      to: intent.recipient,
      value: intent.amountMon,
      status: 'BLOCKED_BY_POLICY',
      timestamp: Date.now(),
      error: policyCheck.reason,
      policyReason: policyCheck.reason,
    };
  }

  // If Policy requires REVIEW:
  if (policyCheck.requiresManualApproval && !autoApproveReview) {
    eventBus.emit({
      type: 'RECOVERY_REVIEW_REQUIRED',
      actor: agentId,
      summary: `MetaMask Agent Wallet operation escalated to REVIEW: ${policyCheck.reason || 'Manual authorization threshold exceeded.'}`,
      details: {
        agentId,
        amountMon: intent.amountMon,
        recipient: intent.recipient,
        requiresManualApproval: true,
      },
    });

    return {
      success: false,
      hash: '',
      chain: 'Monad Testnet',
      chainId: 10143,
      from: (walletAdapter.getWalletAddress() || agent.walletAddress) as `0x${string}`,
      to: intent.recipient,
      value: intent.amountMon,
      status: 'REQUIRES_REVIEW',
      timestamp: Date.now(),
      policyReason: policyCheck.reason || 'Threshold requires operator review',
    };
  }

  // 4. Policy Engine ALLOWED -> Proceed to MetaMask Agent Wallet Execution
  const walletResult = await walletAdapter.signAndSubmitAuthorizedTransaction(intent);

  if (!walletResult.success) {
    eventBus.emit({
      type: 'POLICY_BLOCKED',
      actor: agentId,
      summary: `MetaMask execution failed: ${walletResult.error}`,
      details: {
        agentId,
        error: walletResult.error,
        simulation: walletResult.simulation,
        threatScan: walletResult.threatScan,
      },
    });
    return walletResult;
  }

  // 5. Update ECON Treasury and Record Transaction
  store.updateAgentBalance(agentId, -intent.amountMon);

  const txId = `tx-mm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const mappedType = (intent.type === 'TRANSFER' ? 'BUY' : intent.type || 'BUY') as Transaction['type'];
  const settledTx: Transaction = {
    id: txId,
    type: mappedType,
    buyer: agentId,
    seller: intent.recipient,
    amountMon: intent.amountMon,
    status: 'SETTLED',
    timestamp: Date.now(),
    settlementHash: walletResult.hash,
    memo: description || intent.memo || `MetaMask Agent Wallet executed ${intent.type} on Monad`,
    protocolFeeMon: walletResult.feeMon || 0.00042,
    feeStream: 'TRANSACTION',
  };
  store.setTransaction(settledTx);

  // 6. Emit ECON Protocol Event
  eventBus.emit({
    type: 'SETTLEMENT_COMPLETED',
    actor: agentId,
    summary: `MetaMask Agent Wallet confirmed Monad tx ${typeof walletResult.hash === 'string' ? walletResult.hash.slice(0, 10) : ''}... (${intent.amountMon} MON to ${intent.recipient.slice(0, 8)}...)`,
    details: {
      agentId,
      amountMon: intent.amountMon,
      txHash: walletResult.hash,
      blockNumber: walletResult.blockNumber,
      from: walletResult.from,
      to: walletResult.to,
      simulationPassed: walletResult.simulation?.simulationPassed,
      threatScanPassed: walletResult.threatScan?.passed,
    },
  });

  // 7. Envio Indexer Notification
  try {
    globalEnvioClient.emitRealtimeEvent({
      id: `envio-${txId}`,
      type: 'SETTLEMENT_COMPLETED',
      actor: agentId,
      counterparty: intent.recipient,
      amountMon: intent.amountMon,
      summary: `MetaMask Agent Wallet transaction indexed on Monad: ${typeof walletResult.hash === 'string' ? walletResult.hash.slice(0, 10) : ''}...`,
      contractAddress: intent.recipient,
      txHash: typeof walletResult.hash === 'string' ? walletResult.hash : '',
      blockNumber: walletResult.blockNumber || 1049200,
      timestamp: Date.now(),
      explorerUrl: `https://testnet.monadexplorer.com/tx/${walletResult.hash}`,
    } as any);
  } catch (err) {
    console.warn('[MetaMaskPolicyExecutor] Envio indexer notification warning:', err);
  }

  return walletResult;
}

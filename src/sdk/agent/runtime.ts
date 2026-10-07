import { Agent, AgentId, ObjectId, Transaction, EscrowRecord, RecoveryPlan } from '../types';
import { EconomicStore } from '../store';
import { PolicyEngine } from '../policy';
import { EconomicEngine } from '../engine';
import { EscrowManager } from '../escrow';
import { EconomicGarbageCollector } from '../garbageCollector';
import { RecoveryEngine } from '../recovery';
import { EventBus } from '../events';
import { checkAgentCapability } from './capabilities';
import { QwenProvider, defaultQwenProvider } from '../../integrations/qwen/qwenProvider';
import { EconomicContext, ReasoningResult } from '../../integrations/qwen/qwenTypes';
import {
  MetaMaskAgentWalletAdapter,
  globalMetaMaskAgentWallet,
} from '../../integrations/metamask-agent-wallet/metaMaskAgentWalletAdapter';
import { executeMetaMaskGatedTransaction } from '../../integrations/metamask-agent-wallet/policyGatedExecutor';
import { MetaMaskTransactionIntent } from '../../integrations/metamask-agent-wallet/types';

export interface ProposedAction {
  type: 'PURCHASE' | 'CREATE_ESCROW' | 'RECOVER_OBJECT' | 'ECONOMIC_TRANSACTION';
  params: Record<string, any>;
  reasoning: string;
}

export interface ActionResult {
  success: boolean;
  actionType: string;
  txOrRecord?: any;
  blockedBy?: 'CAPABILITIES' | 'POLICY' | 'SETTLEMENT' | 'SIMULATION' | 'REVIEW';
  error?: string;
  auditSummary: string;
}

export class AgentRuntime {
  public readonly agentId: AgentId;
  private store: EconomicStore;
  private policy: PolicyEngine;
  private engine: EconomicEngine;
  private escrow: EscrowManager;
  private gc: EconomicGarbageCollector;
  private recovery: RecoveryEngine;
  private events: EventBus;
  private qwen: QwenProvider;
  private metaMaskWallet: MetaMaskAgentWalletAdapter;

  constructor(
    agentId: AgentId,
    store: EconomicStore,
    policy: PolicyEngine,
    engine: EconomicEngine,
    escrow: EscrowManager,
    gc: EconomicGarbageCollector,
    recovery: RecoveryEngine,
    events: EventBus,
    qwen: QwenProvider = defaultQwenProvider,
    metaMaskWallet: MetaMaskAgentWalletAdapter = globalMetaMaskAgentWallet
  ) {
    this.agentId = agentId;
    this.store = store;
    this.policy = policy;
    this.engine = engine;
    this.escrow = escrow;
    this.gc = gc;
    this.recovery = recovery;
    this.events = events;
    this.qwen = qwen;
    this.metaMaskWallet = metaMaskWallet;
  }

  public getAgent(): Agent {
    const agent = this.store.getAgent(this.agentId);
    if (!agent) throw new Error(`Agent ${this.agentId} not found in store`);
    return agent;
  }

  /**
   * Invokes Qwen 3.8 Max autonomous economic reasoning over bounded context.
   * Crucial invariant: Qwen only recommends; it NEVER directly authorizes or executes transactions.
   */
  public async reasonEconomicAction(context: EconomicContext): Promise<ReasoningResult> {
    const result = await this.qwen.reason(context);

    this.events.emit({
      type: 'QWEN_REASONING_PRODUCED',
      actor: this.agentId,
      summary: `Qwen 3.8 Max advised ${result.intent.action}${result.intent.target ? ` for ${result.intent.target}` : ''} (Confidence: ${(result.intent.confidence * 100).toFixed(0)}%)`,
      details: {
        intent: result.intent,
        modelUsed: result.modelUsed,
        available: result.available,
      },
    });

    return result;
  }

  /**
   * Dispatches a proposed action from an AI model through the economic runtime
   * Enforces: Capability Check -> Policy Guard -> Protocol Execution -> Event Emission
   */
  public async dispatchAction(proposal: ProposedAction): Promise<ActionResult> {
    const agent = this.getAgent();

    switch (proposal.type) {
      case 'PURCHASE': {
        // 1. Capability Permission Check
        const capCheck = checkAgentCapability(agent, 'canPurchaseServices');
        if (!capCheck.allowed) {
          return {
            success: false,
            actionType: 'PURCHASE',
            blockedBy: 'CAPABILITIES',
            error: capCheck.reason,
            auditSummary: `Blocked by capabilities: ${capCheck.reason}`,
          };
        }

        const { sellerId, objectId, amountMon, memo } = proposal.params;

        try {
          // 2. Economic Engine (which verifies Policy Engine and executes Settlement)
          const tx = await this.engine.buy(this.agentId, sellerId, objectId, amountMon, memo);
          return {
            success: true,
            actionType: 'PURCHASE',
            txOrRecord: tx,
            auditSummary: `Successfully executed purchase of ${amountMon} MON from ${sellerId}`,
          };
        } catch (err: any) {
          return {
            success: false,
            actionType: 'PURCHASE',
            blockedBy: err.message.includes('policy') ? 'POLICY' : 'SETTLEMENT',
            error: err.message,
            auditSummary: `Failed purchase: ${err.message}`,
          };
        }
      }

      case 'CREATE_ESCROW': {
        const capCheck = checkAgentCapability(agent, 'canUseEscrow');
        if (!capCheck.allowed) {
          return {
            success: false,
            actionType: 'CREATE_ESCROW',
            blockedBy: 'CAPABILITIES',
            error: capCheck.reason,
            auditSummary: `Blocked by capabilities: ${capCheck.reason}`,
          };
        }

        const { sellerId, amountMon, condition } = proposal.params;

        // Verify policy
        const policyCheck = this.policy.validateTransaction(this.agentId, amountMon);
        if (!policyCheck.allowed) {
          return {
            success: false,
            actionType: 'CREATE_ESCROW',
            blockedBy: 'POLICY',
            error: policyCheck.reason,
            auditSummary: `Policy blocked escrow: ${policyCheck.reason}`,
          };
        }

        try {
          const escrow = await this.escrow.createEscrow(this.agentId, sellerId, amountMon, condition);
          return {
            success: true,
            actionType: 'CREATE_ESCROW',
            txOrRecord: escrow,
            auditSummary: `Locked ${amountMon} MON into escrow contract ${escrow.id}`,
          };
        } catch (err: any) {
          return {
            success: false,
            actionType: 'CREATE_ESCROW',
            blockedBy: 'SETTLEMENT',
            error: err.message,
            auditSummary: `Escrow creation failed: ${err.message}`,
          };
        }
      }

      case 'RECOVER_OBJECT': {
        const capCheck = checkAgentCapability(agent, 'canRecoverValue');
        if (!capCheck.allowed) {
          return {
            success: false,
            actionType: 'RECOVER_OBJECT',
            blockedBy: 'CAPABILITIES',
            error: capCheck.reason,
            auditSummary: `Blocked by capabilities: ${capCheck.reason}`,
          };
        }

        const { objectId } = proposal.params;
        try {
          const plan = this.gc.plan(objectId);
          await this.recovery.execute(plan, true);
          return {
            success: true,
            actionType: 'RECOVER_OBJECT',
            txOrRecord: plan,
            auditSummary: `Recovered +${plan.expectedRecoveryMon} MON from stranded object ${objectId}`,
          };
        } catch (err: any) {
          return {
            success: false,
            actionType: 'RECOVER_OBJECT',
            blockedBy: 'POLICY',
            error: err.message,
            auditSummary: `Recovery failed: ${err.message}`,
          };
        }
      }

      case 'ECONOMIC_TRANSACTION': {
        const { recipient, amountMon, memo, category, type } = proposal.params;
        return await this.executeEconomicTransaction({
          type: type || 'BUY',
          recipient,
          amountMon,
          memo: memo || proposal.reasoning,
          category,
          economicIdentity: this.agentId,
        });
      }

      default:
        return {
          success: false,
          actionType: proposal.type,
          error: `Unknown action type: ${proposal.type}`,
          auditSummary: 'Unrecognized action',
        };
    }
  }

  /**
   * Controlled Agent Runtime Tool: executeEconomicTransaction
   *
   * Responsibilities:
   * 1. receive structured transaction intent
   * 2. validate schema
   * 3. identify Economic Identity
   * 4. load current policy
   * 5. validate recipient/contract/action
   * 6. run Policy Engine
   * 7. request MetaMask Agent Wallet execution
   * 8. return transaction hash/status
   * 9. emit ECON activity event
   *
   * Invariant: The LLM model is never given arbitrary wallet execution.
   */
  public async executeEconomicTransaction(intent: MetaMaskTransactionIntent): Promise<ActionResult> {
    const agent = this.getAgent();

    // 1. Capability Permission Check
    const capCheck = checkAgentCapability(agent, 'canPurchaseServices');
    if (!capCheck.allowed) {
      return {
        success: false,
        actionType: intent.type || 'ECONOMIC_TRANSACTION',
        blockedBy: 'CAPABILITIES',
        error: capCheck.reason,
        auditSummary: `Blocked by capabilities: ${capCheck.reason}`,
      };
    }

    try {
      const result = await executeMetaMaskGatedTransaction({
        agentId: this.agentId,
        intent: {
          ...intent,
          economicIdentity: this.agentId,
        },
        policyEngine: this.policy,
        walletAdapter: this.metaMaskWallet,
        store: this.store,
        eventBus: this.events,
        category: (intent.category || 'API_LICENSE') as any,
        description: intent.memo,
      });

      if (!result.success) {
        const blockedBy =
          result.status === 'BLOCKED_BY_POLICY'
            ? 'POLICY'
            : result.status === 'REQUIRES_REVIEW'
            ? 'REVIEW'
            : result.status === 'SIMULATION_FAILED'
            ? 'SIMULATION'
            : 'SETTLEMENT';

        return {
          success: false,
          actionType: intent.type || 'ECONOMIC_TRANSACTION',
          txOrRecord: result,
          blockedBy,
          error: result.error || result.policyReason || 'Transaction rejected',
          auditSummary: `MetaMask Agent Wallet operation rejected: ${result.error || result.policyReason}`,
        };
      }

      return {
        success: true,
        actionType: intent.type || 'ECONOMIC_TRANSACTION',
        txOrRecord: result,
        auditSummary: `Successfully executed ${intent.type} of ${intent.amountMon} MON via MetaMask Agent Wallet on Monad (tx: ${typeof result.hash === 'string' ? result.hash.slice(0, 10) : ''}...)`,
      };
    } catch (err: any) {
      return {
        success: false,
        actionType: intent.type || 'ECONOMIC_TRANSACTION',
        blockedBy: 'POLICY',
        error: err.message,
        auditSummary: `Execution error: ${err.message}`,
      };
    }
  }
}

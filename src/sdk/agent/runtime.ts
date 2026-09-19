import { Agent, AgentId, ObjectId, Transaction, EscrowRecord, RecoveryPlan } from '../types';
import { EconomicStore } from '../store';
import { PolicyEngine } from '../policy';
import { EconomicEngine } from '../engine';
import { EscrowManager } from '../escrow';
import { EconomicGarbageCollector } from '../garbageCollector';
import { RecoveryEngine } from '../recovery';
import { EventBus } from '../events';
import { checkAgentCapability } from './capabilities';

import { DiscoveryRegistry } from '../discovery';
import { AgentTools, createAgentTools } from './tools';

export interface ProposedAction {
  type: 'PURCHASE' | 'CREATE_ESCROW' | 'RECOVER_OBJECT';
  params: Record<string, any>;
  reasoning: string;
}

export interface ActionResult {
  success: boolean;
  actionType: string;
  txOrRecord?: any;
  blockedBy?: 'CAPABILITIES' | 'POLICY' | 'SETTLEMENT';
  error?: string;
  auditSummary: string;
}

export class AgentRuntime {
  public readonly agentId: AgentId;
  public readonly tools: AgentTools;
  private store: EconomicStore;
  private policy: PolicyEngine;
  private engine: EconomicEngine;
  private escrow: EscrowManager;
  private gc: EconomicGarbageCollector;
  private recovery: RecoveryEngine;
  private events: EventBus;
  private discovery?: DiscoveryRegistry;

  constructor(
    agentId: AgentId,
    store: EconomicStore,
    policy: PolicyEngine,
    engine: EconomicEngine,
    escrow: EscrowManager,
    gc: EconomicGarbageCollector,
    recovery: RecoveryEngine,
    events: EventBus,
    discovery?: DiscoveryRegistry
  ) {
    this.agentId = agentId;
    this.store = store;
    this.policy = policy;
    this.engine = engine;
    this.escrow = escrow;
    this.gc = gc;
    this.recovery = recovery;
    this.events = events;
    this.discovery = discovery;

    this.tools = createAgentTools(
      this.agentId,
      this.store,
      this.policy,
      this.engine,
      this.escrow,
      this.gc,
      this.recovery,
      this.discovery
    );
  }

  public getAgent(): Agent {
    const agent = this.store.getAgent(this.agentId);
    if (!agent) throw new Error(`Agent ${this.agentId} not found in store`);
    return agent;
  }

  /**
   * Universal tool execution dispatcher (used by MCP and autonomous loops)
   */
  public async executeTool(toolName: string, params: Record<string, any> = {}): Promise<any> {
    switch (toolName) {
      case 'discover':
        return this.tools.discover(params);
      case 'quote':
        return this.tools.quote(params as any);
      case 'buy':
        return this.tools.buy(params as any);
      case 'sell':
        return this.tools.sell(params as any);
      case 'exchange':
        return this.tools.exchange(params as any);
      case 'createEscrow':
      case 'create_escrow':
        return this.tools.createEscrow(params as any);
      case 'checkBalance':
      case 'check_balance':
        return this.tools.checkBalance(params);
      case 'listAssets':
      case 'list_assets':
        return this.tools.listAssets(params);
      case 'listObligations':
      case 'list_obligations':
        return this.tools.listObligations(params);
      case 'scanRecovery':
      case 'scan_recovery':
        return this.tools.scanRecovery(params);
      case 'requestRecovery':
      case 'request_recovery':
        return this.tools.requestRecovery(params as any);
      case 'getTransaction':
      case 'get_transaction':
        return this.tools.getTransaction(params as any);
      case 'getReputation':
      case 'get_reputation':
        return this.tools.getReputation(params);
      default:
        throw new Error(`Unrecognized economic tool: ${toolName}`);
    }
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

      default:
        return {
          success: false,
          actionType: proposal.type,
          error: `Unknown action type: ${proposal.type}`,
          auditSummary: 'Unrecognized action',
        };
    }
  }
}

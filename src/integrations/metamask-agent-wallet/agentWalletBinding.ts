import { Address } from 'viem';
import { AgentWalletBindingRecord, MetaMaskWalletMode } from './types';
import { Agent, AgentId } from '../../sdk/types';
import { EconomicStore } from '../../sdk/store';
import { EventBus } from '../../sdk/events';

/**
 * Manages the explicit binding between:
 * 1. ECON Economic Identity (Sovereign entity, reputation, policy)
 * 2. MetaMask Agent Wallet (Programmatic wallet control layer)
 * 3. Monad Settlement Account (On-chain EVM address on chain 10143)
 */
export class EconomicIdentityWalletBindingRegistry {
  private bindings: Map<AgentId, AgentWalletBindingRecord> = new Map();
  private store?: EconomicStore;
  private eventBus?: EventBus;

  constructor(store?: EconomicStore, eventBus?: EventBus) {
    this.store = store;
    this.eventBus = eventBus;
  }

  /**
   * Explicitly binds an Economic Identity to a MetaMask Agent Wallet and its Monad settlement address.
   */
  public bind(params: {
    agentId: AgentId;
    agentName?: string;
    walletMode: MetaMaskWalletMode;
    walletAddress: Address;
    monadAddress?: Address;
  }): AgentWalletBindingRecord {
    const { agentId, agentName, walletMode, walletAddress, monadAddress } = params;
    const finalMonadAccount = monadAddress || walletAddress;

    const record: AgentWalletBindingRecord = {
      economicIdentityId: agentId,
      economicIdentityName: agentName || agentId,
      walletProvider: 'METAMASK_AGENT_WALLET',
      walletMode,
      walletAddress,
      settlementNetwork: 'Monad',
      settlementChainId: 10143,
      settlementAccount: finalMonadAccount,
      boundAt: Date.now(),
      active: true,
    };

    this.bindings.set(agentId, record);

    // Update agent in ECON store if available
    if (this.store) {
      const agent = this.store.getAgent(agentId);
      if (agent) {
        agent.controllerType = 'METAMASK_AGENT_WALLET' as any;
        (agent as any).metaMaskAgentWallet = {
          address: walletAddress,
          mode: walletMode,
          status: 'CONNECTED',
          networkChainId: 10143,
        };
        agent.walletAddress = finalMonadAccount;
        this.store.setAgent(agent);
      }
    }

    if (this.eventBus) {
      this.eventBus.emit({
        type: 'AGENT_REGISTERED',
        actor: agentId,
        summary: `Bound Economic Identity ${agentId} to MetaMask Agent Wallet (${walletAddress.slice(0, 8)}...) on Monad`,
        details: record,
      });
    }

    return record;
  }

  public getBinding(agentId: AgentId): AgentWalletBindingRecord | null {
    return this.bindings.get(agentId) || null;
  }

  public getAllBindings(): AgentWalletBindingRecord[] {
    return Array.from(this.bindings.values());
  }

  public unbind(agentId: AgentId): boolean {
    return this.bindings.delete(agentId);
  }
}

export const globalAgentWalletBinding = new EconomicIdentityWalletBindingRegistry();

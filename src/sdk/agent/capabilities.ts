import { Agent, AgentCapabilities } from '../types';

export const DEFAULT_AGENT_CAPABILITIES: AgentCapabilities = {
  // Economic Capabilities
  canPurchaseServices: true,
  canSellAssets: true,
  canExchangeAssets: true,
  canCreateContracts: true,
  canUseEscrow: true,
  canReceivePayments: true,
  canTransferObjects: true,
  canRecoverValue: true,

  // Data & Compute Capabilities
  canSearchDatasets: true,
  canPurchaseApis: true,
  canSellDatasets: false,
  canLeaseCompute: false,

  // Autonomy Rules
  autonomousTransactions: true,
  automaticRecovery: true,
  automaticMarketplaceListing: false,
};

export const RESTRICTED_AGENT_CAPABILITIES: AgentCapabilities = {
  canPurchaseServices: false,
  canSellAssets: false,
  canExchangeAssets: false,
  canCreateContracts: false,
  canUseEscrow: false,
  canReceivePayments: true,
  canTransferObjects: false,
  canRecoverValue: false,
  canSearchDatasets: true,
  canPurchaseApis: false,
  canSellDatasets: false,
  canLeaseCompute: false,
  autonomousTransactions: false,
  automaticRecovery: false,
  automaticMarketplaceListing: false,
};

export function checkAgentCapability(
  agent: Agent,
  capability: keyof AgentCapabilities
): { allowed: boolean; reason?: string } {
  const caps = agent.capabilities || DEFAULT_AGENT_CAPABILITIES;

  if (!caps[capability]) {
    return {
      allowed: false,
      reason: `Agent ${agent.name} lacks capability '${capability}'. Economic action blocked by agent runtime permissions.`,
    };
  }

  return { allowed: true };
}

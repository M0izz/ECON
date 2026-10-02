/**
 * TypeScript Type Definitions for Nansen On-Chain Intelligence in ECON
 * Chain: Monad (Chain ID 10143)
 */

export interface NansenLabel {
  label: string;
  category?: string;
  type?: string;
  source?: string;
}

export interface NansenBalance {
  tokenAddress?: string;
  tokenSymbol: string;
  symbol?: string;
  tokenName?: string;
  balance: string | number;
  balanceFormatted: number;
  balanceUsd?: number;
  chain: string;
}

export interface NansenTransaction {
  txHash: string;
  hash?: string;
  timestamp: number;
  from: string;
  to: string;
  valueMon?: number;
  value?: number;
  valueUsd?: number;
  method?: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
}

export interface NansenCounterparty {
  address: string;
  label?: string;
  interactionCount: number;
  volumeMon?: number;
  volumeUsd?: number;
  lastInteraction?: number;
}

export interface NansenRelatedWallet {
  address: string;
  relationshipType: string;
  confidence?: number;
  reason?: string;
  label?: string;
  clusterId?: string;
}

/**
 * Normalized ECON Intelligence Model (Section 12)
 * Cleanly decouples raw external Nansen schema from ECON business logic.
 */
export interface EconomicIntelligence {
  address: string;
  chain: string;
  labels: NansenLabel[];
  balances: NansenBalance[];
  recentTransactions: NansenTransaction[];
  counterparties: NansenCounterparty[];
  relatedWallets: NansenRelatedWallet[];
  fetchedAt: string;
  expiresAt: number;
  source: 'nansen';
  available: boolean;
  error?: string;
  status?: number;
}

export interface CounterpartyIntelligenceContext {
  targetAddress: string;
  targetRole: 'SELLER' | 'BUYER' | 'AGENT' | 'RECOVERY_TARGET' | 'GENERAL';
  intelligence: EconomicIntelligence;
  evaluatedAt: number;
}

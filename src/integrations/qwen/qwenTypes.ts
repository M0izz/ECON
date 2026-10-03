/**
 * Qwen 3.8 Max Integration Types for ECON Economic Operating Layer
 */

import { AgentId, ObjectId, ObjectType, RecoveryStrategy } from '../../sdk/types';
import { CounterpartyIntelligenceContext } from '../nansen/nansenTypes';

export type EconomicActionType =
  | 'DISCOVER'
  | 'BUY'
  | 'SELL'
  | 'TRANSFER'
  | 'RECOVER'
  | 'KEEP'
  | 'ESCROW'
  | 'NEEDS_INFORMATION';

/**
 * Structured Economic Intent output produced by Qwen 3.8 Max.
 * Validated before passing to ECON Policy Engine.
 */
export interface EconomicIntent {
  action: EconomicActionType;
  target?: string;
  counterpartyAddress?: string;
  amountMon?: number;
  objectId?: ObjectId;
  category?: ObjectType;
  strategy?: RecoveryStrategy;
  expectedValueMon?: number;
  confidence: number; // 0.0 - 1.0
  reason: string;
  timestamp: number;
}

/**
 * Bounded Economic Context supplied to Qwen 3.8 Max.
 */
export interface EconomicContext {
  agentId: AgentId;
  agentName?: string;
  agentRole?: string;
  treasuryBalanceMon: number;
  policy: {
    maxPerTransaction: number;
    dailySpendingLimit: number;
    minRetainedBalance: number;
    allowedCategories: string[];
    requireApprovalAbove: number;
    autoRecoveryEnabled: boolean;
  };
  objective: string;
  candidateServices?: Array<{
    id: string;
    providerId: string;
    providerName: string;
    capability: string;
    priceMon: number;
    latencyMs: number;
    reputation: number;
    minSLA: number;
    providerAddress?: string;
  }>;
  recoveryCandidate?: {
    objectId: string;
    objectType: string;
    units: number;
    decayProbability: number;
    options: Array<{
      strategy: RecoveryStrategy;
      yieldMon: number;
      label: string;
      targetRecipient?: string;
    }>;
  };
  counterpartyIntelligence?: CounterpartyIntelligenceContext;
  economicHistorySnippet?: Array<{
    type: string;
    amountMon?: number;
    timestamp: number;
    status: string;
  }>;
}

export interface QwenConfig {
  provider: 'qwen';
  model: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  cacheTtlMs: number;
}

export const DEFAULT_QWEN_CONFIG: QwenConfig = {
  provider: 'qwen',
  model: 'qwen3.8-max',
  baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
  temperature: 0.1,
  maxTokens: 1024,
  timeoutMs: 15000,
  cacheTtlMs: 3 * 60 * 1000, // 3 minutes cache
};

export interface ReasoningResult {
  intent: EconomicIntent;
  modelUsed: string;
  rawResponse?: string;
  durationMs: number;
  available: boolean;
  error?: string;
}

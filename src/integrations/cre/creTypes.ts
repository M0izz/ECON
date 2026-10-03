/**
 * Chainlink Runtime Environment (CRE) Integration Types for ECON
 * Verifiable workflow automation for the Economic Garbage Collector.
 */

import { ObjectId, AgentId, RecoveryStrategy, EconomicObject, RecoveryPlan } from '../../sdk/types';
import { EconomicIntent } from '../qwen/qwenTypes';

export type CREWorkflowStatus = 'ACTIVE' | 'SIMULATED' | 'NOT_DEPLOYED';

export type CRETriggerType = 'CRON_SCHEDULE' | 'EVM_LOG_STRANDED';

export interface CREWorkflowConfig {
  workflowId: string;
  workflowName: string;
  cronSchedule: string; // e.g. "0 */5 * * * *"
  network: 'monad-testnet' | 'local-simulation';
  chainId: number; // 10143 for Monad Testnet
  contracts: {
    economicObjectRegistry: `0x${string}`;
    identityRegistry: `0x${string}`;
    marketplace: `0x${string}`;
  };
  policyGuards: {
    requirePolicyEngineApproval: boolean;
    disallowNonTransferableMovements: boolean;
    autoRecoveryCapMon: number;
  };
}

export interface CRERecoveryCandidate {
  objectId: ObjectId;
  ownerId: AgentId;
  type: string;
  denomination: string;
  remainingUnits: number;
  projectedRequirement: number;
  idleExcessUnits: number;
  nominalValueMon: number;
  expiryTimestamp: number;
  timeLeftHours: number;
  transferable: boolean;
  status: string;
}

export interface CREPolicyDecision {
  allowed: boolean;
  requiresReview: boolean;
  ruleViolated?: string;
  reason: string;
  timestamp: number;
}

export interface CREWorkflowReport {
  executionId: string;
  triggerType: CRETriggerType;
  triggeredAt: number;
  completedAt: number;
  durationMs: number;
  status: 'SUCCESS' | 'REVIEW_REQUIRED' | 'BLOCKED_BY_POLICY' | 'NO_CANDIDATES' | 'FAILED';
  isSimulated: boolean;
  candidate?: CRERecoveryCandidate;
  qwenRecommendation?: EconomicIntent;
  policyDecision?: CREPolicyDecision;
  settlementTxHash?: string;
  error?: string;
  verifiableAuditSummary: string;
}

export interface CRETelemetry {
  workflowId: string;
  status: CREWorkflowStatus;
  totalRuns: number;
  successfulSweeps: number;
  reviewsTriggered: number;
  policyBlocks: number;
  cumulativeRecoveredMon: number;
  lastRunReport?: CREWorkflowReport;
}

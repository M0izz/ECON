import {
  AgentId,
  ObjectId,
  ObjectType,
  RecoveryId,
  RecoveryPlan,
  RecoveryStrategy,
  ExpectedValueCalculation,
} from '../types';

export type EntitlementStatus = 'YES' | 'NO' | 'UNKNOWN';

export type RecoveryEligibilityReason =
  | 'ELIGIBLE_FOR_MARKETPLACE'
  | 'ELIGIBLE_FOR_PEER_TRANSFER'
  | 'ELIGIBLE_FOR_REFUND'
  | 'ELIGIBLE_FOR_TRANSFER'
  | 'TRANSFERABILITY_UNKNOWN'
  | 'NON_TRANSFERABLE'
  | 'NON_REFUNDABLE'
  | 'OBJECT_EXPIRED'
  | 'CONSUMED_RESOURCE'
  | 'ACTIVE_OBLIGATION'
  | 'OWNERSHIP_MISMATCH'
  | 'INSUFFICIENT_USAGE_DATA'
  | 'VALUATION_UNAVAILABLE'
  | 'ALREADY_RECOVERED'
  | 'POLICY_REVIEW_REQUIRED'
  | 'POLICY_BLOCKED';

export type RecoveryLifecycleState =
  | 'DETECTED'
  | 'EVALUATED'
  | 'ELIGIBLE'
  | 'INELIGIBLE'
  | 'REVIEW_REQUIRED'
  | 'RECOMMENDED'
  | 'POLICY_APPROVED'
  | 'EXECUTING'
  | 'SETTLED'
  | 'REJECTED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface UsageForecast {
  estimatedFutureRequirement: number;
  expectedUsageWindowHours: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  dataPointsUsed: number;
  provenance: string;
  isDefensible: boolean;
}

export interface ValuationDetail {
  grossExpectedMon: number;
  expectedFeesMon: number;
  executionCostMon: number;
  netExpectedMon: number;
  evidenceSource: string;
  isAvailable: boolean;
  assumptions: string[];
}

export interface RecoveryValuations {
  keep: ValuationDetail;
  sell: ValuationDetail;
  transfer: ValuationDetail;
  refund: ValuationDetail;
}

export interface RecoveryCandidate {
  objectId: ObjectId;
  ownerId: AgentId;
  resourceType: ObjectType;
  remainingQuantity: number;
  originalQuantity: number;
  nominalValueMon: number;
  projectedRequirement: number;
  potentialSurplus: number;
  expiryTimestamp: number;
  timeLeftHours: number;
  transferability: EntitlementStatus;
  refundability: EntitlementStatus;
  sellability: EntitlementStatus;
  activeObligations: number;
  eligibilityStatus: boolean;
  reasonCode: RecoveryEligibilityReason;
  evidence: string;
  confidence: number;
  detectedAt: number;
}

export interface StructuredRecommendation {
  id: RecoveryId;
  objectId: ObjectId;
  ownerId: AgentId;
  proposedStrategy: RecoveryStrategy;
  quantity: number;
  grossExpectedMon: number;
  expectedCostsMon: number;
  netExpectedMon: number;
  eligibilityEvidence: string;
  reasonCode: RecoveryEligibilityReason;
  confidence: number;
  provenance: 'DETERMINISTIC_ENGINE' | 'QWEN_ASSISTED';
  lifecycleState: RecoveryLifecycleState;
  requiredApproval: boolean;
  expiresAt: number;
  idempotencyKey: string;
  targetBuyerId?: AgentId;
  calculations: ExpectedValueCalculation;
  valuations: RecoveryValuations;
}

export interface SecondaryMarketListing {
  listingId: string;
  objectId: ObjectId;
  sellerId: AgentId;
  resourceType: ObjectType;
  availableQuantity: number;
  expiryTimestamp: number;
  askingPriceMon: number;
  priceUnit: string;
  transferabilityEvidence: string;
  status: 'ACTIVE' | 'PURCHASED' | 'CANCELLED' | 'EXPIRED';
  onChainTxHash?: string;
  createdAt: number;
  purchasedBy?: AgentId;
  purchasedAt?: number;
  settlementTxHash?: string;
}

export interface RecoveryExecutionResult {
  success: boolean;
  action: 'LIST_ON_MARKETPLACE' | 'PEER_TRANSFER' | 'ISSUER_REFUND' | 'RETAIN' | 'REJECTED';
  planId: RecoveryId;
  objectId: ObjectId;
  recoveredAmountMon: number;
  feeMon: number;
  txHash?: string;
  listingId?: string;
  state: RecoveryLifecycleState;
  reconciled: boolean;
  error?: string;
}

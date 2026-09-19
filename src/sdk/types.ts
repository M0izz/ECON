/**
 * ECON Protocol Type Definitions
 * Represents agents, economic objects, policies, transactions, escrows, and garbage collection.
 */

export type AgentId = string;
export type ObjectId = string;
export type TransactionId = string;
export type EscrowId = string;
export type RecoveryId = string;
export type ObligationId = string;

export type ObjectType =
  | 'GPU_COMPUTE_CREDIT'
  | 'API_LICENSE'
  | 'DATA_SUBSCRIPTION'
  | 'STORAGE_CREDIT'
  | 'ESCROW_DEPOSIT'
  | 'COMPUTE_RESERVATION'
  | 'MODEL_WEIGHT_LICENSE';

export type ObjectStatus =
  | 'ACTIVE'
  | 'IN_ESCROW'
  | 'STRANDED'
  | 'RECOVERED'
  | 'EXPIRED'
  | 'LIQUIDATED';

export interface EconomicObject {
  id: ObjectId;
  owner: AgentId;
  type: ObjectType;
  denomination: string; // e.g., "GPU-minutes", "API-requests", "GB-month"
  quantity: number;
  valueMon: number; // Estimated nominal value in MON
  expiryTimestamp: number; // Unix timestamp in ms
  transferable: boolean;
  status: ObjectStatus;
  metadataHash: string;
  createdAt: number;
  // Historical utilization metrics used by GC
  allocationQuantity: number;
  consumedQuantity: number;
  utilizationRatePerHour: number;
  projectedRequirement: number;
}

export interface AgentPolicy {
  maxPerTransaction: number; // In MON
  dailySpendingLimit: number; // In MON
  allowedCategories: ObjectType[];
  requireApprovalAbove: number; // In MON
  autoRecoveryEnabled: boolean;
  autoTransferEnabled: boolean;
  minRetainedBalance: number; // In MON floor that cannot be spent
}

export interface AgentCapabilities {
  // Economic Capabilities
  canPurchaseServices: boolean;
  canSellAssets: boolean;
  canExchangeAssets: boolean;
  canCreateContracts: boolean;
  canUseEscrow: boolean;
  canReceivePayments: boolean;
  canTransferObjects: boolean;
  canRecoverValue: boolean;

  // Data & Compute Capabilities
  canSearchDatasets: boolean;
  canPurchaseApis: boolean;
  canSellDatasets: boolean;
  canLeaseCompute: boolean;

  // Autonomy Rules
  autonomousTransactions: boolean;
  automaticRecovery: boolean;
  automaticMarketplaceListing: boolean;
}

export type AgentOrigin = 'NATIVE' | 'EXTERNAL';
export type ModelProvider = 'OPENAI' | 'ANTHROPIC' | 'GEMINI' | 'LOCAL' | 'EXTERNAL_RUNTIME';
export type AutonomyLevel = 'MANUAL' | 'SEMI_AUTONOMOUS' | 'FULL';

export interface Agent {
  id: AgentId;
  name: string;
  controller: string; // Controller address or entity
  walletAddress: string;
  balanceMon: number;
  reputationScore: number; // 0.0 to 100.0%
  active: boolean;
  registeredAt: number;
  policy: AgentPolicy;
  activeObligations: number; // MON owed in active locks

  // Extended Agent Layer
  origin?: AgentOrigin;
  purpose?: string;
  modelProvider?: ModelProvider;
  capabilities?: AgentCapabilities;
  autonomyLevel?: AutonomyLevel;
}

export type EconomicAgent = Agent;

export type ObligationType =
  | 'ESCROW_PAYMENT'
  | 'SUBSCRIPTION_RENEWAL'
  | 'COMPUTE_DEBT'
  | 'SERVICE_AGREEMENT';

export type ObligationStatus =
  | 'PENDING'
  | 'DUE'
  | 'FULFILLED'
  | 'OVERDUE'
  | 'CANCELLED';

export interface Obligation {
  id: ObligationId;
  debtor: AgentId;
  creditor: AgentId;
  amountMon: number;
  type: ObligationType;
  status: ObligationStatus;
  dueTimestamp: number;
  createdAt: number;
  description: string;
  referenceId?: string; // e.g. escrowId or contractId
  fulfilledAt?: number;
}

export type EscrowStatus =
  | 'LOCKED'
  | 'DELIVERED'
  | 'VERIFIED'
  | 'RELEASED'
  | 'EXPIRED'
  | 'REFUNDED';

export interface EscrowRecord {
  id: EscrowId;
  buyer: AgentId;
  seller: AgentId;
  amountMon: number;
  condition: string;
  deliveryHash?: string;
  status: EscrowStatus;
  createdAt: number;
  deadline: number;
  releasedAt?: number;
}

export type TransactionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'SETTLED'
  | 'FAILED'
  | 'BLOCKED_BY_POLICY';

export interface Transaction {
  id: TransactionId;
  type: 'BUY' | 'SELL' | 'ESCROW_LOCK' | 'ESCROW_RELEASE' | 'RECOVERY_TRANSFER' | 'REFUND';
  buyer: AgentId;
  seller: AgentId;
  amountMon: number;
  objectId?: ObjectId;
  escrowId?: EscrowId;
  status: TransactionStatus;
  timestamp: number;
  settlementHash?: string;
  memo: string;
}

export interface ServiceOffering {
  id: string;
  providerId: AgentId;
  providerName: string;
  capability: string; // e.g. "satellite-imagery", "gpu-cluster", "synthetic-data"
  description: string;
  priceMon: number;
  unit: string;
  latencyMs: number;
  reputation: number;
  availability: boolean;
  minSLA: number; // e.g. 99.5%
}

export type RecoveryStrategy = 'KEEP' | 'SELL' | 'TRANSFER' | 'REFUND';

export interface ExpectedValueCalculation {
  keepValue: number;
  sellValue: number;
  transferValue: number;
  refundValue: number;
}

export interface RecoveryPlan {
  id: RecoveryId;
  objectId: ObjectId;
  ownerId: AgentId;
  detectedAt: number;
  strandedQuantity: number;
  strandedValueMon: number;
  recommendedStrategy: RecoveryStrategy;
  confidenceScore: number; // 0.0 - 1.0
  expectedRecoveryMon: number;
  reason: string;
  targetBuyerId?: AgentId;
  status: 'PROPOSED' | 'APPROVED' | 'EXECUTING' | 'EXECUTED' | 'REJECTED';
  calculations: ExpectedValueCalculation;
  executedAt?: number;
}

export type ECONEventType =
  | 'AGENT_REGISTERED'
  | 'OBJECT_CREATED'
  | 'TRANSACTION_CREATED'
  | 'ESCROW_LOCKED'
  | 'DELIVERY_SUBMITTED'
  | 'DELIVERY_VERIFIED'
  | 'SETTLEMENT_COMPLETED'
  | 'STRANDED_VALUE_DETECTED'
  | 'RECOVERY_PROPOSED'
  | 'RECOVERY_EXECUTED'
  | 'POLICY_BLOCKED'
  | 'POLICY_UPDATED'
  | 'OBLIGATION_CREATED'
  | 'OBLIGATION_FULFILLED'
  | 'OBLIGATION_CANCELLED';

export interface ECONEvent {
  id: string;
  type: ECONEventType;
  timestamp: number;
  actor: AgentId;
  summary: string;
  details: Record<string, any>;
}

export interface SettlementResult {
  success: boolean;
  txHash: string;
  blockNumber: number;
  settledAt: number;
  feeMon: number;
  error?: string;
}

export type SettlementMode = 'LOCAL_SIMULATION' | 'MONAD_TESTNET';

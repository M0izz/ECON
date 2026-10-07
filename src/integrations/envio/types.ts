/**
 * TypeScript type definitions for ECON Envio HyperIndex integration
 */

export interface IndexedAgent {
  id: string;
  controller: string;
  metadataHash: string;
  agentURI: string;
  active: boolean;
  registeredAt: string; // BigInt as string
  registeredBlock: string;
  transactionCount: string;
  totalVolumeMon: string;
  txHash: string;
}

export interface IndexedEconomicIdentity {
  id: string;
  owner: string;
  agentAddress: string;
  metadataHash: string;
  agentURI: string;
  active: boolean;
  registeredAt: string;
  registeredBlock: string;
  transactionCount: string;
  totalVolumeMon: string;
  txHash: string;
}

export interface IndexedTransaction {
  id: string;
  sender: string;
  recipient: string;
  amount?: string; // in wei
  amountMon?: string;
  status?: string;
  txType?: string;
  transactionType?: string;
  timestamp: string;
  txHash: string;
  blockNumber: string;
  relatedObjectId?: string | null;
  relatedEscrowId?: string | null;
}

export interface IndexedRecoveryOpportunity {
  id: string;
  objectId: string;
  owner: string;
  detectedValue: string; // in wei
  remainingUnits: string;
  projectedRequirement: string;
  transferable: boolean;
  expiryTimestamp: string;
  status: string;
  detectedAt: string;
  txHash?: string | null;
}

export interface IndexedRecoveryAction {
  id: string;
  objectId: string;
  agent: string;
  detectedValue: string;
  strategy: string;
  policyResult: string;
  recoveredValue: string; // in wei
  executionStatus: string;
  txHash: string;
  blockNumber: string;
  timestamp: string;
}

export interface IndexedPolicyDecision {
  id: string;
  actor: string;
  target?: string | null;
  policyStatus: 'ALLOWED' | 'REVIEW_REQUIRED' | 'BLOCKED';
  ruleViolated?: string | null;
  reason: string;
  timestamp: string;
  txHash?: string | null;
}

export type EnvioDataSourceStatus = 'LIVE' | 'INDEXING' | 'SIMULATION' | 'NO_DATA';

export interface IndexedEconomicObject {
  id: string;
  owner: string;
  objectType: number | string;
  value?: string; // in wei
  valuationMon?: number | string;
  unitsRemaining?: string;
  unitDenomination?: string;
  expiry?: string;
  expiryTimestamp?: string;
  transferable: boolean;
  status: 'ACTIVE' | 'IN_ESCROW' | 'STRANDED' | 'RECOVERED' | 'EXPIRED' | 'LIQUIDATED';
  createdAt?: string;
  updatedAt?: string;
  txHash?: string;
  blockNumber?: string;
  lastUpdatedTx?: string;
  lastUpdatedBlock?: string;
}

export type IndexedEscrow = IndexedEscrowRecord;

export interface IndexedMarketplaceListing {
  id: string;
  objectId: string;
  seller: string;
  buyer?: string | null;
  price: string; // in wei
  fee?: string | null;
  active: boolean;
  listedAt: string;
  purchasedAt?: string | null;
  cancelledAt?: string | null;
  txHash: string;
}

export interface IndexedEscrowRecord {
  id: string;
  buyer: string;
  seller: string;
  amount?: string; // in wei
  amountMon?: string;
  state?: string;
  conditionHash?: string;
  deadline?: string;
  status?: 'LOCKED' | 'DELIVERED' | 'RELEASED' | 'REFUNDED';
  linkedObjectId?: string | null;
  deliveryProof?: string | null;
  createdAt?: string;
  releasedAt?: string | null;
  refundedAt?: string | null;
  txHash?: string;
  blockNumber?: string;
  settledAt?: string | null;
  settledTx?: string | null;
  createdTx?: string;
}

export interface IndexedCreditReservation {
  id: string;
  agentId: string;
  requester: string;
  amount: string;
  consumedAmount?: string | null;
  refundedAmount?: string | null;
  recycledAmount?: string | null;
  status: 'RESERVED' | 'SETTLED' | 'RELEASED' | 'RECYCLED';
  createdAt: string;
  settledAt?: string | null;
  txHash: string;
}

export interface IndexedRecoveryRecord {
  id: string;
  objectId: string;
  agent: string;
  recoveryType: string;
  detectedValue?: string | null;
  strategy?: string | null;
  policyResult?: string | null;
  recoveredValue: string; // in wei
  status: string;
  executionStatus?: string | null;
  txHash: string;
  blockNumber: string;
  timestamp: string;
}

export type ECONEventType =
  | 'AGENT_REGISTERED'
  | 'AGENT_STATUS_CHANGED'
  | 'ECONOMIC_OBJECT_CREATED'
  | 'OBJECT_TRANSFERRED'
  | 'OBJECT_STATUS_UPDATED'
  | 'ESCROW_LOCKED'
  | 'ESCROW_DELIVERED'
  | 'ESCROW_RELEASED'
  | 'ESCROW_REFUNDED'
  | 'OBJECT_LISTED'
  | 'LISTING_CANCELLED'
  | 'OBJECT_PURCHASED'
  | 'CREDITS_RESERVED'
  | 'RESERVATION_SETTLED'
  | 'RESERVATION_RELEASED'
  | 'RECOVERY_EXECUTED'
  | 'SETTLEMENT_COMPLETED'
  | 'POLICY_BLOCKED';

export interface IndexedEconomicEvent {
  id: string;
  type: ECONEventType | string;
  actor: string;
  counterparty?: string | null;
  amount?: string | null;
  summary: string;
  contractAddress: string;
  txHash: string;
  blockNumber: string;
  timestamp: string;
  relatedObjectId?: string | null;
  relatedEscrowId?: string | null;
}

export interface IndexedDailyMetric {
  id: string;
  date: string;
  totalTransactions: string;
  totalVolumeMon: string;
  marketplaceVolumeMon: string;
  escrowVolumeMon: string;
  recoveredValueMon: string;
  objectsCreated: string;
  activeAgents: string;
}

export interface EnvioSyncStatus {
  isConnected: boolean;
  endpoint: string;
  latestBlock?: number;
  totalIndexedEvents: number;
  network: 'Monad Testnet';
  chainId: 10143;
  lastChecked: number;
  error?: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface EconomicEventFilter extends PaginationParams {
  type?: string;
  actor?: string;
  agentId?: string;
  objectId?: string;
  timeRange?: '24H' | '7D' | '30D' | 'ALL';
}

export interface FormattedEconomicEvent {
  id: string;
  type: string;
  actor: string;
  actorShort: string;
  counterparty?: string | null;
  counterpartyShort?: string | null;
  amountMon: number;
  summary: string;
  contractAddress: string;
  txHash: string;
  txHashShort: string;
  blockNumber: number;
  timestamp: number; // in milliseconds
  relativeTime: string;
  exactTime: string;
  explorerUrl: string;
  isEnvioIndexed: boolean;
}

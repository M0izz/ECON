import { EconomicObject, Agent, AgentPolicy } from '../src/sdk/types';
import { EconomicStore } from '../src/sdk/store';
import { EventBus } from '../src/sdk/events';
import { PolicyEngine } from '../src/sdk/policy';
import { LocalSettlementAdapter } from '../src/settlement/LocalSettlementAdapter';
import { EconomicGarbageCollector } from '../src/sdk/garbageCollector';
import { RecoveryEngine } from '../src/sdk/recovery';

export const RESEARCH_AGENT_ID = 'ResearchAgent-42';
export const PEER_CONSUMER_ID = 'ConsumerAgent-99';

export const BASE_POLICY: AgentPolicy = {
  maxPerTransaction: 5.0,
  dailySpendingLimit: 20.0,
  allowedCategories: ['GPU_COMPUTE_CREDIT', 'API_LICENSE', 'DATA_SUBSCRIPTION'],
  requireApprovalAbove: 4.0,
  autoRecoveryEnabled: true,
  autoTransferEnabled: true,
  minRetainedBalance: 2.0,
};

export const createFixtureResearchAgent = (overridePolicy?: Partial<AgentPolicy>): Agent => ({
  id: RESEARCH_AGENT_ID,
  name: 'ResearchAgent-42',
  controller: '0x1842B6792A645c110E663B514571A15C198547A1',
  walletAddress: '0x1842B6792A645c110E663B514571A15C198547A1',
  balanceMon: 25.0,
  reputationScore: 99.0,
  active: true,
  registeredAt: Date.now() - 86400000,
  policy: { ...BASE_POLICY, ...overridePolicy },
  activeObligations: 0,
});

export const createFixturePeerAgent = (): Agent => ({
  id: PEER_CONSUMER_ID,
  name: 'ConsumerAgent-99',
  controller: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  balanceMon: 50.0,
  reputationScore: 95.0,
  active: true,
  registeredAt: Date.now() - 86400000,
  policy: BASE_POLICY,
  activeObligations: 0,
});

/**
 * Primary Canonical Golden-Path Fixture: OBJ-GPU-82
 */
export const createFixture_OBJ_GPU_82 = (expiryMsFromNow: number = 8 * 3600000): EconomicObject => ({
  id: 'OBJ-GPU-82',
  owner: RESEARCH_AGENT_ID,
  type: 'GPU_COMPUTE_CREDIT',
  denomination: 'GPU-minutes',
  quantity: 100,
  allocationQuantity: 100,
  consumedQuantity: 18, // 82 remaining
  valueMon: 10.0,
  expiryTimestamp: Date.now() + expiryMsFromNow,
  transferable: true,
  status: 'ACTIVE',
  metadataHash: '0x8282828282828282828282828282828282828282828282828282828282828282',
  createdAt: Date.now() - 3600000 * 4,
  utilizationRatePerHour: 2.0,
  projectedRequirement: 17, // Apparent arithmetic surplus = 65
  ...({
    transferability: 'YES',
    refundability: 'NO',
    sellability: 'YES',
    sourceOfTruth: 'TEST FIXTURE: DETERMINISTIC_GPU_ALLOCATION',
    activeObligations: 0,
    usageHistory: [
      { timestamp: Date.now() - 3600000 * 18, unitsUsed: 6 },
      { timestamp: Date.now() - 3600000 * 12, unitsUsed: 6 },
      { timestamp: Date.now() - 3600000 * 6, unitsUsed: 6 },
    ],
  } as any),
});

/**
 * Fixture: Non-transferable compute credits
 */
export const createFixture_NonTransferable = (): EconomicObject => ({
  id: 'OBJ-NON-XFER-1',
  owner: RESEARCH_AGENT_ID,
  type: 'API_LICENSE',
  denomination: 'API-requests',
  quantity: 1000,
  allocationQuantity: 1000,
  consumedQuantity: 200,
  valueMon: 5.0,
  expiryTimestamp: Date.now() + 6 * 3600000,
  transferable: false,
  status: 'ACTIVE',
  metadataHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
  createdAt: Date.now() - 3600000 * 2,
  utilizationRatePerHour: 10,
  projectedRequirement: 100,
  ...({
    transferability: 'NO',
    refundability: 'NO',
    sellability: 'NO',
    activeObligations: 0,
  } as any),
});

/**
 * Fixture: Unknown transferability credits
 */
export const createFixture_UnknownTransferability = (): EconomicObject => ({
  id: 'OBJ-UNKNOWN-XFER-2',
  owner: RESEARCH_AGENT_ID,
  type: 'STORAGE_CREDIT',
  denomination: 'GB-months',
  quantity: 500,
  allocationQuantity: 500,
  consumedQuantity: 50,
  valueMon: 4.0,
  expiryTimestamp: Date.now() + 12 * 3600000,
  transferable: false,
  status: 'ACTIVE',
  metadataHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
  createdAt: Date.now() - 3600000,
  utilizationRatePerHour: 5,
  projectedRequirement: 50,
  ...({
    transferability: 'UNKNOWN',
    refundability: 'UNKNOWN',
    sellability: 'UNKNOWN',
    activeObligations: 0,
  } as any),
});

/**
 * Fixture: Expired resource
 */
export const createFixture_Expired = (): EconomicObject => ({
  id: 'OBJ-EXPIRED-3',
  owner: RESEARCH_AGENT_ID,
  type: 'GPU_COMPUTE_CREDIT',
  denomination: 'GPU-minutes',
  quantity: 50,
  allocationQuantity: 50,
  consumedQuantity: 10,
  valueMon: 3.0,
  expiryTimestamp: Date.now() - 3600000, // 1 hour ago
  transferable: true,
  status: 'ACTIVE',
  metadataHash: '0x3333333333333333333333333333333333333333333333333333333333333333',
  createdAt: Date.now() - 3600000 * 24,
  utilizationRatePerHour: 1,
  projectedRequirement: 0,
  ...({
    transferability: 'YES',
    refundability: 'NO',
    sellability: 'YES',
    activeObligations: 0,
  } as any),
});

/**
 * Fixture: Insufficient usage history
 */
export const createFixture_InsufficientHistory = (): EconomicObject => ({
  id: 'OBJ-NO-HIST-4',
  owner: RESEARCH_AGENT_ID,
  type: 'GPU_COMPUTE_CREDIT',
  denomination: 'GPU-minutes',
  quantity: 100,
  allocationQuantity: 100,
  consumedQuantity: 0,
  valueMon: 8.0,
  expiryTimestamp: Date.now() + 24 * 3600000,
  transferable: true,
  status: 'ACTIVE',
  metadataHash: '0x4444444444444444444444444444444444444444444444444444444444444444',
  createdAt: Date.now(),
  utilizationRatePerHour: 0,
  projectedRequirement: 0,
  ...({
    transferability: 'YES',
    refundability: 'NO',
    sellability: 'YES',
    activeObligations: 0,
    usageHistory: [],
  } as any),
});

/**
 * Fixture: Active obligation / escrow lock
 */
export const createFixture_ActiveObligation = (): EconomicObject => ({
  id: 'OBJ-OBLIGATED-5',
  owner: RESEARCH_AGENT_ID,
  type: 'GPU_COMPUTE_CREDIT',
  denomination: 'GPU-minutes',
  quantity: 80,
  allocationQuantity: 80,
  consumedQuantity: 10,
  valueMon: 6.0,
  expiryTimestamp: Date.now() + 10 * 3600000,
  transferable: true,
  status: 'IN_ESCROW',
  metadataHash: '0x5555555555555555555555555555555555555555555555555555555555555555',
  createdAt: Date.now() - 3600000,
  utilizationRatePerHour: 0,
  projectedRequirement: 10,
  ...({
    transferability: 'YES',
    refundability: 'NO',
    sellability: 'YES',
    activeObligations: 1,
  } as any),
});

/**
 * Fixture: Ownership mismatch
 */
export const createFixture_OwnershipMismatch = (): EconomicObject => ({
  id: 'OBJ-OTHER-OWNER-6',
  owner: 'OtherAgent-999',
  type: 'GPU_COMPUTE_CREDIT',
  denomination: 'GPU-minutes',
  quantity: 100,
  allocationQuantity: 100,
  consumedQuantity: 10,
  valueMon: 10.0,
  expiryTimestamp: Date.now() + 10 * 3600000,
  transferable: true,
  status: 'ACTIVE',
  metadataHash: '0x6666666666666666666666666666666666666666666666666666666666666666',
  createdAt: Date.now() - 3600000,
  utilizationRatePerHour: 0,
  projectedRequirement: 10,
  ...({
    transferability: 'YES',
    refundability: 'NO',
    sellability: 'YES',
    activeObligations: 0,
  } as any),
});

/**
 * Fixture: Previously recovered object
 */
export const createFixture_AlreadyRecovered = (): EconomicObject => ({
  id: 'OBJ-RECOVERED-7',
  owner: RESEARCH_AGENT_ID,
  type: 'GPU_COMPUTE_CREDIT',
  denomination: 'GPU-minutes',
  quantity: 100,
  allocationQuantity: 100,
  consumedQuantity: 50,
  valueMon: 5.0,
  expiryTimestamp: Date.now() + 10 * 3600000,
  transferable: true,
  status: 'RECOVERED',
  metadataHash: '0x7777777777777777777777777777777777777777777777777777777777777777',
  createdAt: Date.now() - 3600000 * 5,
  utilizationRatePerHour: 0,
  projectedRequirement: 0,
  ...({
    transferability: 'YES',
    refundability: 'NO',
    sellability: 'YES',
    activeObligations: 0,
  } as any),
});

export interface TestFixtureEnvironment {
  store: EconomicStore;
  eventBus: EventBus;
  policyEngine: PolicyEngine;
  settlement: LocalSettlementAdapter;
  gc: EconomicGarbageCollector;
  recovery: RecoveryEngine;
}

export function createFixtureEnvironment(
  agentPolicyOverride?: Partial<AgentPolicy>,
  includePeer: boolean = true
): TestFixtureEnvironment {
  const store = new EconomicStore();
  const eventBus = new EventBus();
  const policyEngine = new PolicyEngine(store, eventBus);
  const settlement = new LocalSettlementAdapter(store, eventBus);
  const gc = new EconomicGarbageCollector(store, policyEngine, eventBus);
  const recovery = new RecoveryEngine(store, settlement, policyEngine, eventBus);

  // Seed agents
  store.setAgent(createFixtureResearchAgent(agentPolicyOverride));
  if (includePeer) {
    store.setAgent(createFixturePeerAgent());
  }

  return { store, eventBus, policyEngine, settlement, gc, recovery };
}

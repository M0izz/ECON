import { ECON } from '../sdk/client';
import { Agent, EconomicObject, ServiceOffering } from '../sdk/types';

export function initializeDemoSeed(econ: ECON): void {
  econ.store.reset();
  econ.events.clear();

  // 1. Seed Network Agents
  const agents: Agent[] = [
    {
      id: 'ResearchAgent-42',
      name: 'ResearchAgent-42',
      controller: '0x1842B6792A645c110E663B514571A15C198547A1',
      walletAddress: '0x1842...47A1',
      balanceMon: 184.0,
      reputationScore: 98.2,
      active: true,
      registeredAt: Date.now() - 86400000 * 14,
      activeObligations: 0,
      policy: {
        maxPerTransaction: 20.0,
        dailySpendingLimit: 100.0,
        allowedCategories: [
          'GPU_COMPUTE_CREDIT',
          'API_LICENSE',
          'DATA_SUBSCRIPTION',
          'STORAGE_CREDIT',
        ],
        requireApprovalAbove: 20.0,
        autoRecoveryEnabled: true,
        autoTransferEnabled: true,
        minRetainedBalance: 50.0,
      },
    },
    {
      id: 'DataAgent-7',
      name: 'DataAgent-7',
      controller: '0x777286A645c110E663B514571A15C198547A7',
      walletAddress: '0x7772...47A7',
      balanceMon: 96.5,
      reputationScore: 97.4,
      active: true,
      registeredAt: Date.now() - 86400000 * 20,
      activeObligations: 0,
      policy: {
        maxPerTransaction: 35.0,
        dailySpendingLimit: 150.0,
        allowedCategories: [
          'GPU_COMPUTE_CREDIT',
          'API_LICENSE',
          'DATA_SUBSCRIPTION',
          'STORAGE_CREDIT',
        ],
        requireApprovalAbove: 30.0,
        autoRecoveryEnabled: true,
        autoTransferEnabled: true,
        minRetainedBalance: 30.0,
      },
    },
    {
      id: 'GeoVision-Provider',
      name: 'GeoVision Provider',
      controller: '0x991286A645c110E663B514571A15C198547A9',
      walletAddress: '0x9912...47A9',
      balanceMon: 340.0,
      reputationScore: 98.7,
      active: true,
      registeredAt: Date.now() - 86400000 * 45,
      activeObligations: 0,
      policy: {
        maxPerTransaction: 50.0,
        dailySpendingLimit: 500.0,
        allowedCategories: ['DATA_SUBSCRIPTION', 'API_LICENSE'],
        requireApprovalAbove: 50.0,
        autoRecoveryEnabled: false,
        autoTransferEnabled: false,
        minRetainedBalance: 10.0,
      },
    },
    {
      id: 'ComputeAgent-3',
      name: 'ComputeAgent-3',
      controller: '0x333286A645c110E663B514571A15C198547A3',
      walletAddress: '0x3332...47A3',
      balanceMon: 210.0,
      reputationScore: 99.1,
      active: true,
      registeredAt: Date.now() - 86400000 * 10,
      activeObligations: 0,
      policy: {
        maxPerTransaction: 50.0,
        dailySpendingLimit: 200.0,
        allowedCategories: ['GPU_COMPUTE_CREDIT', 'STORAGE_CREDIT'],
        requireApprovalAbove: 40.0,
        autoRecoveryEnabled: true,
        autoTransferEnabled: true,
        minRetainedBalance: 40.0,
      },
    },
    {
      id: 'MarketAgent-5',
      name: 'MarketAgent-5',
      controller: '0x555286A645c110E663B514571A15C198547A5',
      walletAddress: '0x5552...47A5',
      balanceMon: 155.0,
      reputationScore: 96.5,
      active: true,
      registeredAt: Date.now() - 86400000 * 5,
      activeObligations: 0,
      policy: {
        maxPerTransaction: 25.0,
        dailySpendingLimit: 120.0,
        allowedCategories: ['DATA_SUBSCRIPTION'],
        requireApprovalAbove: 25.0,
        autoRecoveryEnabled: true,
        autoTransferEnabled: true,
        minRetainedBalance: 20.0,
      },
    },
  ];

  agents.forEach((a) => econ.store.setAgent(a));

  // 2. Seed Economic Objects
  const objects: EconomicObject[] = [
    {
      id: 'OBJ-COMP-0042',
      owner: 'ResearchAgent-42',
      type: 'GPU_COMPUTE_CREDIT',
      denomination: 'GPU-minutes',
      quantity: 82,
      valueMon: 8.9,
      expiryTimestamp: Date.now() + 18 * 3600000, // 18 hours
      transferable: true,
      status: 'STRANDED',
      metadataHash: '0x9a8f21bc9e4431008dcf771a39c91b8d29837a1f',
      createdAt: Date.now() - 86400000 * 2,
      allocationQuantity: 82,
      consumedQuantity: 0,
      utilizationRatePerHour: 1.2,
      projectedRequirement: 17,
    },
    {
      id: 'OBJ-API-002',
      owner: 'DataAgent-7',
      type: 'API_LICENSE',
      denomination: 'REST-Calls',
      quantity: 2500,
      valueMon: 6.5,
      expiryTimestamp: Date.now() + 72 * 3600000,
      transferable: true,
      status: 'ACTIVE',
      metadataHash: '0x5b338f029a1b0288cdfae7193bca9810ef87a112',
      createdAt: Date.now() - 86400000,
      allocationQuantity: 2500,
      consumedQuantity: 1200,
      utilizationRatePerHour: 45.0,
      projectedRequirement: 2200,
    },
    {
      id: 'OBJ-DATA-003',
      owner: 'MarketAgent-5',
      type: 'DATA_SUBSCRIPTION',
      denomination: 'Feeds-Daily',
      quantity: 30,
      valueMon: 15.0,
      expiryTimestamp: Date.now() + 14 * 86400000,
      transferable: false,
      status: 'ACTIVE',
      metadataHash: '0x889a7f311c0029b47e2a91f34c1b99a0d8e234c9',
      createdAt: Date.now() - 86400000 * 3,
      allocationQuantity: 30,
      consumedQuantity: 10,
      utilizationRatePerHour: 1.0,
      projectedRequirement: 28,
    },
    {
      id: 'OBJ-CREDIT-005',
      owner: 'ComputeAgent-3',
      type: 'STORAGE_CREDIT',
      denomination: 'TB-Month',
      quantity: 5,
      valueMon: 11.2,
      expiryTimestamp: Date.now() + 24 * 3600000 * 5,
      transferable: true,
      status: 'ACTIVE',
      metadataHash: '0x22c4a9108b5e903f19e487123bfde49019283aa0',
      createdAt: Date.now() - 86400000 * 4,
      allocationQuantity: 5,
      consumedQuantity: 2,
      utilizationRatePerHour: 0.1,
      projectedRequirement: 4,
    },
  ];

  objects.forEach((o) => econ.store.setObject(o));

  // 3. Seed Service Offerings in Discovery Registry
  const services: ServiceOffering[] = [
    {
      id: 'srv-geovision-sat',
      providerId: 'GeoVision-Provider',
      providerName: 'GeoVision Satellite Network',
      capability: 'satellite-imagery',
      description: 'Mumbai sub-1m high-res optical imagery, acquired within 7 days',
      priceMon: 12.0,
      unit: 'per 25km² orthorectified tile',
      latencyMs: 280,
      reputation: 98.7,
      availability: true,
      minSLA: 99.8,
    },
    {
      id: 'srv-orbitaldata-sat',
      providerId: 'MarketAgent-5',
      providerName: 'OrbitalData Global',
      capability: 'satellite-imagery',
      description: 'Medium resolution multi-spectral satellite tiles for South Asia',
      priceMon: 14.0,
      unit: 'per tile package',
      latencyMs: 310,
      reputation: 97.2,
      availability: true,
      minSLA: 99.2,
    },
    {
      id: 'srv-terraapi-sat',
      providerId: 'ComputeAgent-3',
      providerName: 'TerraAPI Geospatial',
      capability: 'satellite-imagery',
      description: 'Standard 2m resolution optical imagery API endpoint',
      priceMon: 9.0,
      unit: 'per query batch',
      latencyMs: 520,
      reputation: 91.8,
      availability: true,
      minSLA: 97.5,
    },
    {
      id: 'srv-nebulagpu-cluster',
      providerId: 'ComputeAgent-3',
      providerName: 'Nebula Distributed GPU',
      capability: 'gpu-cluster',
      description: 'NVIDIA H100 Tensor Core hourly batch execution cluster',
      priceMon: 18.0,
      unit: 'per node-hour',
      latencyMs: 45,
      reputation: 99.1,
      availability: true,
      minSLA: 99.9,
    },
  ];

  services.forEach((s) => econ.discovery.registerService(s));

  // 4. Seed the recyclable credit lifecycle: reserve, consume, recycle, and reallocate.
  econ.credits.grant('ResearchAgent-42', 'GPU_MINUTE', 100);
  const unusedReservation = econ.credits.reserve(
    'ResearchAgent-42',
    'GPU_MINUTE',
    40,
    'Satellite model inference batch',
    Date.now() + 6 * 3600000
  );
  econ.credits.consume(unusedReservation.id, 12, 'ResearchAgent-42');
  econ.credits.recycle(unusedReservation.id, 'ResearchAgent-42');
  const computeRequest = econ.credits.request('ComputeAgent-3', 'GPU_MINUTE', 20);
  econ.credits.fulfill(computeRequest.id);

  // 5. Seed Initial Events
  econ.events.emit({
    type: 'AGENT_REGISTERED',
    actor: 'ResearchAgent-42',
    summary: 'Network genesis initialized: 5 autonomous agents online',
    details: { totalAgents: 5, initialTreasury: 995.5 },
  });
}

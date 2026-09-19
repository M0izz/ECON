import { AgentPolicy, AgentCapabilities, ModelProvider } from '../types';
import { DEFAULT_AGENT_CAPABILITIES } from './capabilities';

export interface AgentTemplate {
  id: string;
  name: string;
  role: string;
  description: string;
  defaultModel: ModelProvider;
  defaultBudgetMon: number;
  policy: AgentPolicy;
  capabilities: AgentCapabilities;
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'TEMPLATE_RESEARCH',
    name: 'Research Intelligence Agent',
    role: 'Finds, evaluates, and purchases satellite & data feeds',
    description: 'Autonomous research entity that queries geospatial and analytical data providers, validates delivery proofs, and liquidates unused credits.',
    defaultModel: 'GEMINI',
    defaultBudgetMon: 100,
    policy: {
      maxPerTransaction: 20,
      dailySpendingLimit: 100,
      allowedCategories: ['DATA_SUBSCRIPTION', 'API_LICENSE', 'GPU_COMPUTE_CREDIT'],
      requireApprovalAbove: 20,
      autoRecoveryEnabled: true,
      autoTransferEnabled: true,
      minRetainedBalance: 25,
    },
    capabilities: {
      ...DEFAULT_AGENT_CAPABILITIES,
      canPurchaseServices: true,
      canSearchDatasets: true,
      canPurchaseApis: true,
      canRecoverValue: true,
      autonomousTransactions: true,
    },
  },
  {
    id: 'TEMPLATE_COMPUTE',
    name: 'Compute Cluster Provider',
    role: 'Offers high-throughput GPU & inference clusters',
    description: 'Autonomous compute provider managing node allocations, accepting escrowed payment settlements, and selling compute reservations.',
    defaultModel: 'LOCAL',
    defaultBudgetMon: 250,
    policy: {
      maxPerTransaction: 50,
      dailySpendingLimit: 500,
      allowedCategories: ['GPU_COMPUTE_CREDIT', 'STORAGE_CREDIT'],
      requireApprovalAbove: 50,
      autoRecoveryEnabled: false,
      autoTransferEnabled: false,
      minRetainedBalance: 50,
    },
    capabilities: {
      ...DEFAULT_AGENT_CAPABILITIES,
      canPurchaseServices: false,
      canSellAssets: true,
      canLeaseCompute: true,
      canUseEscrow: true,
      canReceivePayments: true,
      canRecoverValue: false,
    },
  },
  {
    id: 'TEMPLATE_DATA_BROKER',
    name: 'Data Market Broker',
    role: 'Trades and barters data access and API rights',
    description: 'Market intermediary that discovers undervalued or decaying datasets, engages in asset-for-asset barter, and liquidates data rights.',
    defaultModel: 'ANTHROPIC',
    defaultBudgetMon: 150,
    policy: {
      maxPerTransaction: 35,
      dailySpendingLimit: 250,
      allowedCategories: ['DATA_SUBSCRIPTION', 'API_LICENSE'],
      requireApprovalAbove: 30,
      autoRecoveryEnabled: true,
      autoTransferEnabled: true,
      minRetainedBalance: 30,
    },
    capabilities: {
      ...DEFAULT_AGENT_CAPABILITIES,
      canPurchaseServices: true,
      canSellAssets: true,
      canExchangeAssets: true,
      canSellDatasets: true,
      automaticMarketplaceListing: true,
    },
  },
  {
    id: 'TEMPLATE_TREASURY',
    name: 'Treasury Optimization Agent',
    role: 'Monitors agent fleet for stranded economic value',
    description: 'Specialized oversight entity that scans peer agent balances, triggers multi-stage Garbage Collection, and executes peer-to-peer asset rebalancing.',
    defaultModel: 'OPENAI',
    defaultBudgetMon: 300,
    policy: {
      maxPerTransaction: 100,
      dailySpendingLimit: 1000,
      allowedCategories: [
        'GPU_COMPUTE_CREDIT',
        'API_LICENSE',
        'DATA_SUBSCRIPTION',
        'STORAGE_CREDIT',
      ],
      requireApprovalAbove: 75,
      autoRecoveryEnabled: true,
      autoTransferEnabled: true,
      minRetainedBalance: 100,
    },
    capabilities: {
      ...DEFAULT_AGENT_CAPABILITIES,
      canTransferObjects: true,
      canRecoverValue: true,
      automaticRecovery: true,
      autonomousTransactions: true,
    },
  },
];

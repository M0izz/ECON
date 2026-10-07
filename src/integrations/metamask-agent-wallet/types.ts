import { type Address, type Hash } from 'viem';

export type MetaMaskWalletMode = 'server-wallet' | 'byok';
export type MetaMaskTradingMode = 'guard' | 'beast';
export type MetaMaskWalletStatus = 'CONNECTED' | 'NOT_CONFIGURED' | 'SIMULATION';

export interface MetaMaskAgentWalletConfig {
  walletType: MetaMaskWalletMode;
  tradingMode: MetaMaskTradingMode;
  mnemonic?: string;
  password?: string;
  rpcUrl?: string;
  chainId?: number;
  cliPath?: string;
  autoSimulate?: boolean;
  blockaidScan?: boolean;
}

export interface MetaMaskSimulationResult {
  success: boolean;
  gasUsed: string;
  simulationPassed: boolean;
  stateDiff: Array<{ target: string; change: string }>;
  error?: string;
}

export interface MetaMaskThreatScanResult {
  passed: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  flags: string[];
  blockaidVerified: boolean;
  notes?: string;
}

export interface MetaMaskTransactionIntent {
  type: 'BUY' | 'TRANSFER' | 'ESCROW_LOCK' | 'RECOVERY_TRANSFER';
  recipient: `0x${string}`;
  amountMon: number;
  data?: `0x${string}`;
  category?: string;
  memo?: string;
  economicIdentity: string;
}

export interface MetaMaskTransactionResult {
  success: boolean;
  hash: Hash | string;
  chain: string;
  chainId: number;
  from: Address;
  to: Address;
  value: number;
  status: 'SETTLED' | 'PENDING' | 'BLOCKED_BY_POLICY' | 'REQUIRES_REVIEW' | 'SIMULATION_FAILED' | 'FAILED';
  timestamp: number;
  blockNumber?: number;
  feeMon?: number;
  simulation?: MetaMaskSimulationResult;
  threatScan?: MetaMaskThreatScanResult;
  error?: string;
  policyReason?: string;
}

export interface AgentWalletBindingRecord {
  economicIdentityId: string;
  economicIdentityName: string;
  walletProvider: 'METAMASK_AGENT_WALLET';
  walletMode: MetaMaskWalletMode;
  walletAddress: Address;
  settlementNetwork: 'Monad';
  settlementChainId: number;
  settlementAccount: Address;
  boundAt: number;
  active: boolean;
}

export interface MetaMaskDoctorReport {
  cliVersion: string;
  sdkVersion: string;
  mode: MetaMaskWalletMode;
  tradingMode: MetaMaskTradingMode;
  authStatus: 'VALID' | 'UNAUTHENTICATED';
  rpcHealthy: boolean;
  blockaidHealthy: boolean;
  activeAddress: Address | null;
  chainId: number;
}

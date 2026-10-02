/**
 * TypeScript Type Definitions for Dynamic Integration in ECON
 * Protocol: Sovereign Autonomous Economic Operating Layer on Monad
 */

import type { WalletClient, PublicClient, Address } from 'viem';

export type ECONControlProvider = 'MERA_PASSKEY' | 'DYNAMIC' | 'EXTERNAL_WALLET';

export interface DynamicWalletDetails {
  address: Address;
  chain: string;
  chainId: number;
  networkChainId: number;
  connectorName: string;
  isEmbedded: boolean;
  isEmbeddedWallet: boolean;
  authenticated: boolean;
  email?: string;
  connectedAt: number;
}

export interface DynamicEconomicIdentity {
  controllerAddress: Address;
  walletAddress?: Address;
  provider: 'DYNAMIC';
  controlProvider?: string;
  walletType: 'embedded' | 'external' | 'social';
  agentId?: string;
  identityHash?: string;
  isEmbedded?: boolean;
  connectorName?: string;
  networkChainId?: number;
  network: 'Monad Testnet';
  chainId: 10143;
  createdAt: number;
}

export interface DynamicTransactionRequest {
  to: Address;
  valueMon?: number;
  data?: `0x${string}`;
  memo?: string;
}

export interface DynamicTransactionReceipt {
  success: boolean;
  txHash: `0x${string}` | '';
  blockNumber: number;
  settledAt: number;
  feeMon?: number;
  error?: string;
}

export type DynamicStatusCallback = (details: DynamicWalletDetails | null) => void;

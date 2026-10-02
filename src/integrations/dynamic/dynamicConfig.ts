/**
 * Dynamic Configuration for ECON Protocol on Monad Testnet
 * Chain ID: 10143
 */

export const MONAD_TESTNET_CHAIN_ID = 10143;

export const monadTestnetDynamicNetwork = {
  blockExplorerUrls: ['https://testnet.monadexplorer.com'],
  chainId: MONAD_TESTNET_CHAIN_ID,
  chainName: 'Monad Testnet',
  iconUrls: ['https://avatars.githubusercontent.com/u/179229932'],
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  networkId: MONAD_TESTNET_CHAIN_ID,
  rpcUrls: ['https://testnet-rpc.monad.xyz'],
  vanityName: 'Monad Testnet',
};

export const DEFAULT_DYNAMIC_CONFIG = {
  monadChainId: MONAD_TESTNET_CHAIN_ID,
  monadRpcUrl: 'https://testnet-rpc.monad.xyz',
  monadExplorerUrl: 'https://testnet.monadexplorer.com',
};

/**
 * Returns the configured Dynamic Environment ID.
 * Defaults to Vite environment variable VITE_DYNAMIC_ENVIRONMENT_ID.
 */
export function getDynamicEnvironmentId(): string {
  if (typeof process !== 'undefined' && process.env?.VITE_DYNAMIC_ENVIRONMENT_ID) {
    return process.env.VITE_DYNAMIC_ENVIRONMENT_ID;
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DYNAMIC_ENVIRONMENT_ID) {
    return (import.meta as any).env.VITE_DYNAMIC_ENVIRONMENT_ID;
  }
  // Safe placeholder when environment is unconfigured
  return '';
}

export function isDynamicConfigured(): boolean {
  const envId = getDynamicEnvironmentId();
  return Boolean(envId && envId.trim().length > 0 && envId !== 'DYNAMIC_ENVIRONMENT_ID');
}

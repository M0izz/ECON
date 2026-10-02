import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  monadTestnetDynamicNetwork,
  getDynamicEnvironmentId,
  isDynamicConfigured,
  DEFAULT_DYNAMIC_CONFIG,
} from '../src/integrations/dynamic/dynamicConfig';

describe('Dynamic Monad Configuration & Graceful Fallback', () => {
  const originalEnv = process.env.VITE_DYNAMIC_ENVIRONMENT_ID;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.VITE_DYNAMIC_ENVIRONMENT_ID = originalEnv;
    } else {
      delete process.env.VITE_DYNAMIC_ENVIRONMENT_ID;
    }
  });

  it('correctly configures Monad Testnet (Chain ID: 10143) for Dynamic', () => {
    expect(monadTestnetDynamicNetwork.chainId).toBe(10143);
    expect(monadTestnetDynamicNetwork.networkId).toBe(10143);
    expect(monadTestnetDynamicNetwork.chainName).toBe('Monad Testnet');
    expect(monadTestnetDynamicNetwork.nativeCurrency.symbol).toBe('MON');
    expect(monadTestnetDynamicNetwork.nativeCurrency.decimals).toBe(18);
    expect(monadTestnetDynamicNetwork.rpcUrls).toContain('https://testnet-rpc.monad.xyz');
    expect(monadTestnetDynamicNetwork.blockExplorerUrls).toContain('https://testnet.monadexplorer.com');
  });

  it('matches ECON Monad default configuration', () => {
    expect(DEFAULT_DYNAMIC_CONFIG.monadChainId).toBe(10143);
    expect(DEFAULT_DYNAMIC_CONFIG.monadRpcUrl).toBe('https://testnet-rpc.monad.xyz');
  });

  it('detects unconfigured Dynamic environment ID gracefully', () => {
    delete process.env.VITE_DYNAMIC_ENVIRONMENT_ID;
    expect(isDynamicConfigured()).toBe(false);
    expect(getDynamicEnvironmentId()).toBe('');
  });

  it('detects configured Dynamic environment ID from environment variable', () => {
    process.env.VITE_DYNAMIC_ENVIRONMENT_ID = 'test-env-id-12345';
    expect(isDynamicConfigured()).toBe(true);
    expect(getDynamicEnvironmentId()).toBe('test-env-id-12345');
  });
});

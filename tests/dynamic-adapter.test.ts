import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeEVMAddress,
  mapDynamicWalletToIdentity,
} from '../src/integrations/dynamic/dynamicMapper';
import {
  DynamicWalletManager,
} from '../src/integrations/dynamic/dynamicWallet';

describe('Dynamic Wallet Adapter & Economic Identity Mapper', () => {
  let manager: DynamicWalletManager;

  beforeEach(() => {
    manager = new DynamicWalletManager();
  });

  describe('Address Normalization', () => {
    it('normalizes lowercase addresses to valid 0x format', () => {
      const raw = '0x0f5d2fb29fb7d3cfee444a200298f468908cc942';
      const normalized = normalizeEVMAddress(raw);
      expect(normalized).toBe(raw.toLowerCase());
      expect(normalized.startsWith('0x')).toBe(true);
      expect(normalized.length).toBe(42);
    });

    it('throws error on invalid hex address format', () => {
      expect(() => normalizeEVMAddress('not-an-address')).toThrow('Invalid EVM address');
      expect(() => normalizeEVMAddress('0x123')).toThrow('Invalid EVM address');
    });
  });

  describe('Identity Mapping (Zero Secret Storage)', () => {
    it('creates safe DynamicEconomicIdentity without sensitive private data', () => {
      const rawWallet = {
        address: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942',
        connector: { name: 'Dynamic Embedded EVM' },
        chain: '10143',
        key: 'evm',
      };

      const identity = mapDynamicWalletToIdentity(rawWallet, 'ResearchAgent-42', true);

      expect(identity.agentId).toBe('ResearchAgent-42');
      expect(identity.walletAddress).toBe(rawWallet.address.toLowerCase());
      expect(identity.controlProvider).toBe('DYNAMIC');
      expect(identity.isEmbedded).toBe(true);
      expect(identity.networkChainId).toBe(10143);
      expect(identity.connectorName).toBe('Dynamic Embedded EVM');

      // Crucial Security Verification: No private keys or secret material stored
      const keys = Object.keys(identity);
      expect(keys).not.toContain('privateKey');
      expect(keys).not.toContain('secret');
      expect(keys).not.toContain('mnemonic');
      expect(keys).not.toContain('seed');
    });
  });

  describe('DynamicWalletManager Singleton & State', () => {
    it('starts disconnected', () => {
      expect(manager.isConnected()).toBe(false);
      expect(manager.getConnectedWallet()).toBeNull();
      expect(manager.getWalletAddress()).toBeNull();
    });

    it('correctly sets and retrieves active wallet details', () => {
      const mockWallet = {
        address: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942',
        connector: { name: 'MetaMask' },
        chain: '10143',
        key: 'evm',
      };

      manager.setActiveWallet(mockWallet);

      expect(manager.isConnected()).toBe(true);
      expect(manager.getWalletAddress()).toBe(mockWallet.address.toLowerCase());

      const details = manager.getConnectedWallet();
      expect(details).not.toBeNull();
      expect(details?.address).toBe(mockWallet.address.toLowerCase());
      expect(details?.networkChainId).toBe(10143);
      expect(details?.connectorName).toBe('MetaMask');
    });

    it('notifies subscribers on wallet connection and disconnection', () => {
      let notifiedCount = 0;
      let lastAddress: string | undefined;

      const unsub = manager.subscribe((details) => {
        notifiedCount++;
        lastAddress = details?.address;
      });

      // subscribe immediately invokes listener with current state (null)
      expect(notifiedCount).toBe(1);

      const mockWallet = {
        address: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942',
        connector: { name: 'Embedded' },
        chain: '10143',
        key: 'evm',
      };

      manager.setActiveWallet(mockWallet);
      expect(notifiedCount).toBe(2);
      expect(lastAddress).toBe(mockWallet.address.toLowerCase());

      manager.disconnect();
      expect(notifiedCount).toBe(3);
      expect(lastAddress).toBeUndefined();
      expect(manager.isConnected()).toBe(false);

      unsub();
    });
  });
});

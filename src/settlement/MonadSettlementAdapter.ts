import {
  createPublicClient,
  createWalletClient,
  http,
  custom,
  parseEther,
  formatEther,
  keccak256,
  toHex,
  stringToHex,
  defineChain,
  type PublicClient,
  type WalletClient,
  type Address,
  type Hash,
} from 'viem';
import { SettlementAdapter } from './interface';
import { SettlementResult } from '../sdk/types';
import { EconomicStore } from '../sdk/store';
import { EventBus } from '../sdk/events';
import { MONAD_TESTNET_ADDRESSES, MONAD_EXPLORER_BASE } from '../contracts/addresses';
import ECONIdentityRegistryArtifact from '../contracts/artifacts/ECONIdentityRegistry.json';
import ECONEconomicObjectArtifact from '../contracts/artifacts/ECONEconomicObject.json';
import ECONEscrowArtifact from '../contracts/artifacts/ECONEscrow.json';
import ECONMarketplaceArtifact from '../contracts/artifacts/ECONMarketplace.json';
import ECONCreditVaultArtifact from '../contracts/artifacts/ECONCreditVault.json';

export const monadTestnetChain = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'MonadExplorer', url: MONAD_EXPLORER_BASE },
  },
  testnet: true,
});

export interface MonadConfig {
  rpcUrl?: string;
  chainId?: number;
  identityRegistryAddress?: `0x${string}`;
  reputationRegistryAddress?: `0x${string}`;
  economicObjectAddress?: `0x${string}`;
  escrowAddress?: `0x${string}`;
  marketplaceAddress?: `0x${string}`;
  creditVaultAddress?: `0x${string}`;
  walletClient?: WalletClient;
}

export const DEFAULT_MONAD_CONFIG: MonadConfig = {
  rpcUrl: 'https://testnet-rpc.monad.xyz',
  chainId: 10143,
  identityRegistryAddress: MONAD_TESTNET_ADDRESSES.identityRegistry,
  reputationRegistryAddress: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
  economicObjectAddress: MONAD_TESTNET_ADDRESSES.economicObject,
  escrowAddress: MONAD_TESTNET_ADDRESSES.escrow,
  marketplaceAddress: MONAD_TESTNET_ADDRESSES.marketplace,
  creditVaultAddress: MONAD_TESTNET_ADDRESSES.creditVault,
};

export const MONAD_TESTNET_CONFIG = DEFAULT_MONAD_CONFIG;

export class MonadSettlementAdapter implements SettlementAdapter {
  public readonly id = 'monad' as const;
  public readonly name = 'Monad Testnet Settlement (EVM)';
  public readonly isConnected: boolean;

  private store: EconomicStore;
  private eventBus: EventBus;
  private config: MonadConfig;
  private publicClient: PublicClient;
  private walletClient?: WalletClient;

  constructor(
    store: EconomicStore,
    eventBus: EventBus,
    config: MonadConfig = DEFAULT_MONAD_CONFIG
  ) {
    this.store = store;
    this.eventBus = eventBus;
    this.config = { ...DEFAULT_MONAD_CONFIG, ...config };

    this.publicClient = createPublicClient({
      chain: monadTestnetChain,
      transport: http(this.config.rpcUrl || 'https://testnet-rpc.monad.xyz'),
    });

    if (config.walletClient) {
      this.walletClient = config.walletClient;
    } else if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        this.walletClient = createWalletClient({
          chain: monadTestnetChain,
          transport: custom((window as any).ethereum),
        });
      } catch {
        // In SSR or non-injected environments
      }
    }

    this.isConnected = true;
  }

  public setWalletClient(client: WalletClient): void {
    this.walletClient = client;
  }

  public getPublicClient(): PublicClient {
    return this.publicClient;
  }

  public getConfig(): MonadConfig {
    return this.config;
  }

  public async getBalance(agentIdOrAddress: string): Promise<number> {
    try {
      const address = this.resolveAddress(agentIdOrAddress);
      if (address && address.startsWith('0x') && address.length === 42) {
        const balanceWei = await this.publicClient.getBalance({
          address: address as Address,
        });
        return parseFloat(formatEther(balanceWei));
      }
    } catch (err) {
      console.warn(`[Monad EVM] Failed to query on-chain balance: ${(err as Error).message}`);
    }
    const agent = this.store.getAgent(agentIdOrAddress);
    return agent ? agent.balanceMon : 0;
  }

  public async transfer(
    from: string,
    to: string,
    amount: number,
    memo: string = 'Monad EVM Transfer'
  ): Promise<SettlementResult> {
    const toAddress = this.resolveAddress(to);
    if (!toAddress || !toAddress.startsWith('0x') || toAddress.length !== 42) {
      return {
        success: false,
        txHash: '',
        blockNumber: 0,
        settledAt: Date.now(),
        feeMon: 0,
        error: `Monad Tx Reverted: Recipient "${to}" is not a valid 20-byte EVM address`,
      };
    }

    if (!this.walletClient || !this.walletClient.account) {
      return {
        success: false,
        txHash: '',
        blockNumber: 0,
        settledAt: Date.now(),
        feeMon: 0,
        error: 'Monad Settlement: No wallet signer connected for live EVM execution. Connect wallet in AppKit or configure private key.',
      };
    }

    try {
      const value = parseEther(amount.toString());
      const hash = await (this.walletClient as any).sendTransaction({
        to: toAddress as Address,
        value,
        chain: monadTestnetChain,
        account: this.walletClient.account,
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      const blockNumber = Number(receipt.blockNumber);
      const feeMon = receipt.effectiveGasPrice
        ? parseFloat(formatEther(receipt.effectiveGasPrice * receipt.gasUsed))
        : 0.00042;

      if (receipt.status !== 'success') {
        return {
          success: false,
          txHash: hash,
          blockNumber,
          settledAt: Date.now(),
          feeMon,
          error: `Transaction reverted on Monad Testnet (${hash})`,
        };
      }

      this.eventBus.emit({
        type: 'SETTLEMENT_COMPLETED',
        actor: from,
        summary: `[Monad EVM] Settled ${amount} MON block #${blockNumber} (${hash.slice(0, 10)}...)`,
        details: {
          network: 'Monad Testnet',
          chainId: 10143,
          txHash: hash,
          blockNumber,
          from,
          to: toAddress,
          amount,
          memo,
        },
      });

      return {
        success: true,
        txHash: hash,
        blockNumber,
        settledAt: Date.now(),
        feeMon,
      };
    } catch (err: any) {
      return {
        success: false,
        txHash: '',
        blockNumber: 0,
        settledAt: Date.now(),
        feeMon: 0,
        error: `Monad EVM Transfer failed: ${err.shortMessage || err.message}`,
      };
    }
  }

  public async lockEscrow(
    escrowId: string,
    buyer: string,
    seller: string,
    amount: number,
    deadline: number
  ): Promise<SettlementResult> {
    const sellerAddress = this.resolveAddress(seller);
    if (!sellerAddress || !sellerAddress.startsWith('0x') || sellerAddress.length !== 42) {
      return {
        success: false,
        txHash: '',
        blockNumber: 0,
        settledAt: Date.now(),
        feeMon: 0,
        error: `Monad Escrow Reverted: Invalid seller EVM address "${seller}"`,
      };
    }

    if (!this.walletClient || !this.walletClient.account) {
      return {
        success: false,
        txHash: '',
        blockNumber: 0,
        settledAt: Date.now(),
        feeMon: 0,
        error: 'Monad Escrow: No wallet signer connected for live contract interaction.',
      };
    }

    try {
      const escrowIdBytes32 = this.toHex32(escrowId);
      const conditionHash = keccak256(stringToHex(`Condition:${escrowId}`));
      const deadlineSec = BigInt(Math.floor(deadline / 1000));
      const value = parseEther(amount.toString());

      const hash = await (this.walletClient as any).writeContract({
        address: this.config.escrowAddress!,
        abi: ECONEscrowArtifact.abi,
        functionName: 'lockEscrow',
        args: [escrowIdBytes32, sellerAddress as Address, conditionHash, deadlineSec],
        value,
        chain: monadTestnetChain,
        account: this.walletClient.account,
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      const blockNumber = Number(receipt.blockNumber);
      const feeMon = receipt.effectiveGasPrice
        ? parseFloat(formatEther(receipt.effectiveGasPrice * receipt.gasUsed))
        : 0.0005;

      if (receipt.status !== 'success') {
        return {
          success: false,
          txHash: hash,
          blockNumber,
          settledAt: Date.now(),
          feeMon,
          error: `Monad lockEscrow reverted (${hash})`,
        };
      }

      this.eventBus.emit({
        type: 'ESCROW_LOCKED',
        actor: buyer,
        summary: `[Monad EscrowContract] Locked ${amount} MON in escrow ${escrowId}`,
        details: {
          contract: this.config.escrowAddress,
          escrowId,
          buyer,
          seller: sellerAddress,
          amount,
          txHash: hash,
          blockNumber,
        },
      });

      return {
        success: true,
        txHash: hash,
        blockNumber,
        settledAt: Date.now(),
        feeMon,
      };
    } catch (err: any) {
      return {
        success: false,
        txHash: '',
        blockNumber: 0,
        settledAt: Date.now(),
        feeMon: 0,
        error: `Monad lockEscrow failed: ${err.shortMessage || err.message}`,
      };
    }
  }

  public async releaseEscrow(escrowId: string): Promise<SettlementResult> {
    if (!this.walletClient || !this.walletClient.account) {
      return {
        success: false,
        txHash: '',
        blockNumber: 0,
        settledAt: Date.now(),
        feeMon: 0,
        error: 'Monad Escrow: No wallet signer connected for release transaction.',
      };
    }

    try {
      const escrowIdBytes32 = this.toHex32(escrowId);
      const hash = await (this.walletClient as any).writeContract({
        address: this.config.escrowAddress!,
        abi: ECONEscrowArtifact.abi,
        functionName: 'verifyAndRelease',
        args: [escrowIdBytes32],
        chain: monadTestnetChain,
        account: this.walletClient.account,
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      const blockNumber = Number(receipt.blockNumber);
      const feeMon = receipt.effectiveGasPrice
        ? parseFloat(formatEther(receipt.effectiveGasPrice * receipt.gasUsed))
        : 0.0005;

      if (receipt.status !== 'success') {
        return {
          success: false,
          txHash: hash,
          blockNumber,
          settledAt: Date.now(),
          feeMon,
          error: `Monad verifyAndRelease reverted (${hash})`,
        };
      }

      const escrow = this.store.getEscrow(escrowId);
      this.eventBus.emit({
        type: 'SETTLEMENT_COMPLETED',
        actor: escrow ? escrow.seller : 'seller',
        summary: `[Monad EscrowContract] Released escrow ${escrowId} on-chain`,
        details: {
          contract: this.config.escrowAddress,
          escrowId,
          txHash: hash,
          blockNumber,
        },
      });

      return {
        success: true,
        txHash: hash,
        blockNumber,
        settledAt: Date.now(),
        feeMon,
      };
    } catch (err: any) {
      return {
        success: false,
        txHash: '',
        blockNumber: 0,
        settledAt: Date.now(),
        feeMon: 0,
        error: `Monad releaseEscrow failed: ${err.shortMessage || err.message}`,
      };
    }
  }

  public async refundEscrow(escrowId: string): Promise<SettlementResult> {
    if (!this.walletClient || !this.walletClient.account) {
      return {
        success: false,
        txHash: '',
        blockNumber: 0,
        settledAt: Date.now(),
        feeMon: 0,
        error: 'Monad Escrow: No wallet signer connected for refund transaction.',
      };
    }

    try {
      const escrowIdBytes32 = this.toHex32(escrowId);
      const hash = await (this.walletClient as any).writeContract({
        address: this.config.escrowAddress!,
        abi: ECONEscrowArtifact.abi,
        functionName: 'refund',
        args: [escrowIdBytes32],
        chain: monadTestnetChain,
        account: this.walletClient.account,
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      const blockNumber = Number(receipt.blockNumber);
      const feeMon = receipt.effectiveGasPrice
        ? parseFloat(formatEther(receipt.effectiveGasPrice * receipt.gasUsed))
        : 0.0005;

      return {
        success: receipt.status === 'success',
        txHash: hash,
        blockNumber,
        settledAt: Date.now(),
        feeMon,
      };
    } catch (err: any) {
      return {
        success: false,
        txHash: '',
        blockNumber: 0,
        settledAt: Date.now(),
        feeMon: 0,
        error: `Monad refund failed: ${err.shortMessage || err.message}`,
      };
    }
  }

  public async transferEconomicObject(
    objectId: string,
    fromOwner: string,
    toOwner: string
  ): Promise<SettlementResult> {
    const toAddress = this.resolveAddress(toOwner);
    if (!toAddress || !toAddress.startsWith('0x') || toAddress.length !== 42) {
      return {
        success: false,
        txHash: '',
        blockNumber: 0,
        settledAt: Date.now(),
        feeMon: 0,
        error: `Monad ObjectContract: Invalid recipient address "${toOwner}"`,
      };
    }

    if (!this.walletClient || !this.walletClient.account) {
      return {
        success: false,
        txHash: '',
        blockNumber: 0,
        settledAt: Date.now(),
        feeMon: 0,
        error: 'Monad ObjectContract: No wallet signer connected.',
      };
    }

    try {
      const objectIdBytes32 = this.toHex32(objectId);
      const hash = await (this.walletClient as any).writeContract({
        address: this.config.economicObjectAddress!,
        abi: ECONEconomicObjectArtifact.abi,
        functionName: 'transferObject',
        args: [objectIdBytes32, toAddress as Address],
        chain: monadTestnetChain,
        account: this.walletClient.account,
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      const blockNumber = Number(receipt.blockNumber);
      const feeMon = receipt.effectiveGasPrice
        ? parseFloat(formatEther(receipt.effectiveGasPrice * receipt.gasUsed))
        : 0.0004;

      this.eventBus.emit({
        type: 'OBJECT_CREATED',
        actor: toOwner,
        summary: `[Monad ObjectContract] On-chain transfer of ${objectId} to ${toOwner}`,
        details: {
          contract: this.config.economicObjectAddress,
          objectId,
          fromOwner,
          toOwner,
          txHash: hash,
          blockNumber,
        },
      });

      return {
        success: receipt.status === 'success',
        txHash: hash,
        blockNumber,
        settledAt: Date.now(),
        feeMon,
      };
    } catch (err: any) {
      return {
        success: false,
        txHash: '',
        blockNumber: 0,
        settledAt: Date.now(),
        feeMon: 0,
        error: `Monad transferEconomicObject failed: ${err.shortMessage || err.message}`,
      };
    }
  }

  // --- Extended Protocol Helper Methods ---

  public async registerAgentIdentity(agentId: string, metadataHash: `0x${string}`, agentURI: string = ''): Promise<Hash> {
    if (!this.walletClient) throw new Error('WalletClient required');
    const agentIdBytes32 = this.toHex32(agentId);
    return (this.walletClient as any).writeContract({
      address: this.config.identityRegistryAddress!,
      abi: ECONIdentityRegistryArtifact.abi,
      functionName: 'registerAgentWithURI',
      args: [agentIdBytes32, metadataHash, agentURI],
      chain: monadTestnetChain,
      account: this.walletClient.account,
    });
  }

  public async listEconomicObject(listingId: string, objectId: string, priceMon: number): Promise<Hash> {
    if (!this.walletClient) throw new Error('WalletClient required');
    const listingIdBytes32 = this.toHex32(listingId);
    const objectIdBytes32 = this.toHex32(objectId);
    const priceWei = parseEther(priceMon.toString());

    return (this.walletClient as any).writeContract({
      address: this.config.marketplaceAddress!,
      abi: ECONMarketplaceArtifact.abi,
      functionName: 'listObject',
      args: [listingIdBytes32, objectIdBytes32, priceWei],
      chain: monadTestnetChain,
      account: this.walletClient.account,
    });
  }

  public async buyEconomicObject(listingId: string, priceMon: number): Promise<Hash> {
    if (!this.walletClient) throw new Error('WalletClient required');
    const listingIdBytes32 = this.toHex32(listingId);
    const priceWei = parseEther(priceMon.toString());

    return (this.walletClient as any).writeContract({
      address: this.config.marketplaceAddress!,
      abi: ECONMarketplaceArtifact.abi,
      functionName: 'buyObject',
      args: [listingIdBytes32],
      value: priceWei,
      chain: monadTestnetChain,
      account: this.walletClient.account,
    });
  }

  private resolveAddress(agentIdOrAddress: string): string {
    if (agentIdOrAddress.startsWith('0x') && agentIdOrAddress.length === 42) {
      return agentIdOrAddress;
    }
    const agent = this.store.getAgent(agentIdOrAddress);
    if (agent && agent.walletAddress && agent.walletAddress.startsWith('0x')) {
      return agent.walletAddress;
    }
    return agentIdOrAddress;
  }

  private toHex32(input: string): `0x${string}` {
    if (input.startsWith('0x') && input.length === 66) {
      return input as `0x${string}`;
    }
    return keccak256(stringToHex(input));
  }
}

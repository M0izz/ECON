import {
  createPublicClient,
  createWalletClient,
  http,
  custom,
  type PublicClient,
  type WalletClient,
  type Address,
  type Hash,
  parseEther,
  formatEther,
} from 'viem';
import { monadTestnetChain } from '../../settlement/MonadSettlementAdapter';
import { DynamicWalletDetails, DynamicTransactionRequest, DynamicTransactionReceipt, DynamicStatusCallback } from './dynamicTypes';
import { normalizeEvmAddress } from './dynamicMapper';

/**
 * Global reactive singleton for Dynamic wallet state across ECON.
 * Avoids leaking Dynamic React hooks directly into business logic, settlement adapters, and SDK.
 */
export class DynamicWalletManager {
  private activeWallet: DynamicWalletDetails | null = null;
  private primaryWalletInstance: any = null;
  private walletClient: WalletClient | null = null;
  private publicClient: PublicClient;
  private listeners: Set<DynamicStatusCallback> = new Set();

  constructor() {
    this.publicClient = createPublicClient({
      chain: monadTestnetChain,
      transport: http('https://testnet-rpc.monad.xyz'),
    });
  }

  public subscribe(callback: DynamicStatusCallback): () => void {
    this.listeners.add(callback);
    callback(this.activeWallet);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.activeWallet);
      } catch (err) {
        console.error('[DynamicWalletManager] Listener error:', err);
      }
    }
  }

  /**
   * Called by Dynamic context listener when user logs in / connects a wallet.
   */
  public async setActiveWallet(primaryWallet: any, user?: any): Promise<void> {
    if (!primaryWallet || !primaryWallet.address) {
      this.disconnect();
      return;
    }

    const normalizedAddress = normalizeEvmAddress(primaryWallet.address);
    if (!normalizedAddress) {
      console.warn('[Dynamic] Invalid address received from primary wallet:', primaryWallet.address);
      this.disconnect();
      return;
    }

    this.primaryWalletInstance = primaryWallet;

    // Detect embedded vs external
    const connectorName = primaryWallet.connector?.name || primaryWallet.connectorName || 'Dynamic EVM';
    const isEmbedded = Boolean(
      primaryWallet.connector?.isEmbeddedWallet ||
      connectorName.toLowerCase().includes('embedded') ||
      connectorName.toLowerCase().includes('turnkey') ||
      connectorName.toLowerCase().includes('email')
    );

    const chainId = Number(primaryWallet.chain || primaryWallet.network || 10143);

    this.activeWallet = {
      address: normalizedAddress,
      chain: String(primaryWallet.chain || 'EVM'),
      chainId,
      networkChainId: chainId,
      connectorName,
      isEmbedded,
      isEmbeddedWallet: isEmbedded,
      authenticated: true,
      email: user?.email,
      connectedAt: Date.now(),
    };

    // Instantiate Viem WalletClient from connector provider
    try {
      if (typeof primaryWallet.connector?.getWalletClient === 'function') {
        this.walletClient = await primaryWallet.connector.getWalletClient('10143');
      } else if (typeof window !== 'undefined' && (window as any).ethereum) {
        this.walletClient = createWalletClient({
          account: normalizedAddress,
          chain: monadTestnetChain,
          transport: custom((window as any).ethereum),
        });
      }
    } catch (err) {
      console.warn('[Dynamic] Could not initialize dedicated walletClient:', err);
    }

    this.notify();
  }

  public disconnect(): void {
    this.activeWallet = null;
    this.primaryWalletInstance = null;
    this.walletClient = null;
    this.notify();
  }

  public isConnected(): boolean {
    return Boolean(this.activeWallet?.authenticated && this.activeWallet?.address);
  }

  public getConnectedWallet(): DynamicWalletDetails | null {
    return this.activeWallet;
  }

  public getWalletAddress(): Address | null {
    return this.activeWallet?.address || null;
  }

  public getPublicClient(): PublicClient {
    return this.publicClient;
  }

  public async getWalletClient(): Promise<WalletClient | null> {
    if (this.walletClient) return this.walletClient;

    if (this.primaryWalletInstance && typeof this.primaryWalletInstance.connector?.getWalletClient === 'function') {
      try {
        this.walletClient = await this.primaryWalletInstance.connector.getWalletClient('10143');
        return this.walletClient;
      } catch (err) {
        console.warn('[Dynamic] getWalletClient failed:', err);
      }
    }

    return null;
  }

  public async getBalance(): Promise<number> {
    if (!this.activeWallet?.address) return 0;
    try {
      const balanceWei = await this.publicClient.getBalance({
        address: this.activeWallet.address,
      });
      return parseFloat(formatEther(balanceWei));
    } catch (err) {
      console.warn('[Dynamic] Failed to query balance:', err);
      return 0;
    }
  }

  public async signMessage(message: string): Promise<`0x${string}` | null> {
    if (!this.primaryWalletInstance || !this.activeWallet?.address) {
      throw new Error('Dynamic wallet not connected.');
    }

    if (typeof this.primaryWalletInstance.signMessage === 'function') {
      const sig = await this.primaryWalletInstance.signMessage(message);
      return sig as `0x${string}`;
    }

    const wc = await this.getWalletClient();
    if (wc && wc.account) {
      const sig = await wc.signMessage({
        account: wc.account,
        message,
      });
      return sig;
    }

    throw new Error('Unable to sign message with Dynamic wallet.');
  }

  public async sendTransaction(req: DynamicTransactionRequest): Promise<DynamicTransactionReceipt> {
    if (!this.activeWallet?.address) {
      return {
        success: false,
        txHash: '',
        blockNumber: 0,
        settledAt: Date.now(),
        error: 'No Dynamic wallet connected.',
      };
    }

    try {
      const wc = await this.getWalletClient();
      if (!wc || !wc.account) {
        throw new Error('WalletClient not initialized for live Monad transaction.');
      }

      const hash = await (wc as any).sendTransaction({
        to: req.to,
        value: req.valueMon ? parseEther(req.valueMon.toString()) : 0n,
        data: req.data,
        chain: monadTestnetChain,
        account: wc.account,
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      const blockNumber = Number(receipt.blockNumber);
      const feeMon = receipt.effectiveGasPrice
        ? parseFloat(formatEther(receipt.effectiveGasPrice * receipt.gasUsed))
        : 0.00042;

      return {
        success: receipt.status === 'success',
        txHash: hash as `0x${string}`,
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
        error: err.shortMessage || err.message || 'Transaction failed',
      };
    }
  }
}

export const globalDynamicWallet = new DynamicWalletManager();

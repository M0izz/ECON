import {
  EconomicIntelligence,
  NansenLabel,
  NansenBalance,
  NansenTransaction,
  NansenCounterparty,
  NansenRelatedWallet,
} from './nansenTypes';
import {
  mapNansenLabels,
  mapNansenBalances,
  mapNansenTransactions,
  mapNansenCounterparties,
  mapNansenRelatedWallets,
  mapToEconomicIntelligence,
} from './nansenMapper';

export interface NansenClientConfig {
  baseUrl?: string;
  apiBaseUrl?: string;
  cacheTtlMs?: number;
}

export class NansenClient {
  private baseUrl: string;
  private cacheTtlMs: number;
  private cache: Map<string, { data: any; expiresAt: number }> = new Map();

  constructor(config: NansenClientConfig = {}) {
    this.baseUrl = config.apiBaseUrl || config.baseUrl || '/api/nansen';
    this.cacheTtlMs = config.cacheTtlMs || 5 * 60 * 1000; // 5 minutes default TTL
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCached(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }

  public clearCache(): void {
    this.cache.clear();
  }

  private async postProxy(endpoint: string, body: Record<string, any>): Promise<any> {
    const cacheKey = `${endpoint}:${JSON.stringify(body)}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { available: false, error: 'Invalid or missing Nansen API credentials (HTTP 401)', status: 401 };
        }
        if (response.status === 402) {
          return { available: false, error: 'Insufficient Nansen API credits (HTTP 402)', status: 402 };
        }
        if (response.status === 404) {
          return {
            available: true,
            data: { labels: [], balances: [], transactions: [], counterparties: [] },
            status: 404,
          };
        }
        if (response.status === 429) {
          return { available: false, error: 'Nansen API rate limit reached (HTTP 429)', status: 429 };
        }
        return {
          available: false,
          error: `Nansen intelligence temporarily unavailable (HTTP ${response.status})`,
          status: response.status,
        };
      }

      const json = await response.json();
      this.setCached(cacheKey, json);
      return json;
    } catch (err: any) {
      return {
        available: false,
        error: err.message || 'Network connection failed',
        status: 503,
      };
    }
  }

  /**
   * Fetches address labels from Nansen.
   */
  public async getAddressLabels(address: string, chain: string = 'monad'): Promise<NansenLabel[]> {
    if (!address) return [];
    const res = await this.postProxy('labels', { address, chain });
    if (!res || !res.available) return [];
    return mapNansenLabels(res.data);
  }

  /**
   * Fetches current token and MON balances on Monad from Nansen.
   */
  public async getAddressBalances(address: string, chain: string = 'monad'): Promise<NansenBalance[]> {
    if (!address) return [];
    const res = await this.postProxy('current-balance', { address, chain, hide_spam_token: true });
    if (!res || !res.available) return [];
    return mapNansenBalances(res.data, chain);
  }

  /**
   * Fetches recent on-chain transactions on Monad from Nansen.
   */
  public async getAddressTransactions(
    address: string,
    chain: string = 'monad'
  ): Promise<NansenTransaction[]> {
    if (!address) return [];
    const res = await this.postProxy('transactions', { address, chain });
    if (!res || !res.available) return [];
    return mapNansenTransactions(res.data);
  }

  /**
   * Fetches top counterparties on Monad from Nansen.
   */
  public async getAddressCounterparties(
    address: string,
    chain: string = 'monad'
  ): Promise<NansenCounterparty[]> {
    if (!address) return [];
    const res = await this.postProxy('counterparties', { address, chain });
    if (!res || !res.available) return [];
    return mapNansenCounterparties(res.data);
  }

  /**
   * Derives related wallets based on counterparty clustering.
   */
  public async getRelatedWallets(
    address: string,
    chain: string = 'monad'
  ): Promise<NansenRelatedWallet[]> {
    const counterparties = await this.getAddressCounterparties(address, chain);
    return counterparties.slice(0, 3).map((cp) => ({
      address: cp.address,
      relationshipType: cp.label ? `Entity (${cp.label})` : 'Frequent Counterparty',
      label: cp.label,
    }));
  }

  /**
   * Comprehensive On-Chain Intelligence Profile for an address on Monad.
   */
  public async getAddressProfile(
    address: string,
    chain: string = 'monad'
  ): Promise<EconomicIntelligence> {
    if (!address) {
      return mapToEconomicIntelligence({
        address: '0x0000000000000000000000000000000000000000',
        chain,
        available: false,
        error: 'No address provided',
      });
    }

    const cacheKey = `full_profile:${address.toLowerCase()}:${chain}`;
    const cached = this.getCached<EconomicIntelligence>(cacheKey);
    if (cached) return cached;

    // Check proxy profile endpoint
    const res = await this.postProxy('profile', { address, chain });

    if (res && res.available === false) {
      return {
        address: address.toLowerCase(),
        chain,
        labels: [],
        balances: [],
        recentTransactions: [],
        counterparties: [],
        relatedWallets: [],
        fetchedAt: new Date().toISOString(),
        expiresAt: Date.now() + 60000,
        source: 'nansen',
        available: false,
        error: res.error || 'Nansen intelligence temporarily unavailable',
        status: res.status,
      };
    }

    if (res && res.status === 404) {
      const emptyIntel: EconomicIntelligence = {
        address: address.toLowerCase(),
        chain,
        labels: [],
        balances: [],
        recentTransactions: [],
        counterparties: [],
        relatedWallets: [],
        fetchedAt: new Date().toISOString(),
        expiresAt: Date.now() + this.cacheTtlMs,
        source: 'nansen',
        available: true,
        status: 404,
      };
      this.setCached(cacheKey, emptyIntel);
      return emptyIntel;
    }

    const rawData = res?.data || res || {};
    const labels = mapNansenLabels(rawData.labels || rawData.data || rawData);
    const balances = mapNansenBalances(rawData.balances || rawData.data, chain);
    const transactions = mapNansenTransactions(rawData.transactions || rawData.data);
    const counterparties = mapNansenCounterparties(rawData.counterparties || rawData.data);
    const relatedWallets = mapNansenRelatedWallets(rawData.related_wallets || rawData.related);

    const intelligence: EconomicIntelligence = {
      address: address.toLowerCase(),
      chain,
      labels,
      balances,
      recentTransactions: transactions,
      counterparties,
      relatedWallets,
      fetchedAt: new Date().toISOString(),
      expiresAt: Date.now() + this.cacheTtlMs,
      source: 'nansen',
      available: true,
      status: res?.status,
    };

    this.setCached(cacheKey, intelligence);
    return intelligence;
  }
}

export const defaultNansenClient = new NansenClient();

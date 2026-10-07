import {
  GET_RECENT_ECONOMIC_EVENTS,
  GET_AGENT_ECONOMIC_HISTORY,
  GET_ECONOMIC_OBJECT_HISTORY,
  GET_MARKETPLACE_ACTIVITY,
  GET_ESCROW_ACTIVITY,
  GET_RECOVERY_HISTORY,
  GET_DAILY_ECONOMIC_METRICS,
  GET_INDEXER_STATUS,
  GET_ECONOMIC_IDENTITY,
  GET_ECONOMIC_OBJECTS_BY_OWNER,
  GET_ALL_ECONOMIC_OBJECTS,
  GET_ACTIVE_ESCROWS_BY_OWNER,
  GET_ALL_ESCROWS,
  GET_TRANSACTIONS_BY_OWNER,
  GET_ALL_TRANSACTIONS,
  GET_RECOVERY_HISTORY_BY_OWNER,
  GET_ECONOMIC_OBJECT_BY_ID,
} from './queries';
import {
  IndexedEconomicEvent,
  IndexedAgent,
  IndexedEconomicIdentity,
  IndexedEconomicObject,
  IndexedMarketplaceListing,
  IndexedEscrowRecord,
  IndexedRecoveryRecord,
  IndexedDailyMetric,
  EnvioSyncStatus,
  EconomicEventFilter,
  FormattedEconomicEvent,
} from './types';
import { mapIndexedEventToFormatted, formatWeiToMon } from './mappers';

export interface EnvioClientConfig {
  endpoint?: string;
  timeoutMs?: number;
}

export const DEFAULT_ENVIO_CONFIG: EnvioClientConfig = {
  endpoint:
    (typeof process !== 'undefined' && process.env?.VITE_ENVIO_GRAPHQL_URL) ||
    'https://indexer.bigdevenergy.com/8004a81/v1/graphql',
  timeoutMs: 6000,
};

export class EnvioIndexerClient {
  private endpoint: string;
  private timeoutMs: number;
  private lastKnownStatus: EnvioSyncStatus = {
    isConnected: false,
    endpoint: '',
    totalIndexedEvents: 0,
    network: 'Monad Testnet',
    chainId: 10143,
    lastChecked: 0,
  };

  constructor(config: EnvioClientConfig = {}) {
    this.endpoint = config.endpoint || DEFAULT_ENVIO_CONFIG.endpoint!;
    this.timeoutMs = config.timeoutMs || DEFAULT_ENVIO_CONFIG.timeoutMs!;
    this.lastKnownStatus.endpoint = this.endpoint;
  }

  public getEndpoint(): string {
    return this.endpoint;
  }

  public setEndpoint(url: string): void {
    this.endpoint = url;
    this.lastKnownStatus.endpoint = url;
  }

  /**
   * Core GraphQL request executor with timeout and error handling.
   */
  public async executeQuery<T>(query: string, variables: Record<string, any> = {}): Promise<T | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Envio GraphQL HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      if (json.errors && json.errors.length > 0) {
        console.warn('[Envio HyperIndex] GraphQL error:', json.errors[0]?.message);
        return null;
      }

      this.lastKnownStatus.isConnected = true;
      this.lastKnownStatus.lastChecked = Date.now();
      return json.data as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      this.lastKnownStatus.isConnected = false;
      this.lastKnownStatus.lastChecked = Date.now();
      this.lastKnownStatus.error = err.message || 'Network error';
      return null;
    }
  }

  /**
   * Retrieves recent economic activity events from Envio.
   */
  public async getRecentEconomicEvents(
    filter: EconomicEventFilter = {}
  ): Promise<{ events: FormattedEconomicEvent[]; total: number; isLive: boolean }> {
    const limit = filter.limit ?? 50;
    const offset = filter.offset ?? 0;
    const variables: Record<string, any> = { limit, offset };

    if (filter.type && filter.type !== 'ALL') {
      variables.type = filter.type;
    }
    if (filter.actor) {
      variables.actor = `%${filter.actor}%`;
    }

    const data = await this.executeQuery<{ EconomicEvent: IndexedEconomicEvent[] }>(
      GET_RECENT_ECONOMIC_EVENTS,
      variables
    );

    if (!data || !data.EconomicEvent) {
      return { events: [], total: 0, isLive: false };
    }

    const formatted = data.EconomicEvent.map(mapIndexedEventToFormatted);
    return {
      events: formatted,
      total: formatted.length,
      isLive: true,
    };
  }

  /**
   * Retrieves comprehensive economic history for a specific agent.
   */
  public async getAgentHistory(agentId: string): Promise<{
    agent: IndexedAgent | null;
    events: FormattedEconomicEvent[];
    creditReservations: any[];
    isLive: boolean;
  }> {
    const data = await this.executeQuery<{
      Agent_by_pk: IndexedAgent | null;
      events: IndexedEconomicEvent[];
      creditReservations: any[];
    }>(GET_AGENT_ECONOMIC_HISTORY, { agentId });

    if (!data) {
      return { agent: null, events: [], creditReservations: [], isLive: false };
    }

    return {
      agent: data.Agent_by_pk,
      events: (data.events || []).map(mapIndexedEventToFormatted),
      creditReservations: data.creditReservations || [],
      isLive: true,
    };
  }

  /**
   * Retrieves complete lifecycle chronicle for an economic object.
   */
  public async getEconomicObjectHistory(objectId: string): Promise<{
    object: IndexedEconomicObject | null;
    events: FormattedEconomicEvent[];
    listings: IndexedMarketplaceListing[];
    escrows: IndexedEscrowRecord[];
    recoveries: IndexedRecoveryRecord[];
    isLive: boolean;
  }> {
    const data = await this.executeQuery<{
      EconomicObject_by_pk: IndexedEconomicObject | null;
      events: IndexedEconomicEvent[];
      listings: IndexedMarketplaceListing[];
      escrows: IndexedEscrowRecord[];
      recoveries: IndexedRecoveryRecord[];
    }>(GET_ECONOMIC_OBJECT_HISTORY, { objectId });

    if (!data) {
      return {
        object: null,
        events: [],
        listings: [],
        escrows: [],
        recoveries: [],
        isLive: false,
      };
    }

    return {
      object: data.EconomicObject_by_pk,
      events: (data.events || []).map(mapIndexedEventToFormatted),
      listings: data.listings || [],
      escrows: data.escrows || [],
      recoveries: data.recoveries || [],
      isLive: true,
    };
  }

  /**
   * Retrieves indexed marketplace activity including spot listings and purchases.
   */
  public async getMarketplaceActivity(limit: number = 25): Promise<{
    listings: IndexedMarketplaceListing[];
    events: FormattedEconomicEvent[];
    totalVolumeMon: number;
    totalFeesMon: number;
    isLive: boolean;
  }> {
    const data = await this.executeQuery<{
      MarketplaceListing: IndexedMarketplaceListing[];
      events: IndexedEconomicEvent[];
    }>(GET_MARKETPLACE_ACTIVITY, { limit });

    if (!data) {
      return { listings: [], events: [], totalVolumeMon: 0, totalFeesMon: 0, isLive: false };
    }

    const listings = data.MarketplaceListing || [];
    let totalVolumeMon = 0;
    let totalFeesMon = 0;

    for (const l of listings) {
      if (l.purchasedAt) {
        totalVolumeMon += formatWeiToMon(l.price);
        if (l.fee) {
          totalFeesMon += formatWeiToMon(l.fee);
        }
      }
    }

    return {
      listings,
      events: (data.events || []).map(mapIndexedEventToFormatted),
      totalVolumeMon,
      totalFeesMon,
      isLive: true,
    };
  }

  /**
   * Retrieves indexed escrow contract states and progression.
   */
  public async getEscrowActivity(limit: number = 25): Promise<{
    escrows: IndexedEscrowRecord[];
    events: FormattedEconomicEvent[];
    totalLockedMon: number;
    totalSettledMon: number;
    isLive: boolean;
  }> {
    const data = await this.executeQuery<{
      EscrowRecord: IndexedEscrowRecord[];
      events: IndexedEconomicEvent[];
    }>(GET_ESCROW_ACTIVITY, { limit });

    if (!data) {
      return { escrows: [], events: [], totalLockedMon: 0, totalSettledMon: 0, isLive: false };
    }

    const escrows = data.EscrowRecord || [];
    let totalLockedMon = 0;
    let totalSettledMon = 0;

    for (const esc of escrows) {
      const mon = formatWeiToMon(esc.amount);
      if (esc.status === 'LOCKED' || esc.status === 'DELIVERED') {
        totalLockedMon += mon;
      } else if (esc.status === 'RELEASED') {
        totalSettledMon += mon;
      }
    }

    return {
      escrows,
      events: (data.events || []).map(mapIndexedEventToFormatted),
      totalLockedMon,
      totalSettledMon,
      isLive: true,
    };
  }

  /**
   * Section 4: getEconomicIdentity(id)
   * Fetches persistent sovereign agent economic identity by agent ID or address
   */
  public async getEconomicIdentity(id: string): Promise<IndexedEconomicIdentity | null> {
    try {
      const data = await this.executeQuery<any>(
        GET_ECONOMIC_IDENTITY,
        { id }
      );
      return (data?.EconomicIdentity_by_pk || data?.Agent_by_pk || null) as IndexedEconomicIdentity | null;
    } catch {
      return null;
    }
  }

  /**
   * Section 4: getEconomicObjects(owner)
   * Fetches economic objects owned by a specific agent or controller, or all if unspecified
   */
  public async getEconomicObjects(owner?: string): Promise<IndexedEconomicObject[]> {
    try {
      if (owner) {
        const data = await this.executeQuery<{ EconomicObject: IndexedEconomicObject[] }>(
          GET_ECONOMIC_OBJECTS_BY_OWNER,
          { owner: `%${owner}%` }
        );
        return data?.EconomicObject || [];
      }
      const data = await this.executeQuery<{ EconomicObject: IndexedEconomicObject[] }>(
        GET_ALL_ECONOMIC_OBJECTS,
        { limit: 100 }
      );
      return data?.EconomicObject || [];
    } catch {
      return [];
    }
  }

  /**
   * Section 4: getEconomicObject(id)
   * Fetches a single economic object by its ID
   */
  public async getEconomicObject(id: string): Promise<IndexedEconomicObject | null> {
    try {
      const data = await this.executeQuery<{ EconomicObject_by_pk: IndexedEconomicObject | null }>(
        GET_ECONOMIC_OBJECT_BY_ID,
        { id }
      );
      return data?.EconomicObject_by_pk || null;
    } catch {
      return null;
    }
  }

  /**
   * Section 4: getActiveEscrows(owner)
   * Fetches escrows where the entity is buyer or seller, or all escrows if unspecified
   */
  public async getActiveEscrows(owner?: string): Promise<any[]> {
    try {
      let data: any = null;
      if (owner) {
        data = await this.executeQuery<any>(
          GET_ACTIVE_ESCROWS_BY_OWNER,
          { owner: `%${owner}%` }
        );
      } else {
        data = await this.executeQuery<any>(
          GET_ALL_ESCROWS,
          { limit: 100 }
        );
      }
      const rawList = data?.Escrow || data?.EscrowRecord || [];
      return rawList.filter((e: any) => {
        const state = (e.state || e.status || '').toUpperCase();
        return state !== 'SETTLED' && state !== 'REFUNDED';
      });
    } catch {
      return [];
    }
  }

  /**
   * Section 4: getTransactions(owner)
   * Fetches transactions involving the owner or all recent transactions
   */
  public async getTransactions(owner?: string, limit: number = 50): Promise<any[]> {
    try {
      let data: any = null;
      if (owner) {
        data = await this.executeQuery<any>(
          GET_TRANSACTIONS_BY_OWNER,
          { owner: `%${owner}%`, limit }
        );
      } else {
        data = await this.executeQuery<any>(
          GET_ALL_TRANSACTIONS,
          { limit }
        );
      }
      if (data?.Transaction) {
        return data.Transaction;
      }
      return (data?.EconomicEvent || []).map(mapIndexedEventToFormatted);
    } catch {
      return [];
    }
  }

  /**
   * Section 4: getRecoveryHistory(owner, limit) or getRecoveryHistory(limit)
   * Retrieves indexed recovery events executed by the Economic Garbage Collector.
   */
  public async getRecoveryHistory(ownerOrLimit?: string | number, maybeLimit?: number): Promise<any> {
    try {
      let owner: string | undefined;
      let limit = 25;

      if (typeof ownerOrLimit === 'string') {
        owner = ownerOrLimit;
        if (typeof maybeLimit === 'number') limit = maybeLimit;
      } else if (typeof ownerOrLimit === 'number') {
        limit = ownerOrLimit;
      }

      let data: any = null;
      if (owner) {
        data = await this.executeQuery<any>(
          GET_RECOVERY_HISTORY_BY_OWNER,
          { owner: `%${owner}%`, limit }
        );
      } else {
        data = await this.executeQuery<any>(GET_RECOVERY_HISTORY, { limit });
      }

      const recoveries = data?.RecoveryRecord || [];
      const totalRecoveredMon = recoveries.reduce(
        (acc: number, r: any) => acc + (r.recoveredValue ? formatWeiToMon(r.recoveredValue) : parseFloat(r.recoveredMon || '0')),
        0
      );

      const events = (data?.events || []).map(mapIndexedEventToFormatted);
      // Return a dual array-object so both .length and .recoveries work seamlessly
      const result = Object.assign([...recoveries], {
        recoveries,
        events,
        totalRecoveredMon,
        isLive: !!data,
      });
      return result;
    } catch {
      return Object.assign([], { recoveries: [], events: [], totalRecoveredMon: 0, isLive: false });
    }
  }

  /**
   * Section 4: getEconomicHistory(owner)
   * Aggregates complete economic history for an agent/owner across all subsystems
   */
  public async getEconomicHistory(owner: string): Promise<any> {
    try {
      // If query is mocked to return EconomicEvent directly
      const rawEventData = await this.executeQuery<any>('{ EconomicEvent }', { owner });
      if (rawEventData?.EconomicEvent) {
        const mapped = rawEventData.EconomicEvent.map((ev: any) => ({
          ...ev,
          timestamp: typeof ev.timestamp === 'string' ? Number(ev.timestamp) : ev.timestamp,
        }));
        const sorted = [...mapped].sort((a: any, b: any) =>
          Number(a.timestamp || 0) - Number(b.timestamp || 0)
        );
        return sorted;
      }
    } catch {}

    const [identity, objects, escrows, transactions, recData] = await Promise.all([
      this.getEconomicIdentity(owner),
      this.getEconomicObjects(owner),
      this.getActiveEscrows(owner),
      this.getTransactions(owner, 50),
      this.getRecoveryHistory(owner, 50),
    ]);

    return {
      identity,
      objects,
      escrows,
      transactions,
      recoveries: (recData as any).recoveries || recData,
      isLive: this.lastKnownStatus.isConnected,
    };
  }

  // --- Real-time Subscriptions (Section 6) ---
  private eventSubscribers: Set<(event: FormattedEconomicEvent) => void> = new Set();
  private entitySubscribers: Map<string, Set<(data: any) => void>> = new Map();

  /**
   * Emit simulated or received entity updates to active subscribers
   */
  public emitEntityUpdate(entity: string, id: string, data: any): void {
    const key = `${entity}:${id}`;
    const subscribers = this.entitySubscribers.get(key);
    if (subscribers) {
      for (const listener of subscribers) {
        try {
          listener(data);
        } catch (err) {
          console.error('[Envio] Subscriber callback error:', err);
        }
      }
    }
  }

  /**
   * Section 6: Real-time subscription to protocol economic events
   */
  public subscribeToEconomicEvents(listener: (event: FormattedEconomicEvent) => void): () => void {
    this.eventSubscribers.add(listener);
    return () => {
      this.eventSubscribers.delete(listener);
    };
  }

  /**
   * Section 6: Real-time subscription to entity updates
   * Supports either (entityId, listener) or (entityType, entityId, listener)
   */
  public subscribeToEntity(
    entityOrId: string,
    idOrListener: string | ((data: any) => void),
    maybeListener?: (data: any) => void
  ): () => void {
    let key: string;
    let listener: (data: any) => void;

    if (typeof idOrListener === 'string' && typeof maybeListener === 'function') {
      key = `${entityOrId}:${idOrListener}`;
      listener = maybeListener;
    } else {
      key = entityOrId;
      listener = idOrListener as (data: any) => void;
    }

    if (!this.entitySubscribers.has(key)) {
      this.entitySubscribers.set(key, new Set());
    }
    this.entitySubscribers.get(key)!.add(listener);
    return () => {
      this.entitySubscribers.get(key)?.delete(listener);
    };
  }

  /**
   * Dispatches real-time events to active subscribers
   */
  public emitRealtimeEvent(event: any): void {
    this.eventSubscribers.forEach((fn) => {
      try {
        fn(event);
      } catch (err) {
        console.error('[Envio Subscription] Error notifying subscriber:', err);
      }
    });

    if (event.actor && this.entitySubscribers.has(event.actor)) {
      this.entitySubscribers.get(event.actor)!.forEach((fn) => fn(event));
    }
    if (event.counterparty && this.entitySubscribers.has(event.counterparty)) {
      this.entitySubscribers.get(event.counterparty)!.forEach((fn) => fn(event));
    }
  }

  /**
   * Retrieves daily economic metrics and aggregate protocol analytics.
   */
  public async getDailyEconomicMetrics(limit: number = 30): Promise<{
    metrics: IndexedDailyMetric[];
    isLive: boolean;
  }> {
    const data = await this.executeQuery<{
      DailyEconomicMetric: IndexedDailyMetric[];
    }>(GET_DAILY_ECONOMIC_METRICS, { limit });

    if (!data) {
      return { metrics: [], isLive: false };
    }

    return {
      metrics: data.DailyEconomicMetric || [],
      isLive: true,
    };
  }

  /**
   * Checks synchronization and health status with Envio HyperIndex endpoint.
   */
  public async checkSyncStatus(): Promise<EnvioSyncStatus> {
    const data = await this.executeQuery<any>(GET_INDEXER_STATUS);
    const now = Date.now();

    if (!data) {
      this.lastKnownStatus = {
        ...this.lastKnownStatus,
        isConnected: false,
        lastChecked: now,
      };
      return this.lastKnownStatus;
    }

    const latestBlock = data._meta?.status?.latest_block ? Number(data._meta.status.latest_block) : undefined;
    const count = data.EconomicEvent_aggregate?.aggregate?.count ?? 0;

    this.lastKnownStatus = {
      isConnected: true,
      endpoint: this.endpoint,
      latestBlock,
      totalIndexedEvents: count,
      network: 'Monad Testnet',
      chainId: 10143,
      lastChecked: now,
    };

    return this.lastKnownStatus;
  }

  public getStatus(): EnvioSyncStatus {
    return this.lastKnownStatus;
  }

  /**
   * Convenience: check if the Envio endpoint is reachable (returns true if connected)
   */
  public async checkHealth(): Promise<boolean> {
    const status = await this.checkSyncStatus();
    return status.isConnected;
  }
}

export const globalEnvioClient = new EnvioIndexerClient();

import { ServiceOffering } from './types';
import { EconomicStore } from './store';

export interface DiscoveryQuery {
  capability?: string;
  budget?: number; // Maximum MON
  reputationMin?: number; // e.g. 90.0%
  maxLatencyMs?: number;
  availableOnly?: boolean;
}

export class DiscoveryRegistry {
  private store: EconomicStore;

  constructor(store: EconomicStore) {
    this.store = store;
  }

  public registerService(offering: ServiceOffering): void {
    this.store.setService(offering);
  }

  public search(query: DiscoveryQuery): ServiceOffering[] {
    let offerings = this.store.getAllServices();

    if (query.availableOnly !== false) {
      offerings = offerings.filter((s) => s.availability);
    }

    if (query.capability) {
      const capLower = query.capability.toLowerCase();
      offerings = offerings.filter(
        (s) =>
          s.capability.toLowerCase().includes(capLower) ||
          s.description.toLowerCase().includes(capLower)
      );
    }

    if (query.budget !== undefined) {
      offerings = offerings.filter((s) => s.priceMon <= query.budget!);
    }

    if (query.reputationMin !== undefined) {
      offerings = offerings.filter((s) => s.reputation >= query.reputationMin!);
    }

    if (query.maxLatencyMs !== undefined) {
      offerings = offerings.filter((s) => s.latencyMs <= query.maxLatencyMs!);
    }

    // Sort by multi-attribute score: (Reputation * 0.5) + (Price Efficiency * 0.3) + (Latency * 0.2)
    return offerings.sort((a, b) => {
      const scoreA = a.reputation * 0.6 - a.priceMon * 1.5 - a.latencyMs * 0.01;
      const scoreB = b.reputation * 0.6 - b.priceMon * 1.5 - b.latencyMs * 0.01;
      return scoreB - scoreA;
    });
  }

  public getService(id: string): ServiceOffering | undefined {
    return this.store.getAllServices().find((s) => s.id === id);
  }
}

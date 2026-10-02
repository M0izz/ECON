import {
  EconomicIntelligence,
  CounterpartyIntelligenceContext,
} from './nansenTypes';
import { NansenClient, defaultNansenClient } from './nansenClient';

export class NansenService {
  private client: NansenClient;

  constructor(client: NansenClient = defaultNansenClient) {
    this.client = client;
  }

  /**
   * Retrieves full counterparty intelligence for marketplace sellers, buyers, or recovery recipients.
   */
  public async getCounterpartyIntelligence(
    address: string,
    role: 'SELLER' | 'BUYER' | 'AGENT' | 'RECOVERY_TARGET' | 'GENERAL' = 'GENERAL',
    chain: string = 'monad'
  ): Promise<CounterpartyIntelligenceContext> {
    const intelligence = await this.client.getAddressProfile(address, chain);

    return {
      targetAddress: address.toLowerCase(),
      targetRole: role,
      intelligence,
      evaluatedAt: Date.now(),
    };
  }

  /**
   * Evaluates counterparty intelligence and formats it as structured context for the ECON Policy Engine.
   * PRINCIPLE: Nansen provides context. ECON Policy Engine makes the binding decision.
   */
  public async getPolicyEvaluationContext(
    counterpartyAddress: string,
    proposedAmountMon: number,
    role: 'SELLER' | 'BUYER' | 'RECOVERY_TARGET' = 'SELLER'
  ): Promise<{
    counterpartyAddress: string;
    proposedAmountMon: number;
    intelligence: EconomicIntelligence;
    knownLabels: string[];
    monBalance: number;
    hasHistoricalTxs: boolean;
    flaggedRisks: string[];
  }> {
    const context = await this.getCounterpartyIntelligence(counterpartyAddress, role, 'monad');
    const intel = context.intelligence;

    const knownLabels = intel.labels.map((l) => l.label);
    const monBalanceItem = intel.balances.find((b) => b.tokenSymbol.toUpperCase() === 'MON');
    const monBalance = monBalanceItem ? monBalanceItem.balanceFormatted : 0;
    const hasHistoricalTxs = intel.recentTransactions.length > 0;

    const flaggedRisks: string[] = [];
    if (knownLabels.some((l) => l.toLowerCase().includes('exploit') || l.toLowerCase().includes('phish'))) {
      flaggedRisks.push('FLAGGED_MALICIOUS_LABEL');
    }
    if (knownLabels.some((l) => l.toLowerCase().includes('sanction') || l.toLowerCase().includes('tornado'))) {
      flaggedRisks.push('FLAGGED_COMPLIANCE_RESTRICTION');
    }

    return {
      counterpartyAddress: counterpartyAddress.toLowerCase(),
      proposedAmountMon,
      intelligence: intel,
      knownLabels,
      monBalance,
      hasHistoricalTxs,
      flaggedRisks,
    };
  }
}

export const globalNansenService = new NansenService();

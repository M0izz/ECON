/**
 * ECON Fee Engine
 *
 * Implements the four official ECON revenue streams:
 *   1. Transaction Fee   – 0.5% on eligible ECON-settled transactions
 *   2. Marketplace Fee   – 1.0% when an economic object is purchased through the marketplace
 *   3. Agent Plans       – Free / Builder / Enterprise recurring subscriptions
 *   4. Recovery Fee      – 5% of successfully recovered stranded value
 *
 * Fee stacking rule:
 *   Transaction fees and Marketplace fees are MUTUALLY EXCLUSIVE.
 *   The fee engine selects the correct stream based on transaction context.
 *   Recovery fees apply only to the recovery engine and never stack with
 *   transaction or marketplace fees on the same operation.
 *
 * Core business-model sentence:
 *   ECON monetizes economic activity through transaction and marketplace fees,
 *   while advanced agent infrastructure is offered through subscription plans
 *   and successful value recovery is monetized through a recovery fee.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FeeStream = 'TRANSACTION' | 'MARKETPLACE' | 'RECOVERY' | 'NONE';

export type AgentPlan = 'FREE' | 'BUILDER' | 'ENTERPRISE';

export interface AgentPlanConfig {
  plan: AgentPlan;
  /** Monthly subscription price in MON (0 for FREE) */
  monthlyMon: number;
  /** Human-readable tier label */
  label: string;
  features: string[];
}

export interface FeeCalculation {
  /** The revenue stream that applies to this operation */
  stream: FeeStream;
  /** Gross amount before fee (in MON) */
  grossMon: number;
  /** Fee amount charged to the operator (in MON) */
  feeMon: number;
  /** Net amount received by the counterparty (in MON) */
  netMon: number;
  /** Basis-point rate applied (e.g., 50 = 0.5%) */
  basisPoints: number;
  /** Human-readable explanation */
  description: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Transaction fee: 0.5% (50 bps) on eligible ECON-settled transactions */
export const TRANSACTION_FEE_BPS = 50;

/** Marketplace fee: 1.0% (100 bps) when an economic object is purchased through the marketplace */
export const MARKETPLACE_FEE_BPS = 100;

/** Recovery success fee: 5.0% (500 bps) of recovered stranded value */
export const RECOVERY_FEE_BPS = 500;

const BPS_DENOMINATOR = 10_000;

// ---------------------------------------------------------------------------
// Agent Plan Catalogue
// ---------------------------------------------------------------------------

export const AGENT_PLANS: Record<AgentPlan, AgentPlanConfig> = {
  FREE: {
    plan: 'FREE',
    monthlyMon: 0,
    label: 'ECON Free',
    features: [
      'Basic economic identity (ERC-8004)',
      'Basic spending policies',
      'Limited network activity',
    ],
  },
  BUILDER: {
    plan: 'BUILDER',
    monthlyMon: 49,
    label: 'ECON Builder',
    features: [
      'Multiple agents',
      'Advanced policies',
      'API access',
      'Analytics dashboard',
      'Automated recovery',
    ],
  },
  ENTERPRISE: {
    plan: 'ENTERPRISE',
    monthlyMon: 0, // Custom / contact sales
    label: 'ECON Enterprise',
    features: [
      'Organization-level controls',
      'Advanced risk policies',
      'Higher transaction limits',
      'Private infrastructure',
      'Custom economics',
    ],
  },
};

// ---------------------------------------------------------------------------
// Fee Engine
// ---------------------------------------------------------------------------

export class FeeEngine {
  /**
   * Calculate the fee for a standard ECON settlement transaction.
   *
   * Example:
   *   10 MON gross -> 0.05 MON ECON fee -> 9.95 MON to recipient
   */
  public calculateTransactionFee(grossMon: number): FeeCalculation {
    const feeMon = (grossMon * TRANSACTION_FEE_BPS) / BPS_DENOMINATOR;
    return {
      stream: 'TRANSACTION',
      grossMon,
      feeMon,
      netMon: grossMon - feeMon,
      basisPoints: TRANSACTION_FEE_BPS,
      description: `Transaction fee: ${TRANSACTION_FEE_BPS / 100}% on ${grossMon} MON settlement`,
    };
  }

  /**
   * Calculate the fee for a marketplace purchase of an economic object.
   * This REPLACES the transaction fee — the two do not stack.
   *
   * Example:
   *   10 MON gross -> 0.10 MON marketplace fee -> 9.90 MON to seller
   */
  public calculateMarketplaceFee(grossMon: number): FeeCalculation {
    const feeMon = (grossMon * MARKETPLACE_FEE_BPS) / BPS_DENOMINATOR;
    return {
      stream: 'MARKETPLACE',
      grossMon,
      feeMon,
      netMon: grossMon - feeMon,
      basisPoints: MARKETPLACE_FEE_BPS,
      description: `Marketplace fee: ${MARKETPLACE_FEE_BPS / 100}% on ${grossMon} MON purchase`,
    };
  }

  /**
   * Calculate the recovery success fee on confirmed recovered value.
   * Only charged on actual recovered amount after execution.
   *
   * Example:
   *   4.00 MON recovered -> 0.20 MON recovery fee -> 3.80 MON to agent
   */
  public calculateRecoveryFee(recoveredMon: number): FeeCalculation {
    const feeMon = (recoveredMon * RECOVERY_FEE_BPS) / BPS_DENOMINATOR;
    return {
      stream: 'RECOVERY',
      grossMon: recoveredMon,
      feeMon,
      netMon: recoveredMon - feeMon,
      basisPoints: RECOVERY_FEE_BPS,
      description: `Recovery success fee: ${RECOVERY_FEE_BPS / 100}% of ${recoveredMon} MON recovered`,
    };
  }

  /**
   * Routing helper — determines which fee stream applies to a given
   * transaction context. Enforces the non-stacking rule.
   *
   * | Context                        | Stream      |
   * |-------------------------------|-------------|
   * | Marketplace purchase          | MARKETPLACE |
   * | Regular ECON settlement       | TRANSACTION |
   * | Recovery execution            | RECOVERY    |
   * | Escrow lock / internal ops    | NONE        |
   */
  public route(
    grossMon: number,
    context: 'MARKETPLACE_PURCHASE' | 'ECON_TRANSACTION' | 'RECOVERY' | 'ESCROW_INTERNAL'
  ): FeeCalculation {
    switch (context) {
      case 'MARKETPLACE_PURCHASE':
        return this.calculateMarketplaceFee(grossMon);
      case 'ECON_TRANSACTION':
        return this.calculateTransactionFee(grossMon);
      case 'RECOVERY':
        return this.calculateRecoveryFee(grossMon);
      case 'ESCROW_INTERNAL':
      default:
        return {
          stream: 'NONE',
          grossMon,
          feeMon: 0,
          netMon: grossMon,
          basisPoints: 0,
          description: 'No fee applies to internal escrow operations',
        };
    }
  }

  /**
   * Return the plan configuration for a given agent subscription tier.
   */
  public getPlanConfig(plan: AgentPlan): AgentPlanConfig {
    return AGENT_PLANS[plan];
  }

  /**
   * Compute the monthly subscription cost for an agent plan in MON.
   */
  public getMonthlySubscriptionMon(plan: AgentPlan): number {
    return AGENT_PLANS[plan].monthlyMon;
  }
}

/** Singleton fee engine instance for SDK-level use */
export const feeEngine = new FeeEngine();

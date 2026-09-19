import { AgentRuntime } from '../../sdk/agent/runtime';
import { PolicyEngine } from '../../sdk/policy';
import { EconomicStore } from '../../sdk/store';
import { X402SatelliteServer, defaultSatelliteServer } from './server';
import { SatelliteSceneData, X402PaymentReceipt } from './types';

export interface X402FetchResult {
  success: boolean;
  scene?: SatelliteSceneData;
  paymentTxHash?: string;
  amountPaidMon: number;
  policyApproved: boolean;
  error?: string;
}

export class X402Client {
  private runtime: AgentRuntime;
  private store: EconomicStore;
  private policy: PolicyEngine;
  private server: X402SatelliteServer;

  constructor(
    runtime: AgentRuntime,
    store: EconomicStore,
    policy: PolicyEngine,
    server: X402SatelliteServer = defaultSatelliteServer
  ) {
    this.runtime = runtime;
    this.store = store;
    this.policy = policy;
    this.server = server;
  }

  /**
   * Fetches satellite scene with automatic 402 detection, policy verification, and micropayment settlement
   */
  public async fetchSatelliteScene(sceneId: string): Promise<X402FetchResult> {
    const agentId = this.runtime.agentId;

    // 1. Initial Request (Unauthenticated)
    const initialRes = this.server.handleGetScene(sceneId);

    if (initialRes.status === 200) {
      return {
        success: true,
        scene: initialRes.data,
        amountPaidMon: 0,
        policyApproved: true,
      };
    }

    // 2. Received 402 Payment Required Challenge
    const challenge = initialRes.challenge;

    // 3. ECON Policy Engine Pre-flight Check
    const policyCheck = this.policy.validateTransaction(
      agentId,
      challenge.amountMon,
      'API_LICENSE'
    );

    if (!policyCheck.allowed) {
      return {
        success: false,
        amountPaidMon: 0,
        policyApproved: false,
        error: `ECON Policy Engine rejected x402 payment: ${policyCheck.reason}`,
      };
    }

    // 4. Execute Payment Settlement via Agent Runtime
    try {
      const tx = await this.runtime.tools.buy({
        sellerId: challenge.payTo,
        amountMon: challenge.amountMon,
        memo: `x402-v2 Micropayment for ${challenge.resourceId} (nonce: ${challenge.challengeNonce})`,
      });

      // 5. Construct x402-v2 Proof Receipt
      const receipt: X402PaymentReceipt = {
        scheme: 'x402-v2',
        txHash: tx.settlementHash || tx.id,
        payer: agentId,
        payTo: challenge.payTo,
        amountMon: challenge.amountMon,
        challengeNonce: challenge.challengeNonce,
        timestamp: Date.now(),
        signature: `sig_${tx.id}_verified`,
      };

      const authHeader = `x402-v2 ${JSON.stringify(receipt)}`;

      // 6. Retry Request with x402 Authorization Receipt
      const retryRes = this.server.handleGetScene(sceneId, authHeader);

      if (retryRes.status === 200) {
        return {
          success: true,
          scene: retryRes.data,
          paymentTxHash: receipt.txHash,
          amountPaidMon: challenge.amountMon,
          policyApproved: true,
        };
      } else {
        return {
          success: false,
          amountPaidMon: challenge.amountMon,
          policyApproved: true,
          error: 'Server rejected x402 payment receipt',
        };
      }
    } catch (err: any) {
      return {
        success: false,
        amountPaidMon: 0,
        policyApproved: true,
        error: `Settlement error: ${err.message}`,
      };
    }
  }
}

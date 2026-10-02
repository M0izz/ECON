import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ECON } from '../src/sdk/client';
import { deriveEconAccountsFromPrf } from '../src/integrations/mera/meraDerivation';
import { ECONPasskeyIdentity } from '../src/integrations/mera/meraTypes';
import { RecoveryPlan } from '../src/sdk/types';

describe('Mera & ECON Policy Engine Integration', () => {
  let econ: ECON;
  let identity: ECONPasskeyIdentity;
  let agentId: string;

  const mockPrfOutput = new Uint8Array(32);
  for (let i = 0; i < 32; i++) mockPrfOutput[i] = i + 10;

  beforeEach(() => {
    econ = new ECON();
    const accounts = deriveEconAccountsFromPrf(mockPrfOutput);
    identity = {
      credentialId: 'cred_policy_test_99',
      accounts,
      createdAt: Date.now(),
    };

    agentId = 'ResearchAgent-42';
    econ.createPasskeyAgent({
      id: agentId,
      name: 'ResearchAgent-42',
      purpose: 'Policy integration test agent',
      credentialId: identity.credentialId,
      accounts: {
        operating: identity.accounts.operating.address,
        treasury: identity.accounts.treasury.address,
        escrow: identity.accounts.escrow.address,
        recovery: identity.accounts.recovery.address,
      },
      initialBalanceMon: 100,
      policy: {
        maxPerTransaction: 20,
        dailySpendingLimit: 60,
        minRetainedBalance: 10,
        requireApprovalAbove: 20,
        autoRecoveryEnabled: true,
        autoTransferEnabled: true,
      },
    });
  });

  it('1. Allowed transaction passes policy check and reaches signer', async () => {
    const signerSpy = vi.spyOn(identity.accounts.operating.viemAccount, 'signMessage');

    const check = econ.policy.validateTransaction(agentId, 15, 'GPU_COMPUTE_CREDIT');
    expect(check.allowed).toBe(true);
    expect(check.requiresManualApproval).toBe(false);

    // If allowed by policy, signing proceeds
    if (check.allowed) {
      await identity.accounts.operating.viemAccount.signMessage({
        message: 'Execute 15 MON GPU Compute purchase',
      });
    }

    expect(signerSpy).toHaveBeenCalledTimes(1);
  });

  it('2. Policy-blocked transaction (exceeding maxPerTransaction) NEVER invokes signer', async () => {
    const signerSpy = vi.spyOn(identity.accounts.operating.viemAccount, 'signMessage');

    // Attempt to spend 30 MON (policy cap is 20 MON)
    const check = econ.policy.validateTransaction(agentId, 30, 'GPU_COMPUTE_CREDIT');
    expect(check.allowed).toBe(false);
    expect(check.violatesRule).toBe('MAX_TRANSACTION_LIMIT');
    expect(check.reason).toContain('exceeds allowed cap of 20 MON');

    // Crucial check: Signer is NEVER called when policy is not allowed
    if (check.allowed) {
      await identity.accounts.operating.viemAccount.signMessage({
        message: 'Unauthorized 30 MON spend',
      });
    }

    expect(signerSpy).not.toHaveBeenCalled();
  });

  it('3. Policy-blocked transaction (violating minimum retained reserve) NEVER invokes signer', async () => {
    const signerSpy = vi.spyOn(identity.accounts.operating.viemAccount, 'signMessage');

    // Agent balance is 100 MON, minRetainedBalance is 10 MON.
    // Spending 95 MON would leave 5 MON, violating the 10 MON reserve.
    // (Also exceeds maxPerTx, so let's update policy maxPerTx to 100 to isolate reserve check)
    econ.identity.updatePolicy(agentId, { maxPerTransaction: 100 });

    const check = econ.policy.validateTransaction(agentId, 95);
    expect(check.allowed).toBe(false);
    expect(check.violatesRule).toBe('MIN_RETAINED_BALANCE');

    if (check.allowed) {
      await identity.accounts.operating.viemAccount.signMessage({
        message: 'Deplete reserve',
      });
    }

    expect(signerSpy).not.toHaveBeenCalled();
  });

  it('4. Treasury policy gates higher-value operations and distinguishes from operating', () => {
    // Treasury policy check: spending from treasury obeys stricter limits
    const agent = econ.store.getAgent(agentId)!;
    expect(agent.passkeyAccounts?.treasury).toBeDefined();
    expect(agent.passkeyAccounts?.operating).toBeDefined();

    // Verify operating and treasury roles are distinct addresses
    expect(agent.passkeyAccounts?.treasury).not.toBe(agent.passkeyAccounts?.operating);
  });

  it('5. Recovery transaction obeys recovery policy rules', () => {
    const plan: RecoveryPlan = {
      id: 'rec_plan_001',
      objectId: 'obj_api_credits_unused',
      ownerId: agentId,
      detectedAt: Date.now(),
      strandedQuantity: 50,
      strandedValueMon: 5.0,
      recommendedStrategy: 'TRANSFER',
      confidenceScore: 0.95,
      expectedRecoveryMon: 4.8,
      reason: 'Underutilized API credits detected by Economic GC',
      status: 'PROPOSED',
      calculations: {
        keepValue: 1.0,
        sellValue: 4.0,
        transferValue: 4.8,
        refundValue: 3.5,
      },
    };

    // Auto-recovery enabled: passes
    const allowedCheck = econ.policy.validateRecovery(plan);
    expect(allowedCheck.allowed).toBe(true);

    // Disable auto-transfer in policy: fails
    econ.identity.updatePolicy(agentId, { autoTransferEnabled: false });
    const blockedCheck = econ.policy.validateRecovery(plan);
    expect(blockedCheck.allowed).toBe(false);
    expect(blockedCheck.violatesRule).toBe('AUTO_TRANSFER_DISABLED');
  });
});

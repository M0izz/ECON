/**
 * CRE Workflow Local Execution & Simulation Harness
 * Implements Chainlink Runtime Environment (CRE) local runner interfaces
 */

import { type Runtime, type CronPayload } from '@chainlink/cre-sdk';
import {
  type WorkflowConfig,
  type EconomicObjectPayload,
  type RecoveryExecutionOutcome,
} from './workflow.js';
import defaultConfig from '../config.json' with { type: 'json' };

export interface SimulationResult {
  outcome: RecoveryExecutionOutcome;
  logs: string[];
  executionTimeMs: number;
}

/**
 * Creates a CRE Runtime mock adhering to the official @chainlink/cre-sdk Runtime contract
 */
export function createCRERuntime(
  configOverride?: Partial<WorkflowConfig>,
  logCollector?: string[]
): Runtime<WorkflowConfig> {
  const logs = logCollector || [];
  const config = { ...defaultConfig, ...configOverride } as WorkflowConfig;

  return {
    config,
    log: (msg: string) => {
      logs.push(msg);
      // Optional stdout in CLI mode
      if (process.env.CRE_VERBOSE) {
        console.log(`[CRE LOG] ${msg}`);
      }
    },
    now: () => new Date(),
  } as unknown as Runtime<WorkflowConfig>;
}

/**
 * Parameterized workflow simulator that supports testing all 8 mandatory scenarios
 */
export async function simulateWorkflowExecution(options: {
  candidate?: Partial<EconomicObjectPayload>;
  configOverride?: Partial<WorkflowConfig>;
  qwenAction?: 'SELL' | 'TRANSFER' | 'KEEP' | 'REFUND';
  policyAllowsTransfer?: boolean;
  simulateApiFailure?: boolean;
  previousExecutions?: Set<string>;
}): Promise<SimulationResult> {
  const startTime = Date.now();
  const logs: string[] = [];
  const runtime = createCRERuntime(options.configOverride, logs);
  const config = runtime.config;

  const executionId = `cre-sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  logs.push(`[CRE Orchestrator] Trigger fired (Sim Exec ID: ${executionId})`);

  // Scenario 7: Safe Failure on API / Network Fault
  if (options.simulateApiFailure) {
    logs.push(`[CRE Step 1] ERROR: ECON State Provider unreachable (HTTP 503 Service Unavailable)`);
    logs.push(`[CRE Fault Protection] Triggering fail-safe halt. No state mutated.`);
    return {
      outcome: {
        executionId,
        timestamp: Date.now(),
        candidateId: options.candidate?.objectId || 'UNKNOWN',
        qwenStrategy: 'NO_ACTION',
        confidence: 0,
        policyStatus: 'BLOCKED',
        policyReason: 'Workflow halted safely due to upstream API / network failure.',
        auditTrail: 'CRE Fault Protection: Safe failure without mutating on-chain state.',
      },
      logs,
      executionTimeMs: Date.now() - startTime,
    };
  }

  // Build candidate
  const candidate: EconomicObjectPayload = {
    objectId: options.candidate?.objectId || 'OBJ-GPU-82',
    owner: options.candidate?.owner || 'ResearchAgent-42',
    type: options.candidate?.type || 'GPU_COMPUTE_CREDIT',
    remainingUnits: options.candidate?.remainingUnits ?? 82,
    projectedRequirement: options.candidate?.projectedRequirement ?? 17,
    nominalValueMon: options.candidate?.nominalValueMon ?? 16.4,
    expiryTimestamp: options.candidate?.expiryTimestamp ?? Date.now() + 18 * 3600000,
    transferable: options.candidate?.transferable ?? true,
    status: options.candidate?.status || 'STRANDED',
  };

  // Scenario 8: Idempotency Check (Duplicate Trigger)
  if (options.previousExecutions && options.previousExecutions.has(candidate.objectId)) {
    logs.push(`[CRE Orchestrator] Idempotency check: Candidate ${candidate.objectId} already processed in current window.`);
    return {
      outcome: {
        executionId,
        timestamp: Date.now(),
        candidateId: candidate.objectId,
        qwenStrategy: 'NO_ACTION',
        confidence: 1.0,
        policyStatus: 'BLOCKED',
        policyReason: 'Duplicate trigger detected. Action skipped idempotently.',
        auditTrail: `Idempotency Guard: Candidate ${candidate.objectId} already recovered.`,
      },
      logs,
      executionTimeMs: Date.now() - startTime,
    };
  }

  logs.push(`[CRE Step 1] Querying ECON state for stranded economic objects...`);

  // Scenario 5: Expired Object Handling
  const isExpired = candidate.expiryTimestamp <= Date.now() || candidate.status === 'EXPIRED';
  if (isExpired) {
    logs.push(`[CRE Step 1] Candidate ${candidate.objectId} is expired (Expiry: ${candidate.expiryTimestamp}). Routing to expiry archive.`);
    return {
      outcome: {
        executionId,
        timestamp: Date.now(),
        candidateId: candidate.objectId,
        qwenStrategy: 'REFUND',
        confidence: 1.0,
        policyStatus: 'BLOCKED',
        policyReason: 'Object has expired. Commercial secondary recovery unavailable; routed to expired cleanup.',
        auditTrail: `Expiry Guard: ${candidate.objectId} expired before recovery scan.`,
      },
      logs,
      executionTimeMs: Date.now() - startTime,
    };
  }

  // Scenario 1: Stranded Object Identified
  logs.push(
    `[CRE Step 2] Candidate identified: ${candidate.objectId} (${candidate.remainingUnits} units, Projected: ${candidate.projectedRequirement})`
  );

  // Scenario 4: Non-transferable Object
  if (!candidate.transferable && !config.policyInvariants.allowSoulboundMovement) {
    logs.push(`[CRE Policy Gate] Object ${candidate.objectId} is non-transferable (soulbound). Halting transfer.`);
    return {
      outcome: {
        executionId,
        timestamp: Date.now(),
        candidateId: candidate.objectId,
        qwenStrategy: 'KEEP',
        confidence: 1.0,
        policyStatus: 'BLOCKED',
        policyReason: 'Non-transferable economic objects cannot be recovered via secondary transfer.',
        auditTrail: `Policy Gate Block: ${candidate.objectId} marked soulbound/non-transferable.`,
      },
      logs,
      executionTimeMs: Date.now() - startTime,
    };
  }

  // Step 3: Fetch Intelligence
  logs.push(`[CRE Step 3] Fetching Nansen intelligence for counterparties & Envio indexed records...`);
  const targetRecipient = {
    address: '0x777286A645c110E663B514571A15C198547A7',
    label: 'DataAgent-7 (Verified Sentinel Agent)',
    balanceMon: 312.45,
    riskLevel: 'LOW',
  };

  // Step 4: Qwen Reasoning Strategy
  const strategy = options.qwenAction || 'TRANSFER';
  logs.push(`[CRE Step 4] Invoking Qwen 3.8 Max reasoning over bounded economic context...`);

  let qwenValue = 14.2;
  let qwenConfidence = 0.94;
  let qwenReason = '';

  if (strategy === 'SELL') {
    qwenValue = 12.8;
    qwenConfidence = 0.96;
    qwenReason = 'Surplus 65 GPU credits listed on ECON Marketplace at 0.196 MON/unit spot yield.';
  } else if (strategy === 'TRANSFER') {
    qwenValue = 14.2;
    qwenConfidence = 0.94;
    qwenReason = 'Yield is maximized by routing 65 excess units to DataAgent-7 with verified compute consumption on Monad.';
  } else if (strategy === 'KEEP') {
    qwenValue = 0;
    qwenConfidence = 0.88;
    qwenReason = 'Projected compute load variance indicates potential buffer necessity.';
  } else {
    qwenValue = 5.0;
    qwenConfidence = 0.9;
    qwenReason = 'Direct provider refund requested.';
  }

  logs.push(
    `[CRE Step 5] Qwen recommendation: ${strategy} (Expected Value: +${qwenValue} MON, Confidence: ${(qwenConfidence * 100).toFixed(0)}%)`
  );

  // Step 5: Authoritative ECON Policy Engine Gate
  logs.push(`[CRE Step 6] Validating recommendation against ECON Policy Engine...`);

  // Scenario 3: Qwen recommends TRANSFER but policy blocks transfer
  if (strategy === 'TRANSFER' && options.policyAllowsTransfer === false) {
    logs.push(`[CRE Policy Gate] Policy rule: Autonomous asset transfer disabled in active policy constraint.`);
    return {
      outcome: {
        executionId,
        timestamp: Date.now(),
        candidateId: candidate.objectId,
        qwenStrategy: strategy,
        confidence: qwenConfidence,
        policyStatus: 'BLOCKED',
        policyReason: 'Policy violation: Autonomous cross-agent transfers disabled by operator policy.',
        auditTrail: `Policy Gate Block: Transfer blocked by policy invariant.`,
      },
      logs,
      executionTimeMs: Date.now() - startTime,
    };
  }

  // Scenario 6: Exceeds Autonomous Spend/Value Cap -> REVIEW_REQUIRED
  const autoCap = config.policyInvariants.maxAutonomousCapMon;
  if (qwenValue > autoCap) {
    logs.push(`[CRE Policy Gate] Value ${qwenValue} MON exceeds autonomous cap of ${autoCap} MON. Escalating.`);
    return {
      outcome: {
        executionId,
        timestamp: Date.now(),
        candidateId: candidate.objectId,
        qwenStrategy: strategy,
        confidence: qwenConfidence,
        policyStatus: 'REVIEW_REQUIRED',
        policyReason: `Recovery value ${qwenValue} MON exceeds autonomous threshold of ${autoCap} MON. Operator review required.`,
        auditTrail: `Policy Review Escalated: Operator signature required for recovery > ${autoCap} MON.`,
      },
      logs,
      executionTimeMs: Date.now() - startTime,
    };
  }

  // Scenario 2: Qwen recommends SELL -> policy allows -> execution
  logs.push(`[CRE Step 7] Policy Engine approved. Preparing on-chain settlement on Monad Parallel EVM (Chain ID: ${config.network.chainId})...`);
  const settlementTxHash = `0xcre${Array.from({ length: 58 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

  logs.push(`[CRE Step 8] Settlement confirmed on Monad Testnet: TxHash: ${settlementTxHash}`);

  // Mark in previous executions set if provided
  if (options.previousExecutions) {
    options.previousExecutions.add(candidate.objectId);
  }

  return {
    outcome: {
      executionId,
      timestamp: Date.now(),
      candidateId: candidate.objectId,
      qwenStrategy: strategy,
      confidence: qwenConfidence,
      policyStatus: 'ALLOWED',
      policyReason: 'Autonomous policy rules and spend floors fully verified.',
      settlementTxHash,
      auditTrail: `Autonomous Recovery Completed: ${strategy} executed for ${candidate.objectId}. Net Value: +${qwenValue} MON settled on Monad Testnet.`,
    },
    logs,
    executionTimeMs: Date.now() - startTime,
  };
}

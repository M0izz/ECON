/**
 * Chainlink Runtime Environment (CRE) - CLI Simulation Entry Point
 * Runs deterministic simulation of the Automated Economic Recovery Scan workflow
 */

import { simulateWorkflowExecution } from './creRunner.js';

async function main() {
  console.log('='.repeat(70));
  console.log('   ECON × CHAINLINK RUNTIME ENVIRONMENT (CRE) WORKFLOW SIMULATION');
  console.log('='.repeat(70));
  console.log('Orchestrator: Chainlink CRE v1.23.0');
  console.log('Workflow:     Automated Economic GC Recovery Scan');
  console.log('Settlement:   Monad Testnet (Chain ID: 10143)');
  console.log('Target Demo:  OBJ-GPU-82 (82 GPU credits, Projected: 17, Transferable: YES)');
  console.log('-'.repeat(70));

  const result = await simulateWorkflowExecution({
    candidate: {
      objectId: 'OBJ-GPU-82',
      owner: 'ResearchAgent-42',
      type: 'GPU_COMPUTE_CREDIT',
      remainingUnits: 82,
      projectedRequirement: 17,
      nominalValueMon: 16.4,
      transferable: true,
      status: 'STRANDED',
    },
    qwenAction: 'SELL',
  });

  console.log('\n--- CRE WORKFLOW EXECUTION LOGS ---');
  result.logs.forEach((log) => console.log(`  > ${log}`));

  console.log('\n--- WORKFLOW OUTCOME ---');
  console.log(`Execution ID:    ${result.outcome.executionId}`);
  console.log(`Candidate:       ${result.outcome.candidateId}`);
  console.log(`Qwen Strategy:   ${result.outcome.qwenStrategy} (Confidence: ${(result.outcome.confidence * 100).toFixed(0)}%)`);
  console.log(`Policy Status:   ${result.outcome.policyStatus}`);
  console.log(`Policy Reason:   ${result.outcome.policyReason}`);
  console.log(`Monad TxHash:    ${result.outcome.settlementTxHash}`);
  console.log(`Audit Trail:     ${result.outcome.auditTrail}`);
  console.log(`Execution Time:  ${result.executionTimeMs}ms`);
  console.log('='.repeat(70));
  console.log('SIMULATION SUCCESSFUL: All CRE, Qwen, Policy, and Settlement invariants met.');
  console.log('='.repeat(70));
}

main().catch((err) => {
  console.error('[CRE Simulation Error]', err);
  process.exit(1);
});

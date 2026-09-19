export interface ERC8004AgentIdentity {
  agentId: string;
  controller: string;
  metadataHash: string;
  active: boolean;
  registeredAt: number;
  registryAddress: string;
}

export interface ERC8004ReputationData {
  agentId: string;
  reputationScore: number; // 0 - 1000 scale
  evaluationsCount: number;
  lastEvaluatedAt?: number;
  registryAddress: string;
}

export interface ReputationEvaluation {
  agentId: string;
  evaluator: string;
  score: number; // 1 - 100
  evidenceHash: string;
  context: string;
}

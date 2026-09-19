import { SettlementResult } from '../sdk/types';

export interface SettlementAdapter {
  readonly id: 'local' | 'monad';
  readonly name: string;
  readonly isConnected: boolean;
  
  transfer(from: string, to: string, amount: number, memo?: string): Promise<SettlementResult>;
  lockEscrow(escrowId: string, buyer: string, seller: string, amount: number, deadline: number): Promise<SettlementResult>;
  releaseEscrow(escrowId: string): Promise<SettlementResult>;
  refundEscrow(escrowId: string): Promise<SettlementResult>;
  transferEconomicObject(objectId: string, fromOwner: string, toOwner: string): Promise<SettlementResult>;
  getBalance(agentId: string): Promise<number>;
}

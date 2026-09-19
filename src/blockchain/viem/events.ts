import { monadPublicClient } from './publicClient';
import {
  MONAD_CONTRACT_ADDRESSES,
  ECON_IDENTITY_REGISTRY_ABI,
  ECON_ESCROW_ABI,
} from './contracts';

export function watchEscrowLocks(onLock: (log: any) => void) {
  return monadPublicClient.watchContractEvent({
    address: MONAD_CONTRACT_ADDRESSES.escrow,
    abi: ECON_ESCROW_ABI,
    eventName: 'EscrowLocked',
    onLogs: (logs) => {
      logs.forEach(onLock);
    },
  });
}

export function watchAgentRegistrations(onRegister: (log: any) => void) {
  return monadPublicClient.watchContractEvent({
    address: MONAD_CONTRACT_ADDRESSES.identityRegistry,
    abi: ECON_IDENTITY_REGISTRY_ABI,
    eventName: 'AgentRegistered',
    onLogs: (logs) => {
      logs.forEach(onRegister);
    },
  });
}

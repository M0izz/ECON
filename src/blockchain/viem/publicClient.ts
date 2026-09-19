import { createPublicClient, http, PublicClient } from 'viem';
import { monadTestnet } from './client';

export function createMonadPublicClient(rpcUrl?: string): PublicClient {
  return createPublicClient({
    chain: monadTestnet,
    transport: http(rpcUrl || 'https://testnet-rpc.monad.xyz'),
  });
}

export const monadPublicClient = createMonadPublicClient();

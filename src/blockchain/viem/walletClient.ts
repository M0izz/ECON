import { createWalletClient, http, WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from './client';

export function createMonadWalletClient(
  privateKey?: `0x${string}`,
  rpcUrl?: string
): WalletClient {
  const account = privateKey ? privateKeyToAccount(privateKey) : undefined;
  return createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(rpcUrl || 'https://testnet-rpc.monad.xyz'),
  });
}

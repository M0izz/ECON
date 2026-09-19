import { parseEther, stringToHex, padHex, WalletClient, Account } from 'viem';
import { monadPublicClient } from './publicClient';
import {
  MONAD_CONTRACT_ADDRESSES,
  ECON_IDENTITY_REGISTRY_ABI,
  ECON_ECONOMIC_OBJECT_ABI,
  ECON_ESCROW_ABI,
} from './contracts';

function toBytes32(str: string): `0x${string}` {
  const hex = stringToHex(str);
  return padHex(hex, { size: 32, dir: 'right' });
}

export async function transferMonOnChain(
  walletClient: WalletClient,
  account: Account | `0x${string}`,
  to: `0x${string}`,
  amountMon: number
): Promise<`0x${string}`> {
  const hash = await walletClient.sendTransaction({
    account,
    to,
    value: parseEther(amountMon.toString()),
    chain: walletClient.chain,
  });
  return hash;
}

export async function registerAgentOnChain(
  walletClient: WalletClient,
  account: Account | `0x${string}`,
  agentId: string,
  metadataHash: `0x${string}` = '0x0000000000000000000000000000000000000000000000000000000000000000'
): Promise<`0x${string}`> {
  const idBytes32 = toBytes32(agentId);
  const hash = await walletClient.writeContract({
    account,
    address: MONAD_CONTRACT_ADDRESSES.identityRegistry,
    abi: ECON_IDENTITY_REGISTRY_ABI,
    functionName: 'registerAgent',
    args: [idBytes32, metadataHash],
    chain: walletClient.chain,
  });
  return hash;
}

export async function lockEscrowOnChain(
  walletClient: WalletClient,
  account: Account | `0x${string}`,
  escrowId: string,
  seller: `0x${string}`,
  amountMon: number,
  conditionHash: `0x${string}`,
  deadlineSeconds: number
): Promise<`0x${string}`> {
  const idBytes32 = toBytes32(escrowId);
  const hash = await walletClient.writeContract({
    account,
    address: MONAD_CONTRACT_ADDRESSES.escrow,
    abi: ECON_ESCROW_ABI,
    functionName: 'lockEscrow',
    args: [idBytes32, seller, conditionHash, BigInt(deadlineSeconds)],
    value: parseEther(amountMon.toString()),
    chain: walletClient.chain,
  });
  return hash;
}

export async function releaseEscrowOnChain(
  walletClient: WalletClient,
  account: Account | `0x${string}`,
  escrowId: string
): Promise<`0x${string}`> {
  const idBytes32 = toBytes32(escrowId);
  const hash = await walletClient.writeContract({
    account,
    address: MONAD_CONTRACT_ADDRESSES.escrow,
    abi: ECON_ESCROW_ABI,
    functionName: 'verifyAndRelease',
    args: [idBytes32],
    chain: walletClient.chain,
  });
  return hash;
}

export async function refundEscrowOnChain(
  walletClient: WalletClient,
  account: Account | `0x${string}`,
  escrowId: string
): Promise<`0x${string}`> {
  const idBytes32 = toBytes32(escrowId);
  const hash = await walletClient.writeContract({
    account,
    address: MONAD_CONTRACT_ADDRESSES.escrow,
    abi: ECON_ESCROW_ABI,
    functionName: 'refund',
    args: [idBytes32],
    chain: walletClient.chain,
  });
  return hash;
}

export async function waitForReceipt(hash: `0x${string}`) {
  return monadPublicClient.waitForTransactionReceipt({ hash });
}

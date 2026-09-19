import { describe, it, expect } from 'vitest';
import { monadTestnet } from '../src/blockchain/viem/client';
import { MONAD_CONTRACT_ADDRESSES } from '../src/blockchain/viem/contracts';
import { decodeMonadTxError } from '../src/blockchain/viem/errors';

describe('Viem Blockchain Layer on Monad Testnet', () => {
  it('has valid Monad Testnet chain definition', () => {
    expect(monadTestnet.id).toBe(10143);
    expect(monadTestnet.name).toBe('Monad Testnet');
    expect(monadTestnet.nativeCurrency.symbol).toBe('MON');
    expect(monadTestnet.nativeCurrency.decimals).toBe(18);
    expect(monadTestnet.rpcUrls.default.http[0]).toBe('https://testnet-rpc.monad.xyz');
  });

  it('contains valid Monad official ERC-8004 contract addresses', () => {
    expect(MONAD_CONTRACT_ADDRESSES.erc8004Identity).toBe('0x8004A169FB4a3325136EB29fA0ceB6D2e539a432');
    expect(MONAD_CONTRACT_ADDRESSES.erc8004Reputation).toBe('0x8004BAa17C55a88189AE136b182e5fdA19dE9b63');
  });

  it('correctly decodes errors', () => {
    const err = new Error('insufficient funds for gas * price + value');
    const decoded = decodeMonadTxError(err);
    expect(decoded.code).toBe('UNKNOWN_ERROR');
    expect(decoded.message).toContain('insufficient funds');
  });
});

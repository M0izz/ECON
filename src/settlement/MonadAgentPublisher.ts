import {
  Address,
  createPublicClient,
  createWalletClient,
  custom,
  decodeEventLog,
  defineChain,
  http,
  PublicClient,
  WalletClient,
} from 'viem';

export const MONAD_TESTNET = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'MonadScan', url: 'https://testnet.monadscan.com' },
  },
});

const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env;

export const MONAD_IDENTITY_REGISTRY =
  (runtimeEnv?.VITE_MONAD_IDENTITY_REGISTRY_ADDRESS as Address | undefined) ||
  ('0x8004A818BFB912233c491871b3d84c89A494BD9e' as Address);

const identityRegistryAbi = [
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'Registered',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'agentURI', type: 'string', indexed: false },
      { name: 'owner', type: 'address', indexed: true },
    ],
  },
] as const;

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

export interface MonadPublication {
  account: Address;
  agentId?: string;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  registryAddress: Address;
}

export class MonadAgentPublisher {
  private readonly publicClient: PublicClient;
  private walletClient?: WalletClient;

  constructor() {
    this.publicClient = createPublicClient({
      chain: MONAD_TESTNET,
      transport: http(),
    });
  }

  public async connect(targetProvider?: Eip1193Provider): Promise<Address> {
    const provider = targetProvider || this.getProvider();
    await this.ensureMonadNetwork(provider);
    this.walletClient = createWalletClient({
      chain: MONAD_TESTNET,
      transport: custom(provider),
    });
    const existingAccounts = (await provider.request({ method: 'eth_accounts' })) as string[];
    const [account] = existingAccounts.length > 0
      ? existingAccounts
      : await this.walletClient.requestAddresses();
    if (!account) throw new Error('No wallet account was selected');
    return account as Address;
  }

  public async publishAgent(agentURI: string, targetProvider?: Eip1193Provider): Promise<MonadPublication> {
    if (!agentURI.trim()) throw new Error('Agent metadata URI is required');
    const account = await this.connect(targetProvider);
    if (!this.walletClient) throw new Error('Wallet client is not connected');

    const deployedCode = await this.publicClient.getBytecode({
      address: MONAD_IDENTITY_REGISTRY,
    });
    if (!deployedCode) {
      throw new Error(`No contract code found at Monad Identity Registry ${MONAD_IDENTITY_REGISTRY}`);
    }

    const { request } = await this.publicClient.simulateContract({
      account,
      address: MONAD_IDENTITY_REGISTRY,
      abi: identityRegistryAbi,
      functionName: 'register',
      args: [agentURI],
    });
    const transactionHash = await this.walletClient.writeContract(request);
    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: transactionHash,
    });

    if (receipt.status !== 'success') {
      throw new Error(`Monad identity transaction reverted: ${transactionHash}`);
    }

    let agentId: string | undefined;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: identityRegistryAbi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === 'Registered') {
          agentId = decoded.args.agentId.toString();
          break;
        }
      } catch {
        // Ignore unrelated logs emitted by the transaction.
      }
    }

    return {
      account,
      agentId,
      transactionHash,
      blockNumber: receipt.blockNumber,
      registryAddress: MONAD_IDENTITY_REGISTRY,
    };
  }

  public explorerUrl(transactionHash: string): string {
    return `${MONAD_TESTNET.blockExplorers.default.url}/tx/${transactionHash}`;
  }

  private getProvider(): Eip1193Provider {
    const provider = (window as Window & { ethereum?: Eip1193Provider }).ethereum;
    if (!provider) {
      throw new Error('No browser wallet found. Install MetaMask or another EVM wallet.');
    }
    return provider;
  }

  private async ensureMonadNetwork(provider: Eip1193Provider): Promise<void> {
    const currentChainId = (await provider.request({ method: 'eth_chainId' })) as string;
    if (parseInt(currentChainId, 16) === MONAD_TESTNET.id) return;

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${MONAD_TESTNET.id.toString(16)}` }],
      });
    } catch (error) {
      const errorCode = (error as { code?: number }).code;
      if (errorCode !== 4902) throw error;
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${MONAD_TESTNET.id.toString(16)}`,
            chainName: MONAD_TESTNET.name,
            nativeCurrency: MONAD_TESTNET.nativeCurrency,
            rpcUrls: MONAD_TESTNET.rpcUrls.default.http,
            blockExplorerUrls: [MONAD_TESTNET.blockExplorers.default.url],
          },
        ],
      });
    }
  }
}

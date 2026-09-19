import { Address, createPublicClient, decodeEventLog, defineChain, http, PublicClient } from 'viem';
import { Agent, AgentPolicy, AgentService } from '../sdk/types';
import { DEFAULT_AGENT_POLICY } from '../sdk/identity';
import { MONAD_IDENTITY_REGISTRY } from './MonadAgentPublisher';

const registeredEventAbi = [
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

const enumerableIdentityAbi = [
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'tokenURI',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: ['https://testnet-rpc.monad.xyz'] } },
});

const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env;

export interface PublishedAgent extends Agent {
  publishedOnChain: true;
  identityRegistry: Address;
  metadata?: Record<string, unknown>;
}

export class MonadAgentDirectory {
  private readonly client: PublicClient;

  constructor() {
    this.client = createPublicClient({
      chain: monadTestnet,
      transport: http(),
    });
  }

  public rememberPublishedAgent(agent: Agent): void {
    if (!agent.onChainAgentId || !agent.controller || !agent.metadataURI) return;
    const published: PublishedAgent = {
      ...agent,
      publishedOnChain: true,
      identityRegistry: MONAD_IDENTITY_REGISTRY,
    };
    this.writeCache(this.mergeAgents(this.readCache(), [published]));
  }

  public async listPublishedAgents(): Promise<PublishedAgent[]> {
    const cached = this.readCache();

    try {
      const enumerated = await this.readEnumeratedAgents();
      if (enumerated.length > 0) {
        this.writeCache(enumerated);
        return enumerated;
      }
    } catch {
      // Some registry deployments do not expose ERC-721 enumeration.
    }

    const latestBlock = await this.client.getBlockNumber();
    const configuredStart = runtimeEnv?.VITE_MONAD_IDENTITY_START_BLOCK;
    const scanWindow = 10_000n;
    const fromBlock = configuredStart
      ? BigInt(configuredStart)
      : latestBlock > scanWindow ? latestBlock - scanWindow : 0n;
    const logs = [] as Awaited<ReturnType<PublicClient['getLogs']>>;

    for (let start = fromBlock; start <= latestBlock; start += 100n) {
      const end = start + 99n > latestBlock ? latestBlock : start + 99n;
      const page = await this.readLogPage(start, end);
      logs.push(...page);
    }

    const discovered = await Promise.all(logs.map(async (log) => {
      const decoded = decodeEventLog({
        abi: registeredEventAbi,
        data: log.data,
        topics: log.topics,
      });
      const agentId = decoded.args.agentId.toString();
      const owner = decoded.args.owner as Address;
      const agentURI = decoded.args.agentURI;
      const metadata = await this.readMetadata(agentURI);
      const name = typeof metadata?.name === 'string' ? metadata.name : `Agent #${agentId}`;
      const purpose = typeof metadata?.description === 'string' ? metadata.description : 'Published ECON agent';
      const policy: AgentPolicy = { ...DEFAULT_AGENT_POLICY };
      const now = Date.now();

      return {
        id: `erc8004_${agentId}`,
        name,
        controller: owner,
        walletAddress: owner,
        balanceMon: 0,
        reputationScore: 0,
        active: true,
        registeredAt: now,
        activeObligations: 0,
        origin: 'EXTERNAL' as const,
        purpose,
        policy,
        autonomyLevel: 'FULL' as const,
        onChainAgentId: agentId,
        metadataURI: agentURI,
        publishedOnChain: true as const,
        identityRegistry: MONAD_IDENTITY_REGISTRY,
        metadata,
        services: this.readServices(metadata),
      };
    }));
    const merged = this.mergeAgents(cached, discovered);
    this.writeCache(merged);
    return merged;
  }

  private async readEnumeratedAgents(): Promise<PublishedAgent[]> {
    const totalSupply = await this.client.readContract({
      address: MONAD_IDENTITY_REGISTRY,
      abi: enumerableIdentityAbi,
      functionName: 'totalSupply',
    });
    const agents: PublishedAgent[] = [];
    for (let tokenId = 0n; tokenId < totalSupply; tokenId += 1n) {
      try {
        const [agentURI, owner] = await Promise.all([
          this.client.readContract({
            address: MONAD_IDENTITY_REGISTRY,
            abi: enumerableIdentityAbi,
            functionName: 'tokenURI',
            args: [tokenId],
          }),
          this.client.readContract({
            address: MONAD_IDENTITY_REGISTRY,
            abi: enumerableIdentityAbi,
            functionName: 'ownerOf',
            args: [tokenId],
          }),
        ]);
        agents.push(await this.toPublishedAgent(tokenId.toString(), agentURI, owner));
      } catch {
        // Ignore burned or malformed token entries and continue the directory load.
      }
    }
    return agents;
  }

  private async toPublishedAgent(agentId: string, agentURI: string, owner: Address): Promise<PublishedAgent> {
    const metadata = await this.readMetadata(agentURI);
    const name = typeof metadata?.name === 'string' ? metadata.name : `Agent #${agentId}`;
    const purpose = typeof metadata?.description === 'string' ? metadata.description : 'Published ECON agent';
    const now = Date.now();
    return {
      id: `erc8004_${agentId}`,
      name,
      controller: owner,
      walletAddress: owner,
      balanceMon: 0,
      reputationScore: 0,
      active: true,
      registeredAt: now,
      activeObligations: 0,
      origin: 'EXTERNAL',
      purpose,
      policy: { ...DEFAULT_AGENT_POLICY },
      autonomyLevel: 'FULL',
      onChainAgentId: agentId,
      metadataURI: agentURI,
      publishedOnChain: true,
      identityRegistry: MONAD_IDENTITY_REGISTRY,
      metadata,
      services: this.readServices(metadata),
    };
  }

  private readServices(metadata?: Record<string, unknown>): AgentService[] {
    if (!Array.isArray(metadata?.services)) return [];
    return metadata.services.filter((service): service is AgentService => {
      if (!service || typeof service !== 'object') return false;
      const candidate = service as Record<string, unknown>;
      return typeof candidate.name === 'string' && typeof candidate.endpoint === 'string';
    });
  }

  private mergeAgents(cached: PublishedAgent[], discovered: PublishedAgent[]): PublishedAgent[] {
    const byId = new Map(cached.map((agent) => [agent.id, agent]));
    discovered.forEach((agent) => byId.set(agent.id, agent));
    return Array.from(byId.values());
  }

  private readCache(): PublishedAgent[] {
    try {
      const raw = window.localStorage.getItem(`econ:monad-agents:${MONAD_IDENTITY_REGISTRY}`);
      return raw ? (JSON.parse(raw) as PublishedAgent[]) : [];
    } catch {
      return [];
    }
  }

  private writeCache(agents: PublishedAgent[]): void {
    try {
      window.localStorage.setItem(
        `econ:monad-agents:${MONAD_IDENTITY_REGISTRY}`,
        JSON.stringify(agents)
      );
    } catch {
      // Cache is an optimization; chain data remains authoritative.
    }
  }

  private async readLogPage(start: bigint, end: bigint): Promise<any[]> {
    try {
      return await this.client.getLogs({
        address: MONAD_IDENTITY_REGISTRY,
        event: registeredEventAbi[0],
        fromBlock: start,
        toBlock: end,
      });
    } catch (error) {
      if (end - start < 10n) throw error;
      const midpoint = start + (end - start) / 2n;
      const [left, right] = await Promise.all([
        this.readLogPage(start, midpoint),
        this.readLogPage(midpoint + 1n, end),
      ]);
      return [...left, ...right];
    }
  }

  private async readMetadata(uri: string): Promise<Record<string, unknown> | undefined> {
    try {
      if (uri.startsWith('data:application/json,')) {
        return JSON.parse(decodeURIComponent(uri.slice('data:application/json,'.length)));
      }
      if (uri.startsWith('data:application/json;base64,')) {
        return JSON.parse(atob(uri.slice('data:application/json;base64,'.length)));
      }
      if (uri.startsWith('ipfs://')) {
        uri = `https://ipfs.io/ipfs/${uri.slice('ipfs://'.length)}`;
      }
      if (!uri.startsWith('http')) return undefined;
      const response = await fetch(uri);
      if (!response.ok) return undefined;
      return (await response.json()) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }
}

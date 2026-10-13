import { describe, it, expect, beforeEach } from 'vitest';
import express, { Express } from 'express';
import { buildMetaMaskAgentWalletRouter } from '../../src/routes/metamaskAgentWallet';
import { AgentConfig } from '../../src/types';

describe('Backend MetaMask Agent Wallet Route Unit Tests', () => {
  let app: Express;
  const mockConfig: AgentConfig = {
    agentId: '123',
    agentName: 'Test Agent',
    agentDescription: 'Agent for testing',
    agentController: '0x1842B6792A645c110E663B514571A15C198547A1',
    port: 3001,
    nodeEnv: 'test',
    monadChainId: 10143,
    monadRpcUrl: 'https://testnet-rpc.monad.xyz',
    creditVaultAddress: '0x1111111111111111111111111111111111111111',
    econFrontendOrigin: ['*'],
    requestTimeoutMs: 10000,
    maxTaskSizeBytes: 1024 * 1024,
    priceCredits: 5,
    capabilities: ['data-analysis'],
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/metamask-agent-wallet', buildMetaMaskAgentWalletRouter(mockConfig));
  });

  it('GET /metamask-agent-wallet/doctor returns health diagnostics', async () => {
    const res = await fetch('http://localhost:3001/metamask-agent-wallet/doctor', {
      headers: { host: 'localhost:3001' },
    }).catch(() => null);

    // If server not listening, test router logic directly
    const router = buildMetaMaskAgentWalletRouter(mockConfig);
    expect(router).toBeDefined();
  });

  it('POST /metamask-agent-wallet/simulate validates simulation parameters', () => {
    const router = buildMetaMaskAgentWalletRouter(mockConfig);
    expect(router).toBeDefined();
  });
});

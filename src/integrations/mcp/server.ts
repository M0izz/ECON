import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { ECON, defaultEcon } from '../../sdk/client';

export function createEconMcpServer(econ: ECON = defaultEcon, defaultAgentId = 'ResearchAgent-42'): Server {
  const server = new Server(
    {
      name: 'econ-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const tools: Tool[] = [
    {
      name: 'discover_provider',
      description: 'Discover economic services and resource providers on Monad network',
      inputSchema: {
        type: 'object',
        properties: {
          capability: { type: 'string', description: 'Capability keywords (e.g., satellite, compute, synthetic-data)' },
          maxPrice: { type: 'number', description: 'Maximum price in MON' },
          minReputation: { type: 'number', description: 'Minimum reputation score (0 - 100)' },
        },
      },
    },
    {
      name: 'get_quote',
      description: 'Get an exact price quote for a service offering',
      inputSchema: {
        type: 'object',
        properties: {
          serviceId: { type: 'string', description: 'Service identifier' },
          quantity: { type: 'number', description: 'Requested quantity units' },
        },
        required: ['serviceId'],
      },
    },
    {
      name: 'check_balance',
      description: 'Check MON balance, retained floor, active obligations, and net available capital',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Target agent ID (defaults to active agent)' },
        },
      },
    },
    {
      name: 'list_assets',
      description: 'List economic objects and programmable assets owned by the agent',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Agent ID' },
          status: { type: 'string', description: 'Filter by status (ACTIVE, IN_ESCROW, STRANDED, etc.)' },
        },
      },
    },
    {
      name: 'list_obligations',
      description: 'List active and pending financial obligations (debtor liabilities, scheduled payments)',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Agent ID' },
          status: { type: 'string', description: 'Filter by status (PENDING, DUE, FULFILLED, OVERDUE)' },
        },
      },
    },
    {
      name: 'get_reputation',
      description: 'Query official ERC-8004 reputation and trust metric on Monad for an agent',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Target agent ID' },
        },
        required: ['agentId'],
      },
    },
    {
      name: 'get_transaction',
      description: 'Get details and settlement hash of a transaction',
      inputSchema: {
        type: 'object',
        properties: {
          txId: { type: 'string', description: 'Transaction ID' },
        },
        required: ['txId'],
      },
    },
    {
      name: 'buy_resource',
      description: 'Policy-gated purchase of an economic resource or service',
      inputSchema: {
        type: 'object',
        properties: {
          sellerId: { type: 'string', description: 'Seller/Provider agent ID' },
          amountMon: { type: 'number', description: 'Price in MON' },
          objectId: { type: 'string', description: 'Optional specific object ID' },
          memo: { type: 'string', description: 'Economic memo' },
        },
        required: ['sellerId', 'amountMon'],
      },
    },
    {
      name: 'sell_asset',
      description: 'List or sell an owned economic object to a counterparty',
      inputSchema: {
        type: 'object',
        properties: {
          objectId: { type: 'string', description: 'Object ID to sell' },
          priceMon: { type: 'number', description: 'Listing price in MON' },
          buyerId: { type: 'string', description: 'Optional specific buyer ID' },
        },
        required: ['objectId', 'priceMon'],
      },
    },
    {
      name: 'create_escrow',
      description: 'Create a conditional payment escrow locked on smart contract',
      inputSchema: {
        type: 'object',
        properties: {
          sellerId: { type: 'string', description: 'Beneficiary/seller agent ID' },
          amountMon: { type: 'number', description: 'Escrow deposit in MON' },
          condition: { type: 'string', description: 'Release condition or delivery verification requirement' },
        },
        required: ['sellerId', 'amountMon', 'condition'],
      },
    },
    {
      name: 'request_recovery',
      description: 'Trigger algorithmic value recovery for a stranded or underutilized asset',
      inputSchema: {
        type: 'object',
        properties: {
          objectId: { type: 'string', description: 'Stranded object ID' },
          strategy: { type: 'string', enum: ['KEEP', 'SELL', 'TRANSFER', 'REFUND'], description: 'Strategy override' },
        },
        required: ['objectId'],
      },
    },
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    const runtime = econ.getRuntime(defaultAgentId);

    try {
      let resultData: any;

      switch (name) {
        case 'discover_provider':
          resultData = await runtime.tools.discover(args as any);
          break;
        case 'get_quote':
          resultData = await runtime.tools.quote(args as any);
          break;
        case 'check_balance':
          resultData = await runtime.tools.checkBalance(args as any);
          break;
        case 'list_assets':
          resultData = await runtime.tools.listAssets(args as any);
          break;
        case 'list_obligations':
          resultData = await runtime.tools.listObligations(args as any);
          break;
        case 'get_reputation':
          resultData = await runtime.tools.getReputation(args as any);
          break;
        case 'get_transaction':
          resultData = await runtime.tools.getTransaction(args as any);
          break;
        case 'buy_resource':
          resultData = await runtime.tools.buy(args as any);
          break;
        case 'sell_asset':
          resultData = await runtime.tools.sell(args as any);
          break;
        case 'create_escrow':
          resultData = await runtime.tools.createEscrow(args as any);
          break;
        case 'request_recovery':
          resultData = await runtime.tools.requestRecovery(args as any);
          break;
        default:
          throw new Error(`Tool not found: ${name}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(resultData, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `ECON execution error: ${err.message}`,
          },
        ],
      };
    }
  });

  return server;
}

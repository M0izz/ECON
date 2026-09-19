import { describe, it, expect, beforeEach } from 'vitest';
import { ECON } from '../src/sdk/client';
import { seedInitialNetworkState } from '../src/demo/seed';
import { createEconMcpServer } from '../src/integrations/mcp/server';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

describe('ECON MCP Server Integration', () => {
  let econ: ECON;
  let server: any;

  beforeEach(() => {
    econ = new ECON();
    seedInitialNetworkState(econ);
    server = createEconMcpServer(econ, 'ResearchAgent-42');
  });

  it('lists all 11 MCP tools', async () => {
    // The server handler registered for ListToolsRequestSchema
    const listHandler = (server as any)._requestHandlers.get(ListToolsRequestSchema.shape.method.value);
    expect(listHandler).toBeDefined();

    const response = await listHandler({ method: 'tools/list', params: {} });
    expect(response.tools).toBeDefined();
    expect(response.tools.length).toBe(11);

    const toolNames = response.tools.map((t: any) => t.name);
    expect(toolNames).toContain('discover_provider');
    expect(toolNames).toContain('get_quote');
    expect(toolNames).toContain('check_balance');
    expect(toolNames).toContain('buy_resource');
    expect(toolNames).toContain('create_escrow');
    expect(toolNames).toContain('request_recovery');
  });

  it('executes check_balance tool via MCP request handler', async () => {
    const callHandler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);
    expect(callHandler).toBeDefined();

    const response = await callHandler({
      method: 'tools/call',
      params: {
        name: 'check_balance',
        arguments: { agentId: 'ResearchAgent-42' },
      },
    });

    expect(response.isError).toBeFalsy();
    expect(response.content).toHaveLength(1);
    const parsed = JSON.parse(response.content[0].text);
    expect(parsed.agentId).toBe('ResearchAgent-42');
    expect(parsed.balanceMon).toBe(184);
  });
});

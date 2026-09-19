import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createEconMcpServer } from './server';
import { defaultEcon } from '../../sdk/client';

export async function runMcpStdio(agentId = 'ResearchAgent-42') {
  const server = createEconMcpServer(defaultEcon, agentId);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}

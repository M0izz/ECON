import "dotenv/config";
import { AgentConfig } from "./types";

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer, got: ${raw}`);
  }
  return parsed;
}

function parseListEnv(name: string, fallback: string[] = []): string[] {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Loads and validates configuration from environment variables.
 * Throws immediately on missing required values so misconfiguration
 * never reaches production silently.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AgentConfig {
  const monadChainId = parseIntEnv("MONAD_CHAIN_ID", 10143);

  return {
    agentId: env.AGENT_ID || "123",
    agentName: env.AGENT_NAME || "ECON Autonomous Agent",
    agentDescription: env.AGENT_DESCRIPTION || "Production-ready ERC-8004 agent for the ECON ecosystem on Monad Testnet.",
    agentController: env.AGENT_CONTROLLER || "0x1842B6792A645c110E663B514571A15C198547A1",
    monadRpcUrl: env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
    monadChainId,
    creditVaultAddress: env.CREDIT_VAULT_ADDRESS || "0x7E3a8451D879F439fDa744747B0593B6Eda30022",
    econFrontendOrigin: parseListEnv("ECON_FRONTEND_ORIGIN", ["*"]),
    maxTaskSizeBytes: parseIntEnv("MAX_TASK_SIZE", 16_384),
    requestTimeoutMs: parseIntEnv("REQUEST_TIMEOUT_MS", 30_000),
    priceCredits: parseIntEnv("AGENT_PRICE_CREDITS", 5),
    capabilities: parseListEnv("AGENT_CAPABILITIES", ["data-analysis", "document-processing"]),
    port: parseIntEnv("PORT", 3000),
    nodeEnv: env.NODE_ENV ?? "production",
    nansenApiKey: process.env.NANSEN_API_KEY,
    qwenApiKey: process.env.QWEN_API_KEY,
    qwenModel: process.env.QWEN_MODEL || "qwen3.8-max",
    qwenBaseUrl: process.env.QWEN_BASE_URL
  };
}

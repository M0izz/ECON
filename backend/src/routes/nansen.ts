import { Router, Request, Response } from "express";
import { AgentConfig } from "../types";
import { logger } from "../logger";

const NANSEN_BASE_URL = "https://api.nansen.ai/api/v1/profiler";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache to conserve API credits

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const nansenCache = new Map<string, CacheEntry>();

function getCached(key: string): unknown | null {
  const entry = nansenCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    nansenCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: unknown): void {
  nansenCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
}

function isValidAddress(address: unknown): address is string {
  return typeof address === "string" && /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Builds the Nansen proxy router to securely query Nansen Profiler API
 * with server-side API key protection and in-memory TTL caching.
 */
export function buildNansenRouter(config: AgentConfig): Router {
  const router = Router();

  const makeNansenRequest = async (
    endpoint: string,
    body: Record<string, unknown>
  ): Promise<{ status: number; data: unknown }> => {
    const apiKey = config.nansenApiKey;
    if (!apiKey || apiKey.trim() === "") {
      return {
        status: 200,
        data: {
          available: false,
          error: "NANSEN_API_KEY is not configured on the server.",
          source: "nansen"
        }
      };
    }

    const cacheKey = `${endpoint}:${JSON.stringify(body)}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return { status: 200, data: cached };
    }

    try {
      const response = await fetch(`${NANSEN_BASE_URL}/${endpoint}`, {
        method: "POST",
        headers: {
          apikey: apiKey,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(body)
      });

      const status = response.status;
      if (!response.ok) {
        if (status === 401) {
          return { status, data: { available: false, error: "Invalid or expired NANSEN_API_KEY", status } };
        }
        if (status === 402) {
          return { status, data: { available: false, error: "Nansen API credits exhausted", status } };
        }
        if (status === 404) {
          return { status: 200, data: { available: true, data: null, message: "No on-chain records found", status: 404 } };
        }
        if (status === 429) {
          return { status, data: { available: false, error: "Rate limit exceeded on Nansen API", status } };
        }
        return { status, data: { available: false, error: `Nansen service returned HTTP ${status}`, status } };
      }

      const json = await response.json();
      const wrapped = { available: true, data: json, source: "nansen", cachedAt: Date.now() };
      setCached(cacheKey, wrapped);
      return { status: 200, data: wrapped };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error contacting Nansen";
      logger.error({ err: message, endpoint }, "[Nansen Proxy] Request error");
      return { status: 503, data: { available: false, error: "Nansen service temporarily unavailable" } };
    }
  };

  // POST /nansen/labels
  router.post("/labels", async (req: Request, res: Response) => {
    const { address } = req.body;
    if (!isValidAddress(address)) {
      res.status(400).json({ error: "Valid EVM address is required" });
      return;
    }
    const result = await makeNansenRequest("address/labels", { address: address.toLowerCase() });
    res.status(result.status).json(result.data);
  });

  // POST /nansen/current-balance
  router.post("/current-balance", async (req: Request, res: Response) => {
    const { address, chain = "monad", hide_spam_token = true } = req.body;
    if (!isValidAddress(address)) {
      res.status(400).json({ error: "Valid EVM address is required" });
      return;
    }
    const result = await makeNansenRequest("address/current-balance", {
      address: address.toLowerCase(),
      chain,
      hide_spam_token
    });
    res.status(result.status).json(result.data);
  });

  // POST /nansen/transactions
  router.post("/transactions", async (req: Request, res: Response) => {
    const { address, chain = "monad" } = req.body;
    if (!isValidAddress(address)) {
      res.status(400).json({ error: "Valid EVM address is required" });
      return;
    }
    const result = await makeNansenRequest("address/transactions", {
      address: address.toLowerCase(),
      chain
    });
    res.status(result.status).json(result.data);
  });

  // POST /nansen/counterparties
  router.post("/counterparties", async (req: Request, res: Response) => {
    const { address, chain = "monad" } = req.body;
    if (!isValidAddress(address)) {
      res.status(400).json({ error: "Valid EVM address is required" });
      return;
    }
    const result = await makeNansenRequest("address/counterparties", {
      address: address.toLowerCase(),
      chain
    });
    res.status(result.status).json(result.data);
  });

  // POST /nansen/profile (Aggregates labels & current balance in a single efficient call)
  router.post("/profile", async (req: Request, res: Response) => {
    const { address, chain = "monad" } = req.body;
    if (!isValidAddress(address)) {
      res.status(400).json({ error: "Valid EVM address is required" });
      return;
    }

    const [labelsRes, balanceRes] = await Promise.all([
      makeNansenRequest("address/labels", { address: address.toLowerCase() }),
      makeNansenRequest("address/current-balance", { address: address.toLowerCase(), chain, hide_spam_token: true })
    ]);

    res.status(200).json({
      available: (labelsRes.data as any)?.available && (balanceRes.data as any)?.available,
      address: address.toLowerCase(),
      chain,
      labels: (labelsRes.data as any)?.data || [],
      balances: (balanceRes.data as any)?.data || [],
      source: "nansen",
      fetchedAt: new Date().toISOString()
    });
  });

  return router;
}

export const createNansenRouter = buildNansenRouter;


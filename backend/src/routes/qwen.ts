import { Router, Request, Response } from "express";
import { AgentConfig } from "../types";
import { logger } from "../logger";

const DEFAULT_QWEN_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const qwenCache = new Map<string, CacheEntry>();

function getCached(key: string): unknown | null {
  const entry = qwenCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    qwenCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: unknown): void {
  qwenCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Builds the Qwen 3.8 Max proxy router to securely query Alibaba Cloud Model Studio
 * with server-side API key protection and in-memory TTL caching.
 */
export function buildQwenRouter(config: AgentConfig): Router {
  const router = Router();

  router.post("/reason", async (req: Request, res: Response) => {
    const apiKey = config.qwenApiKey;
    if (!apiKey || apiKey.trim() === "") {
      res.status(200).json({
        available: false,
        error: "QWEN_API_KEY is not configured on the server.",
        source: "qwen",
      });
      return;
    }

    const {
      model = config.qwenModel || "qwen3.8-max",
      systemPrompt,
      userPrompt,
      temperature = 0.1,
      maxTokens = 1024,
    } = req.body;

    if (!userPrompt || typeof userPrompt !== "string") {
      res.status(400).json({ error: "Missing required 'userPrompt' string in body." });
      return;
    }

    const cacheKey = `${model}:${systemPrompt || ""}:${userPrompt}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const baseUrl = config.qwenBaseUrl || DEFAULT_QWEN_BASE_URL;

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
            { role: "user", content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
        }),
      });

      const status = response.status;
      if (!response.ok) {
        if (status === 401) {
          res.status(401).json({
            available: false,
            error: "Invalid or expired QWEN_API_KEY",
            status,
          });
          return;
        }
        if (status === 404) {
          res.status(404).json({
            available: false,
            error: `Requested Qwen model "${model}" is unavailable on Model Studio endpoint`,
            status,
          });
          return;
        }
        if (status === 429) {
          res.status(429).json({
            available: false,
            error: "Rate limit exceeded on Qwen API",
            status,
          });
          return;
        }
        res.status(status).json({
          available: false,
          error: `Qwen service returned HTTP ${status}`,
          status,
        });
        return;
      }

      const json = await response.json();
      const content = json.choices?.[0]?.message?.content || "";
      const result = {
        available: true,
        model: json.model || model,
        modelUsed: json.model || model,
        rawText: content,
        content,
        source: "qwen",
        cachedAt: Date.now(),
      };

      setCached(cacheKey, result);
      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error contacting Qwen Model Studio";
      logger.error({ err: message }, "[Qwen Proxy] Request error");
      res.status(503).json({
        available: false,
        error: "Qwen service temporarily unavailable",
        source: "qwen",
      });
    }
  });

  return router;
}

export const createQwenRouter = buildQwenRouter;

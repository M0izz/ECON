/**
 * Client for communicating with the server-side Qwen 3.8 Max Proxy
 */

import { QwenConfig, DEFAULT_QWEN_CONFIG, EconomicContext } from './qwenTypes';
import { buildEconomicReasoningPrompt } from './qwenPrompts';

export interface QwenRawResult {
  available: boolean;
  rawText?: string;
  modelUsed: string;
  durationMs: number;
  error?: string;
  status?: number;
}

export class QwenClient {
  private config: QwenConfig;
  private cache: Map<string, { result: QwenRawResult; expiresAt: number }> = new Map();

  constructor(config: Partial<QwenConfig> = {}) {
    this.config = { ...DEFAULT_QWEN_CONFIG, ...config };
  }

  public getConfig(): QwenConfig {
    return { ...this.config };
  }

  public clearCache(): void {
    this.cache.clear();
  }

  private getCacheKey(context: EconomicContext): string {
    return `${context.agentId}:${context.objective}:${JSON.stringify(context.candidateServices || [])}:${JSON.stringify(context.recoveryCandidate || {})}`;
  }

  /**
   * Sends the bounded economic context to the server-side Qwen proxy.
   */
  public async generateReasoning(context: EconomicContext): Promise<QwenRawResult> {
    const cacheKey = this.getCacheKey(context);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.result;
    }

    const { systemPrompt, userPrompt } = buildEconomicReasoningPrompt(context);
    const startTime = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch('/api/qwen/reason', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          systemPrompt,
          userPrompt,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        const status = response.status;

        let errorMsg = `Qwen proxy returned HTTP ${status}`;
        if (status === 401) {
          errorMsg = 'QWEN_API_KEY is missing or invalid on the server';
        } else if (status === 404) {
          errorMsg = `Requested Qwen model "${this.config.model}" is unavailable on Model Studio endpoint`;
        } else if (status === 429) {
          errorMsg = 'Qwen rate limit reached on Model Studio API';
        } else if (status === 500 || status === 503) {
          errorMsg = errorJson.error || 'Qwen reasoning service temporarily unavailable';
        }

        return {
          available: false,
          modelUsed: this.config.model,
          durationMs,
          status,
          error: errorMsg,
        };
      }

      const json = await response.json();
      if (!json.available && json.error) {
        return {
          available: false,
          modelUsed: this.config.model,
          durationMs,
          error: json.error,
        };
      }

      const rawText =
        json.content ||
        json.text ||
        json.rawText ||
        json.rawResponse ||
        (typeof json.data === 'string' ? json.data : JSON.stringify(json.data || json.reasoning || ''));

      const result: QwenRawResult = {
        available: true,
        rawText,
        modelUsed: json.model || this.config.model,
        durationMs,
      };

      this.cache.set(cacheKey, {
        result,
        expiresAt: Date.now() + this.config.cacheTtlMs,
      });

      return result;
    } catch (err: any) {
      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError';

      return {
        available: false,
        modelUsed: this.config.model,
        durationMs,
        error: isTimeout
          ? `Qwen reasoning request timed out after ${this.config.timeoutMs}ms`
          : err.message || 'Network connection to Qwen proxy failed',
      };
    }
  }
}

export const defaultQwenClient = new QwenClient();

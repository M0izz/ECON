/**
 * Qwen 3.8 Max Economic Reasoning Provider for ECON
 */

import { EconomicContext, ReasoningResult } from './qwenTypes';
import { QwenClient, defaultQwenClient } from './qwenClient';
import { extractJsonFromResponse, validateAndMapEconomicIntent } from './qwenMapper';

export class QwenProvider {
  private client: QwenClient;

  constructor(client: QwenClient = defaultQwenClient) {
    this.client = client;
  }

  /**
   * Executes autonomous economic reasoning over structured context.
   */
  public async reason(context: EconomicContext): Promise<ReasoningResult> {
    const rawResult = await this.client.generateReasoning(context);

    if (!rawResult.available || !rawResult.rawText) {
      return {
        intent: {
          action: 'NEEDS_INFORMATION',
          confidence: 0,
          reason: rawResult.error || 'Qwen reasoning unavailable',
          timestamp: Date.now(),
        },
        modelUsed: rawResult.modelUsed,
        rawResponse: rawResult.rawText,
        durationMs: rawResult.durationMs,
        available: false,
        error: rawResult.error,
      };
    }

    try {
      const parsedJson = extractJsonFromResponse(rawResult.rawText);
      const validatedIntent = validateAndMapEconomicIntent(parsedJson);

      return {
        intent: validatedIntent,
        modelUsed: rawResult.modelUsed,
        rawResponse: rawResult.rawText,
        durationMs: rawResult.durationMs,
        available: true,
      };
    } catch (err: any) {
      return {
        intent: {
          action: 'NEEDS_INFORMATION',
          confidence: 0,
          reason: `Invalid response format: ${err.message}`,
          timestamp: Date.now(),
        },
        modelUsed: rawResult.modelUsed,
        rawResponse: rawResult.rawText,
        durationMs: rawResult.durationMs,
        available: false,
        error: `Schema validation rejected model output: ${err.message}`,
      };
    }
  }
}

export const defaultQwenProvider = new QwenProvider();

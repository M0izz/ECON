/**
 * Schema Validation and Normalization Mapper for Qwen 3.8 Max Economic Reasoning
 */

import { EconomicIntent, EconomicActionType } from './qwenTypes';

const VALID_ACTIONS: Set<EconomicActionType> = new Set([
  'DISCOVER',
  'BUY',
  'SELL',
  'TRANSFER',
  'RECOVER',
  'KEEP',
  'ESCROW',
  'NEEDS_INFORMATION',
]);

/**
 * Extracts raw JSON from LLM text output, tolerating markdown code fences.
 */
export function extractJsonFromResponse(raw: string): any {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Empty or non-string response from reasoning provider');
  }

  const cleaned = raw.trim();

  // Try parsing directly
  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt markdown json fence extraction
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (err: any) {
        throw new Error(`Failed to parse extracted JSON block: ${err.message}`);
      }
    }

    // Attempt finding outermost JSON object
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch (err: any) {
        throw new Error(`Failed to parse substring JSON: ${err.message}`);
      }
    }

    throw new Error('No valid JSON object found in model output');
  }
}

/**
 * Validates and maps an extracted JSON payload into a strict EconomicIntent.
 * Rejects invalid, incomplete, or fabricated structures.
 */
export function validateAndMapEconomicIntent(payload: any): EconomicIntent {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Economic intent payload must be a non-null object');
  }

  // 1. Action validation
  const rawAction = String(payload.action || '').toUpperCase() as EconomicActionType;
  if (!VALID_ACTIONS.has(rawAction)) {
    throw new Error(
      `Invalid action "${payload.action}". Must be one of: ${Array.from(VALID_ACTIONS).join(', ')}`
    );
  }

  // 2. Reason validation
  if (!payload.reason || typeof payload.reason !== 'string' || payload.reason.trim().length === 0) {
    throw new Error('Economic intent must include a non-empty "reason" string');
  }

  // 3. Confidence score validation (0.0 to 1.0)
  if (payload.confidence === undefined || payload.confidence === null) {
    throw new Error('Economic intent must include a "confidence" score');
  }
  let confidence = Number(payload.confidence);
  if (isNaN(confidence)) {
    throw new Error('Economic intent "confidence" must be a valid number');
  }
  confidence = Math.max(0.0, Math.min(1.0, confidence));

  // 4. Amount parsing
  let amountMon: number | undefined;
  if (payload.amountMon !== undefined && payload.amountMon !== null) {
    const parsed = Number(payload.amountMon);
    if (!isNaN(parsed)) amountMon = parsed;
  } else if (payload.amount !== undefined && payload.amount !== null) {
    const parsed = Number(payload.amount);
    if (!isNaN(parsed)) amountMon = parsed;
  }

  // 5. Expected value parsing
  let expectedValueMon: number | undefined;
  if (payload.expectedValueMon !== undefined && payload.expectedValueMon !== null) {
    const parsed = Number(payload.expectedValueMon);
    if (!isNaN(parsed)) expectedValueMon = parsed;
  } else if (payload.expectedValue !== undefined && payload.expectedValue !== null) {
    const parsed = Number(payload.expectedValue);
    if (!isNaN(parsed)) expectedValueMon = parsed;
  }

  return {
    action: rawAction,
    target: payload.target ? String(payload.target).trim() : undefined,
    counterpartyAddress: payload.counterpartyAddress
      ? String(payload.counterpartyAddress).trim()
      : undefined,
    amountMon,
    objectId: payload.objectId ? String(payload.objectId).trim() : undefined,
    strategy: payload.strategy ? payload.strategy : undefined,
    expectedValueMon,
    confidence,
    reason: payload.reason.trim(),
    timestamp: Date.now(),
  };
}

export class QwenMapper {
  public static extractAndValidateIntent(raw: string): EconomicIntent | null {
    try {
      const payload = extractJsonFromResponse(raw);
      return validateAndMapEconomicIntent(payload);
    } catch {
      return null;
    }
  }
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QwenClient } from '../src/integrations/qwen/qwenClient';
import { QwenProvider } from '../src/integrations/qwen/qwenProvider';
import { DEFAULT_QWEN_CONFIG, EconomicContext } from '../src/integrations/qwen/qwenTypes';

describe('Qwen 3.8 Max — Provider & Proxy Client Test Suite', () => {
  const originalFetch = global.fetch;

  const mockContext: EconomicContext = {
    agentId: 'ResearchAgent-42',
    agentName: 'ResearchAgent-42',
    treasuryBalanceMon: 184,
    policy: {
      maxPerTransaction: 20,
      dailySpendingLimit: 100,
      minRetainedBalance: 10,
      allowedCategories: ['DATA_ACCESS'],
      requireApprovalAbove: 20,
      autoRecoveryEnabled: true,
    },
    objective: 'Acquire satellite imagery under 20 MON',
    candidateServices: [
      {
        id: 'srv-geo-01',
        providerId: 'GeoVision-Provider',
        providerName: 'GeoVision',
        capability: 'satellite-imagery',
        priceMon: 12.0,
        latencyMs: 140,
        reputation: 98,
        minSLA: 99,
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('initializes with official Qwen 3.8 Max configuration parameters', () => {
    const client = new QwenClient();
    const config = client.getConfig();

    expect(config.provider).toBe('qwen');
    expect(config.model).toBe('qwen3.8-max');
    expect(config.temperature).toBe(0.1);
    expect(config.maxTokens).toBe(1024);
    expect(config.timeoutMs).toBe(15000);
    expect(config.baseUrl).toContain('dashscope');
  });

  it('sends structured request payload and receives validated economic reasoning', async () => {
    const client = new QwenClient();

    const mockApiResponse = {
      model: 'qwen3.8-max',
      cached: false,
      reasoning: {
        action: 'BUY',
        target: 'GeoVision',
        amountMon: 12.0,
        confidence: 0.91,
        reason: 'Optimal pricing well under the 20 MON cap with 98% reputation SLA.',
        timestamp: Date.now(),
      },
      rawResponse: '{"action":"BUY","target":"GeoVision","amountMon":12.0,"confidence":0.91,"reason":"Optimal pricing"}',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockApiResponse,
    } as any);

    const result = await client.generateReasoning(mockContext);

    expect(result.available).toBe(true);
    expect(result.modelUsed).toBe('qwen3.8-max');
    expect(result.rawText).toContain('GeoVision');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('serves repeated requests from in-memory cache to conserve API quota', async () => {
    const client = new QwenClient();

    const mockApiResponse = {
      model: 'qwen3.8-max',
      cached: false,
      rawResponse: '{"action":"BUY","target":"GeoVision","amountMon":12.0,"confidence":0.91,"reason":"Cached recommendation"}',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockApiResponse,
    } as any);

    // Call 1: misses cache, executes fetch
    const firstCall = await client.generateReasoning(mockContext);
    expect(firstCall.available).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Call 2: hits cache, does not trigger fetch
    const secondCall = await client.generateReasoning(mockContext);
    expect(secondCall.available).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1!
  });

  it('handles 401 Unauthorized / missing API credentials gracefully', async () => {
    const client = new QwenClient();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: 'Qwen API key not configured on backend. Set QWEN_API_KEY environment variable.',
        code: 'MISSING_API_KEY',
      }),
    } as any);

    const result = await client.generateReasoning(mockContext);

    expect(result.available).toBe(false);
    expect(result.error).toMatch(/QWEN_API_KEY|Qwen API key/i);
  });

  it('handles 404 Model Not Found without crashing or silently substituting fake data', async () => {
    const client = new QwenClient();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        error: 'Requested model qwen3.8-max not found or not enabled on this account',
        code: 'MODEL_NOT_FOUND',
      }),
    } as any);

    const result = await client.generateReasoning(mockContext);

    expect(result.available).toBe(false);
    expect(result.error).toContain('qwen3.8-max');
  });

  it('handles 429 Rate Limit cleanly', async () => {
    const client = new QwenClient();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: 'Rate limit exceeded for Qwen 3.8 Max endpoint',
        code: 'RATE_LIMIT_EXCEEDED',
      }),
    } as any);

    const result = await client.generateReasoning(mockContext);

    expect(result.available).toBe(false);
    expect(result.error).toMatch(/rate limit/i);
  });

  it('QwenProvider wraps client and maps raw output to structured ReasoningResult', async () => {
    const mockClient = new QwenClient();
    vi.spyOn(mockClient, 'generateReasoning').mockResolvedValue({
      available: true,
      modelUsed: 'qwen3.8-max',
      durationMs: 450,
      rawText: JSON.stringify({
        action: 'BUY',
        target: 'GeoVision',
        amountMon: 12.0,
        confidence: 0.94,
        reason: 'Optimal pricing under cap',
      }),
    });

    const provider = new QwenProvider(mockClient);
    const result = await provider.reason(mockContext);

    expect(result.available).toBe(true);
    expect(result.modelUsed).toBe('qwen3.8-max');
    expect(result.intent.action).toBe('BUY');
    expect(result.intent.amountMon).toBe(12.0);
    expect(result.intent.confidence).toBe(0.94);
  });
});

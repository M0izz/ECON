import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NansenClient } from '../src/integrations/nansen/nansenClient';

describe('NansenClient Caching, Error Handling & Security', () => {
  const sampleAddress = '0x1842B6792A645c110E663B514571A15C198547A1';
  let client: NansenClient;

  beforeEach(() => {
    client = new NansenClient({
      apiBaseUrl: '/api/nansen',
      cacheTtlMs: 2000,
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses Monad chain by default and requests profile correctly', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        available: true,
        data: {
          labels: [{ label: 'Monad Whale', category: 'entity' }],
        },
      }),
    } as Response);

    const intel = await client.getAddressProfile(sampleAddress);
    expect(intel.chain).toBe('monad');
    expect(intel.available).toBe(true);
    expect(intel.labels).toHaveLength(1);
    expect(intel.labels[0].label).toBe('Monad Whale');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/nansen/profile');
    const parsedBody = JSON.parse(options?.body as string);
    expect(parsedBody.address).toBe(sampleAddress);
    expect(parsedBody.chain).toBe('monad');
  });

  it('caches responses in-memory and prevents duplicate network requests within TTL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        available: true,
        data: {
          labels: [{ label: 'Verified Bot', category: 'agent' }],
        },
      }),
    } as Response);

    // Call 1: triggers network request
    const firstCall = await client.getAddressProfile(sampleAddress);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(firstCall.labels[0].label).toBe('Verified Bot');

    // Call 2: should be returned directly from cache
    const secondCall = await client.getAddressProfile(sampleAddress);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(secondCall.labels[0].label).toBe('Verified Bot');
    expect(secondCall.fetchedAt).toBe(firstCall.fetchedAt);
  });

  it('handles 401 Unauthorized gracefully without leaking keys', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    } as Response);

    const intel = await client.getAddressProfile(sampleAddress);
    expect(intel.available).toBe(false);
    expect(intel.status).toBe(401);
    expect(intel.error).toContain('Invalid or missing Nansen API credentials');
    expect(JSON.stringify(intel)).not.toContain('apikey');
  });

  it('handles 402 Payment Required (insufficient credits) cleanly', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 402,
      json: async () => ({ error: 'Payment Required' }),
    } as Response);

    const intel = await client.getAddressProfile(sampleAddress);
    expect(intel.available).toBe(false);
    expect(intel.status).toBe(402);
    expect(intel.error).toContain('Insufficient Nansen API credits');
  });

  it('handles 404 Not Found by returning empty intelligence rather than throwing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'No data found' }),
    } as Response);

    const intel = await client.getAddressProfile(sampleAddress);
    expect(intel.available).toBe(true);
    expect(intel.status).toBe(404);
    expect(intel.labels).toEqual([]);
    expect(intel.balances).toEqual([]);
  });

  it('handles 429 Rate Limiting with appropriate backoff notice', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Rate limit exceeded' }),
    } as Response);

    const intel = await client.getAddressProfile(sampleAddress);
    expect(intel.available).toBe(false);
    expect(intel.status).toBe(429);
    expect(intel.error).toContain('Nansen API rate limit reached');
  });

  it('handles 500 Internal Server Error cleanly', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal Error' }),
    } as Response);

    const intel = await client.getAddressProfile(sampleAddress);
    expect(intel.available).toBe(false);
    expect(intel.status).toBe(500);
    expect(intel.error).toContain('Nansen intelligence temporarily unavailable');
  });

  it('handles network drops or fetch rejections gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network connection failed'));

    const intel = await client.getAddressProfile(sampleAddress);
    expect(intel.available).toBe(false);
    expect(intel.error).toContain('Network connection failed');
  });
});

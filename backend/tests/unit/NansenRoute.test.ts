import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { createNansenRouter } from "../../src/routes/nansen";
import { buildTestConfig } from "../testUtils";

describe("Nansen Proxy Router", () => {
  const sampleAddress = "0x1842B6792A645c110E663B514571A15C198547A1";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns available: false when NANSEN_API_KEY is not configured", async () => {
    const config = buildTestConfig({ nansenApiKey: "" });
    const app = express();
    app.use(express.json());
    app.use("/nansen", createNansenRouter(config));

    const res = await request(app)
      .post("/nansen/labels")
      .send({ address: sampleAddress, chain: "monad" });

    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
    expect(res.body.error).toContain("NANSEN_API_KEY is not configured on the server");
  });

  it("validates Ethereum/Monad 0x addresses before making external calls", async () => {
    const config = buildTestConfig({ nansenApiKey: "test-key" });
    const app = express();
    app.use(express.json());
    app.use("/nansen", createNansenRouter(config));

    const res = await request(app)
      .post("/nansen/labels")
      .send({ address: "invalid-address", chain: "monad" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Valid EVM address is required");
  });

  it("forwards requests to Nansen Profiler API and returns formatted response", async () => {
    const config = buildTestConfig({ nansenApiKey: "secret-key-12345" });
    const app = express();
    app.use(express.json());
    app.use("/nansen", createNansenRouter(config));

    const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        labels: [{ label: "Monad Whale", category: "entity" }],
      }),
    } as Response);

    const res = await request(app)
      .post("/nansen/labels")
      .send({ address: sampleAddress, chain: "monad" });

    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
    expect(res.body.data.labels).toHaveLength(1);
    expect(res.body.data.labels[0].label).toBe("Monad Whale");

    // Verify key was passed in request header but never echoed in response
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("https://api.nansen.ai/api/v1/profiler/address/labels");
    expect((init?.headers as any)?.apikey).toBe("secret-key-12345");
    expect(JSON.stringify(res.body)).not.toContain("secret-key-12345");
  });

  it("caches successful requests and does not hammer external API", async () => {
    const config = buildTestConfig({ nansenApiKey: "secret-key-12345" });
    const app = express();
    app.use(express.json());
    app.use("/nansen", createNansenRouter(config));

    const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ token: "MON", balance: 184 }],
      }),
    } as Response);

    // Call 1
    const res1 = await request(app)
      .post("/nansen/current-balance")
      .send({ address: sampleAddress, chain: "monad" });
    expect(res1.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Call 2: should hit in-memory server cache
    const res2 = await request(app)
      .post("/nansen/current-balance")
      .send({ address: sampleAddress, chain: "monad" });
    expect(res2.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("handles 401 Unauthorized from Nansen cleanly", async () => {
    const config = buildTestConfig({ nansenApiKey: "bad-key" });
    const app = express();
    app.use(express.json());
    app.use("/nansen", createNansenRouter(config));

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: "Invalid API key" }),
    } as Response);

    const res = await request(app)
      .post("/nansen/transactions")
      .send({ address: sampleAddress, chain: "monad" });

    expect(res.status).toBe(401);
    expect(res.body.available).toBe(false);
    expect(res.body.error).toContain("Invalid or expired NANSEN_API_KEY");
  });

  it("handles 429 Rate Limit from Nansen cleanly", async () => {
    const config = buildTestConfig({ nansenApiKey: "limited-key" });
    const app = express();
    app.use(express.json());
    app.use("/nansen", createNansenRouter(config));

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ message: "Rate limit reached" }),
    } as Response);

    const res = await request(app)
      .post("/nansen/counterparties")
      .send({ address: sampleAddress, chain: "monad" });

    expect(res.status).toBe(429);
    expect(res.body.available).toBe(false);
    expect(res.body.error).toContain("Rate limit exceeded on Nansen API");
  });
});

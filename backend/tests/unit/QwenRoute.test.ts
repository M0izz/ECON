import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { createQwenRouter } from "../../src/routes/qwen";
import { buildTestConfig } from "../testUtils";

describe("Qwen 3.8 Max Proxy Router", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns available: false when QWEN_API_KEY is not configured", async () => {
    const config = buildTestConfig({ qwenApiKey: "" });
    const app = express();
    app.use(express.json());
    app.use("/qwen", createQwenRouter(config));

    const res = await request(app)
      .post("/qwen/reason")
      .send({
        systemPrompt: "You are an economic reasoning engine.",
        userPrompt: "Analyze GeoVision offering.",
      });

    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
    expect(res.body.error).toContain("QWEN_API_KEY is not configured on the server");
  });

  it("forwards prompt to Alibaba Cloud Model Studio and returns formatted reasoning", async () => {
    const config = buildTestConfig({ qwenApiKey: "sk-mock-qwen-secret-key" });
    const app = express();
    app.use(express.json());
    app.use("/qwen", createQwenRouter(config));

    const mockAiContent = JSON.stringify({
      action: "BUY",
      target: "GeoVision",
      amountMon: 12.0,
      confidence: 0.92,
      reason: "Optimal pricing under 20 MON spending limit with 98% reputation track record.",
    });

    const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: mockAiContent,
            },
          },
        ],
        model: "qwen3.8-max",
      }),
    } as Response);

    const res = await request(app)
      .post("/qwen/reason")
      .send({
        systemPrompt: "You are an economic reasoning engine.",
        userPrompt: "Find satellite imagery.",
      });

    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
    expect(res.body.modelUsed).toBe("qwen3.8-max");
    expect(res.body.rawText).toContain("GeoVision");
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Verify Authorization header
    const fetchArgs = mockFetch.mock.calls[0];
    const headers = fetchArgs[1]?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-mock-qwen-secret-key");
  });

  it("handles upstream 429 rate limit from Alibaba Cloud without crashing", async () => {
    const config = buildTestConfig({ qwenApiKey: "sk-mock-key" });
    const app = express();
    app.use(express.json());
    app.use("/qwen", createQwenRouter(config));

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => "Rate limit exceeded. Quota exhausted.",
    } as Response);

    const res = await request(app)
      .post("/qwen/reason")
      .send({
        systemPrompt: "You are an economic reasoning engine.",
        userPrompt: "Find high volume GPU compute cluster under 100 MON.",
      });

    expect(res.status).toBe(429);
    expect(res.body.available).toBe(false);
    expect(res.body.status).toBe(429);
    expect(res.body.error).toContain("Rate limit");
  });
});

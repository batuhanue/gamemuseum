import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("IGDB client", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.IGDB_CLIENT_ID = "id";
    process.env.IGDB_CLIENT_SECRET = "secret";
    process.env.PGLITE_DIR = "memory://";
  });
  afterEach(() => {
    delete process.env.IGDB_CLIENT_ID;
    delete process.env.IGDB_CLIENT_SECRET;
    vi.unstubAllGlobals();
  });

  it("fetches a token, retries on 429 and refreshes on 401", async () => {
    let tokenCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      tokenCalls++;
      expect(url).toContain("id.twitch.tv");
      return new Response(JSON.stringify({ access_token: `tok${tokenCalls}`, expires_in: 3600 }), { status: 200 });
    }));
    const { igdbQuery } = await import("@/lib/igdb/client");
    const responses = [new Response("", { status: 429, headers: { "retry-after": "0" } }), new Response("", { status: 401 }), new Response(JSON.stringify([{ id: 1 }]), { status: 200 })];
    const seenAuth: string[] = [];
    const fake = vi.fn(async (_u: string, init?: RequestInit) => {
      seenAuth.push(String((init?.headers as Record<string, string>).Authorization));
      return responses.shift()!;
    }) as unknown as typeof fetch;
    const out = await igdbQuery<{ id: number }[]>("games", "fields name;", fake);
    expect(out).toEqual([{ id: 1 }]);
    expect(tokenCalls).toBe(2); // initial + refresh after 401
    expect(seenAuth.at(-1)).toBe("Bearer tok2");
  });

  it("reports unavailable when not configured", async () => {
    delete process.env.IGDB_CLIENT_ID;
    const { igdbQuery } = await import("@/lib/igdb/client");
    await expect(igdbQuery("games", "x")).rejects.toMatchObject({ code: "unavailable" });
  });

  it("gives up with rate_limited after repeated 429", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }))));
    const { igdbQuery } = await import("@/lib/igdb/client");
    const fake = vi.fn(async () => new Response("", { status: 429, headers: { "retry-after": "0" } })) as unknown as typeof fetch;
    await expect(igdbQuery("games", "x", fake)).rejects.toMatchObject({ code: "rate_limited" });
  });
});

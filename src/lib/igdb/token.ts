import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { serviceTokens } from "../db/schema";

const TOKEN_ID = "igdb";
const SAFETY_MS = 5 * 60_000;
let memo: { token: string; expiresAt: number } | null = null;
let inflight: Promise<string> | null = null;

export function igdbConfigured(): boolean {
  return !!process.env.IGDB_CLIENT_ID && (!!process.env.IGDB_CLIENT_SECRET || !!process.env.IGDB_ACCESS_TOKEN);
}

async function fetchAppToken(): Promise<{ token: string; expiresAt: number }> {
  const id = process.env.IGDB_CLIENT_ID!;
  const secret = process.env.IGDB_CLIENT_SECRET!;
  const url = `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(id)}&client_secret=${encodeURIComponent(secret)}&grant_type=client_credentials`;
  const res = await fetch(url, { method: "POST", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Twitch token request failed (${res.status})`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  return { token: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
}

/**
 * App access token with tracked expiry. Shared through the service_tokens table so serverless
 * instances reuse one token; refreshed automatically when it is about to expire or rejected (401).
 * IGDB_ACCESS_TOKEN is only a bootstrap value and is never treated as permanent.
 */
export async function getIgdbToken(): Promise<string> {
  if (memo && memo.expiresAt - SAFETY_MS > Date.now()) return memo.token;
  if (inflight) return inflight;
  inflight = (async () => {
    const db = await getDb();
    const [row] = await db.select().from(serviceTokens).where(eq(serviceTokens.id, TOKEN_ID)).limit(1);
    if (row && row.expiresAt.getTime() - SAFETY_MS > Date.now()) {
      memo = { token: row.token, expiresAt: row.expiresAt.getTime() };
      return row.token;
    }
    if (!process.env.IGDB_CLIENT_SECRET) {
      const boot = process.env.IGDB_ACCESS_TOKEN;
      if (!boot) throw new Error("IGDB credentials missing");
      // Without a secret we cannot refresh; assume a short life so a 401 surfaces quickly.
      memo = { token: boot, expiresAt: Date.now() + 60 * 60_000 };
      return boot;
    }
    const fresh = await fetchAppToken();
    await db
      .insert(serviceTokens)
      .values({ id: TOKEN_ID, token: fresh.token, expiresAt: new Date(fresh.expiresAt) })
      .onConflictDoUpdate({ target: serviceTokens.id, set: { token: fresh.token, expiresAt: new Date(fresh.expiresAt), updatedAt: new Date() } });
    memo = fresh;
    return fresh.token;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

export async function invalidateIgdbToken() {
  memo = null;
  const db = await getDb();
  await db.delete(serviceTokens).where(eq(serviceTokens.id, TOKEN_ID));
}

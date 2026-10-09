import "server-only";
import { AppError } from "../errors";
import { getIgdbToken, igdbConfigured, invalidateIgdbToken } from "./token";

const BASE = "https://api.igdb.com/v4";
const MIN_SPACING_MS = 260; // IGDB allows 4 requests/second
let nextSlot = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + MIN_SPACING_MS;
  if (wait) await sleep(wait);
}

export type IgdbFetch = typeof fetch;

/**
 * Central IGDB call: throttled, 8 s timeout, exponential backoff on 429/5xx, one token refresh on 401.
 * Throws AppError("unavailable") with a clear message instead of hanging the UI.
 */
export async function igdbQuery<T>(endpoint: string, body: string, fetchImpl: IgdbFetch = fetch): Promise<T> {
  if (!igdbConfigured()) throw new AppError("unavailable", "IGDB is not configured");
  let refreshed = false;
  for (let attempt = 0; attempt < 4; attempt++) {
    await throttle();
    const token = await getIgdbToken();
    let res: Response;
    try {
      res = await fetchImpl(`${BASE}/${endpoint}`, {
        method: "POST",
        headers: { "Client-ID": process.env.IGDB_CLIENT_ID!, Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "text/plain" },
        body,
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
    } catch (e) {
      if (attempt === 3) throw new AppError("unavailable", "IGDB did not respond in time", { cause: String(e) });
      await sleep(400 * 2 ** attempt);
      continue;
    }
    if (res.ok) return (await res.json()) as T;
    if (res.status === 401 && !refreshed) {
      refreshed = true;
      await invalidateIgdbToken();
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get("retry-after"));
      if (attempt === 3) throw new AppError(res.status === 429 ? "rate_limited" : "unavailable", res.status === 429 ? "IGDB rate limit reached, try again shortly" : "IGDB is temporarily unavailable");
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt);
      continue;
    }
    const text = await res.text().catch(() => "");
    throw new AppError("unavailable", `IGDB request failed (${res.status})`, { body: text.slice(0, 300) });
  }
  throw new AppError("unavailable", "IGDB request failed");
}

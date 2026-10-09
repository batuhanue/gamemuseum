import { AppError } from "../errors";

type Bucket = { tokens: number; updated: number };
const buckets = new Map<string, Bucket>();

/**
 * Simple per-instance token bucket. On Vercel each function instance keeps its own map, so this is a
 * brake against bursts, not a global quota (use Vercel Firewall / Upstash for strict global limits).
 */
export function rateLimit(key: string, capacity: number, refillPerSecond: number) {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: capacity, updated: now };
  b.tokens = Math.min(capacity, b.tokens + ((now - b.updated) / 1000) * refillPerSecond);
  b.updated = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    throw new AppError("rate_limited", "Too many requests, please slow down");
  }
  b.tokens -= 1;
  buckets.set(key, b);
  if (buckets.size > 10_000) buckets.clear();
}

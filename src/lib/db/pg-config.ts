import type { PoolConfig } from "pg";

/**
 * Postgres connection settings. Remote databases (Neon) use full TLS verification: legacy
 * `sslmode=require|prefer|verify-ca` values are rewritten to the explicit `verify-full` that
 * node-postgres applies anyway (avoids its security warning). Local databases use no TLS.
 */
export function pgPoolConfig(url: string, extra: PoolConfig = {}): PoolConfig {
  const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
  if (local) return { connectionString: url, ...extra };
  const u = new URL(url);
  const mode = u.searchParams.get("sslmode");
  if (!mode || mode === "require" || mode === "prefer" || mode === "verify-ca") u.searchParams.set("sslmode", "verify-full");
  return { connectionString: u.toString(), ...extra };
}

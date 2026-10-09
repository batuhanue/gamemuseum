import "server-only";
import path from "node:path";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

type GlobalDb = { __gmDb?: Promise<DB> };
const g = globalThis as unknown as GlobalDb;

/**
 * Production / preview: Vercel Postgres (Neon) through DATABASE_URL.
 * Local development and tests without DATABASE_URL: embedded PGlite (real Postgres in WASM)
 * persisted on disk, so data survives restarts and no credentials are needed.
 */
async function create(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: url,
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
    });
    return drizzle(pool, { schema });
  }
  if (process.env.APP_ENV === "production" && process.env.VERCEL) {
    throw new Error("DATABASE_URL is required in production. Connect a Vercel Postgres (Neon) database.");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR === "memory://" ? "memory://" : path.resolve(process.env.PGLITE_DIR ?? ".data/pglite");
  if (dir !== "memory://") await (await import("node:fs/promises")).mkdir(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.resolve("drizzle") });
  return db as unknown as DB;
}

export function getDb(): Promise<DB> {
  if (!g.__gmDb) {
    g.__gmDb = (async () => {
      const db = await create();
      const { ensureReferenceData } = await import("./seed");
      await ensureReferenceData(db);
      return db;
    })().catch((err) => {
      g.__gmDb = undefined;
      throw err;
    });
  }
  return g.__gmDb;
}

export { schema };

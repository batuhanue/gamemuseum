import "server-only";
import path from "node:path";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { AppError } from "../errors";
import { pgPoolConfig } from "./pg-config";

export type DB = NodePgDatabase<typeof schema>;

type GlobalDb = { __gmDb?: Promise<DB> };
const g = globalThis as unknown as GlobalDb;

/** Neon/Vercel integrations expose the connection string under different names. */
export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || undefined;
}

const MIGRATION_LOCK = 727_001;

/**
 * Production / preview: Vercel Postgres (Neon). Migrations are applied on first connection under an
 * advisory lock, so a deploy works even if the build command did not run `db:migrate`.
 * Local development and tests without a URL: embedded PGlite (real Postgres in WASM) on disk.
 */
async function create(): Promise<DB> {
  const url = databaseUrl();
  if (url) {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { Pool } = await import("pg");
    const pool = new Pool(pgPoolConfig(url, { max: Number(process.env.DATABASE_POOL_MAX ?? 5), connectionTimeoutMillis: 10_000 }));
    const client = await pool.connect();
    try {
      await client.query("select pg_advisory_lock($1)", [MIGRATION_LOCK]);
      await migrate(drizzle(client), { migrationsFolder: path.join(/* turbopackIgnore: true */ process.cwd(), "drizzle") });
    } finally {
      await client.query("select pg_advisory_unlock($1)", [MIGRATION_LOCK]).catch(() => undefined);
      client.release();
    }
    return drizzle(pool, { schema });
  }
  if (process.env.VERCEL) {
    // Vercel's filesystem is read-only: the embedded fallback cannot work there.
    throw new AppError("unavailable", "Database is not configured: connect a Neon (Vercel Postgres) database so DATABASE_URL is set, then redeploy.");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR === "memory://" ? "memory://" : path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.PGLITE_DIR ?? ".data/pglite");
  if (dir !== "memory://") await (await import("node:fs/promises")).mkdir(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(/* turbopackIgnore: true */ process.cwd(), "drizzle") });
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

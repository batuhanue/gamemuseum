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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Applies pending SQL migrations without ever blocking indefinitely:
 * - if every migration in the journal is already recorded, nothing is locked at all (normal cold start);
 * - otherwise a non-blocking advisory lock is polled for at most ~20 s.
 * Uses the unpooled connection when available: session locks are unreliable through PgBouncer.
 */
async function ensureMigrated(url: string) {
  const { Client } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const { readFile } = await import("node:fs/promises");
  const folder = path.join(/* turbopackIgnore: true */ process.cwd(), "drizzle");
  const journal = JSON.parse(await readFile(path.join(/* turbopackIgnore: true */ folder, "meta/_journal.json"), "utf8")) as { entries: unknown[] };
  const expected = journal.entries.length;
  const direct = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || url;
  const client = new Client(pgPoolConfig(direct, { connectionTimeoutMillis: 10_000, statement_timeout: 60_000 }));
  await client.connect();
  const applied = async () => {
    try {
      const r = await client.query<{ n: number }>("select count(*)::int as n from drizzle.__drizzle_migrations");
      return r.rows[0]?.n ?? 0;
    } catch {
      return 0; // migrations table does not exist yet
    }
  };
  try {
    if ((await applied()) >= expected) return;
    let locked = false;
    for (let i = 0; i < 40 && !locked; i++) {
      locked = (await client.query<{ ok: boolean }>("select pg_try_advisory_lock($1) as ok", [MIGRATION_LOCK])).rows[0]?.ok ?? false;
      if (!locked) {
        if ((await applied()) >= expected) return; // another instance finished meanwhile
        await sleep(500);
      }
    }
    if (!locked) throw new AppError("unavailable", "Database migration is in progress elsewhere. Please retry in a moment.");
    try {
      if ((await applied()) < expected) await migrate(drizzle(client), { migrationsFolder: folder });
    } finally {
      await client.query("select pg_advisory_unlock($1)", [MIGRATION_LOCK]).catch(() => undefined);
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}

/**
 * Production / preview: Vercel Postgres (Neon); pending migrations are applied on first use so a
 * deploy works even if the build command did not run `db:migrate`.
 * Local development and tests without a URL: embedded PGlite (real Postgres in WASM) on disk.
 */
async function create(): Promise<DB> {
  const url = databaseUrl();
  if (url) {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { Pool } = await import("pg");
    await ensureMigrated(url);
    // Timeouts guarantee a request can never hang forever on the database.
    const pool = new Pool(
      pgPoolConfig(url, { max: Number(process.env.DATABASE_POOL_MAX ?? 5), connectionTimeoutMillis: 10_000, statement_timeout: 30_000, query_timeout: 35_000 }),
    );
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

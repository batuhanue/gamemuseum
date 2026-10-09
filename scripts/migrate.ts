/* Applies SQL migrations to DATABASE_URL (Vercel Postgres / Neon). PGlite migrates itself on boot. */
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { pgPoolConfig } from "../src/lib/db/pg-config";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.log("DATABASE_URL not set — skipping (embedded PGlite migrates automatically).");
  process.exit(0);
}
const pool = new Pool(pgPoolConfig(url));
await migrate(drizzle(pool), { migrationsFolder: path.resolve("drizzle") });
await pool.end();
console.log("Migrations applied.");

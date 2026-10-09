/* Applies SQL migrations to DATABASE_URL (Vercel Postgres / Neon). PGlite migrates itself on boot. */
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("DATABASE_URL not set — skipping (embedded PGlite migrates automatically).");
  process.exit(0);
}
const pool = new Pool({ connectionString: url, ssl: /localhost/.test(url) ? undefined : { rejectUnauthorized: false } });
await migrate(drizzle(pool), { migrationsFolder: path.resolve("drizzle") });
await pool.end();
console.log("Migrations applied.");

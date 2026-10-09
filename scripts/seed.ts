/* Inserts reference data (platforms, generations, themes, awards, demo catalog) into DATABASE_URL. Idempotent. */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { pgPoolConfig } from "../src/lib/db/pg-config";
import * as schema from "../src/lib/db/schema";
import { ensureReferenceData } from "../src/lib/db/seed";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.log("DATABASE_URL not set — skipping (embedded PGlite seeds automatically).");
  process.exit(0);
}
const pool = new Pool(pgPoolConfig(url));
await ensureReferenceData(drizzle(pool, { schema }));
await pool.end();
console.log("Reference data ensured.");

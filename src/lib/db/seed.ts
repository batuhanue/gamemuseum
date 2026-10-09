import { sql } from "drizzle-orm";
import type { DB } from "./client";
import { awardDefinitions, catalogGames, generations, platforms, themes } from "./schema";
import { GENERATIONS, IGDB_PLATFORM_NAMES, PLATFORMS } from "@/features/platforms/reference";
import { THEMES } from "@/features/museum/themes";
import { AWARDS } from "@/features/rewards/definitions";
import { DEMO_GAMES, demoGameId } from "@/features/games/demo-catalog";

/**
 * Idempotent reference data. Existing rows are never overwritten so admin edits survive deploys;
 * new definitions shipped with the code are added.
 */
export async function ensureReferenceData(db: DB): Promise<void> {
  const [row] = await db.execute<{ n: number }>(sql`select count(*)::int as n from award_definitions`).then((r) => r.rows);
  const [genRow] = await db.execute<{ n: number }>(sql`select count(*)::int as n from generations`).then((r) => r.rows);
  if ((row?.n ?? 0) >= AWARDS.length && (genRow?.n ?? 0) >= GENERATIONS.length) return;

  await db.insert(platforms).values(PLATFORMS.map((p) => ({ ...p }))).onConflictDoNothing();
  await db.insert(generations).values(GENERATIONS.map((g) => ({ ...g }))).onConflictDoNothing();
  await db
    .insert(themes)
    .values(THEMES.map((t) => ({ id: t.id, name: t.name, description: t.description, params: t.params, premiumSku: t.premiumSku, sortOrder: t.sortOrder })))
    .onConflictDoNothing();
  await db
    .insert(awardDefinitions)
    .values(
      AWARDS.map((a) => ({
        id: a.id, title: a.title, description: a.description, category: a.category, conditionType: a.conditionType,
        conditionConfig: a.conditionConfig, rarity: a.rarity, material: a.material, points: a.points, sortOrder: a.sortOrder,
      })),
    )
    .onConflictDoNothing();
  await db
    .insert(catalogGames)
    .values(
      DEMO_GAMES.map((g) => ({
        id: demoGameId(g.slug),
        title: g.title,
        slug: g.slug,
        summary: g.summary.en,
        releaseDate: `${g.year}-01-01`,
        igdbPlatformIds: g.platforms,
        platformNames: g.platforms.map((p) => IGDB_PLATFORM_NAMES[p] ?? String(p)),
        genres: g.genres,
        series: g.series ? [g.series] : [],
        developers: [g.developer],
        publishers: ["Demo Publishing"],
        dataSource: "demo" as const,
      })),
    )
    .onConflictDoNothing();
}

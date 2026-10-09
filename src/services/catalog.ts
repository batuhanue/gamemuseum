import "server-only";
import { and, eq, gt, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { catalogGames, catalogSearchCache } from "@/lib/db/schema";
import { igdbQuery } from "@/lib/igdb/client";
import { igdbConfigured } from "@/lib/igdb/token";
import { AppError } from "@/lib/errors";
import { newId, sha256, slugify } from "@/lib/ids";
import { IGDB_PLATFORM_NAMES, SUPPORTED_IGDB_PLATFORMS } from "@/features/platforms/reference";

export type CatalogSource = "igdb" | "demo";
export type CatalogGameRow = typeof catalogGames.$inferSelect;

export const PAGE_SIZE = 10;
const SEARCH_TTL_MS = 24 * 3600e3;
const GAME_TTL_MS = 30 * 24 * 3600e3;

const img = (id: string | undefined, size: string) => (id ? `https://images.igdb.com/igdb/image/upload/${size}/${id}.jpg` : undefined);

// Validate IGDB responses instead of trusting their shape.
const named = z.object({ name: z.string() }).passthrough();
const igdbGame = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string().optional(),
  summary: z.string().optional(),
  first_release_date: z.number().optional(),
  total_rating: z.number().optional(),
  cover: z.object({ image_id: z.string() }).optional(),
  artworks: z.array(z.object({ image_id: z.string() })).optional(),
  screenshots: z.array(z.object({ image_id: z.string() })).optional(),
  videos: z.array(z.object({ video_id: z.string() })).optional(),
  platforms: z.array(z.number()).optional(),
  genres: z.array(named).optional(),
  collections: z.array(named).optional(),
  franchises: z.array(named).optional(),
  alternative_names: z.array(named).optional(),
  involved_companies: z
    .array(z.object({ developer: z.boolean().optional(), publisher: z.boolean().optional(), company: named.optional() }))
    .optional(),
  external_games: z.array(z.object({ uid: z.string().optional(), category: z.number().optional() })).optional(),
});
type IgdbGame = z.infer<typeof igdbGame>;

const GAME_FIELDS = [
  "name", "slug", "summary", "first_release_date", "total_rating", "cover.image_id", "artworks.image_id", "screenshots.image_id",
  "videos.video_id", "platforms", "genres.name", "collections.name", "franchises.name", "alternative_names.name",
  "involved_companies.developer", "involved_companies.publisher", "involved_companies.company.name",
  "external_games.uid", "external_games.category",
].join(",");

export function mapIgdbGame(g: IgdbGame): typeof catalogGames.$inferInsert {
  const companies = g.involved_companies ?? [];
  const steam = (g.external_games ?? []).filter((e) => e.category === 1 && e.uid).map((e) => e.uid!);
  const gog = (g.external_games ?? []).filter((e) => e.category === 5 && e.uid).map((e) => e.uid!);
  const epic = (g.external_games ?? []).filter((e) => e.category === 26 && e.uid).map((e) => e.uid!);
  return {
    id: `igdb-${g.id}`,
    igdbId: g.id,
    title: g.name,
    slug: g.slug ?? slugify(g.name),
    alternativeNames: (g.alternative_names ?? []).map((a) => a.name).slice(0, 10),
    summary: g.summary ?? null,
    coverUrl: img(g.cover?.image_id, "t_cover_big") ?? null,
    artworkUrls: (g.artworks ?? []).map((a) => img(a.image_id, "t_1080p")!).slice(0, 6),
    screenshotUrls: (g.screenshots ?? []).map((a) => img(a.image_id, "t_screenshot_big")!).slice(0, 8),
    videoIds: (g.videos ?? []).map((v) => v.video_id).slice(0, 4),
    releaseDate: g.first_release_date ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10) : null,
    igdbPlatformIds: g.platforms ?? [],
    platformNames: (g.platforms ?? []).map((p) => IGDB_PLATFORM_NAMES[p]).filter((x): x is string => !!x),
    genres: (g.genres ?? []).map((x) => x.name),
    series: (g.collections ?? []).map((x) => x.name),
    franchises: (g.franchises ?? []).map((x) => x.name),
    developers: companies.filter((c) => c.developer && c.company).map((c) => c.company!.name),
    publishers: companies.filter((c) => c.publisher && c.company).map((c) => c.company!.name),
    externalIds: { steam, gog, epic },
    totalRating: g.total_rating ?? null,
    dataSource: "igdb",
    fetchedAt: new Date(),
  };
}

async function upsertIgdbGames(games: IgdbGame[]) {
  if (!games.length) return [] as string[];
  const db = await getDb();
  const rows = games.map(mapIgdbGame);
  await db
    .insert(catalogGames)
    .values(rows)
    .onConflictDoUpdate({
      target: catalogGames.id,
      set: Object.fromEntries(
        ["title", "slug", "alternative_names", "summary", "cover_url", "artwork_urls", "screenshot_urls", "video_ids", "release_date", "igdb_platform_ids",
          "platform_names", "genres", "series", "franchises", "developers", "publishers", "external_ids", "total_rating", "fetched_at"].map((c) => [
          c.replace(/_([a-z])/g, (_, l: string) => l.toUpperCase()),
          sql.raw(`excluded.${c}`),
        ]),
      ),
    });
  return rows.map((r) => r.id);
}

function escapeIgdb(q: string) {
  return q.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export type SearchResult = { source: CatalogSource; games: CatalogGameRow[]; hasMore: boolean };

export async function searchCatalog(q: string, opts: { platform?: number; page?: number; userId?: string } = {}): Promise<SearchResult> {
  const query = q.trim();
  const page = Math.max(0, opts.page ?? 0);
  const platform = opts.platform && SUPPORTED_IGDB_PLATFORMS.includes(opts.platform) ? opts.platform : undefined;
  const db = await getDb();
  if (query.length < 2) return { source: igdbConfigured() ? "igdb" : "demo", games: [], hasMore: false };

  // Manual entries the user created are always searchable for them.
  const manual = opts.userId && page === 0
    ? await db.select().from(catalogGames).where(and(eq(catalogGames.dataSource, "manual"), eq(catalogGames.createdBy, opts.userId), ilike(catalogGames.title, `%${query}%`))).limit(5)
    : [];

  if (!igdbConfigured()) {
    const rows = await db
      .select()
      .from(catalogGames)
      .where(and(eq(catalogGames.dataSource, "demo"), or(ilike(catalogGames.title, `%${query}%`), ilike(catalogGames.slug, `%${slugify(query)}%`))))
      .limit(PAGE_SIZE + 1)
      .offset(page * PAGE_SIZE);
    const filtered = platform ? rows.filter((r) => r.igdbPlatformIds.includes(platform)) : rows;
    return { source: "demo", games: [...manual, ...filtered.slice(0, PAGE_SIZE)], hasMore: rows.length > PAGE_SIZE };
  }

  const key = sha256(`v1|${query.toLowerCase()}|${platform ?? ""}|${page}`);
  const [cached] = await db.select().from(catalogSearchCache).where(and(eq(catalogSearchCache.key, key), gt(catalogSearchCache.expiresAt, new Date()))).limit(1);
  let ids: string[];
  let hasMore: boolean;
  if (cached) {
    ids = cached.gameIds.slice(0, PAGE_SIZE);
    hasMore = cached.gameIds.length > PAGE_SIZE;
  } else {
    const where = platform ? `where platforms = (${platform});` : `where platforms = (${SUPPORTED_IGDB_PLATFORMS.join(",")});`;
    const body = `search "${escapeIgdb(query)}"; fields ${GAME_FIELDS}; ${where} limit ${PAGE_SIZE + 1}; offset ${page * PAGE_SIZE};`;
    let raw = z.array(igdbGame).parse(await igdbQuery<unknown>("games", body));
    if (!raw.length && page === 0) {
      // Fallback for partial words / typos IGDB's search misses: case-insensitive contains match.
      const fb = `fields ${GAME_FIELDS}; ${where.replace(";", "")} & name ~ *"${escapeIgdb(query)}"*; sort total_rating_count desc; limit ${PAGE_SIZE + 1};`;
      raw = z.array(igdbGame).parse(await igdbQuery<unknown>("games", fb));
    }
    const all = await upsertIgdbGames(raw);
    await db
      .insert(catalogSearchCache)
      .values({ key, gameIds: all, expiresAt: new Date(Date.now() + SEARCH_TTL_MS) })
      .onConflictDoUpdate({ target: catalogSearchCache.key, set: { gameIds: all, expiresAt: new Date(Date.now() + SEARCH_TTL_MS) } });
    ids = all.slice(0, PAGE_SIZE);
    hasMore = all.length > PAGE_SIZE;
  }
  const rows = ids.length ? await db.select().from(catalogGames).where(inArray(catalogGames.id, ids)) : [];
  const ordered = ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is CatalogGameRow => !!r);
  return { source: "igdb", games: [...manual, ...ordered], hasMore };
}

/** Catalog record by id; IGDB records older than 30 days are refreshed (failures keep the cached copy). */
export async function getCatalogGame(id: string, userId?: string): Promise<CatalogGameRow> {
  const db = await getDb();
  const [row] = await db.select().from(catalogGames).where(eq(catalogGames.id, id)).limit(1);
  if (!row) {
    const m = /^igdb-(\d+)$/.exec(id);
    if (m && igdbConfigured()) {
      const fresh = await fetchIgdbGames([Number(m[1])]);
      if (fresh[0]) return fresh[0];
    }
    throw new AppError("not_found", "Game not found");
  }
  if (row.dataSource === "manual" && row.createdBy && row.createdBy !== userId) throw new AppError("not_found", "Game not found");
  if (row.dataSource === "igdb" && row.igdbId && Date.now() - row.fetchedAt.getTime() > GAME_TTL_MS && igdbConfigured()) {
    try {
      const [fresh] = await fetchIgdbGames([row.igdbId]);
      if (fresh) return fresh;
    } catch {
      /* stale data is better than none */
    }
  }
  return row;
}

export async function fetchIgdbGames(igdbIds: number[]): Promise<CatalogGameRow[]> {
  if (!igdbIds.length) return [];
  const raw = z.array(igdbGame).parse(await igdbQuery<unknown>("games", `fields ${GAME_FIELDS}; where id = (${igdbIds.join(",")}); limit ${igdbIds.length};`));
  const ids = await upsertIgdbGames(raw);
  const db = await getDb();
  return ids.length ? db.select().from(catalogGames).where(inArray(catalogGames.id, ids)) : [];
}

/** Maps Steam AppIDs to IGDB games through IGDB external_games (category 1 = Steam). */
export async function findBySteamAppIds(appIds: string[]): Promise<Map<string, CatalogGameRow>> {
  const out = new Map<string, CatalogGameRow>();
  if (!appIds.length) return out;
  const db = await getDb();
  // 1. Already cached locally.
  const local = await db.select().from(catalogGames).where(sql`${catalogGames.externalIds}->'steam' ?| array[${sql.join(appIds.map((a) => sql`${a}`), sql`, `)}]`);
  for (const g of local) for (const uid of g.externalIds.steam ?? []) if (appIds.includes(uid)) out.set(uid, g);
  const missing = appIds.filter((a) => !out.has(a));
  if (!missing.length || !igdbConfigured()) return out;
  const ext = z.array(z.object({ game: z.number().optional(), uid: z.string().optional() }));
  for (let i = 0; i < missing.length; i += 400) {
    const chunk = missing.slice(i, i + 400);
    const uids = chunk.map((u) => `"${u.replace(/\D/g, "")}"`).join(",");
    const rows = ext.parse(await igdbQuery<unknown>("external_games", `fields game,uid; where category = 1 & uid = (${uids}); limit 500;`));
    const gameIds = [...new Set(rows.map((r) => r.game).filter((g): g is number => !!g))];
    for (let j = 0; j < gameIds.length; j += 200) {
      const games = await fetchIgdbGames(gameIds.slice(j, j + 200));
      for (const r of rows) {
        const g = games.find((x) => x.igdbId === r.game);
        if (g && r.uid) out.set(r.uid, g);
      }
    }
  }
  return out;
}

/** User-created entry for games missing from the catalog. Clearly marked as manual, visible only to its creator. */
export async function createManualGame(userId: string, input: { title: string; year?: number; platformIds: number[] }) {
  const db = await getDb();
  const id = newId("manual");
  const [row] = await db
    .insert(catalogGames)
    .values({
      id,
      title: input.title.trim(),
      slug: slugify(input.title),
      releaseDate: input.year ? `${input.year}-01-01` : null,
      igdbPlatformIds: input.platformIds,
      platformNames: input.platformIds.map((p) => IGDB_PLATFORM_NAMES[p]).filter((x): x is string => !!x),
      dataSource: "manual",
      createdBy: userId,
    })
    .returning();
  return row!;
}

export async function catalogStatus() {
  return { source: (igdbConfigured() ? "igdb" : "demo") as CatalogSource };
}


import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  assetCatalog,
  awardDefinitions,
  catalogGames,
  generations,
  museumObjects,
  museumPlacements,
  museumShelves,
  platforms,
  themes,
  userAwards,
  userGames,
  users,
} from "@/lib/db/schema";
import { caseProfileFor } from "@/features/museum/case-profiles";
import { conditionProgress, levelFromPoints } from "@/features/rewards/engine";
import { DEFAULT_THEME_ID, THEMES } from "@/features/museum/themes";
import type { AssetRef, AwardView, GalleryState, MuseumSnapshot, PlacedObject, ShelfGame } from "@/types/museum";
import { demoPalette } from "@/features/games/demo-catalog";
import { computeGoalProgress, computeMetrics } from "./awards";
import type { Locale } from "@/i18n/config";

type AssetRow = typeof assetCatalog.$inferSelect;
export const toAssetRef = (a: AssetRow): AssetRef => ({
  id: a.id, name: a.name, category: a.category, modelUrl: a.modelUrl, status: a.status,
  scale: a.scale, positionOffset: a.positionOffset, rotationOffset: a.rotationOffset, version: a.version,
});

export async function loadReferenceForScene() {
  const db = await getDb();
  const [gens, plats, assets] = await Promise.all([
    db.select().from(generations).where(eq(generations.active, true)).orderBy(generations.sortOrder),
    db.select().from(platforms).where(eq(platforms.active, true)).orderBy(platforms.sortOrder),
    db.select().from(assetCatalog).where(eq(assetCatalog.status, "ready")),
  ]);
  return { gens, plats, assets };
}

export function consoleSlotsFor(platformId: string, gens: (typeof generations.$inferSelect)[], assets: AssetRow[]) {
  return gens
    .filter((g) => g.platformId === platformId)
    .map((g) => {
      const exact = assets.find((a) => a.category === "console" && a.generationId === g.id && a.modelUrl);
      const family = platformId === "pc" ? assets.find((a) => a.category === "console" && a.platformFamily === "pc" && !a.generationId && a.modelUrl) : undefined;
      const asset = exact ?? family;
      return { generationId: g.id, label: g.shortName, asset: asset ? toAssetRef(asset) : null };
    });
}

function yearsLabel(g: { yearStart: number | null; yearEnd: number | null }) {
  if (!g.yearStart) return null;
  return `${g.yearStart} – ${g.yearEnd ?? "…"}`;
}

export async function getMuseumSnapshot(userId: string, locale: Locale, opts: { publicView?: boolean; platforms?: string[] } = {}): Promise<MuseumSnapshot> {
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("user missing");
  const { gens, plats, assets } = await loadReferenceForScene();

  const copyWhere = opts.publicView ? and(eq(userGames.userId, userId), eq(userGames.isPublic, true)) : eq(userGames.userId, userId);
  const [rows, shelves, defs, earned, objects, themeRow] = await Promise.all([
    db
      .select({ copy: userGames, game: catalogGames, placement: museumPlacements })
      .from(userGames)
      .innerJoin(catalogGames, eq(catalogGames.id, userGames.catalogGameId))
      .leftJoin(museumPlacements, eq(museumPlacements.userGameId, userGames.id))
      .where(copyWhere)
      .orderBy(desc(userGames.createdAt)),
    db.select().from(museumShelves).where(eq(museumShelves.userId, userId)),
    db.select().from(awardDefinitions).where(eq(awardDefinitions.active, true)).orderBy(awardDefinitions.sortOrder),
    db.select().from(userAwards).where(eq(userAwards.userId, userId)),
    db.select().from(museumObjects).where(eq(museumObjects.userId, userId)),
    db.select().from(themes).where(eq(themes.id, user.activeThemeId)).limit(1),
  ]);

  const allowedPlatforms = opts.platforms ? new Set(opts.platforms) : null;
  const games: ShelfGame[] = rows
    .filter((r) => !allowedPlatforms || allowedPlatforms.has(r.copy.platformId))
    .map(({ copy, game, placement }) => {
      const gen = gens.find((g) => g.id === copy.generationId);
      return {
        copyId: copy.id,
        catalogGameId: game.id,
        title: game.title,
        coverUrl: game.coverUrl,
        releaseYear: game.releaseDate ? Number(game.releaseDate.slice(0, 4)) : null,
        series: game.series.length ? game.series : game.franchises,
        generationId: copy.generationId,
        platformId: copy.platformId,
        ownershipType: copy.ownershipType,
        store: copy.store,
        status: copy.status,
        isFavorite: copy.isFavorite,
        caseProfile: caseProfileFor(gen?.caseProfile ?? "dvd-black", copy.platformId, copy.ownershipType).id,
        sortIndex: placement?.sortIndex ?? 9999,
        shelfIndex: placement?.shelfIndex ?? 0,
        slotIndex: placement?.slotIndex ?? 0,
        dataSource: game.dataSource,
        palette: game.dataSource === "demo" ? demoPalette(game.id) : undefined,
        createdAt: copy.createdAt.toISOString(),
      };
    });

  const galleries: GalleryState[] = plats
    .filter((p) => !allowedPlatforms || allowedPlatforms.has(p.id))
    .map((p) => {
      const pg = gens.filter((g) => g.platformId === p.id);
      return {
        platformId: p.id as GalleryState["platformId"],
        name: p.name,
        accent: p.accentColor,
        tagline: p.tagline,
        total: games.filter((g) => g.platformId === p.id).length,
        consoles: consoleSlotsFor(p.id, gens, assets),
        shelves: pg.map((g) => {
          const s = shelves.find((x) => x.generationId === g.id);
          return {
            generationId: g.id,
            platformId: p.id,
            name: g.name,
            shortName: g.shortName,
            years: yearsLabel(g),
            caseProfile: g.caseProfile,
            capacity: g.shelfCapacity,
            mode: s?.mode ?? "auto",
            sortBy: s?.sortBy ?? "added",
            version: s?.version ?? 0,
            games: games.filter((x) => x.generationId === g.id).sort((a, b) => a.sortIndex - b.sortIndex),
          };
        }),
      };
    });

  const metrics = await computeMetrics(db, userId);
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const awards: AwardView[] = defs.map((d) => {
    const e = earned.find((x) => x.awardDefinitionId === d.id);
    const asset = d.modelAssetId ? assetById.get(d.modelAssetId) : undefined;
    return {
      id: d.id,
      title: d.title[locale] ?? d.title.en,
      description: d.description[locale] ?? d.description.en,
      category: d.category,
      rarity: d.rarity,
      material: d.material,
      points: d.points,
      conditionType: d.conditionType,
      conditionConfig: d.conditionConfig,
      asset: asset ? toAssetRef(asset) : null,
      earned: e ? { userAwardId: e.id, unlockedAt: e.unlockedAt.toISOString(), displayed: e.displayedInMuseum, verificationLevel: e.verificationLevel } : null,
      progress: opts.publicView ? null : conditionProgress(d, metrics),
    };
  });

  const objectAssets = objects.length
    ? await db.select().from(assetCatalog).where(inArray(assetCatalog.id, objects.map((o) => o.assetId)))
    : [];
  const placedObjects: PlacedObject[] = objects.map((o) => {
    const a = objectAssets.find((x) => x.id === o.assetId);
    const usable = a && a.status === "ready";
    return { id: o.id, anchorId: o.anchorId, rotationY: o.rotationY, asset: usable ? toAssetRef(a) : null, missing: !usable };
  });

  const points = awards.filter((a) => a.earned).reduce((s, a) => s + a.points, 0);
  const goals = opts.publicView ? [] : await computeGoalProgress(db, userId);
  const latest = games.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const theme = themeRow[0]?.params ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID)!.params;

  return {
    mode: opts.publicView ? "public" : "user",
    owner: { username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, level: levelFromPoints(points), points },
    themeId: themeRow[0]?.id ?? DEFAULT_THEME_ID,
    theme,
    galleries,
    awards: opts.publicView ? awards.filter((a) => a.earned) : awards,
    objects: placedObjects,
    stats: {
      uniqueGames: new Set(games.map((g) => g.catalogGameId)).size,
      copies: games.length,
      physical: games.filter((g) => g.ownershipType === "physical").length,
      digital: games.filter((g) => g.ownershipType === "digital").length,
      platforms: new Set(games.map((g) => g.platformId)).size,
      awards: awards.filter((a) => a.earned).length,
      awardsTotal: defs.length,
      completed: games.filter((g) => g.status === "completed").length,
      latest: latest ? { title: latest.title, catalogGameId: latest.catalogGameId, addedAt: latest.createdAt } : null,
      byPlatform: Object.fromEntries(plats.map((p) => [p.id, games.filter((g) => g.platformId === p.id).length])),
      goalProgress: goals.length
        ? { owned: goals.reduce((s, g) => s + g.owned, 0), target: goals.reduce((s, g) => s + g.target, 0), goals: goals.length }
        : null,
    },
  };
}

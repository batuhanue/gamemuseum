import "server-only";
import { DEMO_GAMES, DEMO_OWNERSHIP, demoGameId } from "@/features/games/demo-catalog";
import { GENERATIONS, PLATFORMS } from "@/features/platforms/reference";
import { caseProfileFor } from "@/features/museum/case-profiles";
import { THEMES } from "@/features/museum/themes";
import { AWARDS } from "@/features/rewards/definitions";
import type { GalleryState, MuseumSnapshot, ShelfGame } from "@/types/museum";
import type { Locale } from "@/i18n/config";
import { consoleSlotsFor, loadReferenceForScene } from "./museum";

const DEMO_EARNED = ["first-game", "games-10", "games-25", "first-xbox", "first-playstation", "first-pc", "retro-traveler"];

/**
 * In-memory showcase for signed-out visitors. Never persisted to any account; the UI labels it
 * "Demo Museum". Importing it into an account requires explicit confirmation (see /api/collection/import/demo).
 */
export async function getDemoSnapshot(locale: Locale): Promise<MuseumSnapshot> {
  const { gens, assets } = await loadReferenceForScene();
  const base = Date.parse("2025-01-01T00:00:00Z");
  const games: ShelfGame[] = DEMO_OWNERSHIP.map((o, i) => {
    const g = DEMO_GAMES.find((d) => d.slug === o.slug)!;
    const gen = GENERATIONS.find((x) => x.id === o.generationId)!;
    return {
      copyId: `demo-copy-${i}`,
      catalogGameId: demoGameId(g.slug),
      title: g.title,
      coverUrl: null,
      releaseYear: g.year,
      series: g.series ? [g.series] : [],
      generationId: gen.id,
      platformId: gen.platformId,
      ownershipType: o.ownership,
      store: gen.platformId === "pc" ? gen.id.replace("pc-", "") : null,
      status: o.status,
      isFavorite: !!o.favorite,
      caseProfile: caseProfileFor(gen.caseProfile, gen.platformId, o.ownership).id,
      sortIndex: 0,
      shelfIndex: 0,
      slotIndex: 0,
      dataSource: "demo",
      palette: g.palette,
      createdAt: new Date(base + i * 864e5).toISOString(),
    };
  });
  const galleries: GalleryState[] = PLATFORMS.map((p) => ({
    platformId: p.id,
    name: p.name,
    accent: p.accentColor,
    tagline: p.tagline,
    total: games.filter((g) => g.platformId === p.id).length,
    consoles: consoleSlotsFor(p.id, gens, assets),
    shelves: GENERATIONS.filter((g) => g.platformId === p.id).map((g) => {
      const list = games.filter((x) => x.generationId === g.id).map((x, i) => ({ ...x, sortIndex: i, shelfIndex: Math.floor(i / g.shelfCapacity), slotIndex: i % g.shelfCapacity }));
      return {
        generationId: g.id, platformId: p.id, name: g.name, shortName: g.shortName,
        years: g.yearStart ? `${g.yearStart} – ${g.yearEnd ?? "…"}` : null,
        caseProfile: g.caseProfile, capacity: g.shelfCapacity, mode: "auto" as const, sortBy: "added", version: 0, games: list,
      };
    }),
  }));
  const awards = AWARDS.map((a) => {
    const idx = DEMO_EARNED.indexOf(a.id);
    return {
      id: a.id, title: a.title[locale], description: a.description[locale], category: a.category, rarity: a.rarity,
      material: a.material, points: a.points, conditionType: a.conditionType, conditionConfig: a.conditionConfig, asset: null,
      earned: idx >= 0 ? { userAwardId: `demo-${a.id}`, unlockedAt: new Date(base + idx * 7 * 864e5).toISOString(), displayed: true, verificationLevel: "self-reported" } : null,
      progress: null,
    };
  });
  const points = awards.filter((a) => a.earned).reduce((s, a) => s + a.points, 0);
  const theme = THEMES[0]!;
  return {
    mode: "demo",
    owner: { username: "demo", displayName: "Demo Curator", avatarUrl: null, level: 1 + Math.floor(Math.sqrt(points / 12)), points },
    themeId: theme.id,
    theme: theme.params,
    galleries,
    awards,
    objects: [],
    stats: {
      uniqueGames: new Set(games.map((g) => g.catalogGameId)).size,
      copies: games.length,
      physical: games.filter((g) => g.ownershipType === "physical").length,
      digital: games.filter((g) => g.ownershipType === "digital").length,
      platforms: 3,
      awards: DEMO_EARNED.length,
      awardsTotal: AWARDS.length,
      completed: games.filter((g) => g.status === "completed").length,
      latest: { title: games.at(-1)!.title, catalogGameId: games.at(-1)!.catalogGameId, addedAt: games.at(-1)!.createdAt },
      byPlatform: Object.fromEntries(PLATFORMS.map((p) => [p.id, games.filter((g) => g.platformId === p.id).length])),
      goalProgress: null,
    },
  };
}


import type { catalogGames } from "@/lib/db/schema";
import { generationsForIgdbPlatforms, supportsPc } from "@/features/platforms/reference";

export type CatalogGameDto = {
  id: string;
  title: string;
  coverUrl: string | null;
  releaseDate: string | null;
  platformNames: string[];
  igdbPlatformIds: number[];
  genres: string[];
  series: string[];
  developers: string[];
  publishers: string[];
  summary: string | null;
  dataSource: "igdb" | "manual" | "demo";
  availableGenerations: string[];
  pc: boolean;
};

export function toCatalogDto(g: typeof catalogGames.$inferSelect): CatalogGameDto {
  const manual = g.dataSource === "manual" && !g.igdbPlatformIds.length;
  return {
    id: g.id,
    title: g.title,
    coverUrl: g.coverUrl,
    releaseDate: g.releaseDate,
    platformNames: g.platformNames,
    igdbPlatformIds: g.igdbPlatformIds,
    genres: g.genres,
    series: g.series.length ? g.series : g.franchises,
    developers: g.developers,
    publishers: g.publishers,
    summary: g.summary,
    dataSource: g.dataSource,
    availableGenerations: manual ? [] : generationsForIgdbPlatforms(g.igdbPlatformIds).map((x) => x.id),
    pc: manual || supportsPc(g.igdbPlatformIds),
  };
}

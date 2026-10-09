import type { CaseProfileId } from "@/lib/db/schema";

export type PlatformFamilyId = "xbox" | "playstation" | "pc";
export const GALLERY_ORDER: PlatformFamilyId[] = ["xbox", "playstation", "pc"];

/** Visible shelf rows per generation column; a "shelf module" holds shelfCapacity cases. */
export const SHELF_ROWS = 3;

export const PLATFORMS = [
  { id: "xbox", name: "Xbox", accentColor: "#45B36B", tagline: "Power your journey", sortOrder: 0 },
  { id: "playstation", name: "PlayStation", accentColor: "#477DFF", tagline: "Play has a longer history here", sortOrder: 1 },
  { id: "pc", name: "PC", accentColor: "#AEB9C7", tagline: "Mod. Create. Experience. Forever.", sortOrder: 2 },
] as const;

export type GenerationSeed = {
  id: string;
  platformId: PlatformFamilyId;
  name: string;
  shortName: string;
  kind: "console" | "store";
  yearStart: number | null;
  yearEnd: number | null;
  caseProfile: CaseProfileId;
  igdbPlatformIds: number[];
  isRetro: boolean;
  shelfCapacity: number;
  sortOrder: number;
};

/** IGDB platform ids: 11 Xbox, 12 X360, 49 XOne, 169 Series; 7 PS1, 8 PS2, 9 PS3, 48 PS4, 167 PS5; 6 Windows, 14 Mac, 3 Linux. */
export const GENERATIONS: GenerationSeed[] = [
  { id: "xbox-og", platformId: "xbox", name: "Original Xbox", shortName: "Xbox", kind: "console", yearStart: 2001, yearEnd: 2005, caseProfile: "dvd-xbox", igdbPlatformIds: [11], isRetro: true, shelfCapacity: 5, sortOrder: 0 },
  { id: "x360", platformId: "xbox", name: "Xbox 360", shortName: "X360", kind: "console", yearStart: 2005, yearEnd: 2013, caseProfile: "dvd-x360", igdbPlatformIds: [12], isRetro: true, shelfCapacity: 5, sortOrder: 1 },
  { id: "xone", platformId: "xbox", name: "Xbox One", shortName: "XONE", kind: "console", yearStart: 2013, yearEnd: 2020, caseProfile: "bluray-xone", igdbPlatformIds: [49], isRetro: false, shelfCapacity: 5, sortOrder: 2 },
  { id: "xseries", platformId: "xbox", name: "Xbox Series X|S", shortName: "Series X|S", kind: "console", yearStart: 2020, yearEnd: null, caseProfile: "bluray-xseries", igdbPlatformIds: [169], isRetro: false, shelfCapacity: 5, sortOrder: 3 },
  { id: "ps1", platformId: "playstation", name: "PlayStation", shortName: "PS1", kind: "console", yearStart: 1994, yearEnd: 2000, caseProfile: "jewel-case", igdbPlatformIds: [7], isRetro: true, shelfCapacity: 4, sortOrder: 0 },
  { id: "ps2", platformId: "playstation", name: "PlayStation 2", shortName: "PS2", kind: "console", yearStart: 2000, yearEnd: 2006, caseProfile: "dvd-black", igdbPlatformIds: [8], isRetro: true, shelfCapacity: 4, sortOrder: 1 },
  { id: "ps3", platformId: "playstation", name: "PlayStation 3", shortName: "PS3", kind: "console", yearStart: 2006, yearEnd: 2013, caseProfile: "bluray-ps3", igdbPlatformIds: [9], isRetro: true, shelfCapacity: 4, sortOrder: 2 },
  { id: "ps4", platformId: "playstation", name: "PlayStation 4", shortName: "PS4", kind: "console", yearStart: 2013, yearEnd: 2020, caseProfile: "bluray-ps4", igdbPlatformIds: [48], isRetro: false, shelfCapacity: 4, sortOrder: 3 },
  { id: "ps5", platformId: "playstation", name: "PlayStation 5", shortName: "PS5", kind: "console", yearStart: 2020, yearEnd: null, caseProfile: "bluray-ps5", igdbPlatformIds: [167], isRetro: false, shelfCapacity: 4, sortOrder: 4 },
  { id: "pc-steam", platformId: "pc", name: "Steam", shortName: "Steam", kind: "store", yearStart: null, yearEnd: null, caseProfile: "pc-digital", igdbPlatformIds: [6, 14, 3], isRetro: false, shelfCapacity: 6, sortOrder: 0 },
  { id: "pc-epic", platformId: "pc", name: "Epic Games", shortName: "Epic", kind: "store", yearStart: null, yearEnd: null, caseProfile: "pc-digital", igdbPlatformIds: [6], isRetro: false, shelfCapacity: 6, sortOrder: 1 },
  { id: "pc-gog", platformId: "pc", name: "GOG", shortName: "GOG", kind: "store", yearStart: null, yearEnd: null, caseProfile: "pc-digital", igdbPlatformIds: [6, 14, 3], isRetro: false, shelfCapacity: 6, sortOrder: 2 },
  { id: "pc-other", platformId: "pc", name: "Other PC", shortName: "PC", kind: "store", yearStart: null, yearEnd: null, caseProfile: "pc-bigbox", igdbPlatformIds: [6, 14, 3], isRetro: false, shelfCapacity: 4, sortOrder: 3 },
];

export const PC_STORE_TO_GENERATION: Record<"steam" | "epic" | "gog" | "other", string> = {
  steam: "pc-steam",
  epic: "pc-epic",
  gog: "pc-gog",
  other: "pc-other",
};

export function generationsFor(platformId: string): GenerationSeed[] {
  return GENERATIONS.filter((g) => g.platformId === platformId).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function generationById(id: string): GenerationSeed | undefined {
  return GENERATIONS.find((g) => g.id === id);
}

/** Generations whose IGDB platform ids intersect the game's platforms (PC stores collapse into one choice). */
export function generationsForIgdbPlatforms(igdbPlatformIds: number[]): GenerationSeed[] {
  const set = new Set(igdbPlatformIds);
  return GENERATIONS.filter((g) => g.kind === "console" && g.igdbPlatformIds.some((p) => set.has(p)));
}

export function supportsPc(igdbPlatformIds: number[]): boolean {
  return igdbPlatformIds.some((p) => p === 6 || p === 14 || p === 3);
}

export const PLATFORM_ACCENT: Record<string, string> = Object.fromEntries(PLATFORMS.map((p) => [p.id, p.accentColor]));

export const IGDB_PLATFORM_NAMES: Record<number, string> = {
  3: "Linux", 6: "PC (Windows)", 7: "PlayStation", 8: "PlayStation 2", 9: "PlayStation 3", 11: "Xbox",
  12: "Xbox 360", 14: "Mac", 48: "PlayStation 4", 49: "Xbox One", 167: "PlayStation 5", 169: "Xbox Series X|S",
};

/** IGDB platform ids the catalog search can filter by. */
export const SUPPORTED_IGDB_PLATFORMS = Object.keys(IGDB_PLATFORM_NAMES).map(Number);

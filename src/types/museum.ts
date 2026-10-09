import type { ThemeParams, Vec3 } from "@/lib/db/schema";
import type { CaseProfileId } from "@/lib/db/schema";

export type GameStatus = "backlog" | "playing" | "completed" | "paused" | "dropped";

export type ShelfGame = {
  copyId: string;
  catalogGameId: string;
  title: string;
  coverUrl: string | null;
  releaseYear: number | null;
  series: string[];
  generationId: string;
  platformId: string;
  ownershipType: "physical" | "digital";
  store: string | null;
  status: GameStatus;
  isFavorite: boolean;
  caseProfile: CaseProfileId;
  sortIndex: number;
  shelfIndex: number;
  slotIndex: number;
  dataSource: "igdb" | "manual" | "demo";
  palette?: [string, string];
  createdAt: string;
};

export type ShelfState = {
  generationId: string;
  platformId: string;
  name: string;
  shortName: string;
  years: string | null;
  caseProfile: CaseProfileId;
  capacity: number;
  mode: "auto" | "manual";
  sortBy: string;
  version: number;
  games: ShelfGame[];
};

export type GalleryState = {
  platformId: "xbox" | "playstation" | "pc";
  name: string;
  accent: string;
  tagline: string | null;
  total: number;
  shelves: ShelfState[];
  consoles: ConsoleSlot[];
};

export type AssetRef = {
  id: string;
  name: string;
  category: string;
  modelUrl: string | null;
  status: "draft" | "ready" | "disabled";
  scale: Vec3;
  positionOffset: Vec3;
  rotationOffset: Vec3;
  version: number;
};

export type ConsoleSlot = { generationId: string; label: string; asset: AssetRef | null };

export type AwardView = {
  id: string;
  title: string;
  description: string;
  category: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  material: "bronze" | "silver" | "gold" | "crystal" | "obsidian";
  points: number;
  conditionType: string;
  conditionConfig: Record<string, unknown>;
  asset: AssetRef | null;
  earned: null | { userAwardId: string; unlockedAt: string; displayed: boolean; verificationLevel: string };
  progress: { current: number; target: number } | null;
};

export type PlacedObject = { id: string; anchorId: string; rotationY: number; asset: AssetRef | null; missing: boolean };

export type MuseumStats = {
  uniqueGames: number;
  copies: number;
  physical: number;
  digital: number;
  platforms: number;
  awards: number;
  awardsTotal: number;
  completed: number;
  latest: { title: string; catalogGameId: string; addedAt: string } | null;
  byPlatform: Record<string, number>;
  goalProgress: { owned: number; target: number; goals: number } | null;
};

export type MuseumSnapshot = {
  mode: "user" | "demo" | "public";
  owner: { username: string; displayName: string; avatarUrl: string | null; level: number; points: number };
  themeId: string;
  theme: ThemeParams;
  galleries: GalleryState[];
  awards: AwardView[];
  objects: PlacedObject[];
  stats: MuseumStats;
};

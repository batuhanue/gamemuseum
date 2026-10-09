import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();

/* ─────────────────────────────── Accounts ─────────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
    plan: text("plan", { enum: ["free", "premium"] }).notNull().default("free"),
    avatarUrl: text("avatar_url"),
    locale: text("locale", { enum: ["tr", "en"] }).notNull().default("tr"),
    bio: text("bio"),
    collectionDescription: text("collection_description"),
    museumVisibility: text("museum_visibility", { enum: ["private", "unlisted", "public"] })
      .notNull()
      .default("private"),
    shareToken: text("share_token").notNull(),
    shareSettings: jsonb("share_settings")
      .$type<{ platforms: string[]; showAwards: boolean; showFavorites: boolean; showStats: boolean }>()
      .notNull()
      .default({ platforms: ["xbox", "playstation", "pc"], showAwards: true, showFavorites: true, showStats: true }),
    selectedPlatforms: jsonb("selected_platforms").$type<string[]>().notNull().default([]),
    activeThemeId: text("active_theme_id").notNull().default("modern-museum"),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email), uniqueIndex("users_username_uq").on(t.username)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: id(), // sha256 of the cookie token
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] }), index("oauth_user_idx").on(t.userId)],
);

/** Linked third-party libraries (Steam). Never stores passwords. */
export const linkedAccounts = pgTable(
  "linked_accounts",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["steam"] }).notNull(),
    externalId: text("external_id").notNull(),
    displayName: text("display_name"),
    linkedAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.provider] })],
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: id(), // sha256 of token
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["verify-email", "reset-password"] }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("auth_tokens_user_idx").on(t.userId)],
);

export const entitlements = pgTable(
  "entitlements",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    source: text("source", { enum: ["admin-grant", "payment"] }).notNull(),
    grantedBy: text("granted_by"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.sku] })],
);

/* ─────────────────────────── Platforms & catalog ─────────────────────────── */

export const platforms = pgTable("platforms", {
  id: id(), // "xbox" | "playstation" | "pc" | future families
  name: text("name").notNull(),
  accentColor: text("accent_color").notNull(),
  tagline: text("tagline"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export type CaseProfileId =
  | "jewel-case"
  | "dvd-black"
  | "dvd-xbox"
  | "dvd-x360"
  | "bluray-ps3"
  | "bluray-ps4"
  | "bluray-ps5"
  | "bluray-xone"
  | "bluray-xseries"
  | "pc-digital"
  | "pc-bigbox";

export const generations = pgTable(
  "generations",
  {
    id: id(), // e.g. "ps2", "x360", "pc-steam"
    platformId: text("platform_id").notNull().references(() => platforms.id),
    name: text("name").notNull(),
    shortName: text("short_name").notNull(),
    kind: text("kind", { enum: ["console", "store"] }).notNull(),
    yearStart: integer("year_start"),
    yearEnd: integer("year_end"),
    caseProfile: text("case_profile").$type<CaseProfileId>().notNull(),
    igdbPlatformIds: jsonb("igdb_platform_ids").$type<number[]>().notNull().default([]),
    isRetro: boolean("is_retro").notNull().default(false),
    shelfCapacity: integer("shelf_capacity").notNull().default(10),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("generations_platform_idx").on(t.platformId)],
);

export const catalogGames = pgTable(
  "catalog_games",
  {
    id: id(), // "igdb-1942" | "demo-..." | "manual-..."
    igdbId: integer("igdb_id"),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    alternativeNames: jsonb("alternative_names").$type<string[]>().notNull().default([]),
    summary: text("summary"),
    coverUrl: text("cover_url"),
    artworkUrls: jsonb("artwork_urls").$type<string[]>().notNull().default([]),
    screenshotUrls: jsonb("screenshot_urls").$type<string[]>().notNull().default([]),
    videoIds: jsonb("video_ids").$type<string[]>().notNull().default([]),
    releaseDate: text("release_date"),
    igdbPlatformIds: jsonb("igdb_platform_ids").$type<number[]>().notNull().default([]),
    platformNames: jsonb("platform_names").$type<string[]>().notNull().default([]),
    genres: jsonb("genres").$type<string[]>().notNull().default([]),
    series: jsonb("series").$type<string[]>().notNull().default([]),
    franchises: jsonb("franchises").$type<string[]>().notNull().default([]),
    developers: jsonb("developers").$type<string[]>().notNull().default([]),
    publishers: jsonb("publishers").$type<string[]>().notNull().default([]),
    ageRatings: jsonb("age_ratings").$type<string[]>().notNull().default([]),
    externalIds: jsonb("external_ids").$type<{ steam?: string[]; gog?: string[]; epic?: string[] }>().notNull().default({}),
    dataSource: text("data_source", { enum: ["igdb", "manual", "demo"] }).notNull(),
    /** Manual entries belong to the user who created them and never appear in shared search. */
    createdBy: text("created_by"),
    totalRating: real("total_rating"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("catalog_igdb_uq").on(t.igdbId),
    index("catalog_slug_idx").on(t.slug),
    index("catalog_source_idx").on(t.dataSource),
  ],
);

export const catalogSearchCache = pgTable("catalog_search_cache", {
  key: text("key").primaryKey(),
  gameIds: jsonb("game_ids").$type<string[]>().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const serviceTokens = pgTable("service_tokens", {
  id: id(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  updatedAt: updatedAt(),
});

/* ─────────────────────────────── Ownership ─────────────────────────────── */

export const userGames = pgTable(
  "user_games",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    catalogGameId: text("catalog_game_id").notNull().references(() => catalogGames.id),
    platformId: text("platform_id").notNull().references(() => platforms.id),
    generationId: text("generation_id").notNull().references(() => generations.id),
    ownershipType: text("ownership_type", { enum: ["physical", "digital"] }).notNull(),
    store: text("store", { enum: ["steam", "epic", "gog", "other"] }),
    edition: text("edition"),
    region: text("region"),
    condition: text("condition", { enum: ["sealed", "complete", "loose", "custom"] }),
    purchaseDate: text("purchase_date"),
    purchasePrice: doublePrecision("purchase_price"),
    purchaseCurrency: text("purchase_currency"),
    status: text("status", { enum: ["backlog", "playing", "completed", "paused", "dropped"] })
      .notNull()
      .default("backlog"),
    isFavorite: boolean("is_favorite").notNull().default(false),
    isPublic: boolean("is_public").notNull().default(true),
    rating: real("rating"),
    playtimeMinutes: integer("playtime_minutes"),
    notes: text("notes"),
    source: text("source", { enum: ["manual", "steam-import", "csv-import", "demo-import"] }).notNull().default("manual"),
    externalRef: text("external_ref"),
    verificationStatus: text("verification_status", { enum: ["self-reported", "platform-confirmed"] })
      .notNull()
      .default("self-reported"),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("user_games_user_idx").on(t.userId, t.createdAt),
    index("user_games_user_gen_idx").on(t.userId, t.generationId),
    index("user_games_catalog_idx").on(t.userId, t.catalogGameId),
    // Same import source can never create the same entry twice (Steam re-sync idempotency).
    uniqueIndex("user_games_external_uq")
      .on(t.userId, t.source, t.externalRef)
      .where(sql`${t.externalRef} is not null`),
  ],
);

/** Per user + generation shelf configuration (layout mode, sort rule, optimistic-lock version). */
export const museumShelves = pgTable(
  "museum_shelves",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    generationId: text("generation_id").notNull().references(() => generations.id),
    mode: text("mode", { enum: ["auto", "manual"] }).notNull().default("auto"),
    sortBy: text("sort_by", {
      enum: ["alphabetical", "release", "added", "generation", "status", "favorites", "series", "ownership", "custom"],
    })
      .notNull()
      .default("added"),
    version: integer("version").notNull().default(1),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.generationId] })],
);

/** One placement per owned copy. shelfIndex/slotIndex are derived from sortIndex and shelf capacity. */
export const museumPlacements = pgTable(
  "museum_placements",
  {
    userGameId: text("user_game_id")
      .primaryKey()
      .references(() => userGames.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    galleryId: text("gallery_id").notNull(),
    generationId: text("generation_id").notNull(),
    shelfIndex: integer("shelf_index").notNull(),
    slotIndex: integer("slot_index").notNull(),
    sortIndex: integer("sort_index").notNull(),
    rotationY: real("rotation_y").notNull().default(0),
    scale: real("scale").notNull().default(1),
    displayMode: text("display_mode", { enum: ["cover-out", "spine-out", "showcase"] }).notNull().default("cover-out"),
    updatedAt: updatedAt(),
  },
  (t) => [index("placements_user_gen_idx").on(t.userId, t.generationId, t.sortIndex)],
);

/* ─────────────────────────────── 3D assets ─────────────────────────────── */

export type Vec3 = [number, number, number];

export const assetCatalog = pgTable(
  "asset_catalog",
  {
    id: id(),
    name: text("name").notNull(),
    category: text("category", {
      enum: ["console", "controller", "figure", "award", "furniture", "decoration", "exhibit"],
    }).notNull(),
    modelUrl: text("model_url"),
    thumbnailUrl: text("thumbnail_url"),
    platformFamily: text("platform_family"),
    generationId: text("generation_id"),
    scale: jsonb("scale").$type<Vec3>().notNull().default([1, 1, 1]),
    positionOffset: jsonb("position_offset").$type<Vec3>().notNull().default([0, 0, 0]),
    rotationOffset: jsonb("rotation_offset").$type<Vec3>().notNull().default([0, 0, 0]),
    anchorType: text("anchor_type", { enum: ["shelf", "pedestal", "floor", "wall"] }).notNull().default("pedestal"),
    rarity: text("rarity"),
    isUnlockable: boolean("is_unlockable").notNull().default(false),
    unlockRuleId: text("unlock_rule_id"),
    premiumSku: text("premium_sku"),
    status: text("status", { enum: ["draft", "ready", "disabled"] }).notNull().default("draft"),
    analysis: jsonb("analysis").$type<{
      fileSize?: number;
      triangles?: number;
      meshes?: number;
      materials?: number;
      textures?: number;
      bbox?: { min: Vec3; max: Vec3 };
      warnings?: string[];
    }>(),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("assets_category_idx").on(t.category, t.status)],
);

/** Every model file ever attached to an asset; enables safe replacement and rollback. */
export const assetVersions = pgTable(
  "asset_versions",
  {
    id: id(),
    assetId: text("asset_id").notNull().references(() => assetCatalog.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    modelUrl: text("model_url").notNull(),
    analysis: jsonb("analysis"),
    createdBy: text("created_by"),
    createdAt: createdAt(),
  },
  (t) => [index("asset_versions_asset_idx").on(t.assetId, t.version)],
);

/** Objects (figures, consoles, decorations) a user placed into named scene anchors. */
export const museumObjects = pgTable(
  "museum_objects",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    // Asset may be deleted later; keep the record and render a fallback.
    assetId: text("asset_id").notNull(),
    anchorId: text("anchor_id").notNull(),
    rotationY: real("rotation_y").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("museum_objects_anchor_uq").on(t.userId, t.anchorId)],
);

/* ─────────────────────────────── Awards ─────────────────────────────── */

export const awardDefinitions = pgTable("award_definitions", {
  id: id(),
  title: jsonb("title").$type<{ tr: string; en: string }>().notNull(),
  description: jsonb("description").$type<{ tr: string; en: string }>().notNull(),
  category: text("category", { enum: ["milestone", "platform", "retro", "series", "curator", "verified"] }).notNull(),
  conditionType: text("condition_type").notNull(),
  conditionConfig: jsonb("condition_config").$type<Record<string, unknown>>().notNull().default({}),
  rarity: text("rarity", { enum: ["common", "rare", "epic", "legendary"] }).notNull(),
  material: text("material", { enum: ["bronze", "silver", "gold", "crystal", "obsidian"] }).notNull().default("gold"),
  modelAssetId: text("model_asset_id"),
  points: integer("points").notNull().default(10),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  version: integer("version").notNull().default(1),
  updatedAt: updatedAt(),
});

export const userAwards = pgTable(
  "user_awards",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    awardDefinitionId: text("award_definition_id").notNull().references(() => awardDefinitions.id),
    definitionVersion: integer("definition_version").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
    progressSnapshot: jsonb("progress_snapshot").$type<Record<string, unknown>>(),
    verificationLevel: text("verification_level", { enum: ["self-reported", "platform-verified"] })
      .notNull()
      .default("self-reported"),
    displayedInMuseum: boolean("displayed_in_museum").notNull().default(true),
    seenAt: timestamp("seen_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("user_awards_uq").on(t.userId, t.awardDefinitionId)],
);

/* ─────────────────────────────── Themes ─────────────────────────────── */

export type ThemeParams = {
  wall: string;
  wallRoughness: number;
  floor: string;
  floorRoughness: number;
  floorMetalness: number;
  trim: string;
  shelf: string;
  shelfMetalness: number;
  glass: string;
  ambient: number;
  ambientColor: string;
  keyLight: number;
  keyColor: string;
  ledColor: string;
  ledIntensity: number;
  fog: string;
  fogDensity: number;
  exposure: number;
  camera: { position: Vec3; target: Vec3 };
};

export const themes = pgTable("themes", {
  id: id(),
  name: jsonb("name").$type<{ tr: string; en: string }>().notNull(),
  description: jsonb("description").$type<{ tr: string; en: string }>().notNull(),
  params: jsonb("params").$type<ThemeParams>().notNull(),
  premiumSku: text("premium_sku"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  updatedAt: updatedAt(),
});

/* ─────────────────────────── Jobs, events, audit ─────────────────────────── */

export const importJobs = pgTable(
  "import_jobs",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["csv", "steam"] }).notNull(),
    status: text("status", { enum: ["pending", "running", "completed", "partial", "failed"] }).notNull(),
    total: integer("total").notNull().default(0),
    imported: integer("imported").notNull().default(0),
    skipped: integer("skipped").notNull().default(0),
    failed: integer("failed").notNull().default(0),
    report: jsonb("report").$type<{ row?: number; title?: string; reason: string }[]>().notNull().default([]),
    pendingMatches: jsonb("pending_matches")
      .$type<{ ref: string; title: string; candidates: { id: string; title: string; year?: string }[] }[]>()
      .notNull()
      .default([]),
    createdAt: createdAt(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("import_jobs_user_idx").on(t.userId, t.createdAt)],
);

export const activityEvents = pgTable(
  "activity_events",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("activity_user_type_idx").on(t.userId, t.type)],
);

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: id(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

export const errorLog = pgTable("error_log", {
  id: id(),
  scope: text("scope").notNull(),
  message: text("message").notNull(),
  detail: jsonb("detail").$type<Record<string, unknown>>(),
  createdAt: createdAt(),
});

/* ─────────────────────────────── Goals ─────────────────────────────── */

/** Personal completion targets: a series, a hand-picked list or a shelf size. Progress = owned / target. */
export const collectionGoals = pgTable(
  "collection_goals",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: text("type", { enum: ["series", "custom", "shelf"] }).notNull(),
    seriesName: text("series_name"),
    targetGameIds: jsonb("target_game_ids").$type<string[]>().notNull().default([]),
    generationId: text("generation_id"),
    targetCount: integer("target_count"),
    createdAt: createdAt(),
  },
  (t) => [index("goals_user_idx").on(t.userId)],
);

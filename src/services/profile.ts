import "server-only";
import { timingSafeEqual } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  activityEvents, collectionGoals, entitlements, importJobs, linkedAccounts, museumObjects, museumPlacements, museumShelves,
  themes, userAwards, userGames, users, catalogGames,
} from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { randomToken } from "@/lib/ids";
import type { Locale } from "@/i18n/config";
import { getMuseumSnapshot } from "./museum";
import { evaluateAwards } from "./awards";
import { recordEvent } from "./activity";

export async function updateProfile(userId: string, patch: { displayName?: string; bio?: string | null; collectionDescription?: string | null; locale?: Locale; avatarUrl?: string | null }) {
  const db = await getDb();
  const [before] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  await db.update(users).set({ ...patch, updatedAt: new Date() }).where(eq(users.id, userId));
  if (patch.collectionDescription && patch.collectionDescription.trim().length >= 20 && !before?.collectionDescription) {
    await recordEvent(userId, "description_written", {});
  }
  return evaluateAwards(userId);
}

export async function updatePrivacy(
  userId: string,
  input: { museumVisibility: "private" | "unlisted" | "public"; shareSettings: { platforms: string[]; showAwards: boolean; showFavorites: boolean; showStats: boolean }; rotateToken?: boolean },
) {
  const db = await getDb();
  await db
    .update(users)
    .set({
      museumVisibility: input.museumVisibility,
      shareSettings: input.shareSettings,
      ...(input.rotateToken ? { shareToken: randomToken(18) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  if (input.museumVisibility !== "private") await recordEvent(userId, "museum_shared", { visibility: input.museumVisibility });
  return evaluateAwards(userId);
}

function tokenMatches(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Public museum access. private → 404 for everyone but the owner; unlisted → needs the share key;
 * public → open. Hidden copies (isPublic=false), prices and notes never leave the server.
 */
export async function getPublicMuseum(username: string, key: string | null, viewerId: string | null, locale: Locale) {
  const db = await getDb();
  const [owner] = await db.select().from(users).where(eq(users.username, username.toLowerCase())).limit(1);
  if (!owner) throw new AppError("not_found", "Museum not found");
  const isOwner = viewerId === owner.id;
  const allowed =
    isOwner ||
    owner.museumVisibility === "public" ||
    (owner.museumVisibility === "unlisted" && !!key && tokenMatches(key, owner.shareToken));
  if (!allowed) throw new AppError("not_found", "Museum not found");
  const s = owner.shareSettings;
  const snap = await getMuseumSnapshot(owner.id, locale, { publicView: true, platforms: s.platforms });
  if (!s.showAwards) snap.awards = [];
  else snap.awards = snap.awards.filter((a) => a.earned?.displayed);
  if (!s.showStats) snap.stats = { ...snap.stats, completed: 0, latest: null, goalProgress: null };
  if (!s.showFavorites) for (const g of snap.galleries) for (const sh of g.shelves) for (const x of sh.games) x.isFavorite = false;
  return {
    snapshot: snap,
    profile: { username: owner.username, displayName: owner.displayName, avatarUrl: owner.avatarUrl, bio: owner.bio, collectionDescription: owner.collectionDescription, memberSince: owner.createdAt.toISOString() },
    isOwner,
  };
}

/** Full personal data export (KVKK/GDPR). Always free. */
export async function exportUserData(userId: string) {
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new AppError("not_found", "User not found");
  const { passwordHash: _p, shareToken: _s, ...profile } = user;
  const [copies, placements, shelves, awards, goals, objects, jobs, events, links, ents] = await Promise.all([
    db.select({ copy: userGames, title: catalogGames.title, igdbId: catalogGames.igdbId, dataSource: catalogGames.dataSource })
      .from(userGames).innerJoin(catalogGames, eq(catalogGames.id, userGames.catalogGameId)).where(eq(userGames.userId, userId)),
    db.select().from(museumPlacements).where(eq(museumPlacements.userId, userId)),
    db.select().from(museumShelves).where(eq(museumShelves.userId, userId)),
    db.select().from(userAwards).where(eq(userAwards.userId, userId)),
    db.select().from(collectionGoals).where(eq(collectionGoals.userId, userId)),
    db.select().from(museumObjects).where(eq(museumObjects.userId, userId)),
    db.select().from(importJobs).where(eq(importJobs.userId, userId)),
    db.select().from(activityEvents).where(eq(activityEvents.userId, userId)).orderBy(desc(activityEvents.createdAt)).limit(5000),
    db.select({ provider: linkedAccounts.provider, externalId: linkedAccounts.externalId, linkedAt: linkedAccounts.linkedAt }).from(linkedAccounts).where(eq(linkedAccounts.userId, userId)),
    db.select().from(entitlements).where(eq(entitlements.userId, userId)),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    profile,
    collection: copies.map((c) => ({ ...c.copy, title: c.title, igdbId: c.igdbId, catalogSource: c.dataSource })),
    placements, shelves, awards, goals, museumObjects: objects, importJobs: jobs, activity: events, linkedAccounts: links, entitlements: ents,
  };
}

const CSV_COLUMNS = ["title", "igdbId", "platform", "generationId", "ownershipType", "store", "edition", "region", "condition", "status", "isFavorite", "rating", "purchaseDate", "purchasePrice", "purchaseCurrency", "notes", "createdAt"] as const;

function csvCell(v: unknown) {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  // Neutralise spreadsheet formula injection.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function exportCollectionCsv(userId: string) {
  const data = await exportUserData(userId);
  const lines = [CSV_COLUMNS.join(",")];
  for (const c of data.collection) {
    const row: Record<(typeof CSV_COLUMNS)[number], unknown> = {
      title: c.title, igdbId: c.igdbId, platform: c.platformId, generationId: c.generationId, ownershipType: c.ownershipType, store: c.store,
      edition: c.edition, region: c.region, condition: c.condition, status: c.status, isFavorite: c.isFavorite, rating: c.rating,
      purchaseDate: c.purchaseDate, purchasePrice: c.purchasePrice, purchaseCurrency: c.purchaseCurrency, notes: c.notes, createdAt: c.createdAt,
    };
    lines.push(CSV_COLUMNS.map((k) => csvCell(row[k])).join(","));
  }
  return lines.join("\r\n");
}

/** Themes: free ones for everyone; premium ones only with a server-side entitlement. */
export async function applyTheme(userId: string, themeId: string) {
  const db = await getDb();
  const [theme] = await db.select().from(themes).where(and(eq(themes.id, themeId), eq(themes.active, true))).limit(1);
  if (!theme) throw new AppError("not_found", "Theme not found");
  if (theme.premiumSku) {
    const [ent] = await db.select().from(entitlements).where(and(eq(entitlements.userId, userId), eq(entitlements.sku, theme.premiumSku))).limit(1);
    const [u] = await db.select({ plan: users.plan }).from(users).where(eq(users.id, userId)).limit(1);
    if (!ent && u?.plan !== "premium") throw new AppError("premium_required", "This theme requires Premium");
  }
  await db.update(users).set({ activeThemeId: themeId, updatedAt: new Date() }).where(eq(users.id, userId));
  await recordEvent(userId, "theme_applied", { themeId });
  return evaluateAwards(userId);
}

export async function userEntitlements(userId: string) {
  const db = await getDb();
  const [u] = await db.select({ plan: users.plan }).from(users).where(eq(users.id, userId)).limit(1);
  const ents = await db.select({ sku: entitlements.sku }).from(entitlements).where(eq(entitlements.userId, userId));
  return { plan: u?.plan ?? "free", skus: ents.map((e) => e.sku) };
}

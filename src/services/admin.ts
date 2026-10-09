import "server-only";
import { count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  adminAuditLog, assetCatalog, assetVersions, awardDefinitions, entitlements, errorLog, generations, museumObjects, platforms, themes,
  userAwards, userGames, users,
} from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { isTrustedModelUrl } from "@/lib/storage";

export async function audit(actorId: string, action: string, targetType: string, targetId: string | null, payload: Record<string, unknown> = {}) {
  const db = await getDb();
  await db.insert(adminAuditLog).values({ id: newId("aud"), actorId, action, targetType, targetId, payload });
}

export async function adminOverview() {
  const db = await getDb();
  const [[u], [c], [a], [aw], audits, errors] = await Promise.all([
    db.select({ n: count() }).from(users),
    db.select({ n: count() }).from(userGames),
    db.select({ n: count() }).from(assetCatalog),
    db.select({ n: count() }).from(userAwards),
    db.select().from(adminAuditLog).orderBy(desc(adminAuditLog.createdAt)).limit(30),
    db.select().from(errorLog).orderBy(desc(errorLog.createdAt)).limit(30),
  ]);
  return { users: Number(u?.n ?? 0), copies: Number(c?.n ?? 0), assets: Number(a?.n ?? 0), awardsGranted: Number(aw?.n ?? 0), audits, errors };
}

/* ── Assets ── */

export type AssetInput = Partial<Omit<typeof assetCatalog.$inferInsert, "id" | "createdAt" | "updatedAt" | "version">>;

export async function listAssets() {
  const db = await getDb();
  const rows = await db.select().from(assetCatalog).orderBy(desc(assetCatalog.updatedAt));
  const usage = await db.select({ assetId: museumObjects.assetId, n: count() }).from(museumObjects).groupBy(museumObjects.assetId);
  const awardUse = await db.select({ id: awardDefinitions.id, assetId: awardDefinitions.modelAssetId }).from(awardDefinitions);
  return rows.map((r) => ({
    ...r,
    usage: {
      placedByUsers: Number(usage.find((u) => u.assetId === r.id)?.n ?? 0),
      awards: awardUse.filter((a) => a.assetId === r.id).map((a) => a.id),
      consoleSlot: r.category === "console" ? r.generationId ?? r.platformFamily : null,
    },
  }));
}

export async function createAsset(actorId: string, input: AssetInput & { name: string; category: (typeof assetCatalog.$inferInsert)["category"] }) {
  if (input.modelUrl && !isTrustedModelUrl(input.modelUrl)) throw new AppError("invalid", "Untrusted model URL");
  const db = await getDb();
  const id = newId("ast");
  const [row] = await db.insert(assetCatalog).values({ ...input, id, status: input.modelUrl ? (input.status ?? "draft") : "draft" }).returning();
  if (input.modelUrl) await db.insert(assetVersions).values({ id: newId("asv"), assetId: id, version: 1, modelUrl: input.modelUrl, analysis: input.analysis ?? null, createdBy: actorId });
  await audit(actorId, "asset.create", "asset", id, { name: input.name, category: input.category });
  return row!;
}

/** Updating metadata keeps user placements intact (they reference the asset id, not the file). */
export async function updateAsset(actorId: string, id: string, patch: AssetInput) {
  const db = await getDb();
  const [cur] = await db.select().from(assetCatalog).where(eq(assetCatalog.id, id)).limit(1);
  if (!cur) throw new AppError("not_found", "Asset not found");
  let version = cur.version;
  if (patch.modelUrl && patch.modelUrl !== cur.modelUrl) {
    if (!isTrustedModelUrl(patch.modelUrl)) throw new AppError("invalid", "Untrusted model URL");
    version = cur.version + 1;
    await db.insert(assetVersions).values({ id: newId("asv"), assetId: id, version, modelUrl: patch.modelUrl, analysis: patch.analysis ?? null, createdBy: actorId });
  }
  if (patch.status === "ready" && !(patch.modelUrl ?? cur.modelUrl)) throw new AppError("invalid", "Upload a model before activating");
  const [row] = await db.update(assetCatalog).set({ ...patch, version, updatedAt: new Date() }).where(eq(assetCatalog.id, id)).returning();
  await audit(actorId, "asset.update", "asset", id, { fields: Object.keys(patch), version });
  return row!;
}

export async function assetHistory(id: string) {
  const db = await getDb();
  return db.select().from(assetVersions).where(eq(assetVersions.assetId, id)).orderBy(desc(assetVersions.version));
}

export async function rollbackAsset(actorId: string, id: string, toVersion: number) {
  const db = await getDb();
  const [v] = await db.select().from(assetVersions).where(sql`${assetVersions.assetId} = ${id} and ${assetVersions.version} = ${toVersion}`).limit(1);
  if (!v) throw new AppError("not_found", "Version not found");
  const [cur] = await db.select().from(assetCatalog).where(eq(assetCatalog.id, id)).limit(1);
  if (!cur) throw new AppError("not_found", "Asset not found");
  const version = cur.version + 1;
  await db.insert(assetVersions).values({ id: newId("asv"), assetId: id, version, modelUrl: v.modelUrl, analysis: v.analysis, createdBy: actorId });
  const [row] = await db.update(assetCatalog).set({ modelUrl: v.modelUrl, analysis: v.analysis as typeof cur.analysis, version, updatedAt: new Date() }).where(eq(assetCatalog.id, id)).returning();
  await audit(actorId, "asset.rollback", "asset", id, { toVersion, newVersion: version });
  return row!;
}

/** Disabling instead of deleting keeps references valid; the scene shows a fallback for disabled assets. */
export async function disableAsset(actorId: string, id: string) {
  return updateAsset(actorId, id, { status: "disabled" });
}

/* ── Awards ── */

export type AwardInput = Omit<typeof awardDefinitions.$inferInsert, "version" | "updatedAt">;

export async function listAwardDefinitions() {
  const db = await getDb();
  const defs = await db.select().from(awardDefinitions).orderBy(awardDefinitions.sortOrder);
  const counts = await db.select({ id: userAwards.awardDefinitionId, n: count() }).from(userAwards).groupBy(userAwards.awardDefinitionId);
  return defs.map((d) => ({ ...d, granted: Number(counts.find((c) => c.id === d.id)?.n ?? 0) }));
}

export async function upsertAward(actorId: string, input: AwardInput) {
  const db = await getDb();
  const [cur] = await db.select().from(awardDefinitions).where(eq(awardDefinitions.id, input.id)).limit(1);
  if (!cur) {
    const [row] = await db.insert(awardDefinitions).values({ ...input, version: 1 }).returning();
    await audit(actorId, "award.create", "award", input.id, {});
    return row!;
  }
  // Changing the rule bumps the version; already granted awards keep the version they were earned under.
  const ruleChanged = cur.conditionType !== input.conditionType || JSON.stringify(cur.conditionConfig) !== JSON.stringify(input.conditionConfig);
  const [row] = await db
    .update(awardDefinitions)
    .set({ ...input, version: ruleChanged ? cur.version + 1 : cur.version, updatedAt: new Date() })
    .where(eq(awardDefinitions.id, input.id))
    .returning();
  await audit(actorId, "award.update", "award", input.id, { ruleChanged });
  return row!;
}

/* ── Themes ── */

export async function listThemes() {
  const db = await getDb();
  return db.select().from(themes).orderBy(themes.sortOrder);
}

export async function upsertTheme(actorId: string, input: typeof themes.$inferInsert) {
  const db = await getDb();
  const [row] = await db
    .insert(themes)
    .values(input)
    .onConflictDoUpdate({ target: themes.id, set: { ...input, updatedAt: new Date() } })
    .returning();
  await audit(actorId, "theme.upsert", "theme", input.id, {});
  return row!;
}

/* ── Platforms & generations ── */

export async function listPlatformsAndGenerations() {
  const db = await getDb();
  const [p, g] = await Promise.all([db.select().from(platforms).orderBy(platforms.sortOrder), db.select().from(generations).orderBy(generations.platformId, generations.sortOrder)]);
  return { platforms: p, generations: g };
}

export async function upsertPlatform(actorId: string, input: typeof platforms.$inferInsert) {
  const db = await getDb();
  await db.insert(platforms).values(input).onConflictDoUpdate({ target: platforms.id, set: input });
  await audit(actorId, "platform.upsert", "platform", input.id, {});
}

export async function upsertGeneration(actorId: string, input: typeof generations.$inferInsert) {
  const db = await getDb();
  await db.insert(generations).values(input).onConflictDoUpdate({ target: generations.id, set: input });
  await audit(actorId, "generation.upsert", "generation", input.id, {});
}

/* ── Entitlements (premium) — only admins or a verified payment webhook may grant ── */

export async function grantEntitlement(actorId: string, email: string, sku: string) {
  const db = await getDb();
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!u) throw new AppError("not_found", "User not found");
  await db.insert(entitlements).values({ userId: u.id, sku, source: "admin-grant", grantedBy: actorId }).onConflictDoNothing();
  await audit(actorId, "entitlement.grant", "user", u.id, { sku });
}

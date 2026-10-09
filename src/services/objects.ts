import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { assetCatalog, museumObjects, users, entitlements } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { anchorById } from "@/features/museum/anchors";
import { recordEvent } from "./activity";
import { evaluateAwards } from "./awards";

/** Places a ready asset into a named anchor (one object per anchor). Enforces category, unlock and premium rules. */
export async function placeObject(userId: string, anchorId: string, assetId: string, rotationY = 0) {
  const anchor = anchorById(anchorId);
  if (!anchor) throw new AppError("invalid", "Unknown placement slot");
  const db = await getDb();
  const [asset] = await db.select().from(assetCatalog).where(eq(assetCatalog.id, assetId)).limit(1);
  if (!asset || asset.status !== "ready") throw new AppError("invalid", "Asset is not available");
  if (!anchor.accepts.includes(asset.category)) throw new AppError("invalid", "This object does not fit that slot");
  if (anchor.premium || asset.premiumSku) {
    const [u] = await db.select({ plan: users.plan }).from(users).where(eq(users.id, userId)).limit(1);
    const sku = asset.premiumSku ?? "slot.premium";
    const [ent] = await db.select().from(entitlements).where(and(eq(entitlements.userId, userId), eq(entitlements.sku, sku))).limit(1);
    if (u?.plan !== "premium" && !ent) throw new AppError("premium_required", "Premium required");
  }
  if (asset.isUnlockable && asset.unlockRuleId) {
    const { userAwards } = await import("@/lib/db/schema");
    const [ok] = await db.select().from(userAwards).where(and(eq(userAwards.userId, userId), eq(userAwards.awardDefinitionId, asset.unlockRuleId))).limit(1);
    if (!ok) throw new AppError("forbidden", "Unlock this object by earning its award first");
  }
  await db
    .insert(museumObjects)
    .values({ id: newId("obj"), userId, anchorId, assetId, rotationY })
    .onConflictDoUpdate({ target: [museumObjects.userId, museumObjects.anchorId], set: { assetId, rotationY } });
  await recordEvent(userId, "showcase_created", { anchorId, assetId });
  return evaluateAwards(userId);
}

export async function removeObject(userId: string, anchorId: string) {
  const db = await getDb();
  await db.delete(museumObjects).where(and(eq(museumObjects.userId, userId), eq(museumObjects.anchorId, anchorId)));
}

export async function placeableAssets() {
  const db = await getDb();
  return db.select().from(assetCatalog).where(eq(assetCatalog.status, "ready"));
}

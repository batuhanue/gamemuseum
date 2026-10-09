import { z } from "zod";
import { route, json, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { placeObject, placeableAssets, removeObject } from "@/services/objects";
import { toAssetRef } from "@/services/museum";

export const GET = route(async () => {
  await requireUser();
  const assets = await placeableAssets();
  return json({ assets: assets.map((a) => ({ ...toAssetRef(a), thumbnailUrl: a.thumbnailUrl, premiumSku: a.premiumSku, isUnlockable: a.isUnlockable, unlockRuleId: a.unlockRuleId })) });
});

export const PUT = route(async (req) => {
  const user = await requireUser();
  const b = await parseBody(req, z.object({ anchorId: z.string(), assetId: z.string(), rotationY: z.number().min(-Math.PI * 2).max(Math.PI * 2).default(0) }));
  return json({ ok: true, unlocked: await placeObject(user.id, b.anchorId, b.assetId, b.rotationY) });
});

export const DELETE = route(async (req) => {
  const user = await requireUser();
  const b = await parseBody(req, z.object({ anchorId: z.string() }));
  await removeObject(user.id, b.anchorId);
  return json({ ok: true });
});

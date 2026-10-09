import { route, json, parseBody } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/session";
import { assetHistory, updateAsset } from "@/services/admin";
import { verifyRemoteModel } from "@/lib/storage";
import { assetSchema } from "../schema";

type P = { id: string };

export const GET = route<P>(async (_req, { params }) => {
  await requireAdmin();
  return json({ history: await assetHistory((await params).id) });
});

export const PATCH = route<P>(async (req, { params }) => {
  const admin = await requireAdmin();
  const patch = await parseBody(req, assetSchema.partial());
  if (patch.modelUrl) await verifyRemoteModel(patch.modelUrl);
  return json({ asset: await updateAsset(admin.id, (await params).id, patch) });
});

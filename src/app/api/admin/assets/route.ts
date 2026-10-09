import { route, json, parseBody } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/session";
import { createAsset, listAssets } from "@/services/admin";
import { verifyRemoteModel, blobConfigured, localUploadsAllowed } from "@/lib/storage";
import { assetSchema } from "./schema";

export const GET = route(async () => {
  await requireAdmin();
  return json({ assets: await listAssets(), storage: blobConfigured() ? "blob" : localUploadsAllowed() ? "local" : "none" });
});

export const POST = route(async (req) => {
  const admin = await requireAdmin();
  const input = await parseBody(req, assetSchema);
  if (input.modelUrl) await verifyRemoteModel(input.modelUrl);
  return json({ asset: await createAsset(admin.id, input) }, { status: 201 });
});

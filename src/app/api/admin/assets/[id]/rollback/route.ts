import { z } from "zod";
import { route, json, parseBody } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/session";
import { rollbackAsset } from "@/services/admin";

export const POST = route<{ id: string }>(async (req, { params }) => {
  const admin = await requireAdmin();
  const { version } = await parseBody(req, z.object({ version: z.number().int().positive() }));
  return json({ asset: await rollbackAsset(admin.id, (await params).id, version) });
});

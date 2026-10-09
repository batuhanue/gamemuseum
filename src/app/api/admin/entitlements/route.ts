import { z } from "zod";
import { route, json, parseBody } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/session";
import { grantEntitlement } from "@/services/admin";

export const POST = route(async (req) => {
  const admin = await requireAdmin();
  const b = await parseBody(req, z.object({ email: z.string().email(), sku: z.string().regex(/^[a-z0-9.-]{3,80}$/) }));
  await grantEntitlement(admin.id, b.email, b.sku);
  return json({ ok: true });
});

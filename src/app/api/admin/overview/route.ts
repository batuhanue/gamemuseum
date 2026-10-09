import { route, json } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/session";
import { adminOverview } from "@/services/admin";

export const GET = route(async () => {
  await requireAdmin();
  return json(await adminOverview());
});

import { route, json } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth/session";
import { getPublicMuseum } from "@/services/profile";
import { resolveLocale } from "@/i18n/request";

export const GET = route<{ username: string }>(async (req, { params }) => {
  const viewer = await getCurrentUser();
  const res = await getPublicMuseum((await params).username, req.nextUrl.searchParams.get("key"), viewer?.id ?? null, await resolveLocale());
  return json(res, { headers: { "Cache-Control": "private, no-store" } });
});

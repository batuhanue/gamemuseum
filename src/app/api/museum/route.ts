import { route, json } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth/session";
import { getMuseumSnapshot } from "@/services/museum";
import { getDemoSnapshot } from "@/services/demo";
import { resolveLocale } from "@/i18n/request";

export const GET = route(async () => {
  const user = await getCurrentUser();
  const locale = await resolveLocale();
  return json({ snapshot: user ? await getMuseumSnapshot(user.id, locale) : await getDemoSnapshot(locale) });
});

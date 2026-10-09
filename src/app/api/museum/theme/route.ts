import { z } from "zod";
import { route, json, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { applyTheme, userEntitlements } from "@/services/profile";
import { listThemes } from "@/services/admin";

export const GET = route(async () => {
  const user = await requireUser();
  const [themes, ent] = await Promise.all([listThemes(), userEntitlements(user.id)]);
  return json({
    activeThemeId: user.activeThemeId,
    themes: themes.filter((t) => t.active).map((t) => ({ ...t, owned: !t.premiumSku || ent.plan === "premium" || ent.skus.includes(t.premiumSku) })),
  });
});

export const PUT = route(async (req) => {
  const user = await requireUser();
  const { themeId } = await parseBody(req, z.object({ themeId: z.string() }));
  return json({ ok: true, unlocked: await applyTheme(user.id, themeId) });
});

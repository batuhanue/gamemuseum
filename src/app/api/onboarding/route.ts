import { z } from "zod";
import { eq } from "drizzle-orm";
import { route, json, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { applyTheme } from "@/services/profile";

const schema = z.object({
  step: z.enum(["platforms", "theme", "complete"]),
  platforms: z.array(z.enum(["xbox", "playstation", "pc"])).optional(),
  themeId: z.string().optional(),
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, schema);
  const db = await getDb();
  if (body.step === "platforms") await db.update(users).set({ selectedPlatforms: body.platforms ?? [] }).where(eq(users.id, user.id));
  if (body.step === "theme" && body.themeId) return json({ ok: true, unlocked: await applyTheme(user.id, body.themeId) });
  if (body.step === "complete") await db.update(users).set({ onboardingCompletedAt: new Date() }).where(eq(users.id, user.id));
  return json({ ok: true, unlocked: [] });
});

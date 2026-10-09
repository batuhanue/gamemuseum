import { z } from "zod";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { route, json, parseBody } from "@/lib/http";
import { LOCALE_COOKIE } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export const POST = route(async (req) => {
  const { locale } = await parseBody(req, z.object({ locale: z.enum(["tr", "en"]) }));
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 365 * 864e2, sameSite: "lax" });
  const user = await getCurrentUser();
  if (user) await (await getDb()).update(users).set({ locale }).where(eq(users.id, user.id));
  return json({ ok: true });
});

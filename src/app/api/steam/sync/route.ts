import { and, eq } from "drizzle-orm";
import { route, json } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { syncSteam } from "@/services/imports";
import { rateLimit } from "@/lib/security/rate-limit";
import { getDb } from "@/lib/db/client";
import { linkedAccounts } from "@/lib/db/schema";
import { steamConfigured } from "@/lib/steam/api";
import { igdbConfigured } from "@/lib/igdb/token";

export const maxDuration = 300;

export const GET = route(async () => {
  const user = await requireUser();
  const db = await getDb();
  const [link] = await db.select().from(linkedAccounts).where(and(eq(linkedAccounts.userId, user.id), eq(linkedAccounts.provider, "steam"))).limit(1);
  return json({ linked: link ? { steamId: link.externalId, linkedAt: link.linkedAt } : null, steamConfigured: steamConfigured(), igdbConfigured: igdbConfigured() });
});

export const POST = route(async () => {
  const user = await requireUser();
  rateLimit(`steam-sync:${user.id}`, 2, 1 / 120);
  return json({ job: await syncSteam(user.id) });
});

export const DELETE = route(async () => {
  const user = await requireUser();
  const db = await getDb();
  await db.delete(linkedAccounts).where(and(eq(linkedAccounts.userId, user.id), eq(linkedAccounts.provider, "steam")));
  return json({ ok: true });
});

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { verifySteamAssertion } from "@/lib/steam/openid";
import { appUrl } from "@/lib/email";
import { getDb } from "@/lib/db/client";
import { linkedAccounts } from "@/lib/db/schema";
import { logError } from "@/lib/log";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const jar = await cookies();
  const state = req.nextUrl.searchParams.get("state");
  const saved = jar.get("gm_steam_state")?.value;
  jar.delete("gm_steam_state");
  const back = (q: string) => NextResponse.redirect(new URL(`/collection/import?steam=${q}`, req.url));
  if (!user || !state || state !== saved) return back("state");
  try {
    const steamId = await verifySteamAssertion(req.nextUrl.searchParams, appUrl(`/api/steam/callback?state=${state}`));
    if (!steamId) return back("invalid");
    const db = await getDb();
    await db
      .insert(linkedAccounts)
      .values({ userId: user.id, provider: "steam", externalId: steamId })
      .onConflictDoUpdate({ target: [linkedAccounts.userId, linkedAccounts.provider], set: { externalId: steamId, linkedAt: new Date() } });
    return back("linked");
  } catch (e) {
    await logError("steam.callback", e);
    return back("error");
  }
}

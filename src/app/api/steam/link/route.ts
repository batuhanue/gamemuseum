import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { steamLoginUrl } from "@/lib/steam/openid";
import { appUrl } from "@/lib/email";
import { randomToken } from "@/lib/ids";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/collection/import", req.url));
  const state = randomToken(16);
  (await cookies()).set("gm_steam_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
  return NextResponse.redirect(steamLoginUrl(appUrl(`/api/steam/callback?state=${state}`), appUrl("/")));
}

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { decodeIdToken } from "arctic";
import { googleClient, googleConfigured } from "@/lib/auth/google";
import { upsertOAuthUser } from "@/services/users";
import { createSession } from "@/lib/auth/session";
import { logError } from "@/lib/log";

export async function GET(req: NextRequest) {
  const jar = await cookies();
  const state = req.nextUrl.searchParams.get("state");
  const code = req.nextUrl.searchParams.get("code");
  const saved = jar.get("gm_g_state")?.value;
  const verifier = jar.get("gm_g_verifier")?.value;
  jar.delete("gm_g_state");
  jar.delete("gm_g_verifier");
  if (!googleConfigured() || !state || !code || !saved || !verifier || state !== saved) {
    return NextResponse.redirect(new URL("/login?error=google_state", req.url));
  }
  try {
    const tokens = await googleClient().validateAuthorizationCode(code, verifier);
    const claims = decodeIdToken(tokens.idToken()) as { sub: string; email?: string; email_verified?: boolean; name?: string; picture?: string };
    if (!claims.email || !claims.email_verified) return NextResponse.redirect(new URL("/login?error=google_email", req.url));
    const userId = await upsertOAuthUser("google", claims.sub, claims.email, claims.name ?? "", claims.picture);
    await createSession(userId);
    return NextResponse.redirect(new URL("/museum", req.url));
  } catch (e) {
    await logError("auth.google", e);
    return NextResponse.redirect(new URL("/login?error=google_failed", req.url));
  }
}

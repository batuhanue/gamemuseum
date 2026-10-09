import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateCodeVerifier, generateState } from "arctic";
import { googleClient, googleConfigured } from "@/lib/auth/google";

export async function GET(req: Request) {
  if (!googleConfigured()) return NextResponse.redirect(new URL("/login?error=google_unavailable", req.url));
  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = googleClient().createAuthorizationURL(state, verifier, ["openid", "profile", "email"]);
  const jar = await cookies();
  const opts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };
  jar.set("gm_g_state", state, opts);
  jar.set("gm_g_verifier", verifier, opts);
  return NextResponse.redirect(url);
}

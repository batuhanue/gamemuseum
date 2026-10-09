import { NextResponse, type NextRequest } from "next/server";
import { verifyEmail } from "@/services/users";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  try {
    await verifyEmail(token);
    return NextResponse.redirect(new URL("/settings?verified=1", req.url));
  } catch {
    return NextResponse.redirect(new URL("/settings?verified=0", req.url));
  }
}

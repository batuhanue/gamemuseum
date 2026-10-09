import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AppError } from "./errors";
import { logError } from "./log";

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function errorResponse(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json({ error: { code: err.code, message: err.message, details: err.details } }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "invalid", message: "Invalid input", details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) } },
      { status: 400 },
    );
  }
  void logError("api", err);
  return NextResponse.json({ error: { code: "internal", message: "Unexpected server error" } }, { status: 500 });
}

/** Rejects cross-site mutating requests (cookie auth CSRF guard). */
export function assertSameOrigin(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin");
  if (!origin) return; // same-origin fetch from older browsers / server-to-server
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw new AppError("forbidden", "Cross-origin request blocked");
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError("forbidden", "Invalid origin");
  }
}

type Ctx<P> = { params: Promise<P> };

/** Wraps a route handler with origin checks and uniform error responses. */
export function route<P = Record<string, string>>(handler: (req: NextRequest, ctx: Ctx<P>) => Promise<Response>) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export async function parseBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new AppError("invalid", "Body must be JSON");
  }
  return schema.parse(raw);
}

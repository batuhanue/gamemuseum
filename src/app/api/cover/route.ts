import { NextResponse, type NextRequest } from "next/server";

/**
 * Same-origin proxy for IGDB images so WebGL can use them as textures without CORS issues.
 * Strictly limited to images.igdb.com; responses are cached by the CDN.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("u") ?? "";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return new NextResponse("bad url", { status: 400 });
  }
  if (url.protocol !== "https:" || url.hostname !== "images.igdb.com" || !/^\/igdb\/image\/upload\/t_[a-z0-9_]+\/[a-z0-9]+\.(jpg|png|webp)$/i.test(url.pathname)) {
    return new NextResponse("forbidden", { status: 403 });
  }
  const upstream = await fetch(url, { signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!upstream?.ok) return new NextResponse("upstream error", { status: 502 });
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, s-maxage=2592000, immutable",
    },
  });
}

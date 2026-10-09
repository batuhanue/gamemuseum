import { route, json } from "@/lib/http";
import { searchCatalog } from "@/services/catalog";
import { getCurrentUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { toCatalogDto } from "@/features/games/dto";

export const GET = route(async (req) => {
  const sp = req.nextUrl.searchParams;
  const user = await getCurrentUser();
  rateLimit(`search:${user?.id ?? req.headers.get("x-forwarded-for") ?? "anon"}`, 20, 4);
  const res = await searchCatalog(sp.get("q") ?? "", {
    platform: sp.get("platform") ? Number(sp.get("platform")) : undefined,
    page: Number(sp.get("page") ?? 0) || 0,
    userId: user?.id,
  });
  return json({ source: res.source, hasMore: res.hasMore, games: res.games.map(toCatalogDto) });
});

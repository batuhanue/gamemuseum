import { route, json } from "@/lib/http";
import { getCatalogGame } from "@/services/catalog";
import { getCurrentUser } from "@/lib/auth/session";
import { toCatalogDto } from "@/features/games/dto";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  const user = await getCurrentUser();
  return json({ game: toCatalogDto(await getCatalogGame(id, user?.id)) });
});

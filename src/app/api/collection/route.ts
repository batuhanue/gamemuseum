import { route, json, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { addGameSchema } from "@/lib/validation/schemas";
import { addGameToCollection, listCollection } from "@/services/collection";

export const GET = route(async () => {
  const user = await requireUser();
  const rows = await listCollection(user.id);
  return json({
    items: rows.map((r) => ({
      ...r.copy,
      game: { id: r.game.id, title: r.game.title, coverUrl: r.game.coverUrl, releaseDate: r.game.releaseDate, dataSource: r.game.dataSource, series: r.game.series },
      placement: r.placement ? { shelfIndex: r.placement.shelfIndex, slotIndex: r.placement.slotIndex, sortIndex: r.placement.sortIndex } : null,
    })),
  });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = await parseBody(req, addGameSchema);
  const res = await addGameToCollection(user.id, input);
  return json({ copy: res!.copy, placement: res!.placement, unlocked: res!.unlocked }, { status: 201 });
});

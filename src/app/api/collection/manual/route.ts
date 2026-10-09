import { z } from "zod";
import { route, json, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { createManualGame } from "@/services/catalog";
import { toCatalogDto } from "@/features/games/dto";
import { SUPPORTED_IGDB_PLATFORMS } from "@/features/platforms/reference";

export const POST = route(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, z.object({
    title: z.string().trim().min(1).max(200),
    year: z.number().int().min(1970).max(2100).optional(),
    platformIds: z.array(z.number().int().refine((p) => SUPPORTED_IGDB_PLATFORMS.includes(p))).max(12).default([]),
  }));
  return json({ game: toCatalogDto(await createManualGame(user.id, body)) }, { status: 201 });
});

import { z } from "zod";
import { route, json, parseBody } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/session";
import { listAwardDefinitions, upsertAward } from "@/services/admin";

const loc = z.object({ tr: z.string().min(1).max(200), en: z.string().min(1).max(200) });
const schema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,60}$/),
  title: loc,
  description: loc,
  category: z.enum(["milestone", "platform", "retro", "series", "curator", "verified"]),
  conditionType: z.enum(["total_games", "platform_games", "generation_games", "retro_generations", "retro_shelf_full", "series_count", "goal_completed", "completed_games", "event"]),
  conditionConfig: z.record(z.string(), z.unknown()),
  rarity: z.enum(["common", "rare", "epic", "legendary"]),
  material: z.enum(["bronze", "silver", "gold", "crystal", "obsidian"]),
  modelAssetId: z.string().nullable().optional(),
  points: z.number().int().min(0).max(1000),
  sortOrder: z.number().int(),
  active: z.boolean(),
});

export const GET = route(async () => {
  await requireAdmin();
  return json({ awards: await listAwardDefinitions() });
});

export const PUT = route(async (req) => {
  const admin = await requireAdmin();
  return json({ award: await upsertAward(admin.id, await parseBody(req, schema)) });
});

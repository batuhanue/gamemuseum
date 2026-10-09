import { z } from "zod";
import { route, json, parseBody } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/session";
import { listThemes, upsertTheme } from "@/services/admin";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const unit = z.number().min(0).max(1);
const vec3 = z.tuple([z.number(), z.number(), z.number()]);
const params = z.object({
  wall: color, wallRoughness: unit, floor: color, floorRoughness: unit, floorMetalness: unit, trim: color, shelf: color, shelfMetalness: unit,
  glass: color, ambient: z.number().min(0).max(3), ambientColor: color, keyLight: z.number().min(0).max(5), keyColor: color, ledColor: color,
  ledIntensity: z.number().min(0).max(5), fog: color, fogDensity: z.number().min(0).max(0.2), exposure: z.number().min(0.2).max(3),
  camera: z.object({ position: vec3, target: vec3 }),
});
const loc = z.object({ tr: z.string().min(1).max(120), en: z.string().min(1).max(120) });

export const GET = route(async () => {
  await requireAdmin();
  return json({ themes: await listThemes() });
});

export const PUT = route(async (req) => {
  const admin = await requireAdmin();
  const body = await parseBody(req, z.object({ id: z.string().regex(/^[a-z0-9-]{2,60}$/), name: loc, description: loc, params, premiumSku: z.string().max(80).nullable(), sortOrder: z.number().int(), active: z.boolean() }));
  return json({ theme: await upsertTheme(admin.id, body) });
});

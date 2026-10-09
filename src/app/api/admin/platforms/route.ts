import { z } from "zod";
import { route, json, parseBody } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/session";
import { listPlatformsAndGenerations, upsertGeneration, upsertPlatform } from "@/services/admin";

const platform = z.object({ id: z.string().regex(/^[a-z0-9-]{2,40}$/), name: z.string().min(1).max(60), accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), tagline: z.string().max(120).nullable(), sortOrder: z.number().int(), active: z.boolean() });
const generation = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,40}$/), platformId: z.string(), name: z.string().min(1).max(60), shortName: z.string().min(1).max(20),
  kind: z.enum(["console", "store"]), yearStart: z.number().int().nullable(), yearEnd: z.number().int().nullable(),
  caseProfile: z.enum(["jewel-case", "dvd-black", "dvd-xbox", "dvd-x360", "bluray-ps3", "bluray-ps4", "bluray-ps5", "bluray-xone", "bluray-xseries", "pc-digital", "pc-bigbox"]),
  igdbPlatformIds: z.array(z.number().int()), isRetro: z.boolean(), shelfCapacity: z.number().int().min(1).max(20), sortOrder: z.number().int(), active: z.boolean(),
});

export const GET = route(async () => {
  await requireAdmin();
  return json(await listPlatformsAndGenerations());
});

export const PUT = route(async (req) => {
  const admin = await requireAdmin();
  const body = await parseBody(req, z.discriminatedUnion("type", [z.object({ type: z.literal("platform"), data: platform }), z.object({ type: z.literal("generation"), data: generation })]));
  if (body.type === "platform") await upsertPlatform(admin.id, body.data);
  else await upsertGeneration(admin.id, body.data);
  return json({ ok: true });
});

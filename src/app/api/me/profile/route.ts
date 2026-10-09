import { z } from "zod";
import { route, json, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { updateProfile } from "@/services/profile";

const schema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  collectionDescription: z.string().trim().max(2000).nullable().optional(),
  locale: z.enum(["tr", "en"]).optional(),
  avatarUrl: z.string().url().max(500).refine((u) => u.startsWith("https://"), "https only").nullable().optional(),
});

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const unlocked = await updateProfile(user.id, await parseBody(req, schema));
  return json({ ok: true, unlocked });
});

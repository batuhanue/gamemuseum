import { z } from "zod";
import { route, json, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { updatePrivacy } from "@/services/profile";

const schema = z.object({
  museumVisibility: z.enum(["private", "unlisted", "public"]),
  shareSettings: z.object({
    platforms: z.array(z.enum(["xbox", "playstation", "pc"])),
    showAwards: z.boolean(),
    showFavorites: z.boolean(),
    showStats: z.boolean(),
  }),
  rotateToken: z.boolean().optional(),
});

export const PUT = route(async (req) => {
  const user = await requireUser();
  const unlocked = await updatePrivacy(user.id, await parseBody(req, schema));
  return json({ ok: true, unlocked });
});

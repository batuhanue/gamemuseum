import { z } from "zod";
import { route, json, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { setAwardDisplayed } from "@/services/awards";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUser();
  const { displayed } = await parseBody(req, z.object({ displayed: z.boolean() }));
  const unlocked = await setAwardDisplayed(user.id, (await params).id, displayed);
  return json({ ok: true, unlocked });
});

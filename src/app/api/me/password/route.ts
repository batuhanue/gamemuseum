import { z } from "zod";
import { route, json, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { changePassword } from "@/services/users";
import { passwordSchema } from "@/lib/validation/schemas";

export const POST = route(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, z.object({ current: z.string().optional(), next: passwordSchema }));
  await changePassword(user.id, body.current, body.next);
  return json({ ok: true });
});

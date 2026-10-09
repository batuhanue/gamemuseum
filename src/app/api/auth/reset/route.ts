import { z } from "zod";
import { route, parseBody, json } from "@/lib/http";
import { passwordSchema } from "@/lib/validation/schemas";
import { resetPassword } from "@/services/users";
import { createSession, destroyAllSessions } from "@/lib/auth/session";

export const POST = route(async (req) => {
  const { token, password } = await parseBody(req, z.object({ token: z.string().min(10), password: passwordSchema }));
  const userId = await resetPassword(token, password);
  await destroyAllSessions(userId);
  await createSession(userId);
  return json({ ok: true });
});

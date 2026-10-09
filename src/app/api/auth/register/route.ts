import { route, parseBody, json } from "@/lib/http";
import { registerSchema } from "@/lib/validation/schemas";
import { registerUser } from "@/services/users";
import { createSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { resolveLocale } from "@/i18n/request";

export const POST = route(async (req) => {
  rateLimit(`register:${req.headers.get("x-forwarded-for") ?? "local"}`, 5, 0.05);
  const input = await parseBody(req, registerSchema);
  const { id, mail } = await registerUser({ ...input, locale: await resolveLocale() });
  await createSession(id);
  return json({ ok: true, verificationMail: mail.channel }, { status: 201 });
});

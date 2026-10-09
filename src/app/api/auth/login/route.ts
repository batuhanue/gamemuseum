import { route, parseBody, json } from "@/lib/http";
import { loginSchema } from "@/lib/validation/schemas";
import { authenticate } from "@/services/users";
import { createSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rate-limit";

export const POST = route(async (req) => {
  const input = await parseBody(req, loginSchema);
  rateLimit(`login:${input.email}`, 8, 0.1);
  const user = await authenticate(input.email, input.password);
  await createSession(user.id);
  return json({ ok: true, onboarded: !!user.onboardingCompletedAt });
});

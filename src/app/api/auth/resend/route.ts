import { route, json } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { sendVerificationEmail } from "@/services/users";
import { rateLimit } from "@/lib/security/rate-limit";

export const POST = route(async () => {
  const user = await requireUser();
  rateLimit(`verify:${user.id}`, 3, 0.005);
  const mail = await sendVerificationEmail(user.id, user.email);
  return json({ ok: true, channel: mail.channel });
});

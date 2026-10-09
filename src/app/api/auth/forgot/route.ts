import { z } from "zod";
import { route, parseBody, json } from "@/lib/http";
import { requestPasswordReset } from "@/services/users";
import { rateLimit } from "@/lib/security/rate-limit";

export const POST = route(async (req) => {
  const { email } = await parseBody(req, z.object({ email: z.string().trim().toLowerCase().email() }));
  rateLimit(`forgot:${email}`, 3, 0.01);
  const res = await requestPasswordReset(email);
  // Same answer whether or not the address exists; mail channel tells the UI if e-mail is configured at all.
  return json({ ok: true, mailConfigured: !!process.env.RESEND_API_KEY, devLog: res?.channel === "dev-log" });
});

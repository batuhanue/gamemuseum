import { route, json } from "@/lib/http";
import { getCurrentUser, requireUser, destroySession } from "@/lib/auth/session";
import { deleteAccount } from "@/services/users";
import { parseBody } from "@/lib/http";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import { AppError } from "@/lib/errors";

export const GET = route(async () => {
  const u = await getCurrentUser();
  if (!u) return json({ user: null });
  const { passwordHash: _p, shareToken, ...rest } = u;
  return json({ user: { ...rest, hasPassword: !!_p, shareToken } });
});

/** Account deletion: requires typing the username (and password when one is set). Cascades all user data. */
export const DELETE = route(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, z.object({ confirmUsername: z.string(), password: z.string().optional() }));
  if (body.confirmUsername.toLowerCase() !== user.username) throw new AppError("invalid", "Username confirmation does not match");
  if (user.passwordHash && !(body.password && (await verifyPassword(body.password, user.passwordHash)))) throw new AppError("unauthorized", "Password is incorrect");
  await deleteAccount(user.id);
  await destroySession();
  return json({ ok: true });
});

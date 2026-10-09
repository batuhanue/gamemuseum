import { route, json } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { evaluateAwards } from "@/services/awards";

/** Re-runs the evaluator (idempotent) — used after offline sync or by clients that missed an unlock. */
export const POST = route(async () => {
  const user = await requireUser();
  return json({ unlocked: await evaluateAwards(user.id) });
});

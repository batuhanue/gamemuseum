import { route, json } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { deleteGoal } from "@/services/goals";

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser();
  await deleteGoal(user.id, (await params).id);
  return json({ ok: true });
});

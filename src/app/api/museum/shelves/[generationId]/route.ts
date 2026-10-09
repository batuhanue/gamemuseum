import { route, json, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { shelfUpdateSchema } from "@/lib/validation/schemas";
import { updateShelf } from "@/services/shelves";
import { getDb } from "@/lib/db/client";
import { recordEvent } from "@/services/activity";
import { evaluateAwards } from "@/services/awards";

export const PUT = route<{ generationId: string }>(async (req, { params }) => {
  const user = await requireUser();
  const { generationId } = await params;
  const input = await parseBody(req, shelfUpdateSchema);
  const res = await updateShelf(await getDb(), user.id, generationId, input);
  if (input.mode === "manual" && input.order?.length) await recordEvent(user.id, "layout_saved", { generationId });
  const unlocked = await evaluateAwards(user.id);
  return json({ ...res, unlocked });
});

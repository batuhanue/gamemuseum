import { route, json } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { markAwardsSeen } from "@/services/awards";

export const POST = route(async () => {
  const user = await requireUser();
  await markAwardsSeen(user.id);
  return json({ ok: true });
});

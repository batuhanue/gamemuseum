import { route, json, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { updateGameSchema } from "@/lib/validation/schemas";
import { deleteCopy, getCopy, updateCopy } from "@/services/collection";

type P = { id: string };

export const GET = route<P>(async (_req, { params }) => {
  const user = await requireUser();
  return json({ copy: await getCopy(user.id, (await params).id) });
});

export const PATCH = route<P>(async (req, { params }) => {
  const user = await requireUser();
  const res = await updateCopy(user.id, (await params).id, await parseBody(req, updateGameSchema));
  return json(res);
});

export const DELETE = route<P>(async (_req, { params }) => {
  const user = await requireUser();
  await deleteCopy(user.id, (await params).id);
  return json({ ok: true });
});

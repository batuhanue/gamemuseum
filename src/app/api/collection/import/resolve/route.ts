import { z } from "zod";
import { route, json, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { resolvePending } from "@/services/imports";

export const POST = route(async (req) => {
  const user = await requireUser();
  const b = await parseBody(req, z.object({ jobId: z.string(), ref: z.string(), catalogGameId: z.string().nullable() }));
  return json(await resolvePending(user.id, b.jobId, b.ref, b.catalogGameId));
});

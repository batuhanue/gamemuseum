import { z } from "zod";
import { route, json, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { importDemoCollection } from "@/services/imports";

/** Requires an explicit confirmation flag sent by the confirmation dialog. */
export const POST = route(async (req) => {
  const user = await requireUser();
  await parseBody(req, z.object({ confirm: z.literal(true) }));
  return json(await importDemoCollection(user.id));
});

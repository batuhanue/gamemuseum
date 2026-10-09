import { z } from "zod";
import { route, json, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { createJob, csvRowSchema, importCsvBatch } from "@/services/imports";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), total: z.number().int().min(1).max(5000) }),
  z.object({ action: z.literal("batch"), jobId: z.string(), rows: z.array(csvRowSchema).max(25), final: z.boolean() }),
]);

export const POST = route(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, schema);
  if (body.action === "start") return json({ job: await createJob(user.id, "csv", body.total) });
  return json(await importCsvBatch(user.id, body.jobId, body.rows, body.final));
});

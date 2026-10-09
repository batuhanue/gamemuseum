import { z } from "zod";
import { route, json, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { createGoal, listGoals } from "@/services/goals";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ goals: await listGoals(user.id) });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, z.object({
    title: z.string().trim().min(1).max(80),
    type: z.enum(["series", "custom", "shelf"]),
    seriesName: z.string().max(120).optional(),
    targetGameIds: z.array(z.string().max(100)).max(500).optional(),
    generationId: z.string().max(50).optional(),
    targetCount: z.number().int().min(1).max(5000).optional(),
  }));
  return json({ ok: true, unlocked: await createGoal(user.id, body) }, { status: 201 });
});

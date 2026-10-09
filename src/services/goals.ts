import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { catalogGames, collectionGoals } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { computeGoalProgress, evaluateAwards } from "./awards";

export async function listGoals(userId: string) {
  const db = await getDb();
  return computeGoalProgress(db, userId);
}

/**
 * Series goals target the series members currently known to the catalog (IGDB "collections").
 * The list is stored on the goal so later catalog changes do not silently move the target.
 */
export async function createGoal(userId: string, input: { title: string; type: "series" | "custom" | "shelf"; seriesName?: string; targetGameIds?: string[]; generationId?: string; targetCount?: number }) {
  const db = await getDb();
  let targets = input.targetGameIds ?? [];
  if (input.type === "series") {
    if (!input.seriesName) throw new AppError("invalid", "Series name required");
    const rows = await db
      .select({ id: catalogGames.id })
      .from(catalogGames)
      .where(sql`(${catalogGames.series} ? ${input.seriesName} or ${catalogGames.franchises} ? ${input.seriesName}) and ${catalogGames.dataSource} <> 'manual'`);
    targets = rows.map((r) => r.id);
    if (!targets.length) throw new AppError("invalid", "No catalog games found for that series");
  }
  if (input.type === "custom" && !targets.length) throw new AppError("invalid", "Pick at least one game");
  if (input.type === "shelf" && (!input.generationId || !input.targetCount)) throw new AppError("invalid", "Shelf and target count required");
  await db.insert(collectionGoals).values({
    id: newId("goal"), userId, title: input.title, type: input.type, seriesName: input.seriesName ?? null,
    targetGameIds: targets.slice(0, 500), generationId: input.generationId ?? null, targetCount: input.targetCount ?? null,
  });
  return evaluateAwards(userId);
}

export async function deleteGoal(userId: string, goalId: string) {
  const db = await getDb();
  await db.delete(collectionGoals).where(and(eq(collectionGoals.id, goalId), eq(collectionGoals.userId, userId)));
}

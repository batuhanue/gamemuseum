import "server-only";
import { and, count, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { activityEvents, awardDefinitions, catalogGames, collectionGoals, generations, userAwards, userGames } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { AppError } from "@/lib/errors";
import { SHELF_ROWS } from "@/features/platforms/reference";
import { isSatisfied, type CollectionMetrics } from "@/features/rewards/engine";
import type { Executor } from "./shelves";
import { recordEvent } from "./activity";

export const SHOWCASE_CAPACITY = 7;

export type GoalProgress = {
  id: string;
  title: string;
  type: "series" | "custom" | "shelf";
  owned: number;
  target: number;
  seriesName: string | null;
  generationId: string | null;
};

export async function computeGoalProgress(ex: Executor, userId: string): Promise<GoalProgress[]> {
  const goals = await ex.select().from(collectionGoals).where(eq(collectionGoals.userId, userId));
  if (!goals.length) return [];
  const owned = await ex
    .select({ catalogGameId: userGames.catalogGameId, generationId: userGames.generationId })
    .from(userGames)
    .where(eq(userGames.userId, userId));
  const ownedCatalog = new Set(owned.map((o) => o.catalogGameId));
  return goals.map((g) => {
    if (g.type === "shelf") {
      const n = owned.filter((o) => o.generationId === g.generationId).length;
      return { id: g.id, title: g.title, type: g.type, owned: Math.min(n, g.targetCount ?? 0), target: g.targetCount ?? 0, seriesName: null, generationId: g.generationId };
    }
    const targets = g.targetGameIds;
    return {
      id: g.id, title: g.title, type: g.type, seriesName: g.seriesName, generationId: null,
      owned: targets.filter((t) => ownedCatalog.has(t)).length, target: targets.length,
    };
  });
}

export async function computeMetrics(ex: Executor, userId: string): Promise<CollectionMetrics> {
  const perGen = await ex
    .select({
      generationId: userGames.generationId,
      platformId: userGames.platformId,
      isRetro: generations.isRetro,
      capacity: generations.shelfCapacity,
      n: count(),
      completed: sql<number>`count(*) filter (where ${userGames.status} = 'completed')`.mapWith(Number),
    })
    .from(userGames)
    .innerJoin(generations, eq(generations.id, userGames.generationId))
    .where(eq(userGames.userId, userId))
    .groupBy(userGames.generationId, userGames.platformId, generations.isRetro, generations.shelfCapacity);

  const byPlatform: Record<string, number> = {};
  const byGeneration: Record<string, number> = {};
  let total = 0;
  let completed = 0;
  let retroGenerations = 0;
  let retroShelfFull = false;
  for (const r of perGen) {
    const n = Number(r.n);
    total += n;
    completed += r.completed;
    byPlatform[r.platformId] = (byPlatform[r.platformId] ?? 0) + n;
    byGeneration[r.generationId] = n;
    if (r.isRetro && n > 0) retroGenerations++;
    if (r.isRetro && n >= r.capacity * SHELF_ROWS) retroShelfFull = true; // one full shelf column
  }

  const seriesRows = await ex
    .select({ series: catalogGames.series, franchises: catalogGames.franchises, catalogGameId: catalogGames.id })
    .from(userGames)
    .innerJoin(catalogGames, eq(catalogGames.id, userGames.catalogGameId))
    .where(eq(userGames.userId, userId));
  const seriesCounts = new Map<string, Set<string>>();
  for (const r of seriesRows) {
    for (const s of new Set([...r.series, ...r.franchises])) {
      const set = seriesCounts.get(s) ?? new Set<string>();
      set.add(r.catalogGameId); // distinct games, not copies
      seriesCounts.set(s, set);
    }
  }
  const maxSeriesCount = Math.max(0, ...[...seriesCounts.values()].map((s) => s.size));

  const goals = await computeGoalProgress(ex, userId);
  const completedGoalTypes = goals.filter((g) => g.target > 0 && g.owned >= g.target).map((g) => g.type);

  const ev = await ex.selectDistinct({ type: activityEvents.type }).from(activityEvents).where(eq(activityEvents.userId, userId));

  return { total, completed, byPlatform, byGeneration, retroGenerations, retroShelfFull, maxSeriesCount, completedGoalTypes, events: ev.map((e) => e.type) };
}

export type UnlockedAward = { userAwardId: string; awardId: string; displayed: boolean };

/**
 * Idempotent: the (user, award) unique index plus ON CONFLICT DO NOTHING guarantees an award is
 * granted at most once even when the same event is processed concurrently or twice.
 * Policy: earned awards are permanent; removing games later recalculates counts and progress only.
 */
export async function evaluateAwards(userId: string, ex?: Executor): Promise<UnlockedAward[]> {
  const db = ex ?? (await getDb());
  const metrics = await computeMetrics(db, userId);
  const defs = await db.select().from(awardDefinitions).where(eq(awardDefinitions.active, true));
  const earned = await db.select({ id: userAwards.awardDefinitionId }).from(userAwards).where(eq(userAwards.userId, userId));
  const have = new Set(earned.map((e) => e.id));
  const [{ displayed } = { displayed: 0 }] = await db
    .select({ displayed: count() })
    .from(userAwards)
    .where(and(eq(userAwards.userId, userId), eq(userAwards.displayedInMuseum, true)));
  let free = SHOWCASE_CAPACITY - Number(displayed);

  const unlocked: UnlockedAward[] = [];
  for (const def of defs.sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (have.has(def.id) || def.category === "verified") continue;
    if (!isSatisfied(def, metrics)) continue;
    const displayedInMuseum = free > 0;
    const inserted = await db
      .insert(userAwards)
      .values({
        id: newId("uaw"),
        userId,
        awardDefinitionId: def.id,
        definitionVersion: def.version,
        progressSnapshot: { total: metrics.total, byPlatform: metrics.byPlatform },
        displayedInMuseum,
      })
      .onConflictDoNothing()
      .returning({ id: userAwards.id });
    if (inserted[0]) {
      if (displayedInMuseum) free--;
      unlocked.push({ userAwardId: inserted[0].id, awardId: def.id, displayed: displayedInMuseum });
    }
  }
  return unlocked;
}

/** Only earned awards can be shown; the showcase holds at most SHOWCASE_CAPACITY trophies. */
export async function setAwardDisplayed(userId: string, awardDefinitionId: string, displayed: boolean) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(userAwards)
    .where(and(eq(userAwards.userId, userId), eq(userAwards.awardDefinitionId, awardDefinitionId)))
    .limit(1);
  if (!row) throw new AppError("forbidden", "Award not earned yet");
  if (displayed && !row.displayedInMuseum) {
    const [{ n } = { n: 0 }] = await db
      .select({ n: count() })
      .from(userAwards)
      .where(and(eq(userAwards.userId, userId), eq(userAwards.displayedInMuseum, true)));
    if (Number(n) >= SHOWCASE_CAPACITY) throw new AppError("conflict", "Showcase is full");
  }
  await db.update(userAwards).set({ displayedInMuseum: displayed }).where(eq(userAwards.id, row.id));
  await recordEvent(userId, "showcase_created", { awardDefinitionId, displayed });
  return evaluateAwards(userId);
}

export async function markAwardsSeen(userId: string) {
  const db = await getDb();
  await db.update(userAwards).set({ seenAt: new Date() }).where(and(eq(userAwards.userId, userId), sql`${userAwards.seenAt} is null`));
}

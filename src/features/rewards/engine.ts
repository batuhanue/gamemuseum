/**
 * Pure award-condition evaluation. The server computes CollectionMetrics from the database and calls
 * these functions; the client never decides whether an award is earned.
 */
export type CollectionMetrics = {
  total: number;
  completed: number;
  byPlatform: Record<string, number>;
  byGeneration: Record<string, number>;
  retroGenerations: number;
  retroShelfFull: boolean;
  maxSeriesCount: number;
  completedGoalTypes: string[];
  events: string[];
};

export type ConditionDef = { conditionType: string; conditionConfig: Record<string, unknown> };

const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Returns progress towards the condition (current/target), or null for binary conditions without a count. */
export function conditionProgress(def: ConditionDef, m: CollectionMetrics): { current: number; target: number } {
  const c = def.conditionConfig;
  switch (def.conditionType) {
    case "total_games":
      return { current: m.total, target: num(c.min, 1) };
    case "completed_games":
      return { current: m.completed, target: num(c.min, 1) };
    case "platform_games":
      return { current: m.byPlatform[str(c.platformId)] ?? 0, target: num(c.min, 1) };
    case "generation_games":
      return { current: m.byGeneration[str(c.generationId)] ?? 0, target: num(c.min, 1) };
    case "retro_generations":
      return { current: m.retroGenerations, target: num(c.min, 3) };
    case "retro_shelf_full":
      return { current: m.retroShelfFull ? 1 : 0, target: 1 };
    case "series_count":
      return { current: m.maxSeriesCount, target: num(c.min, 3) };
    case "goal_completed": {
      const types = Array.isArray(c.types) ? (c.types as string[]) : null;
      const ok = m.completedGoalTypes.some((t) => !types || types.includes(t));
      return { current: ok ? 1 : 0, target: 1 };
    }
    case "event":
      return { current: m.events.includes(str(c.type)) ? 1 : 0, target: 1 };
    default:
      // Unknown or platform-verified conditions are never satisfied without real data.
      return { current: 0, target: 1 };
  }
}

export function isSatisfied(def: ConditionDef, m: CollectionMetrics): boolean {
  const p = conditionProgress(def, m);
  return p.current >= p.target;
}

/** Collector level from earned points: gentle curve, level 1 at zero. */
export function levelFromPoints(points: number): number {
  return 1 + Math.floor(Math.sqrt(Math.max(0, points) / 12));
}

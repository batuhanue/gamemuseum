import { describe, expect, it } from "vitest";
import { conditionProgress, isSatisfied, levelFromPoints, type CollectionMetrics } from "@/features/rewards/engine";
import { AWARDS } from "@/features/rewards/definitions";

const base: CollectionMetrics = { total: 0, completed: 0, byPlatform: {}, byGeneration: {}, retroGenerations: 0, retroShelfFull: false, maxSeriesCount: 0, completedGoalTypes: [], events: [] };

describe("award conditions", () => {
  it("milestones need the exact count", () => {
    const def = AWARDS.find((a) => a.id === "games-10")!;
    expect(isSatisfied(def, { ...base, total: 9 })).toBe(false);
    expect(isSatisfied(def, { ...base, total: 10 })).toBe(true);
    expect(conditionProgress(def, { ...base, total: 4 })).toEqual({ current: 4, target: 10 });
  });

  it("platform, generation, retro, series, goals and events", () => {
    expect(isSatisfied(AWARDS.find((a) => a.id === "first-pc")!, { ...base, byPlatform: { pc: 1 } })).toBe(true);
    expect(isSatisfied(AWARDS.find((a) => a.id === "ps2-25")!, { ...base, byGeneration: { ps2: 24 } })).toBe(false);
    expect(isSatisfied(AWARDS.find((a) => a.id === "retro-traveler")!, { ...base, retroGenerations: 3 })).toBe(true);
    expect(isSatisfied(AWARDS.find((a) => a.id === "series-archivist")!, { ...base, maxSeriesCount: 3 })).toBe(true);
    expect(isSatisfied(AWARDS.find((a) => a.id === "series-complete")!, { ...base, completedGoalTypes: ["shelf"] })).toBe(false);
    expect(isSatisfied(AWARDS.find((a) => a.id === "series-complete")!, { ...base, completedGoalTypes: ["series"] })).toBe(true);
    expect(isSatisfied(AWARDS.find((a) => a.id === "first-theme")!, { ...base, events: ["theme_applied"] })).toBe(true);
  });

  it("unknown conditions are never satisfied", () => {
    expect(isSatisfied({ conditionType: "platform_trophies", conditionConfig: {} }, { ...base, total: 1000 })).toBe(false);
  });

  it("level grows with points", () => {
    expect(levelFromPoints(0)).toBe(1);
    expect(levelFromPoints(12)).toBe(2);
    expect(levelFromPoints(500)).toBeGreaterThan(levelFromPoints(100));
  });

  it("award ids are unique", () => {
    expect(new Set(AWARDS.map((a) => a.id)).size).toBe(AWARDS.length);
  });
});

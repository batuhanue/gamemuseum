import { describe, expect, it } from "vitest";
import { applyRequestedOrder, manualOrder, moveId, slotsFor, sortItems, type LayoutItem } from "@/features/museum/layout";

const item = (id: string, title: string, extra: Partial<LayoutItem> = {}): LayoutItem => ({
  id, title, releaseDate: null, createdAt: "2024-01-01T00:00:00Z", status: "backlog", isFavorite: false, series: [], ownershipType: "physical",
  generationOrder: 0, currentSortIndex: null, ...extra,
});

describe("shelf layout", () => {
  it("sorts alphabetically with Turkish-aware collation", () => {
    const out = sortItems([item("a", "Zelda"), item("b", "Çiftlik"), item("c", "Assassin")], "alphabetical");
    expect(out.map((x) => x.id)).toEqual(["c", "b", "a"]);
  });

  it("sorts by release year and favorites", () => {
    const items = [item("a", "A", { releaseDate: "2010-01-01" }), item("b", "B", { releaseDate: "2001-01-01", isFavorite: true }), item("c", "C")];
    expect(sortItems(items, "release").map((x) => x.id)).toEqual(["b", "a", "c"]);
    expect(sortItems(items, "favorites")[0]!.id).toBe("b");
  });

  it("manual mode keeps saved order and appends new copies", () => {
    const out = manualOrder([item("new", "N", { createdAt: "2025-01-01" }), item("b", "B", { currentSortIndex: 1 }), item("a", "A", { currentSortIndex: 0 })]);
    expect(out.map((x) => x.id)).toEqual(["a", "b", "new"]);
  });

  it("applies requested order, drops unknown ids and keeps missing ones", () => {
    const items = [item("a", "A", { currentSortIndex: 0 }), item("b", "B", { currentSortIndex: 1 }), item("c", "C", { currentSortIndex: 2 })];
    expect(applyRequestedOrder(items, ["c", "ghost", "a"]).map((x) => x.id)).toEqual(["c", "a", "b"]);
  });

  it("derives shelf and slot from capacity", () => {
    expect(slotsFor([{ id: "a" }, { id: "b" }, { id: "c" }], 2)).toEqual([
      { id: "a", sortIndex: 0, shelfIndex: 0, slotIndex: 0 },
      { id: "b", sortIndex: 1, shelfIndex: 0, slotIndex: 1 },
      { id: "c", sortIndex: 2, shelfIndex: 1, slotIndex: 0 },
    ]);
  });

  it("moves an id to a clamped index", () => {
    expect(moveId(["a", "b", "c"], "a", 2)).toEqual(["b", "c", "a"]);
    expect(moveId(["a", "b", "c"], "c", -5)).toEqual(["c", "a", "b"]);
    expect(moveId(["a"], "zz", 0)).toEqual(["a"]);
  });
});

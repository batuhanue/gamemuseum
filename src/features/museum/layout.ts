import type { SortRule } from "@/lib/validation/schemas";

export type LayoutItem = {
  id: string;
  title: string;
  releaseDate: string | null;
  createdAt: Date | string;
  status: string;
  isFavorite: boolean;
  series: string[];
  ownershipType: string;
  generationOrder: number;
  currentSortIndex: number | null;
};

const collator = new Intl.Collator(["tr", "en"], { sensitivity: "base", numeric: true });
const STATUS_ORDER: Record<string, number> = { playing: 0, completed: 1, paused: 2, backlog: 3, dropped: 4 };
const time = (d: Date | string) => (typeof d === "string" ? Date.parse(d) : d.getTime());

/** Deterministic auto-arrangement; ties fall back to title so layouts are stable across devices. */
export function sortItems(items: LayoutItem[], rule: SortRule): LayoutItem[] {
  const byTitle = (a: LayoutItem, b: LayoutItem) => collator.compare(a.title, b.title) || a.id.localeCompare(b.id);
  const arr = [...items];
  switch (rule) {
    case "alphabetical":
      return arr.sort(byTitle);
    case "release":
      return arr.sort((a, b) => (a.releaseDate ?? "9999").localeCompare(b.releaseDate ?? "9999") || byTitle(a, b));
    case "added":
      return arr.sort((a, b) => time(a.createdAt) - time(b.createdAt) || byTitle(a, b));
    case "generation":
      return arr.sort((a, b) => a.generationOrder - b.generationOrder || byTitle(a, b));
    case "status":
      return arr.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || byTitle(a, b));
    case "favorites":
      return arr.sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || byTitle(a, b));
    case "series":
      return arr.sort(
        (a, b) =>
          collator.compare(a.series[0] ?? "￿", b.series[0] ?? "￿") ||
          (a.releaseDate ?? "").localeCompare(b.releaseDate ?? "") ||
          byTitle(a, b),
      );
    case "ownership":
      return arr.sort((a, b) => a.ownershipType.localeCompare(b.ownershipType) || byTitle(a, b));
    case "custom":
      return manualOrder(arr);
  }
}

/** Manual mode keeps saved order; items without a saved index (new copies) are appended by add date. */
export function manualOrder(items: LayoutItem[]): LayoutItem[] {
  const placed = items.filter((i) => i.currentSortIndex !== null).sort((a, b) => a.currentSortIndex! - b.currentSortIndex!);
  const fresh = items.filter((i) => i.currentSortIndex === null).sort((a, b) => time(a.createdAt) - time(b.createdAt));
  return [...placed, ...fresh];
}

/** Applies a client-provided order: unknown ids are dropped, missing ids keep relative order at the end. */
export function applyRequestedOrder(items: LayoutItem[], order: string[]): LayoutItem[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const seen = new Set<string>();
  const out: LayoutItem[] = [];
  for (const id of order) {
    const it = byId.get(id);
    if (it && !seen.has(id)) {
      out.push(it);
      seen.add(id);
    }
  }
  for (const it of manualOrder(items)) if (!seen.has(it.id)) out.push(it);
  return out;
}

export function slotsFor(order: { id: string }[], capacity: number) {
  const cap = Math.max(1, capacity);
  return order.map((it, i) => ({ id: it.id, sortIndex: i, shelfIndex: Math.floor(i / cap), slotIndex: i % cap }));
}

/** Moves one id to a target index (clamped). Returns a new array. */
export function moveId(order: string[], id: string, toIndex: number): string[] {
  const from = order.indexOf(id);
  if (from === -1) return order;
  const next = order.filter((x) => x !== id);
  const idx = Math.max(0, Math.min(next.length, toIndex));
  next.splice(idx, 0, id);
  return next;
}

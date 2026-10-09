import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { DB } from "@/lib/db/client";
import { catalogGames, generations, museumPlacements, museumShelves, userGames } from "@/lib/db/schema";
import { applyRequestedOrder, slotsFor, sortItems, type LayoutItem } from "@/features/museum/layout";
import type { SortRule } from "@/lib/validation/schemas";
import { AppError } from "@/lib/errors";

export type Executor = DB | Parameters<Parameters<DB["transaction"]>[0]>[0];

export async function getShelfSettings(ex: Executor, userId: string, generationId: string) {
  const [row] = await ex
    .select()
    .from(museumShelves)
    .where(and(eq(museumShelves.userId, userId), eq(museumShelves.generationId, generationId)))
    .limit(1);
  return row ?? { userId, generationId, mode: "auto" as const, sortBy: "added" as SortRule, version: 0, updatedAt: new Date() };
}

async function loadItems(ex: Executor, userId: string, generationId: string): Promise<LayoutItem[]> {
  const rows = await ex
    .select({
      id: userGames.id,
      title: catalogGames.title,
      releaseDate: catalogGames.releaseDate,
      createdAt: userGames.createdAt,
      status: userGames.status,
      isFavorite: userGames.isFavorite,
      series: catalogGames.series,
      franchises: catalogGames.franchises,
      ownershipType: userGames.ownershipType,
      generationOrder: generations.sortOrder,
      currentSortIndex: museumPlacements.sortIndex,
    })
    .from(userGames)
    .innerJoin(catalogGames, eq(catalogGames.id, userGames.catalogGameId))
    .innerJoin(generations, eq(generations.id, userGames.generationId))
    .leftJoin(museumPlacements, eq(museumPlacements.userGameId, userGames.id))
    .where(and(eq(userGames.userId, userId), eq(userGames.generationId, generationId)));
  return rows.map((r) => ({
    ...r,
    series: r.series.length ? r.series : r.franchises,
    currentSortIndex: r.currentSortIndex ?? null,
  }));
}

/**
 * Recomputes every placement on one generation shelf. Auto mode: sort rule. Manual mode: saved order
 * (or the provided order), newcomers appended. Writes are upserts keyed by the owned copy.
 */
export async function relayoutShelf(ex: Executor, userId: string, generationId: string, requestedOrder?: string[]) {
  const [gen] = await ex.select().from(generations).where(eq(generations.id, generationId)).limit(1);
  if (!gen) throw new AppError("invalid", `Unknown generation ${generationId}`);
  const settings = await getShelfSettings(ex, userId, generationId);
  const items = await loadItems(ex, userId, generationId);
  const ordered =
    settings.mode === "manual"
      ? requestedOrder
        ? applyRequestedOrder(items, requestedOrder)
        : sortItems(items, "custom")
      : sortItems(items, settings.sortBy as SortRule);
  const slots = slotsFor(ordered, gen.shelfCapacity);
  if (!slots.length) return [];
  await ex
    .insert(museumPlacements)
    .values(
      slots.map((s) => ({
        userGameId: s.id,
        userId,
        galleryId: gen.platformId,
        generationId,
        shelfIndex: s.shelfIndex,
        slotIndex: s.slotIndex,
        sortIndex: s.sortIndex,
      })),
    )
    .onConflictDoUpdate({
      target: museumPlacements.userGameId,
      set: {
        galleryId: sql`excluded.gallery_id`,
        generationId: sql`excluded.generation_id`,
        shelfIndex: sql`excluded.shelf_index`,
        slotIndex: sql`excluded.slot_index`,
        sortIndex: sql`excluded.sort_index`,
        updatedAt: sql`now()`,
      },
    });
  return slots;
}

/** Saves shelf mode/sort/order with optimistic concurrency (expectedVersion must match). */
export async function updateShelf(
  db: DB,
  userId: string,
  generationId: string,
  input: { mode: "auto" | "manual"; sortBy: SortRule; order?: string[]; expectedVersion: number },
) {
  return db.transaction(async (tx) => {
    const current = await getShelfSettings(tx, userId, generationId);
    if (current.version !== input.expectedVersion) {
      throw new AppError("conflict", "Shelf was changed on another device", { currentVersion: current.version });
    }
    const version = current.version + 1;
    await tx
      .insert(museumShelves)
      .values({ userId, generationId, mode: input.mode, sortBy: input.sortBy, version })
      .onConflictDoUpdate({
        target: [museumShelves.userId, museumShelves.generationId],
        set: { mode: input.mode, sortBy: input.sortBy, version, updatedAt: new Date() },
      });
    if (input.order?.length) {
      // Validate ownership: every id must belong to this user and this shelf.
      const owned = await tx
        .select({ id: userGames.id })
        .from(userGames)
        .where(and(eq(userGames.userId, userId), inArray(userGames.id, input.order)));
      if (owned.length === 0) throw new AppError("invalid", "Order does not match this shelf");
    }
    const slots = await relayoutShelf(tx, userId, generationId, input.mode === "manual" ? input.order : undefined);
    return { version, slots };
  });
}

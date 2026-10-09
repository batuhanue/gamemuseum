import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { catalogGames, generations, museumPlacements, userGames } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { AppError } from "@/lib/errors";
import type { AddGameInput, UpdateGameInput } from "@/lib/validation/schemas";
import { PC_STORE_TO_GENERATION, supportsPc } from "@/features/platforms/reference";
import { relayoutShelf, type Executor } from "./shelves";
import { evaluateAwards } from "./awards";
import { recordEvent } from "./activity";

async function resolveGeneration(ex: Executor, input: { generationId: string; store?: string | null }) {
  let generationId = input.generationId;
  // PC copies are shelved by store; "pc" is accepted as a shorthand.
  if (generationId === "pc" || generationId.startsWith("pc-")) {
    const store = (input.store ?? (generationId.startsWith("pc-") ? generationId.slice(3) : "other")) as keyof typeof PC_STORE_TO_GENERATION;
    generationId = PC_STORE_TO_GENERATION[store] ?? "pc-other";
  }
  const [gen] = await ex.select().from(generations).where(eq(generations.id, generationId)).limit(1);
  if (!gen || !gen.active) throw new AppError("invalid", "Unknown platform generation", { field: "generationId" });
  return gen;
}

function assertCompatible(gen: typeof generations.$inferSelect, game: typeof catalogGames.$inferSelect) {
  if (!game.igdbPlatformIds.length || game.dataSource === "manual") return; // no platform data: trust the user
  const ok = gen.platformId === "pc" ? supportsPc(game.igdbPlatformIds) : gen.igdbPlatformIds.some((p) => game.igdbPlatformIds.includes(p));
  if (!ok) throw new AppError("invalid", "This game was not released on the selected platform", { field: "generationId" });
}

export async function addGameToCollection(userId: string, input: AddGameInput, opts: { source?: "manual" | "csv-import" | "demo-import" | "steam-import"; externalRef?: string; playtimeMinutes?: number; verification?: "self-reported" | "platform-confirmed"; skipAwards?: boolean } = {}) {
  const db = await getDb();
  const result = await db.transaction(async (tx) => {
    const [game] = await tx.select().from(catalogGames).where(eq(catalogGames.id, input.catalogGameId)).limit(1);
    if (!game) throw new AppError("not_found", "Game not found in catalog");
    const gen = await resolveGeneration(tx, input);
    assertCompatible(gen, game);
    const store = gen.platformId === "pc" ? (input.store ?? (gen.id.replace("pc-", "") as AddGameInput["store"])) : undefined;
    const id = newId("cp");
    const inserted = await tx
      .insert(userGames)
      .values({
        id,
        userId,
        catalogGameId: game.id,
        platformId: gen.platformId,
        generationId: gen.id,
        ownershipType: gen.platformId === "pc" && input.ownershipType === "physical" ? "physical" : input.ownershipType,
        store: store ?? null,
        edition: input.edition || null,
        region: input.region || null,
        condition: input.ownershipType === "physical" ? (input.condition ?? null) : null,
        purchaseDate: input.purchaseDate ?? null,
        purchasePrice: input.purchasePrice ?? null,
        purchaseCurrency: input.purchasePrice != null ? (input.purchaseCurrency ?? "TRY") : null,
        status: input.status,
        isFavorite: input.isFavorite,
        rating: input.rating ?? null,
        notes: input.notes || null,
        playtimeMinutes: opts.playtimeMinutes ?? null,
        source: opts.source ?? "manual",
        externalRef: opts.externalRef ?? null,
        verificationStatus: opts.verification ?? "self-reported",
      })
      .onConflictDoNothing()
      .returning();
    if (!inserted[0]) return null; // duplicate external import
    await relayoutShelf(tx, userId, gen.id);
    const [placement] = await tx.select().from(museumPlacements).where(eq(museumPlacements.userGameId, id)).limit(1);
    return { copy: inserted[0], placement: placement ?? null, game };
  });
  if (!result) return null;
  await recordEvent(userId, "game_added", { copyId: result.copy.id, catalogGameId: result.game.id, generationId: result.copy.generationId });
  const unlocked = opts.skipAwards ? [] : await evaluateAwards(userId);
  return { ...result, unlocked };
}

export async function getCopy(userId: string, copyId: string) {
  const db = await getDb();
  const [row] = await db.select().from(userGames).where(and(eq(userGames.id, copyId), eq(userGames.userId, userId))).limit(1);
  if (!row) throw new AppError("not_found", "Collection entry not found");
  return row;
}

/** Optimistic concurrency: the client sends the version it edited; stale writes get 409. */
export async function updateCopy(userId: string, copyId: string, input: UpdateGameInput) {
  const db = await getDb();
  const out = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(userGames).where(and(eq(userGames.id, copyId), eq(userGames.userId, userId))).limit(1);
    if (!row) throw new AppError("not_found", "Collection entry not found");
    if (row.version !== input.expectedVersion) throw new AppError("conflict", "This entry was changed elsewhere", { current: row });
    const { expectedVersion: _v, ...patch } = input;
    let generationId = row.generationId;
    let platformId = row.platformId;
    if (patch.generationId && patch.generationId !== row.generationId || (patch.store && row.platformId === "pc")) {
      const [game] = await tx.select().from(catalogGames).where(eq(catalogGames.id, row.catalogGameId)).limit(1);
      const gen = await resolveGeneration(tx, { generationId: patch.generationId ?? row.generationId, store: patch.store ?? row.store });
      if (game) assertCompatible(gen, game);
      generationId = gen.id;
      platformId = gen.platformId;
    }
    const [updated] = await tx
      .update(userGames)
      .set({ ...patch, generationId, platformId, version: row.version + 1, updatedAt: new Date() })
      .where(and(eq(userGames.id, copyId), eq(userGames.version, row.version)))
      .returning();
    if (!updated) throw new AppError("conflict", "This entry was changed elsewhere");
    if (generationId !== row.generationId) {
      // Moving shelves: drop the old placement so the copy is appended on its new shelf.
      await tx.delete(museumPlacements).where(eq(museumPlacements.userGameId, copyId));
      await relayoutShelf(tx, userId, row.generationId);
    }
    await relayoutShelf(tx, userId, generationId);
    return updated;
  });
  const unlocked = await evaluateAwards(userId);
  return { copy: out, unlocked };
}

export async function deleteCopy(userId: string, copyId: string) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [row] = await tx.delete(userGames).where(and(eq(userGames.id, copyId), eq(userGames.userId, userId))).returning();
    if (!row) throw new AppError("not_found", "Collection entry not found");
    // Placement row cascades; re-pack the shelf so no gaps remain.
    await relayoutShelf(tx, userId, row.generationId);
  });
  await recordEvent(userId, "game_removed", { copyId });
}

export async function listCollection(userId: string) {
  const db = await getDb();
  return db
    .select({ copy: userGames, game: catalogGames, placement: museumPlacements })
    .from(userGames)
    .innerJoin(catalogGames, eq(catalogGames.id, userGames.catalogGameId))
    .leftJoin(museumPlacements, eq(museumPlacements.userGameId, userGames.id))
    .where(eq(userGames.userId, userId))
    .orderBy(desc(userGames.createdAt));
}

export async function copiesForGame(userId: string, catalogGameId: string) {
  const db = await getDb();
  return db
    .select({ copy: userGames, placement: museumPlacements })
    .from(userGames)
    .leftJoin(museumPlacements, eq(museumPlacements.userGameId, userGames.id))
    .where(and(eq(userGames.userId, userId), eq(userGames.catalogGameId, catalogGameId)))
    .orderBy(userGames.createdAt);
}

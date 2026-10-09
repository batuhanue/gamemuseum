import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

process.env.PGLITE_DIR = "memory://";
delete process.env.DATABASE_URL;
delete process.env.IGDB_CLIENT_ID;

type Mods = {
  db: typeof import("@/lib/db/client");
  schema: typeof import("@/lib/db/schema");
  users: typeof import("@/services/users");
  collection: typeof import("@/services/collection");
  awards: typeof import("@/services/awards");
  shelves: typeof import("@/services/shelves");
  museum: typeof import("@/services/museum");
  profile: typeof import("@/services/profile");
  catalog: typeof import("@/services/catalog");
  imports: typeof import("@/services/imports");
};
let m: Mods;

beforeAll(async () => {
  m = {
    db: await import("@/lib/db/client"),
    schema: await import("@/lib/db/schema"),
    users: await import("@/services/users"),
    collection: await import("@/services/collection"),
    awards: await import("@/services/awards"),
    shelves: await import("@/services/shelves"),
    museum: await import("@/services/museum"),
    profile: await import("@/services/profile"),
    catalog: await import("@/services/catalog"),
    imports: await import("@/services/imports"),
  };
}, 60_000);

let n = 0;
async function newUser() {
  n++;
  const { id } = await m.users.registerUser({ email: `t${n}-${Date.now()}@example.com`, username: `tester_${n}_${Date.now() % 100000}`, password: "password123" });
  return id;
}
const add = (userId: string, catalogGameId: string, generationId: string, ownershipType: "physical" | "digital" = "physical") =>
  m.collection.addGameToCollection(userId, { catalogGameId, generationId, ownershipType, status: "backlog", isFavorite: false });

describe("collection & shelves", () => {
  it("places a new copy on the right generation shelf and keeps platform copies separate", async () => {
    const u = await newUser();
    const a = await add(u, "demo-frostpunker", "ps2");
    const b = await add(u, "demo-frostpunker", "pc-gog", "digital");
    expect(a?.copy.generationId).toBe("ps2");
    expect(a?.placement).toMatchObject({ generationId: "ps2", sortIndex: 0, shelfIndex: 0, slotIndex: 0 });
    expect(b?.copy).toMatchObject({ platformId: "pc", generationId: "pc-gog", store: "gog" });
    expect((await m.collection.listCollection(u)).length).toBe(2);
  });

  it("rejects platforms the game was not released on", async () => {
    const u = await newUser();
    await expect(add(u, "demo-lumen", "ps2")).rejects.toMatchObject({ code: "invalid" });
  });

  it("persists a manual order, enforces versions and re-packs after delete", async () => {
    const u = await newUser();
    const db = await m.db.getDb();
    const ids = [];
    for (const g of ["demo-bloodline", "demo-echoes-of-aeris", "demo-frostpunker"]) ids.push((await add(u, g, "ps2"))!.copy.id);
    const res = await m.shelves.updateShelf(db, u, "ps2", { mode: "manual", sortBy: "custom", order: [ids[2]!, ids[0]!, ids[1]!], expectedVersion: 0 });
    expect(res.version).toBe(1);
    // stale version from another device → conflict
    await expect(m.shelves.updateShelf(db, u, "ps2", { mode: "manual", sortBy: "custom", order: ids, expectedVersion: 0 })).rejects.toMatchObject({ code: "conflict" });
    const snap = await m.museum.getMuseumSnapshot(u, "en");
    const shelf = snap.galleries.find((g) => g.platformId === "playstation")!.shelves.find((s) => s.generationId === "ps2")!;
    expect(shelf.games.map((g) => g.copyId)).toEqual([ids[2], ids[0], ids[1]]);
    // a newly added copy is appended in manual mode
    const extra = await add(u, "demo-bloodline", "ps2");
    expect(extra?.placement?.sortIndex).toBe(3);
    // delete re-packs without gaps
    await m.collection.deleteCopy(u, ids[0]!);
    const rows = await db.select().from(m.schema.museumPlacements).where(eq(m.schema.museumPlacements.userId, u));
    expect(rows.map((r) => r.sortIndex).sort()).toEqual([0, 1, 2]);
  });

  it("moving a copy to another generation updates both shelves", async () => {
    const u = await newUser();
    const c = (await add(u, "demo-dreamers-veil", "ps3"))!.copy;
    await m.collection.updateCopy(u, c.id, { generationId: "x360", expectedVersion: c.version });
    const snap = await m.museum.getMuseumSnapshot(u, "en");
    const all = snap.galleries.flatMap((g) => g.shelves);
    expect(all.find((s) => s.generationId === "ps3")!.games).toHaveLength(0);
    expect(all.find((s) => s.generationId === "x360")!.games.map((g) => g.copyId)).toEqual([c.id]);
    await expect(m.collection.updateCopy(u, c.id, { status: "completed", expectedVersion: c.version })).rejects.toMatchObject({ code: "conflict" });
  });

  it("cannot edit another user's copy", async () => {
    const a = await newUser();
    const b = await newUser();
    const c = (await add(a, "demo-bloodline", "ps2"))!.copy;
    await expect(m.collection.updateCopy(b, c.id, { status: "completed", expectedVersion: 1 })).rejects.toMatchObject({ code: "not_found" });
    await expect(m.collection.deleteCopy(b, c.id)).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("awards", () => {
  it("grants on condition, never twice, and counts match records", async () => {
    const u = await newUser();
    const first = await add(u, "demo-bloodline", "ps2");
    expect(first!.unlocked.map((x) => x.awardId)).toEqual(expect.arrayContaining(["first-game", "first-playstation"]));
    const again = await Promise.all([m.awards.evaluateAwards(u), m.awards.evaluateAwards(u)]);
    expect(again.flat()).toHaveLength(0);
    const db = await m.db.getDb();
    const rows = await db.select().from(m.schema.userAwards).where(eq(m.schema.userAwards.userId, u));
    const snap = await m.museum.getMuseumSnapshot(u, "en");
    expect(snap.stats.awards).toBe(rows.length);
    expect(new Set(rows.map((r) => r.awardDefinitionId)).size).toBe(rows.length);
  });

  it("earned awards survive removal (documented policy); unearned cannot be displayed", async () => {
    const u = await newUser();
    const c = (await add(u, "demo-bloodline", "ps2"))!.copy;
    await m.collection.deleteCopy(u, c.id);
    const snap = await m.museum.getMuseumSnapshot(u, "en");
    expect(snap.stats.copies).toBe(0);
    expect(snap.awards.find((a) => a.id === "first-game")?.earned).not.toBeNull();
    await expect(m.awards.setAwardDisplayed(u, "games-500", true)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("curator awards come from real actions", async () => {
    const u = await newUser();
    const unlocked = await m.profile.applyTheme(u, "classic-hall");
    expect(unlocked.map((x) => x.awardId)).toContain("first-theme");
    await expect(m.profile.applyTheme(u, "cyber-gallery")).rejects.toMatchObject({ code: "premium_required" });
  });
});

describe("sharing & privacy", () => {
  it("private museums are hidden, unlisted need the key, hidden copies and prices never leak", async () => {
    const u = await newUser();
    const c1 = (await m.collection.addGameToCollection(u, { catalogGameId: "demo-bloodline", generationId: "ps2", ownershipType: "physical", status: "backlog", isFavorite: false, purchasePrice: 4321.75, notes: "secret note" }))!.copy;
    const c2 = (await add(u, "demo-lumen", "ps5"))!.copy;
    await m.collection.updateCopy(u, c2.id, { isPublic: false, expectedVersion: c2.version });
    const db = await m.db.getDb();
    const [user] = await db.select().from(m.schema.users).where(eq(m.schema.users.id, u));
    await expect(m.profile.getPublicMuseum(user!.username, null, null, "en")).rejects.toMatchObject({ code: "not_found" });
    await m.profile.updatePrivacy(u, { museumVisibility: "unlisted", shareSettings: user!.shareSettings });
    await expect(m.profile.getPublicMuseum(user!.username, "wrong", null, "en")).rejects.toMatchObject({ code: "not_found" });
    const res = await m.profile.getPublicMuseum(user!.username, user!.shareToken, null, "en");
    const json = JSON.stringify(res);
    expect(json).toContain(c1.id);
    expect(json).not.toContain(c2.id);
    expect(json).not.toContain("secret note");
    expect(json).not.toContain("4321");
    expect(json).not.toContain("purchasePrice");
    expect(json).not.toContain(user!.email);
  });

  it("exports all user data", async () => {
    const u = await newUser();
    await add(u, "demo-bloodline", "ps2");
    const data = await m.profile.exportUserData(u);
    expect(data.collection).toHaveLength(1);
    expect(JSON.stringify(data.profile)).not.toContain("passwordHash");
    const csv = await m.profile.exportCollectionCsv(u);
    expect(csv.split("\r\n")[1]).toContain("Bloodline");
  });
});

describe("catalog & imports", () => {
  it("falls back to the labelled demo catalog without IGDB credentials", async () => {
    const r = await m.catalog.searchCatalog("star");
    expect(r.source).toBe("demo");
    expect(r.games.every((g) => g.dataSource === "demo")).toBe(true);
    expect(r.games.map((g) => g.title)).toContain("Starfall Chronicles");
  });

  it("demo data never leaks into a new account", async () => {
    const u = await newUser();
    const snap = await m.museum.getMuseumSnapshot(u, "en");
    expect(snap.stats.copies).toBe(0);
    expect(snap.mode).toBe("user");
  });

  it("CSV import is idempotent on re-import and reports bad rows", async () => {
    const u = await newUser();
    const rows = [
      { row: 2, title: "Bloodline", platform: "PS2" },
      { row: 3, title: "Bloodline", platform: "Dreamcast" },
      { row: 4, title: "Nonexistent Game XYZ", platform: "PS2" },
    ];
    const job = await m.imports.createJob(u, "csv", rows.length);
    const r1 = await m.imports.importCsvBatch(u, job.id, rows, true);
    expect(r1).toMatchObject({ imported: 1, failed: 2 });
    const job2 = await m.imports.createJob(u, "csv", rows.length);
    const r2 = await m.imports.importCsvBatch(u, job2.id, rows, true);
    expect(r2.imported).toBe(0);
    expect(r2.skipped).toBe(1);
    expect((await m.collection.listCollection(u)).length).toBe(1);
  });

  it("deleting an account removes all its data", async () => {
    const u = await newUser();
    await add(u, "demo-bloodline", "ps2");
    await m.users.deleteAccount(u);
    const db = await m.db.getDb();
    expect(await db.select().from(m.schema.userGames).where(eq(m.schema.userGames.userId, u))).toHaveLength(0);
  });
});

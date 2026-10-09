import "server-only";
import { and, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { importJobs, linkedAccounts, userGames } from "@/lib/db/schema";
import { newId, sha256 } from "@/lib/ids";
import { AppError } from "@/lib/errors";
import { getOwnedGames } from "@/lib/steam/api";
import { igdbConfigured } from "@/lib/igdb/token";
import { generationFromAlias } from "@/features/platforms/aliases";
import { DEMO_OWNERSHIP, demoGameId } from "@/features/games/demo-catalog";
import { findBySteamAppIds, getCatalogGame, searchCatalog, type CatalogGameRow } from "./catalog";
import { addGameToCollection } from "./collection";
import { evaluateAwards } from "./awards";
import { statuses } from "@/lib/validation/schemas";

type Job = typeof importJobs.$inferSelect;
type ReportLine = Job["report"][number];
type Pending = Job["pendingMatches"][number];

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[™®©:'’\-–—.,!?]/g, " ").replace(/\s+/g, " ").trim();

export async function createJob(userId: string, type: "csv" | "steam", total: number) {
  const db = await getDb();
  // Jobs left "running" by an interrupted request are closed so they don't look alive forever.
  await db.update(importJobs).set({ status: "failed", finishedAt: new Date() })
    .where(and(eq(importJobs.userId, userId), eq(importJobs.status, "running"), lt(importJobs.createdAt, new Date(Date.now() - 15 * 60_000))));
  const [job] = await db.insert(importJobs).values({ id: newId("job"), userId, type, status: "running", total }).returning();
  return job!;
}

async function finishJob(job: Pick<Job, "id">, patch: Partial<Job>, final: boolean) {
  const db = await getDb();
  const [row] = await db.select().from(importJobs).where(eq(importJobs.id, job.id)).limit(1);
  if (!row) return;
  const next = {
    imported: row.imported + (patch.imported ?? 0),
    skipped: row.skipped + (patch.skipped ?? 0),
    failed: row.failed + (patch.failed ?? 0),
    report: [...row.report, ...(patch.report ?? [])].slice(0, 2000),
    pendingMatches: [...row.pendingMatches, ...(patch.pendingMatches ?? [])].slice(0, 500),
  };
  const status = final ? (next.failed || next.pendingMatches.length ? (next.imported ? "partial" : next.pendingMatches.length ? "partial" : "failed") : "completed") : "running";
  await db.update(importJobs).set({ ...next, status, finishedAt: final ? new Date() : null }).where(eq(importJobs.id, job.id));
}

export async function listJobs(userId: string) {
  const db = await getDb();
  return db.select().from(importJobs).where(eq(importJobs.userId, userId)).orderBy(desc(importJobs.createdAt)).limit(20);
}

export async function getJob(userId: string, jobId: string) {
  const db = await getDb();
  const [job] = await db.select().from(importJobs).where(and(eq(importJobs.id, jobId), eq(importJobs.userId, userId))).limit(1);
  if (!job) throw new AppError("not_found", "Import job not found");
  return job;
}

/* ────────────────────────────── CSV ────────────────────────────── */

export const csvRowSchema = z.object({
  row: z.number().int(),
  title: z.string().trim().max(200).optional(),
  igdbId: z.coerce.number().int().positive().optional(),
  platform: z.string().max(60).optional(),
  ownership: z.string().max(20).optional(),
  status: z.string().max(20).optional(),
  edition: z.string().max(120).optional(),
  region: z.string().max(40).optional(),
  purchaseDate: z.string().max(20).optional(),
  purchasePrice: z.coerce.number().nonnegative().optional(),
  purchaseCurrency: z.string().max(3).optional(),
  notes: z.string().max(2000).optional(),
});
export type CsvRow = z.infer<typeof csvRowSchema>;

function pickMatch(title: string, games: CatalogGameRow[]) {
  const t = norm(title);
  const exact = games.filter((g) => norm(g.title) === t || g.alternativeNames.some((a) => norm(a) === t));
  return { exact, candidates: games.slice(0, 5) };
}

/** Processes one batch of mapped CSV rows; the client sends batches so each request stays short. */
export async function importCsvBatch(userId: string, jobId: string, rows: CsvRow[], final: boolean) {
  const job = await getJob(userId, jobId);
  if (job.status !== "running") throw new AppError("conflict", "Import job is not running");
  const report: ReportLine[] = [];
  const pending: Pending[] = [];
  let imported = 0, skipped = 0, failed = 0;
  const occurrences = new Map<string, number>();

  for (const r of rows) {
    const label = r.title ?? (r.igdbId ? `IGDB #${r.igdbId}` : `#${r.row}`);
    try {
      const generationId = generationFromAlias(r.platform);
      if (!generationId) {
        failed++; report.push({ row: r.row, title: label, reason: `unknown platform "${r.platform ?? ""}"` });
        continue;
      }
      let game: CatalogGameRow | undefined;
      if (r.igdbId) {
        game = await getCatalogGame(`igdb-${r.igdbId}`).catch(() => undefined);
      }
      if (!game && r.title) {
        const res = await searchCatalog(r.title, { userId });
        const { exact, candidates } = pickMatch(r.title, res.games);
        if (exact.length === 1) game = exact[0];
        else if (candidates.length) {
          pending.push({ ref: JSON.stringify({ ...r, generationId }), title: r.title, candidates: candidates.map((c) => ({ id: c.id, title: c.title, year: c.releaseDate?.slice(0, 4) })) });
          continue;
        }
      }
      if (!game) {
        failed++; report.push({ row: r.row, title: label, reason: "no catalog match" });
        continue;
      }
      const ownership = /dij|dig/i.test(r.ownership ?? "") || generationId.startsWith("pc-") && !/fiz|phys/i.test(r.ownership ?? "") ? "digital" : "physical";
      const status = (statuses as readonly string[]).includes((r.status ?? "").toLowerCase()) ? (r.status!.toLowerCase() as (typeof statuses)[number]) : "backlog";
      const base = sha256([game.id, generationId, ownership, r.edition ?? "", r.region ?? ""].join("|")).slice(0, 24);
      const n = (occurrences.get(base) ?? 0) + 1;
      occurrences.set(base, n);
      const res = await addGameToCollection(
        userId,
        {
          catalogGameId: game.id, generationId, ownershipType: ownership, status, isFavorite: false,
          edition: r.edition, region: r.region, notes: r.notes,
          purchaseDate: /^\d{4}-\d{2}-\d{2}$/.test(r.purchaseDate ?? "") ? r.purchaseDate : undefined,
          purchasePrice: r.purchasePrice, purchaseCurrency: r.purchaseCurrency?.toUpperCase(),
        },
        { source: "csv-import", externalRef: `${base}:${n}`, skipAwards: true },
      );
      if (res) imported++;
      else { skipped++; report.push({ row: r.row, title: label, reason: "already imported" }); }
    } catch (e) {
      failed++;
      report.push({ row: r.row, title: label, reason: e instanceof AppError ? e.message : "error" });
    }
  }
  await finishJob(job, { imported, skipped, failed, report, pendingMatches: pending }, final);
  const unlocked = final ? await evaluateAwards(userId) : [];
  return { imported, skipped, failed, report, pending: pending.length, unlocked };
}

/** Confirms an ambiguous match chosen by the user (CSV or Steam). */
export async function resolvePending(userId: string, jobId: string, ref: string, catalogGameId: string | null) {
  const job = await getJob(userId, jobId);
  const item = job.pendingMatches.find((p) => p.ref === ref);
  if (!item) throw new AppError("not_found", "Pending match not found");
  const db = await getDb();
  const remaining = job.pendingMatches.filter((p) => p.ref !== ref);
  let added = false;
  if (catalogGameId) {
    if (!item.candidates.some((c) => c.id === catalogGameId)) throw new AppError("invalid", "Choose one of the suggested games");
    if (job.type === "steam") {
      const data = JSON.parse(ref) as { appId: string; playtimeMinutes: number };
      added = !!(await addGameToCollection(userId, { catalogGameId, generationId: "pc-steam", store: "steam", ownershipType: "digital", status: "backlog", isFavorite: false },
        { source: "steam-import", externalRef: data.appId, playtimeMinutes: data.playtimeMinutes, verification: "platform-confirmed" }));
    } else {
      const r = JSON.parse(ref) as CsvRow & { generationId: string };
      added = !!(await addGameToCollection(userId, {
        catalogGameId, generationId: r.generationId, ownershipType: /dij|dig/i.test(r.ownership ?? "") ? "digital" : "physical",
        status: "backlog", isFavorite: false, edition: r.edition, region: r.region,
      }, { source: "csv-import", externalRef: sha256(ref).slice(0, 24) }));
    }
  }
  await db.update(importJobs).set({
    pendingMatches: remaining,
    imported: job.imported + (added ? 1 : 0),
    skipped: job.skipped + (catalogGameId ? 0 : 1),
    status: remaining.length ? job.status : job.failed ? "partial" : "completed",
  }).where(eq(importJobs.id, jobId));
  return { added };
}

/* ────────────────────────────── Steam ────────────────────────────── */

export async function syncSteam(userId: string) {
  const db = await getDb();
  const [link] = await db.select().from(linkedAccounts).where(and(eq(linkedAccounts.userId, userId), eq(linkedAccounts.provider, "steam"))).limit(1);
  if (!link) throw new AppError("invalid", "Link your Steam account first");
  if (!igdbConfigured()) throw new AppError("unavailable", "Steam import needs the IGDB catalog to match games. Configure IGDB credentials first.");
  const owned = await getOwnedGames(link.externalId);
  const job = await createJob(userId, "steam", owned?.length ?? 0);
  if (owned === null) {
    await finishJob(job, { failed: 0, report: [{ reason: "steam-library-private" }] }, true);
    await db.update(importJobs).set({ status: "failed" }).where(eq(importJobs.id, job.id));
    return getJob(userId, job.id);
  }
  try {
    const existing = await db.select({ ref: userGames.externalRef }).from(userGames).where(and(eq(userGames.userId, userId), eq(userGames.source, "steam-import")));
    const have = new Set(existing.map((e) => e.ref));
    const todo = owned.filter((g) => !have.has(g.appId));
    const matched = await findBySteamAppIds(todo.map((g) => g.appId));
    let imported = 0, failed = 0;
    const report: ReportLine[] = [];
    const pending: Pending[] = [];
    let nameSearches = 0;
    for (const g of todo) {
      const game = matched.get(g.appId);
      if (game) {
        const r = await addGameToCollection(userId, { catalogGameId: game.id, generationId: "pc-steam", store: "steam", ownershipType: "digital", status: "backlog", isFavorite: false },
          { source: "steam-import", externalRef: g.appId, playtimeMinutes: g.playtimeMinutes, verification: "platform-confirmed", skipAwards: true });
        if (r) imported++;
        continue;
      }
      if (nameSearches < 30) {
        nameSearches++;
        const res = await searchCatalog(g.name, { platform: 6 }).catch(() => null);
        if (res?.games.length) {
          pending.push({ ref: JSON.stringify({ appId: g.appId, playtimeMinutes: g.playtimeMinutes }), title: g.name, candidates: res.games.slice(0, 5).map((c) => ({ id: c.id, title: c.title, year: c.releaseDate?.slice(0, 4) })) });
          continue;
        }
      }
      failed++;
      report.push({ title: g.name, reason: "no catalog match" });
    }
    await finishJob(job, { imported, failed, skipped: owned.length - todo.length, report, pendingMatches: pending }, true);
    await evaluateAwards(userId);
  } catch (e) {
    await finishJob(job, { report: [{ reason: e instanceof Error ? e.message : "error" }] }, true);
    await db.update(importJobs).set({ status: "failed" }).where(eq(importJobs.id, job.id));
  }
  return getJob(userId, job.id);
}

/* ────────────────────────────── Demo import ────────────────────────────── */

/** Copies the demo showcase into the account. Only called after explicit confirmation in the UI. */
export async function importDemoCollection(userId: string) {
  let imported = 0;
  for (const o of DEMO_OWNERSHIP) {
    const r = await addGameToCollection(
      userId,
      { catalogGameId: demoGameId(o.slug), generationId: o.generationId, ownershipType: o.ownership, status: o.status, isFavorite: !!o.favorite },
      { source: "demo-import", externalRef: `${o.slug}:${o.generationId}`, skipAwards: true },
    );
    if (r) imported++;
  }
  const unlocked = await evaluateAwards(userId);
  return { imported, unlocked };
}

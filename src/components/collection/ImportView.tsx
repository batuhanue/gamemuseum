"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useTranslations, useFormatter } from "next-intl";
import Papa from "papaparse";
import { FileUp } from "lucide-react";
import { api, ApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { useUnlocks } from "@/stores/unlock-store";

const FIELDS = ["title", "igdbId", "platform", "ownership", "status", "edition", "region", "purchaseDate", "purchasePrice", "purchaseCurrency", "notes"] as const;
type Field = (typeof FIELDS)[number];
type Job = {
  id: string; type: "csv" | "steam"; status: "pending" | "running" | "completed" | "partial" | "failed";
  total: number; imported: number; skipped: number; failed: number; createdAt: string;
  report: { row?: number; title?: string; reason: string }[];
  pendingMatches: { ref: string; title: string; candidates: { id: string; title: string; year?: string }[] }[];
};

const GUESS: Record<Field, RegExp> = {
  title: /^(title|name|game|oyun|ad[ıi])$/i, igdbId: /igdb/i, platform: /^(platform|system|konsol|console)$/i, ownership: /(owner|format|sahiplik|type)/i,
  status: /^(status|durum)$/i, edition: /(edition|sürüm|baskı)/i, region: /(region|bölge)/i, purchaseDate: /(date|tarih)/i, purchasePrice: /(price|fiyat)/i,
  purchaseCurrency: /(currency|para)/i, notes: /(note|not)/i,
};

export function ImportView() {
  const t = useTranslations();
  const f = useFormatter();
  const qc = useQueryClient();
  const params = useSearchParams();
  const pushUnlocks = useUnlocks((s) => s.push);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<Field, string>>>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState<{ imported: number; skipped: number; failed: number; pending: number; report: Job["report"] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const jobs = useQuery({ queryKey: ["import-jobs"], queryFn: () => api<{ jobs: Job[] }>("/api/collection/import/jobs") });
  const steam = useQuery({ queryKey: ["steam"], queryFn: () => api<{ linked: { steamId: string } | null; steamConfigured: boolean; igdbConfigured: boolean }>("/api/steam/sync") });
  const [syncing, setSyncing] = useState(false);
  const steamState = params.get("steam");

  const onFile = (file: File) => {
    setSummary(null);
    setError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const hs = res.meta.fields ?? [];
        setHeaders(hs);
        setRows(res.data.slice(0, 5000));
        const m: Partial<Record<Field, string>> = {};
        for (const fld of FIELDS) {
          const h = hs.find((x) => GUESS[fld].test(x.trim()));
          if (h) m[fld] = h;
        }
        setMapping(m);
      },
      error: (e) => setError(e.message),
    });
  };

  const run = async () => {
    setError(null);
    try {
      const { job } = await api<{ job: { id: string } }>("/api/collection/import/csv", { method: "POST", body: { action: "start", total: rows.length } });
      const mapped = rows.map((r, i) => {
        const o: Record<string, unknown> = { row: i + 2 };
        for (const fld of FIELDS) {
          const h = mapping[fld];
          const v = h ? r[h]?.trim() : undefined;
          if (v) o[fld] = v;
        }
        return o;
      });
      const agg = { imported: 0, skipped: 0, failed: 0, pending: 0, report: [] as Job["report"], unlocked: [] as string[] };
      for (let i = 0; i < mapped.length; i += 25) {
        const batch = mapped.slice(i, i + 25);
        const r = await api<{ imported: number; skipped: number; failed: number; pending: number; report: Job["report"]; unlocked: { awardId: string }[] }>("/api/collection/import/csv", {
          method: "POST",
          body: { action: "batch", jobId: job.id, rows: batch, final: i + 25 >= mapped.length },
        });
        agg.imported += r.imported; agg.skipped += r.skipped; agg.failed += r.failed; agg.pending += r.pending;
        agg.report.push(...r.report);
        agg.unlocked.push(...r.unlocked.map((u) => u.awardId));
        setProgress({ done: Math.min(mapped.length, i + 25), total: mapped.length });
      }
      setSummary(agg);
      if (agg.unlocked.length) pushUnlocks(agg.unlocked);
      await Promise.all(["import-jobs", "collection", "museum"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("common.error"));
    } finally {
      setProgress(null);
    }
  };

  const resolve = async (job: Job, ref: string, catalogGameId: string | null) => {
    await api("/api/collection/import/resolve", { method: "POST", body: { jobId: job.id, ref, catalogGameId } });
    await Promise.all(["import-jobs", "collection", "museum"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
  };

  return (
    <div className="space-y-8">
      <h1 className="display text-4xl">{t("import.title")}</h1>

      <section className="panel p-5">
        <h2 className="display text-2xl">{t("import.csvTitle")}</h2>
        <p className="mt-1 text-sm text-slate">{t("import.csvBody")}</p>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-3 text-sm hover:border-gold/50">
          <FileUp size={16} /> {t("import.chooseFile")}
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        {headers.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 text-sm">{t("import.mapping")} · <span className="text-slate">{t("import.rows", { count: rows.length })}</span></div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map((fld) => (
                <label key={fld} className="text-xs">
                  <span className="label">{t(`import.field_${fld}`)}</span>
                  <select className="field" value={mapping[fld] ?? ""} onChange={(e) => setMapping({ ...mapping, [fld]: e.target.value || undefined })}>
                    <option value="">{t("import.ignore")}</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <Button variant="primary" className="mt-4" disabled={!!progress || !(mapping.title || mapping.igdbId) || !mapping.platform} onClick={() => void run()}>
              {progress ? `${progress.done} / ${progress.total}` : t("import.start")}
            </Button>
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-[#ff9a92]">{error}</p>}
        {summary && (
          <div className="mt-4 rounded-xl border hairline p-3 text-sm" role="status">
            {t("import.result", { imported: summary.imported, skipped: summary.skipped, failed: summary.failed, pending: summary.pending })}
            {summary.report.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-slate">{t("import.failedRows")}</summary>
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-slate">{summary.report.map((r, i) => <li key={i}>#{r.row ?? "–"} {r.title} — {r.reason}</li>)}</ul>
              </details>
            )}
          </div>
        )}
      </section>

      <section className="panel p-5">
        <h2 className="display text-2xl">{t("import.steamTitle")}</h2>
        <p className="mt-1 text-sm text-slate">{t("import.steamBody")}</p>
        {steamState && <p className="mt-2 text-sm text-gold" role="status">{t(`import.steamState_${steamState}` as "import.steamState_linked")}</p>}
        {steam.data && (!steam.data.steamConfigured || !steam.data.igdbConfigured) && <p className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate">{t("import.steamNotConfigured")}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {steam.data?.linked ? (
            <>
              <Badge tone="gold">{t("import.steamLinked", { id: steam.data.linked.steamId })}</Badge>
              <Button
                variant="primary"
                disabled={syncing || !steam.data.steamConfigured || !steam.data.igdbConfigured}
                onClick={async () => {
                  setSyncing(true);
                  try {
                    await api("/api/steam/sync", { method: "POST" });
                  } catch (e) {
                    setError(e instanceof ApiError ? e.message : t("common.error"));
                  }
                  setSyncing(false);
                  await Promise.all(["import-jobs", "collection", "museum"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
                }}
              >
                {syncing ? t("common.loading") : t("import.steamSync")}
              </Button>
              <Button variant="ghost" onClick={async () => { await api("/api/steam/sync", { method: "DELETE" }); await qc.invalidateQueries({ queryKey: ["steam"] }); }}>{t("import.steamUnlink")}</Button>
            </>
          ) : (
            <Button asChild variant="secondary"><a href="/api/steam/link">{t("import.steamLink")}</a></Button>
          )}
        </div>
        <p className="mt-4 text-xs text-slate">{t("import.consoleNote")}</p>
      </section>

      <section>
        <h2 className="display mb-3 text-2xl">{t("import.jobs")}</h2>
        <ul className="space-y-2">
          {jobs.data?.jobs.map((j) => (
            <li key={j.id} className="panel p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{j.type.toUpperCase()}</Badge>
                <Badge tone={j.status === "completed" ? "gold" : j.status === "failed" ? "danger" : "neutral"}>{t(`import.job_${j.status}`)}</Badge>
                <span className="text-xs text-slate">{f.dateTime(new Date(j.createdAt), { dateStyle: "medium", timeStyle: "short" })}</span>
                <span className="ml-auto text-xs text-slate">{t("import.result", { imported: j.imported, skipped: j.skipped, failed: j.failed, pending: j.pendingMatches.length })}</span>
              </div>
              {j.report.some((r) => r.reason === "steam-library-private") && <p className="mt-2 text-xs text-gold">{t("import.steamPrivate")}</p>}
              {j.pendingMatches.length > 0 && (
                <details className="mt-2" open>
                  <summary className="cursor-pointer text-xs text-slate">{t("import.pending")}</summary>
                  <ul className="mt-2 space-y-2">
                    {j.pendingMatches.slice(0, 30).map((p) => (
                      <li key={p.ref} className="rounded-lg border hairline p-2">
                        <div className="text-xs">“{p.title}”</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {p.candidates.map((c) => <Button key={c.id} size="sm" variant="outline" onClick={() => void resolve(j, p.ref, c.id)}>{c.title}{c.year ? ` (${c.year})` : ""}</Button>)}
                          <Button size="sm" variant="ghost" onClick={() => void resolve(j, p.ref, null)}>{t("import.skip")}</Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

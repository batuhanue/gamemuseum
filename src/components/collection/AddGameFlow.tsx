"use client";
import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Check, ChevronLeft } from "lucide-react";
import { api, ApiError } from "@/lib/client/api";
import type { CatalogGameDto } from "@/features/games/dto";
import { GENERATIONS, IGDB_PLATFORM_NAMES } from "@/features/platforms/reference";
import { Button } from "@/components/ui/button";
import { PlatformMark } from "@/components/shell/PlatformMark";
import { CoverImage } from "@/components/museum/CoverImage";
import { demoPalette } from "@/features/games/demo-catalog";
import { useUnlocks } from "@/stores/unlock-store";
import { GameSearch } from "./GameSearch";
import { cn } from "@/lib/cn";

type Step = "search" | "platform" | "ownership" | "details" | "done";
const STORES = ["steam", "epic", "gog", "other"] as const;

export function AddGameFlow({ onAdded, compact, preselected }: { onAdded?: (r: { copyId: string; title: string; platformId: string }) => void; compact?: boolean; preselected?: CatalogGameDto }) {
  const t = useTranslations();
  const qc = useQueryClient();
  const pushUnlocks = useUnlocks((s) => s.push);
  const [step, setStep] = useState<Step>(preselected ? "platform" : "search");
  const [game, setGame] = useState<CatalogGameDto | null>(preselected ?? null);
  const [generationId, setGenerationId] = useState<string>("");
  const [ownership, setOwnership] = useState<"physical" | "digital">("physical");
  const [store, setStore] = useState<(typeof STORES)[number]>("steam");
  const [details, setDetails] = useState({ edition: "", region: "", condition: "", purchaseDate: "", purchasePrice: "", purchaseCurrency: "TRY", status: "backlog", isFavorite: false, rating: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ copyId: string; platformId: string } | null>(null);
  const [manual, setManual] = useState<{ open: boolean; title: string; year: string; platforms: number[] }>({ open: false, title: "", year: "", platforms: [] });

  const isPc = generationId === "pc";
  // Manual entries without platform data may go on any console shelf; catalog games only where released.
  const consoleGens = !game ? [] : game.dataSource === "manual" && !game.igdbPlatformIds.length ? GENERATIONS.filter((g) => g.kind === "console") : GENERATIONS.filter((g) => game.availableGenerations.includes(g.id));

  const submit = async () => {
    if (!game) return;
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        catalogGameId: game.id,
        generationId: isPc ? `pc-${store}` : generationId,
        ownershipType: ownership,
        store: isPc ? store : undefined,
        status: details.status,
        isFavorite: details.isFavorite,
      };
      if (details.edition) body.edition = details.edition;
      if (details.region) body.region = details.region;
      if (details.condition && ownership === "physical") body.condition = details.condition;
      if (details.purchaseDate) body.purchaseDate = details.purchaseDate;
      if (details.purchasePrice) {
        body.purchasePrice = Number(details.purchasePrice);
        body.purchaseCurrency = details.purchaseCurrency;
      }
      if (details.rating) body.rating = Number(details.rating);
      if (details.notes) body.notes = details.notes;
      const res = await api<{ copy: { id: string; platformId: string }; unlocked: { awardId: string }[] }>("/api/collection", { method: "POST", body });
      setResult({ copyId: res.copy.id, platformId: res.copy.platformId });
      setStep("done");
      await Promise.all([qc.invalidateQueries({ queryKey: ["museum"] }), qc.invalidateQueries({ queryKey: ["collection"] })]);
      if (res.unlocked.length) pushUnlocks(res.unlocked.map((u) => u.awardId));
      onAdded?.({ copyId: res.copy.id, title: game.title, platformId: res.copy.platformId });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep("search");
    setGame(null);
    setGenerationId("");
    setResult(null);
    setError(null);
  };

  const steps: { key: Step; label: string }[] = [
    { key: "search", label: t("add.step1") },
    { key: "platform", label: t("add.step2") },
    { key: "ownership", label: t("add.step3") },
    { key: "details", label: t("add.step4") },
  ];
  const idx = steps.findIndex((s) => s.key === step);

  return (
    <div>
      {!compact && (
        <ol className="mb-6 flex items-center gap-2 text-xs" aria-label={t("add.title")}>
          {steps.map((s, i) => (
            <li key={s.key} className={cn("flex items-center gap-2", i <= idx || step === "done" ? "text-ivory" : "text-slate")}>
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border", i < idx || step === "done" ? "border-gold bg-gold text-obsidian" : i === idx ? "border-gold text-gold" : "border-white/15")}>
                {i < idx || step === "done" ? <Check size={12} /> : i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
              {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-white/10" />}
            </li>
          ))}
        </ol>
      )}

      {game && step !== "search" && step !== "done" && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border hairline p-2">
          <div className="w-12"><CoverImage title={game.title} url={game.coverUrl} palette={game.dataSource === "demo" ? demoPalette(game.id) : undefined} tiny /></div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{game.title}</div>
            <div className="text-xs text-slate">{game.releaseDate?.slice(0, 4) ?? "—"}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStep(step === "platform" ? "search" : step === "ownership" ? "platform" : "ownership")}><ChevronLeft size={14} /> {t("common.back")}</Button>
        </div>
      )}

      {step === "search" && (
        <>
          <GameSearch autoFocus onPick={(g) => { setGame(g); setGenerationId(""); setStep("platform"); }} />
          <div className="mt-6 rounded-xl border border-dashed border-white/10 p-4">
            <div className="text-sm">{t("add.manualTitle")}</div>
            <p className="text-xs text-slate">{t("add.manualBody")}</p>
            {manual.open ? (
              <form
                className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px]"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const r = await api<{ game: CatalogGameDto }>("/api/collection/manual", { method: "POST", body: { title: manual.title, year: manual.year ? Number(manual.year) : undefined, platformIds: manual.platforms } });
                    setGame(r.game);
                    setStep("platform");
                  } catch (err) {
                    setError(err instanceof ApiError ? err.message : t("common.error"));
                  }
                }}
              >
                <input required className="field" placeholder={t("add.searchPlaceholder")} value={manual.title} onChange={(e) => setManual({ ...manual, title: e.target.value })} aria-label={t("add.searchPlaceholder")} />
                <input className="field" inputMode="numeric" placeholder={t("add.year")} value={manual.year} onChange={(e) => setManual({ ...manual, year: e.target.value.replace(/\D/g, "").slice(0, 4) })} aria-label={t("add.year")} />
                <fieldset className="sm:col-span-2 flex flex-wrap gap-2">
                  <legend className="label">{t("game.platforms")}</legend>
                  {Object.entries(IGDB_PLATFORM_NAMES).map(([id, name]) => (
                    <label key={id} className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-xs">
                      <input type="checkbox" checked={manual.platforms.includes(Number(id))} onChange={(e) => setManual({ ...manual, platforms: e.target.checked ? [...manual.platforms, Number(id)] : manual.platforms.filter((p) => p !== Number(id)) })} /> {name}
                    </label>
                  ))}
                </fieldset>
                <Button type="submit" variant="outline" className="sm:col-span-2">{t("add.manualCreate")}</Button>
              </form>
            ) : (
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setManual({ ...manual, open: true })}>{t("add.manualCreate")}</Button>
            )}
          </div>
        </>
      )}

      {step === "platform" && game && (
        <div>
          <h3 className="mb-3 text-sm text-slate">{t("add.choosePlatform")}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {consoleGens.map((g) => (
              <button key={g.id} onClick={() => { setGenerationId(g.id); setOwnership("physical"); setStep("ownership"); }} className={cn("flex items-center gap-2 rounded-xl border p-3 text-left text-sm", generationId === g.id ? "border-gold" : "border-white/[0.08] hover:border-white/25")}>
                <PlatformMark platform={g.platformId} size={24} /> {g.name}
              </button>
            ))}
            {game.pc && (
              <button onClick={() => { setGenerationId("pc"); setOwnership("digital"); setStep("ownership"); }} className={cn("flex items-center gap-2 rounded-xl border p-3 text-left text-sm", isPc ? "border-gold" : "border-white/[0.08] hover:border-white/25")}>
                <PlatformMark platform="pc" size={24} /> PC
              </button>
            )}
          </div>
          {consoleGens.length === 0 && !game.pc && <p className="text-sm text-slate">{t("add.notOnPlatform")}</p>}
        </div>
      )}

      {step === "ownership" && game && (
        <div className="space-y-5">
          <fieldset>
            <legend className="label">{t("add.ownershipType")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["physical", "digital"] as const).map((o) => (
                <button key={o} type="button" aria-pressed={ownership === o} onClick={() => setOwnership(o)} className={cn("rounded-xl border p-3 text-sm", ownership === o ? "border-gold bg-gold/5" : "border-white/[0.08]")}>
                  {t(`common.${o}`)}
                </button>
              ))}
            </div>
          </fieldset>
          {isPc && (
            <fieldset>
              <legend className="label">{t("add.store")}</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {STORES.map((s) => (
                  <button key={s} type="button" aria-pressed={store === s} onClick={() => setStore(s)} className={cn("rounded-xl border p-2.5 text-sm", store === s ? "border-gold bg-gold/5" : "border-white/[0.08]")}>
                    {t(`add.${s}`)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <Button variant="primary" onClick={() => setStep("details")}>{t("common.next")}</Button>
        </div>
      )}

      {step === "details" && game && (
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div><label className="label" htmlFor="d-status">{t("case.status")}</label>
            <select id="d-status" className="field" value={details.status} onChange={(e) => setDetails({ ...details, status: e.target.value })}>
              {["backlog", "playing", "completed", "paused", "dropped"].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
            </select>
          </div>
          <div><label className="label" htmlFor="d-edition">{t("add.edition")} <span className="text-slate/60">· {t("common.optional")}</span></label><input id="d-edition" className="field" value={details.edition} onChange={(e) => setDetails({ ...details, edition: e.target.value })} /></div>
          <div><label className="label" htmlFor="d-region">{t("add.region")}</label><input id="d-region" className="field" placeholder="PAL / NTSC-U / TR…" value={details.region} onChange={(e) => setDetails({ ...details, region: e.target.value })} /></div>
          {ownership === "physical" && (
            <div><label className="label" htmlFor="d-cond">{t("add.condition")}</label>
              <select id="d-cond" className="field" value={details.condition} onChange={(e) => setDetails({ ...details, condition: e.target.value })}>
                <option value="">—</option>
                {["sealed", "complete", "loose", "custom"].map((c) => <option key={c} value={c}>{t(`add.${c}`)}</option>)}
              </select>
            </div>
          )}
          <div><label className="label" htmlFor="d-date">{t("add.purchaseDate")}</label><input id="d-date" type="date" className="field" value={details.purchaseDate} onChange={(e) => setDetails({ ...details, purchaseDate: e.target.value })} /></div>
          <div className="grid grid-cols-[1fr_90px] gap-2">
            <div><label className="label" htmlFor="d-price">{t("add.purchasePrice")}</label><input id="d-price" inputMode="decimal" className="field" value={details.purchasePrice} onChange={(e) => setDetails({ ...details, purchasePrice: e.target.value.replace(/[^\d.]/g, "") })} /></div>
            <div><label className="label" htmlFor="d-cur">{t("add.currency")}</label>
              <select id="d-cur" className="field" value={details.purchaseCurrency} onChange={(e) => setDetails({ ...details, purchaseCurrency: e.target.value })}>
                {["TRY", "USD", "EUR", "GBP", "JPY"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <p className="col-span-2 text-[10px] text-slate">{t("add.priceNote")}</p>
          </div>
          <div><label className="label" htmlFor="d-rating">{t("add.rating")}</label><input id="d-rating" inputMode="decimal" className="field" value={details.rating} onChange={(e) => setDetails({ ...details, rating: e.target.value.replace(/[^\d.]/g, "").slice(0, 4) })} /></div>
          <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={details.isFavorite} onChange={(e) => setDetails({ ...details, isFavorite: e.target.checked })} /> {t("add.favorite")}</label>
          <div className="sm:col-span-2"><label className="label" htmlFor="d-notes">{t("add.notes")}</label><textarea id="d-notes" rows={3} className="field" value={details.notes} onChange={(e) => setDetails({ ...details, notes: e.target.value })} /></div>
          {error && <p role="alert" className="sm:col-span-2 text-sm text-[#ff9a92]">{error}</p>}
          <Button type="submit" variant="primary" disabled={busy} className="sm:col-span-2">{busy ? t("common.saving") : t("add.submit")}</Button>
        </form>
      )}

      {step === "done" && game && result && (
        <div className="panel flex flex-col items-center gap-3 p-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-obsidian"><Check size={20} /></div>
          <p>{t("add.added", { title: game.title })}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild variant="primary"><Link href={`/museum/${result.platformId}?highlight=${result.copyId}`}>{t("add.viewOnShelf")}</Link></Button>
            <Button variant="secondary" onClick={() => { setStep("platform"); setResult(null); }}>{t("add.differentVersion")}</Button>
            <Button variant="ghost" onClick={reset}>{t("add.title")}</Button>
          </div>
        </div>
      )}
      {error && step !== "details" && <p role="alert" className="mt-3 text-sm text-[#ff9a92]">{error}</p>}
    </div>
  );
}

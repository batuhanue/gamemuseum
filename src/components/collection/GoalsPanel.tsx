"use client";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Trash2, X } from "lucide-react";
import { api, ApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/misc";
import { GENERATIONS } from "@/features/platforms/reference";
import { useUnlocks } from "@/stores/unlock-store";
import { GameSearch } from "./GameSearch";
import type { CollectionItem } from "./types";

type Goal = { id: string; title: string; type: "series" | "custom" | "shelf"; owned: number; target: number; seriesName: string | null; generationId: string | null };

/** Personal completion targets — the only denominators used for "collection progress". */
export function GoalsPanel() {
  const t = useTranslations();
  const qc = useQueryClient();
  const pushUnlocks = useUnlocks((s) => s.push);
  const goals = useQuery({ queryKey: ["goals"], queryFn: () => api<{ goals: Goal[] }>("/api/goals") });
  const coll = useQuery({ queryKey: ["collection"], queryFn: () => api<{ items: CollectionItem[] }>("/api/collection") });
  const seriesOptions = useMemo(() => [...new Set((coll.data?.items ?? []).flatMap((i) => i.game.series))].sort(), [coll.data]);
  const [form, setForm] = useState({ title: "", type: "series" as Goal["type"], seriesName: "", generationId: "ps2", targetCount: "25" });
  const [picked, setPicked] = useState<{ id: string; title: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setError(null);
    try {
      const body =
        form.type === "series" ? { title: form.title || form.seriesName, type: "series", seriesName: form.seriesName }
        : form.type === "shelf" ? { title: form.title || GENERATIONS.find((g) => g.id === form.generationId)?.name, type: "shelf", generationId: form.generationId, targetCount: Number(form.targetCount) }
        : { title: form.title, type: "custom", targetGameIds: picked.map((p) => p.id) };
      const r = await api<{ unlocked: { awardId: string }[] }>("/api/goals", { method: "POST", body });
      if (r.unlocked.length) pushUnlocks(r.unlocked.map((u) => u.awardId));
      setPicked([]);
      setForm({ ...form, title: "", seriesName: "" });
      await Promise.all([qc.invalidateQueries({ queryKey: ["goals"] }), qc.invalidateQueries({ queryKey: ["museum"] })]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("common.error"));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section>
        <p className="mb-4 text-sm text-slate">{t("collection.goalsSub")}</p>
        <ul className="space-y-2">
          {goals.data?.goals.map((g) => (
            <li key={g.id} className="panel flex items-center gap-4 p-3">
              <ProgressRing value={g.target ? g.owned / g.target : 0} size={52} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{g.title}</div>
                <div className="text-xs text-slate">{g.owned} / {g.target} · {t(g.type === "series" ? "collection.goalSeries" : g.type === "shelf" ? "collection.goalShelf" : "collection.goalCustom")}</div>
              </div>
              <Button size="icon" variant="ghost" aria-label={t("common.delete")} onClick={async () => { await api(`/api/goals/${g.id}`, { method: "DELETE" }); await qc.invalidateQueries({ queryKey: ["goals"] }); await qc.invalidateQueries({ queryKey: ["museum"] }); }}>
                <Trash2 size={16} />
              </Button>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel h-fit p-4">
        <h2 className="display mb-3 text-2xl">{t("collection.newGoal")}</h2>
        <div className="space-y-3">
          <div><label className="label" htmlFor="g-type">{t("collection.goalType")}</label>
            <select id="g-type" className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Goal["type"] })}>
              <option value="series">{t("collection.goalSeries")}</option><option value="shelf">{t("collection.goalShelf")}</option><option value="custom">{t("collection.goalCustom")}</option>
            </select>
          </div>
          <div><label className="label" htmlFor="g-title">{t("collection.goalTitle")}</label><input id="g-title" className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          {form.type === "series" && (
            <div><label className="label" htmlFor="g-series">{t("collection.seriesName")}</label>
              <input id="g-series" list="gm-series" className="field" value={form.seriesName} onChange={(e) => setForm({ ...form, seriesName: e.target.value })} />
              <datalist id="gm-series">{seriesOptions.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
          )}
          {form.type === "shelf" && (
            <div className="grid grid-cols-2 gap-2">
              <div><label className="label" htmlFor="g-gen">{t("collection.generation")}</label>
                <select id="g-gen" className="field" value={form.generationId} onChange={(e) => setForm({ ...form, generationId: e.target.value })}>{GENERATIONS.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
              </div>
              <div><label className="label" htmlFor="g-n">{t("collection.targetCount")}</label><input id="g-n" inputMode="numeric" className="field" value={form.targetCount} onChange={(e) => setForm({ ...form, targetCount: e.target.value.replace(/\D/g, "") })} /></div>
            </div>
          )}
          {form.type === "custom" && (
            <div>
              <div className="mb-2 flex flex-wrap gap-1">
                {picked.map((p) => (
                  <span key={p.id} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-xs">{p.title}<button aria-label={t("common.delete")} onClick={() => setPicked(picked.filter((x) => x.id !== p.id))}><X size={12} /></button></span>
                ))}
              </div>
              <GameSearch onPick={(g) => !picked.some((p) => p.id === g.id) && setPicked([...picked, { id: g.id, title: g.title }])} />
            </div>
          )}
          {error && <p role="alert" className="text-sm text-[#ff9a92]">{error}</p>}
          <Button variant="primary" className="w-full" onClick={() => void create()}>{t("common.save")}</Button>
        </div>
      </section>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Lock, RotateCw, Undo2 } from "lucide-react";
import type { ThemeParams } from "@/lib/db/schema";
import type { MuseumSnapshot } from "@/types/museum";
import { api, ApiError } from "@/lib/client/api";
import { useMuseumStore } from "@/stores/museum-store";
import { PillTabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SCENE_ANCHORS } from "@/features/museum/anchors";
import { useToasts } from "@/stores/toast-store";
import { useUnlocks } from "@/stores/unlock-store";
import { cn } from "@/lib/cn";

type ThemeRow = { id: string; name: { tr: string; en: string }; description: { tr: string; en: string }; params: ThemeParams; premiumSku: string | null; owned: boolean };
type AssetRow = { id: string; name: string; category: string; thumbnailUrl: string | null; premiumSku: string | null; isUnlockable: boolean; unlockRuleId: string | null };

function Swatch({ p }: { p: ThemeParams }) {
  return (
    <div className="relative h-24 overflow-hidden rounded-lg" style={{ background: `linear-gradient(180deg, ${p.wall}, ${p.wall} 58%, ${p.floor} 58%)` }}>
      <div className="absolute inset-x-3 top-3 h-[46%] rounded-sm border" style={{ borderColor: p.trim, background: `linear-gradient(180deg, ${p.shelf}, #000)` }} />
      {[0.32, 0.48, 0.64].map((y) => <div key={y} className="absolute inset-x-4 h-[2px]" style={{ top: `${y * 100}%`, background: p.ledColor, opacity: 0.8 }} />)}
      <div className="absolute bottom-2 left-1/2 h-3 w-16 -translate-x-1/2 rounded-full" style={{ background: p.trim, opacity: 0.6 }} />
    </div>
  );
}

export function CustomizePanel({ snapshot, className }: { snapshot: MuseumSnapshot; className?: string }) {
  const t = useTranslations();
  const locale = useLocale() as "tr" | "en";
  const qc = useQueryClient();
  const toast = useToasts((s) => s.show);
  const pushUnlocks = useUnlocks((s) => s.push);
  const set = useMuseumStore((s) => s.set);
  const [tab, setTab] = useState<"themes" | "objects">("themes");
  const [picked, setPicked] = useState<string>(snapshot.themeId);
  const [previous, setPrevious] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const themes = useQuery({ queryKey: ["themes"], queryFn: () => api<{ activeThemeId: string; themes: ThemeRow[] }>("/api/museum/theme") });
  const assets = useQuery({ queryKey: ["placeable-assets"], queryFn: () => api<{ assets: AssetRow[] }>("/api/museum/objects"), enabled: tab === "objects" });

  // Leaving the page without applying restores the saved theme.
  useEffect(() => () => set({ previewTheme: null }), [set]);

  const preview = (id: string) => {
    setPicked(id);
    const th = themes.data?.themes.find((x) => x.id === id);
    set({ previewTheme: id === snapshot.themeId ? null : th?.params ?? null });
  };

  const apply = async (id: string) => {
    setBusy(true);
    try {
      const res = await api<{ unlocked: { awardId: string }[] }>("/api/museum/theme", { method: "PUT", body: { themeId: id } });
      setPrevious(snapshot.themeId);
      if (res.unlocked.length) pushUnlocks(res.unlocked.map((u) => u.awardId));
      await qc.invalidateQueries({ queryKey: ["museum"] });
      await qc.invalidateQueries({ queryKey: ["themes"] });
      set({ previewTheme: null });
      toast(t("common.saved"), "success");
    } catch (e) {
      toast(e instanceof ApiError && e.code === "premium_required" ? t("customize.locked") : t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  };

  const place = async (anchorId: string, assetId: string | null, rotationY = 0) => {
    try {
      if (assetId) {
        const res = await api<{ unlocked: { awardId: string }[] }>("/api/museum/objects", { method: "PUT", body: { anchorId, assetId, rotationY } });
        if (res.unlocked.length) pushUnlocks(res.unlocked.map((u) => u.awardId));
      } else await api("/api/museum/objects", { method: "DELETE", body: { anchorId } });
      await qc.invalidateQueries({ queryKey: ["museum"] });
    } catch (e) {
      toast(e instanceof ApiError ? e.message : t("common.error"), "error");
    }
  };

  const pickedTheme = themes.data?.themes.find((x) => x.id === picked);
  const awardTitle = (id: string | null) => snapshot.awards.find((a) => a.id === id)?.title ?? id ?? "";

  return (
    <section className={cn("flex flex-col", className)}>
      <h1 className="display text-3xl">{t("customize.title")}</h1>
      <p className="text-sm text-slate">{t("customize.subtitle")}</p>
      <PillTabs className="mt-3" ariaLabel={t("customize.title")} value={tab} onChange={setTab} items={[{ value: "themes", label: t("customize.themes") }, { value: "objects", label: t("customize.objects") }]} />

      {tab === "themes" && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          {picked !== snapshot.themeId && <div className="mb-2 text-[11px] text-gold">{t("customize.previewing")}</div>}
          <ul className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto pb-2">
            {themes.data?.themes.map((th) => (
              <li key={th.id}>
                <button onClick={() => preview(th.id)} aria-pressed={picked === th.id} className={cn("w-full rounded-xl border p-2 text-left", picked === th.id ? "border-[#7aa2ff]" : "border-white/[0.06] hover:border-white/20")}>
                  <Swatch p={th.params} />
                  <div className="mt-2 flex items-center justify-between gap-2 px-1">
                    <span className="text-sm">{th.name[locale]}</span>
                    {snapshot.themeId === th.id ? <Check size={14} className="text-[#7aa2ff]" /> : !th.owned ? <Lock size={13} className="text-slate" /> : null}
                  </div>
                  <div className="px-1 text-[11px] text-slate">{th.description[locale]}</div>
                </button>
              </li>
            ))}
          </ul>
          {pickedTheme && !pickedTheme.owned && <p className="mt-2 text-[11px] text-slate">{t("customize.locked")}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" className="flex-1" disabled={busy || picked === snapshot.themeId || !pickedTheme?.owned} onClick={() => void apply(picked)}>
              {t("customize.applyTheme")}
            </Button>
            {picked !== snapshot.themeId && <Button variant="ghost" onClick={() => preview(snapshot.themeId)}>{t("common.cancel")}</Button>}
            {previous && previous !== snapshot.themeId && (
              <Button variant="ghost" onClick={() => void apply(previous).then(() => { setPicked(previous); setPrevious(null); })}><Undo2 size={14} /> {t("common.undo")}</Button>
            )}
            {snapshot.themeId !== "modern-museum" && <Button variant="ghost" onClick={() => { setPicked("modern-museum"); void apply("modern-museum"); }}>{t("common.reset")}</Button>}
          </div>
        </div>
      )}

      {tab === "objects" && (
        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {assets.data && assets.data.assets.filter((a) => a.category !== "award" && a.category !== "console").length === 0 && (
            <p className="rounded-lg border border-dashed border-white/10 p-4 text-xs text-slate">{t("customize.noAssets")}</p>
          )}
          {SCENE_ANCHORS.map((a) => {
            const current = snapshot.objects.find((o) => o.anchorId === a.id);
            const options = assets.data?.assets.filter((x) => a.accepts.includes(x.category)) ?? [];
            return (
              <div key={a.id} className="rounded-xl border hairline bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm">{t(`customize.anchor_${a.id}`)}</div>
                  {a.premium && <span className="text-[10px] text-gold">{t("customize.premiumSlot")}</span>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {/* Simple slot choice instead of fine 3D dragging — works the same on phones. */}
                  <select aria-label={t("customize.choose")} className="field h-8 flex-1 py-0 text-xs" value={current?.asset?.id ?? (current ? "__missing" : "")} onChange={(e) => void place(a.id, e.target.value || null)}>
                    <option value="">{t("customize.slotEmpty")}</option>
                    {current?.missing && <option value="__missing" disabled>{t("museum.modelMissing")}</option>}
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}{o.premiumSku ? " ★" : ""}{o.isUnlockable && o.unlockRuleId ? ` — ${t("customize.unlockVia", { award: awardTitle(o.unlockRuleId) })}` : ""}</option>
                    ))}
                  </select>
                  {current && current.asset && (
                    <Button size="sm" variant="ghost" aria-label={t("customize.rotate")} onClick={() => void place(a.id, current.asset!.id, ((current.rotationY + Math.PI / 4) % (Math.PI * 2)))}>
                      <RotateCw size={14} />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

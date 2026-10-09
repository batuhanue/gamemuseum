"use client";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Move, Check } from "lucide-react";
import type { GalleryState, ShelfState } from "@/types/museum";
import { useMuseumStore } from "@/stores/museum-store";
import { api, ApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { PillTabs } from "@/components/ui/tabs";
import { SHELF_ROWS } from "@/features/platforms/reference";
import { sortRules } from "@/lib/validation/schemas";
import { moveId } from "@/features/museum/layout";
import { PlatformMark } from "@/components/shell/PlatformMark";
import { CoverImage } from "../CoverImage";
import { useToasts } from "@/stores/toast-store";
import { cn } from "@/lib/cn";

type Props = {
  gallery: GalleryState;
  editable: boolean;
  orders: Record<string, string[]>;
  onReorder: (generationId: string, order: string[]) => void;
  saveState: string;
  compact?: boolean;
  className?: string;
};

export function useShelfSettings() {
  const qc = useQueryClient();
  const toast = useToasts((s) => s.show);
  const t = useTranslations();
  return async (shelf: ShelfState, mode: "auto" | "manual", sortBy: string, order?: string[]) => {
    try {
      await api(`/api/museum/shelves/${shelf.generationId}`, { method: "PUT", body: { mode, sortBy, order, expectedVersion: shelf.version } });
    } catch (e) {
      toast(e instanceof ApiError && e.status === 409 ? t("common.conflict") : t("common.error"), "error");
    }
    await qc.invalidateQueries({ queryKey: ["museum"] });
  };
}

export function GalleryPanel({ gallery, editable, orders, onReorder, saveState, compact, className }: Props) {
  const t = useTranslations();
  const focusGeneration = useMuseumStore((s) => s.focusGeneration);
  const editMode = useMuseumStore((s) => s.editMode);
  const pages = useMuseumStore((s) => s.pages);
  const set = useMuseumStore((s) => s.set);
  const setPage = useMuseumStore((s) => s.setPage);
  const saveSettings = useShelfSettings();

  const shelf = gallery.shelves.find((s) => s.generationId === focusGeneration) ?? null;
  const shelves = shelf ? [shelf] : gallery.shelves;

  const tabs = [{ value: "__all", label: gallery.platformId === "pc" ? t("gallery.all") : t("gallery.allGenerations") }, ...gallery.shelves.map((s) => ({ value: s.generationId, label: s.shortName }))];

  return (
    <aside className={cn("flex flex-col", className)}>
      {!compact && (
        <div className="flex items-center gap-3 px-1">
          <PlatformMark platform={gallery.platformId} size={34} />
          <div>
            <h2 className="display text-2xl leading-none">{t("gallery.collectionOf", { name: gallery.name })}</h2>
            <div className="mt-1 text-xs text-slate">{t("common.games", { count: gallery.total })}</div>
          </div>
        </div>
      )}
      <PillTabs
        className="mt-3"
        ariaLabel={t("gallery.allGenerations")}
        items={tabs}
        value={focusGeneration ?? "__all"}
        onChange={(v) => set({ focusGeneration: v === "__all" ? null : v, selectedCopyId: null, highlightCopyId: null })}
      />

      {shelf && editable && (
        <div className="mt-4 rounded-xl border hairline bg-white/[0.02] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate" htmlFor="gm-mode">{t("gallery.arrange")}</label>
            <select id="gm-mode" className="field h-8 w-auto py-0 text-xs" value={shelf.mode} onChange={(e) => void saveSettings(shelf, e.target.value as "auto" | "manual", e.target.value === "manual" ? "custom" : "added", e.target.value === "manual" ? shelf.games.map((g) => g.copyId) : undefined)}>
              <option value="auto">{t("gallery.auto")}</option>
              <option value="manual">{t("gallery.manual")}</option>
            </select>
            {shelf.mode === "auto" && (
              <select aria-label={t("gallery.sortBy")} className="field h-8 w-auto py-0 text-xs" value={shelf.sortBy} onChange={(e) => void saveSettings(shelf, "auto", e.target.value)}>
                {sortRules.filter((r) => r !== "custom").map((r) => (
                  <option key={r} value={r}>{t(`sort.${r}`)}</option>
                ))}
              </select>
            )}
            <Button
              size="sm"
              variant={editMode ? "primary" : "outline"}
              className="ml-auto"
              onClick={async () => {
                if (!editMode && shelf.mode === "auto") await saveSettings(shelf, "manual", "custom", shelf.games.map((g) => g.copyId));
                set({ editMode: !editMode, selectedCopyId: null });
              }}
            >
              {editMode ? <Check size={14} /> : <Move size={14} />} {editMode ? t("gallery.doneEditing") : t("gallery.editLayout")}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-slate">{editMode ? t("gallery.dragHint") : shelf.mode === "manual" ? t("gallery.manualHint") : ""}</p>
          {saveState !== "idle" && (
            <p className={cn("mt-1 text-[11px]", saveState === "error" || saveState === "conflict" ? "text-[#ff9a92]" : "text-gold-dim")} aria-live="polite">
              {saveState === "saving" ? t("common.saving") : saveState === "saved" ? t("common.saved") : saveState === "offline" ? t("common.offline") : saveState === "conflict" ? t("common.conflict") : t("common.error")}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {shelves.map((s) => {
          const order = orders[s.generationId];
          const games = order ? order.map((id) => s.games.find((g) => g.copyId === id)).filter((g): g is (typeof s.games)[number] => !!g) : s.games;
          const perPage = s.capacity * SHELF_ROWS;
          const pageCount = Math.max(1, Math.ceil(games.length / perPage));
          const page = Math.min(pages[s.generationId] ?? 0, pageCount - 1);
          const canMove = editable && s.mode === "manual";
          return (
            <section key={s.generationId} aria-label={s.name}>
              <div className="mb-2 flex items-center justify-between">
                <button className="text-left" onClick={() => set({ focusGeneration: s.generationId })}>
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-[11px] text-slate">{s.years ? `${s.years} · ` : ""}{t("common.games", { count: s.games.length })}</div>
                </button>
                {pageCount > 1 && (
                  <div className="flex items-center gap-1 text-[11px] text-slate">
                    <button aria-label={t("gallery.prev")} disabled={page === 0} onClick={() => setPage(s.generationId, page - 1)} className="rounded p-1 hover:bg-white/5 disabled:opacity-30"><ChevronLeft size={14} /></button>
                    {t("gallery.page", { page: page + 1, pages: pageCount })}
                    <button aria-label={t("gallery.next")} disabled={page >= pageCount - 1} onClick={() => setPage(s.generationId, page + 1)} className="rounded p-1 hover:bg-white/5 disabled:opacity-30"><ChevronRight size={14} /></button>
                  </div>
                )}
              </div>
              {games.length === 0 ? (
                <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-slate">{t("gallery.empty")}</p>
              ) : (
                <ol className="space-y-1">
                  {games.map((g, i) => (
                    <li key={g.copyId} className="group flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-white/[0.04]">
                      <button
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                        onClick={() => {
                          setPage(s.generationId, Math.floor(i / perPage));
                          set({ selectedCopyId: g.copyId, highlightCopyId: g.copyId, focusGeneration: s.generationId });
                        }}
                      >
                        <div className="w-8 shrink-0"><CoverImage title={g.title} url={g.coverUrl} palette={g.palette} demo={g.dataSource === "demo"} className="rounded-[3px]" tiny /></div>
                        <div className="min-w-0">
                          <div className="truncate text-sm">{g.title}</div>
                          <div className="text-[11px] text-slate">{g.releaseYear ?? ""} · {t(`status.${g.status}`)}</div>
                        </div>
                      </button>
                      {canMove && (
                        <div className="flex opacity-60 group-hover:opacity-100">
                          <button aria-label={t("gallery.moveUp")} disabled={i === 0} onClick={() => onReorder(s.generationId, moveId(games.map((x) => x.copyId), g.copyId, i - 1))} className="rounded p-1 hover:bg-white/10 disabled:opacity-20"><ArrowUp size={14} /></button>
                          <button aria-label={t("gallery.moveDown")} disabled={i === games.length - 1} onClick={() => onReorder(s.generationId, moveId(games.map((x) => x.copyId), g.copyId, i + 1))} className="rounded p-1 hover:bg-white/10 disabled:opacity-20"><ArrowDown size={14} /></button>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
}

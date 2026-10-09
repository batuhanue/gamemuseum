"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, X } from "lucide-react";
import type { MuseumSnapshot } from "@/types/museum";
import { useMuseumStore } from "@/stores/museum-store";
import { api } from "@/lib/client/api";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { CoverImage } from "../CoverImage";
import { cn } from "@/lib/cn";
import { useToasts } from "@/stores/toast-store";
import { useUnlocks } from "@/stores/unlock-store";
import type { CollectionItem } from "@/components/collection/types";

const STATUSES = ["backlog", "playing", "completed", "paused", "dropped"] as const;

export function CaseDetail({ snapshot, readOnly, className, gameHref }: { snapshot: MuseumSnapshot; readOnly: boolean; className?: string; gameHref: (catalogGameId: string, copyId: string) => string }) {
  const t = useTranslations();
  const qc = useQueryClient();
  const toast = useToasts((s) => s.show);
  const pushUnlocks = useUnlocks((s) => s.push);
  const id = useMuseumStore((s) => s.selectedCopyId);
  const set = useMuseumStore((s) => s.set);
  const game = id ? snapshot.galleries.flatMap((g) => g.shelves.flatMap((s) => s.games.map((x) => ({ ...x, shelf: s })))).find((x) => x.copyId === id) : undefined;
  const copy = useQuery({
    queryKey: ["copy", id],
    queryFn: () => api<{ copy: CollectionItem }>(`/api/collection/${id}`),
    enabled: !!id && !readOnly && snapshot.mode === "user",
  });
  if (!game) return null;

  const patch = async (body: Record<string, unknown>) => {
    const v = copy.data?.copy.version;
    if (!v) return;
    try {
      const res = await api<{ unlocked: { awardId: string }[] }>(`/api/collection/${game.copyId}`, { method: "PATCH", body: { ...body, expectedVersion: v } });
      if (res.unlocked.length) pushUnlocks(res.unlocked.map((u) => u.awardId));
      await Promise.all([qc.invalidateQueries({ queryKey: ["museum"] }), qc.invalidateQueries({ queryKey: ["copy", id] }), qc.invalidateQueries({ queryKey: ["collection"] })]);
      toast(t("collection.updated"), "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : t("common.error"), "error");
    }
  };

  return (
    <aside className={cn("panel-glass p-4", className)} aria-label={game.title}>
      <div className="flex gap-4">
        <div className="w-24 shrink-0">
          <CoverImage title={game.title} url={game.coverUrl} palette={game.palette} demo={game.dataSource === "demo"} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="display text-xl leading-tight">{game.title}</h3>
            <button onClick={() => set({ selectedCopyId: null, highlightCopyId: null })} className="rounded-full p-1 text-slate hover:text-ivory" aria-label={t("common.close")}>
              <X size={16} />
            </button>
          </div>
          <div className="mt-1 text-xs text-slate">
            {game.shelf.name}
            {game.releaseYear ? ` · ${game.releaseYear}` : ""}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={game.platformId === "xbox" ? "xbox" : game.platformId === "playstation" ? "ps" : "pc"}>{game.ownershipType === "physical" ? t("common.physical") : t("common.digital")}</Badge>
            <Badge>{t(`status.${game.status}`)}</Badge>
            {game.dataSource === "demo" && <Badge tone="gold">{t("common.demoCatalog")}</Badge>}
            {game.isFavorite && <Badge tone="gold">★</Badge>}
          </div>
          <div className="mt-2 text-[11px] text-slate">{t("case.onShelf", { generation: game.shelf.shortName, shelf: game.shelfIndex + 1, slot: game.slotIndex + 1 })}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="primary" size="sm">
          <Link href={gameHref(game.catalogGameId, game.copyId)}>{t("case.openDetails")}</Link>
        </Button>
        {!readOnly && snapshot.mode === "user" && (
          <>
            <select
              aria-label={t("case.status")}
              className="field h-8 w-auto py-0 text-xs"
              value={copy.data?.copy.status ?? game.status}
              disabled={!copy.data}
              onChange={(e) => void patch({ status: e.target.value })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{t(`status.${s}`)}</option>
              ))}
            </select>
            <Button size="sm" variant="ghost" disabled={!copy.data} onClick={() => void patch({ isFavorite: !(copy.data?.copy.isFavorite ?? game.isFavorite) })} aria-pressed={copy.data?.copy.isFavorite ?? game.isFavorite}>
              <Heart size={14} className={cn((copy.data?.copy.isFavorite ?? game.isFavorite) && "fill-gold text-gold")} />
              {(copy.data?.copy.isFavorite ?? game.isFavorite) ? t("case.unfavorite") : t("case.favorite")}
            </Button>
          </>
        )}
      </div>
    </aside>
  );
}

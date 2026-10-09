"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock, Heart, MapPin, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import type { CatalogGameDto } from "@/features/games/dto";
import { GENERATIONS } from "@/features/platforms/reference";
import { api, ApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { PillTabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/dialog";
import { CoverImage } from "@/components/museum/CoverImage";
import { coverProxyUrl } from "@/components/museum/scene/textures";
import { AddGameFlow } from "@/components/collection/AddGameFlow";
import { EditCopyDialog } from "@/components/collection/EditCopyDialog";
import type { CollectionItem } from "@/components/collection/types";
import { useToasts } from "@/stores/toast-store";
import { useUnlocks } from "@/stores/unlock-store";
import { cn } from "@/lib/cn";

type Copy = Omit<CollectionItem, "game"> & { updatedAt: string };
type Game = CatalogGameDto & { artworkUrls: string[]; screenshotUrls: string[]; videoIds: string[]; totalRating: number | null };

export function GameDetail({ game, copies, signedIn, focusCopyId, palette }: { game: Game; copies: Copy[]; signedIn: boolean; focusCopyId: string | null; palette?: [string, string] }) {
  const t = useTranslations();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToasts((s) => s.show);
  const pushUnlocks = useUnlocks((s) => s.push);
  const [tab, setTab] = useState<"overview" | "collection" | "media" | "notes">("overview");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Copy | null>(null);
  const [removing, setRemoving] = useState<Copy | null>(null);
  const primary = copies.find((c) => c.id === focusCopyId) ?? copies[0];
  const hero = game.artworkUrls[0] ?? game.screenshotUrls[0];
  const year = game.releaseDate?.slice(0, 4);
  const asItem = (c: Copy): CollectionItem => ({ ...c, game: { id: game.id, title: game.title, coverUrl: game.coverUrl, releaseDate: game.releaseDate, dataSource: game.dataSource, series: game.series } });

  const refresh = async () => {
    await Promise.all(["collection", "museum"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
    router.refresh();
  };

  const patch = async (c: Copy, body: Record<string, unknown>) => {
    try {
      const r = await api<{ unlocked: { awardId: string }[] }>(`/api/collection/${c.id}`, { method: "PATCH", body: { ...body, expectedVersion: c.version } });
      if (r.unlocked.length) pushUnlocks(r.unlocked.map((u) => u.awardId));
      await refresh();
    } catch (e) {
      toast(e instanceof ApiError && e.status === 409 ? t("common.conflict") : t("common.error"), "error");
      router.refresh();
    }
  };

  return (
    <div className="-mx-4 -mt-4 lg:-mx-8 lg:-mt-24">
      <div className="relative h-[46dvh] min-h-[320px] overflow-hidden lg:h-[52dvh]">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverProxyUrl(hero)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 60% 20%, ${palette?.[1] ?? "#3a4150"}, ${palette?.[0] ?? "#11151b"} 55%, #080a0e)` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/60 to-transparent" />
        <div className="absolute left-4 top-[calc(var(--safe-top)+12px)] lg:left-8 lg:top-24">
          <Button variant="secondary" size="icon" onClick={() => router.back()} aria-label={t("common.back")}><ArrowLeft size={18} /></Button>
        </div>
        <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-6xl items-end gap-5 px-4 pb-6 lg:px-8">
          <div className="w-28 shrink-0 shadow-2xl lg:w-40"><CoverImage title={game.title} url={game.coverUrl} palette={palette} demo={game.dataSource === "demo"} /></div>
          <div className="min-w-0 pb-1">
            <h1 className="display text-3xl leading-tight lg:text-5xl">{game.title}</h1>
            <div className="mt-1 text-sm text-ivory/80">{[game.developers[0], year].filter(Boolean).join(" · ")}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {game.platformNames.slice(0, 6).map((p) => <Badge key={p}>{p}</Badge>)}
              {game.dataSource === "demo" && <Badge tone="gold">{t("common.demoCatalog")}</Badge>}
              {game.dataSource === "manual" && <Badge>{t("collection.manualEntry")}</Badge>}
            </div>
          </div>
          {copies.length > 0 && (
            <div className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-full border border-xbox/50 bg-xbox/10 px-3 py-1 text-xs text-xbox sm:flex"><CheckCircle2 size={14} /> {t("game.inCollection")}</div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-28 lg:px-8">
        {primary && (
          <div className="panel mb-5 grid grid-cols-3 divide-x divide-white/5 p-3 text-center text-sm">
            <div className="flex flex-col items-center gap-1"><Trophy size={16} className="text-gold" /><span className="text-[11px] text-slate">{t("game.playStatus")}</span><span>{t(`status.${primary.status}`)}</span></div>
            <div className="flex flex-col items-center gap-1"><Clock size={16} className="text-slate" /><span className="text-[11px] text-slate">{t("game.playtime")}</span><span>{primary.playtimeMinutes ? t("game.hours", { hours: Math.round(primary.playtimeMinutes / 60) }) : "—"}</span></div>
            <div className="flex flex-col items-center gap-1"><CheckCircle2 size={16} className="text-slate" /><span className="text-[11px] text-slate">✓</span><span className="text-xs">{primary.verificationStatus === "platform-confirmed" ? t("game.verified") : t("game.selfReported")}</span></div>
          </div>
        )}

        <PillTabs
          ariaLabel={game.title}
          value={tab}
          onChange={setTab}
          items={[
            { value: "overview", label: t("game.overview") },
            { value: "collection", label: t("game.collectionInfo") },
            { value: "media", label: t("game.media") },
            { value: "notes", label: t("game.notes") },
          ]}
        />

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            {tab === "overview" && (
              <div className="space-y-5">
                <section>
                  <h2 className="mb-2 font-semibold">{t("game.description")}</h2>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-ivory/80">{game.summary ?? "—"}</p>
                </section>
                <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <div><dt className="text-xs text-slate">{t("game.developer")}</dt><dd>{game.developers.join(", ") || t("game.unknown")}</dd></div>
                  <div><dt className="text-xs text-slate">{t("game.publisher")}</dt><dd>{game.publishers.join(", ") || t("game.unknown")}</dd></div>
                  <div><dt className="text-xs text-slate">{t("game.released")}</dt><dd>{game.releaseDate ?? t("game.unknown")}</dd></div>
                  <div><dt className="text-xs text-slate">{t("game.genres")}</dt><dd>{game.genres.join(", ") || "—"}</dd></div>
                  <div><dt className="text-xs text-slate">{t("game.series")}</dt><dd>{game.series.join(", ") || "—"}</dd></div>
                  <div><dt className="text-xs text-slate">IGDB</dt><dd>{game.totalRating ? Math.round(game.totalRating) : "—"}</dd></div>
                </dl>
                <p className="text-[11px] text-slate">{t("game.achievementsNote")}</p>
                <p className="text-[10px] text-slate">{t("game.source", { source: game.dataSource.toUpperCase() })} · {game.dataSource === "igdb" ? t("attribution.igdb") : game.dataSource === "demo" ? t("attribution.demo") : ""}</p>
              </div>
            )}
            {tab === "collection" && (
              <div className="space-y-3">
                {copies.length === 0 && <p className="text-sm text-slate">{t("game.notInCollection")}</p>}
                {copies.map((c) => {
                  const gen = GENERATIONS.find((g) => g.id === c.generationId);
                  return (
                    <div key={c.id} className={cn("panel p-4", c.id === focusCopyId && "border-gold/40")}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{gen?.name}</span>
                        <Badge>{t(`common.${c.ownershipType}`)}</Badge>
                        {c.store && <Badge>{c.store}</Badge>}
                        {c.edition && <Badge>{c.edition}</Badge>}
                        {c.region && <Badge>{c.region}</Badge>}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select aria-label={t("case.status")} className="field h-9 w-auto py-0 text-sm" value={c.status} onChange={(e) => void patch(c, { status: e.target.value })}>
                          {["backlog", "playing", "completed", "paused", "dropped"].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                        </select>
                        <Button size="sm" variant="ghost" onClick={() => void patch(c, { isFavorite: !c.isFavorite })} aria-pressed={c.isFavorite}><Heart size={14} className={cn(c.isFavorite && "fill-gold text-gold")} /> {c.isFavorite ? t("case.unfavorite") : t("case.favorite")}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(c)}><Pencil size={14} /> {t("game.editCopy")}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setRemoving(c)}><Trash2 size={14} /> {t("game.removeCopy")}</Button>
                      </div>
                      {c.purchasePrice != null && <div className="mt-2 text-xs text-slate">{t("add.purchasePrice")}: {c.purchasePrice} {c.purchaseCurrency}</div>}
                    </div>
                  );
                })}
              </div>
            )}
            {tab === "media" && (
              <div>
                {[...game.screenshotUrls, ...game.artworkUrls].length === 0 && game.videoIds.length === 0 ? (
                  <p className="text-sm text-slate">{t("game.noMedia")}</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[...game.screenshotUrls, ...game.artworkUrls].slice(0, 8).map((u) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={u} src={coverProxyUrl(u)} alt="" loading="lazy" className="aspect-video w-full rounded-lg object-cover" />
                    ))}
                    {game.videoIds.slice(0, 2).map((v) => (
                      <a key={v} href={`https://www.youtube.com/watch?v=${encodeURIComponent(v)}`} target="_blank" rel="noreferrer" className="flex aspect-video items-center justify-center rounded-lg border hairline text-sm text-slate hover:text-ivory">▶ YouTube</a>
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === "notes" && (
              <div className="space-y-3">
                {copies.filter((c) => c.notes).length === 0 && <p className="text-sm text-slate">{t("game.noNotes")}</p>}
                {copies.filter((c) => c.notes).map((c) => <blockquote key={c.id} className="panel whitespace-pre-line p-4 text-sm">{c.notes}</blockquote>)}
              </div>
            )}
          </div>

          <aside className="space-y-3">
            {signedIn ? (
              <>
                {primary && (
                  <Button asChild variant="primary" size="lg" className="w-full">
                    <Link href={`/museum/${primary.platformId}?highlight=${primary.id}`}><MapPin size={16} /> {t("game.showOnShelf")}</Link>
                  </Button>
                )}
                <Button variant={primary ? "secondary" : "primary"} size="lg" className="w-full" onClick={() => setAdding(true)}>
                  <Plus size={16} /> {primary ? t("add.differentVersion") : t("game.addToCollection")}
                </Button>
              </>
            ) : (
              <Button asChild variant="primary" size="lg" className="w-full"><Link href="/register">{t("common.signUp")}</Link></Button>
            )}
          </aside>
        </div>
      </div>

      <Dialog open={adding} onOpenChange={setAdding} title={t("game.addToCollection")} description={game.title} closeLabel={t("common.close")} className="w-[min(94vw,640px)]">
        <AddGameFlow compact preselected={game} onAdded={() => void refresh()} />
      </Dialog>
      {editing && <EditCopyDialog key={editing.id + editing.version} item={asItem(editing)} allowedGenerations={game.availableGenerations} open onOpenChange={(o) => { if (!o) { setEditing(null); router.refresh(); } }} />}
      <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)} title={t("game.removeCopy")} closeLabel={t("common.close")}>
        <p className="text-sm text-slate">{t("collection.removeConfirm")}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(null)}>{t("common.cancel")}</Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!removing) return;
              await api(`/api/collection/${removing.id}`, { method: "DELETE" });
              setRemoving(null);
              toast(t("collection.removed"), "success");
              await refresh();
            }}
          >
            {t("common.delete")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

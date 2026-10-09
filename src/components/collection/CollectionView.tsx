"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Download, Plus, Upload, Pencil, Trash2, MapPin, Star } from "lucide-react";
import { api, ApiError } from "@/lib/client/api";
import type { CollectionItem } from "./types";
import { Button } from "@/components/ui/button";
import { PillTabs } from "@/components/ui/tabs";
import { Badge, EmptyState, Skeleton } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/dialog";
import { CoverImage } from "@/components/museum/CoverImage";
import { GENERATIONS } from "@/features/platforms/reference";
import { demoPalette } from "@/features/games/demo-catalog";
import { EditCopyDialog } from "./EditCopyDialog";
import { GoalsPanel } from "./GoalsPanel";
import { useToasts } from "@/stores/toast-store";
import { useUnlocks } from "@/stores/unlock-store";

export function CollectionView() {
  const t = useTranslations();
  const qc = useQueryClient();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToasts((s) => s.show);
  const pushUnlocks = useUnlocks((s) => s.push);
  const [tab, setTab] = useState<"games" | "goals">(params.get("tab") === "goals" ? "goals" : "games");
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState("");
  const [status, setStatus] = useState("");
  const [ownership, setOwnership] = useState("");
  const [editing, setEditing] = useState<CollectionItem | null>(null);
  const [removing, setRemoving] = useState<CollectionItem | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ["collection"], queryFn: () => api<{ items: CollectionItem[] }>("/api/collection") });

  const items = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr");
    return (data?.items ?? []).filter(
      (i) =>
        (!s || i.game.title.toLocaleLowerCase("tr").includes(s)) &&
        (!platform || i.platformId === platform) &&
        (!status || i.status === status) &&
        (!ownership || i.ownershipType === ownership),
    );
  }, [data, q, platform, status, ownership]);

  const remove = async (item: CollectionItem) => {
    try {
      await api(`/api/collection/${item.id}`, { method: "DELETE" });
      await Promise.all([qc.invalidateQueries({ queryKey: ["collection"] }), qc.invalidateQueries({ queryKey: ["museum"] })]);
      toast(t("collection.removed"), "success");
      router.refresh();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : t("common.error"), "error");
    }
    setRemoving(null);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-4xl">{t("collection.title")}</h1>
          <p className="text-sm text-slate">{t("collection.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="primary"><Link href="/collection/add"><Plus size={16} /> {t("collection.add")}</Link></Button>
          <Button asChild variant="secondary"><Link href="/collection/import"><Upload size={16} /> {t("collection.import")}</Link></Button>
          <Button asChild variant="ghost"><a href="/api/me/export?format=csv"><Download size={16} /> {t("collection.export")}</a></Button>
        </div>
      </div>
      <PillTabs ariaLabel={t("collection.title")} value={tab} onChange={setTab} items={[{ value: "games", label: t("collection.title") }, { value: "goals", label: t("collection.goals") }]} className="mb-5" />

      {tab === "goals" ? (
        <GoalsPanel />
      ) : (
        <>
          <div className="mb-4 grid gap-2 sm:grid-cols-4">
            <input className="field sm:col-span-1" placeholder={t("collection.searchCollection")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("collection.searchCollection")} />
            <select className="field" value={platform} onChange={(e) => setPlatform(e.target.value)} aria-label={t("collection.filterPlatform")}>
              <option value="">{t("collection.filterPlatform")}</option><option value="xbox">Xbox</option><option value="playstation">PlayStation</option><option value="pc">PC</option>
            </select>
            <select className="field" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("collection.filterStatus")}>
              <option value="">{t("collection.filterStatus")}</option>{["backlog", "playing", "completed", "paused", "dropped"].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
            </select>
            <select className="field" value={ownership} onChange={(e) => setOwnership(e.target.value)} aria-label={t("collection.filterOwnership")}>
              <option value="">{t("collection.filterOwnership")}</option><option value="physical">{t("common.physical")}</option><option value="digital">{t("common.digital")}</option>
            </select>
          </div>

          {isLoading && <div className="space-y-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>}
          {error && <p role="alert" className="text-sm text-[#ff9a92]">{t("common.error")}</p>}
          {data && data.items.length === 0 && (
            <EmptyState
              title={t("collection.empty")}
              body={t("museum.emptyBody")}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild variant="primary"><Link href="/collection/add">{t("museum.addFirst")}</Link></Button>
                  <Button variant="ghost" onClick={() => setDemoOpen(true)}>{t("collection.demoImport")}</Button>
                </div>
              }
            />
          )}
          <ul className="grid gap-2 md:grid-cols-2">
            {items.map((i) => {
              const gen = GENERATIONS.find((g) => g.id === i.generationId);
              return (
                <li key={i.id} className="panel flex gap-3 p-3">
                  <Link href={`/games/${i.game.id}?copy=${i.id}`} className="w-16 shrink-0"><CoverImage title={i.game.title} url={i.game.coverUrl} palette={i.game.dataSource === "demo" ? demoPalette(i.game.id) : undefined} demo={i.game.dataSource === "demo"} tiny /></Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/games/${i.game.id}?copy=${i.id}`} className="block truncate font-medium hover:text-gold">{i.game.title}</Link>
                    <div className="text-xs text-slate">{gen?.name ?? i.generationId}{i.edition ? ` · ${i.edition}` : ""}{i.region ? ` · ${i.region}` : ""}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <Badge tone={i.platformId === "xbox" ? "xbox" : i.platformId === "playstation" ? "ps" : "pc"}>{t(`common.${i.ownershipType}`)}</Badge>
                      <Badge>{t(`status.${i.status}`)}</Badge>
                      {i.isFavorite && <Badge tone="gold"><Star size={10} /> </Badge>}
                      {i.game.dataSource === "demo" && <Badge tone="gold">{t("common.demo")}</Badge>}
                      {i.verificationStatus === "platform-confirmed" && <Badge>{t("game.verified")}</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button asChild size="icon" variant="ghost" aria-label={t("game.showOnShelf")}><Link href={`/museum/${i.platformId}?highlight=${i.id}`}><MapPin size={16} /></Link></Button>
                    <Button size="icon" variant="ghost" aria-label={t("common.edit")} onClick={() => setEditing(i)}><Pencil size={16} /></Button>
                    <Button size="icon" variant="ghost" aria-label={t("common.delete")} onClick={() => setRemoving(i)}><Trash2 size={16} /></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {editing && <EditCopyDialog key={editing.id + editing.version} item={editing} open onOpenChange={(o) => !o && setEditing(null)} />}
      <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)} title={t("game.removeCopy")} description={removing?.game.title} closeLabel={t("common.close")}>
        <p className="text-sm text-slate">{t("collection.removeConfirm")}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(null)}>{t("common.cancel")}</Button>
          <Button variant="danger" onClick={() => removing && void remove(removing)}>{t("common.delete")}</Button>
        </div>
      </Dialog>
      <Dialog open={demoOpen} onOpenChange={setDemoOpen} title={t("collection.demoImport")} closeLabel={t("common.close")}>
        <p className="text-sm text-slate">{t("collection.demoImportConfirm")}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDemoOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="primary"
            onClick={async () => {
              const r = await api<{ imported: number; unlocked: { awardId: string }[] }>("/api/collection/import/demo", { method: "POST", body: { confirm: true } });
              setDemoOpen(false);
              toast(t("collection.demoImported", { count: r.imported }), "success");
              if (r.unlocked.length) pushUnlocks(r.unlocked.map((u) => u.awardId));
              await Promise.all([qc.invalidateQueries({ queryKey: ["collection"] }), qc.invalidateQueries({ queryKey: ["museum"] })]);
            }}
          >
            {t("common.yes")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

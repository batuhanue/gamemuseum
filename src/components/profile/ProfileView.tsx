"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useFormatter } from "next-intl";
import { Pencil, Share2 } from "lucide-react";
import type { MuseumSnapshot } from "@/types/museum";
import { Avatar } from "@/components/shell/Avatar";
import { Button } from "@/components/ui/button";
import { PillTabs } from "@/components/ui/tabs";
import { Dialog } from "@/components/ui/dialog";
import { CoverImage } from "@/components/museum/CoverImage";
import { AwardInfo } from "@/components/museum/panels/AwardDetail";
import { api, ApiError } from "@/lib/client/api";
import { useUnlocks } from "@/stores/unlock-store";
import { Donut } from "./Donut";

type Profile = { displayName: string; username: string; avatarUrl: string | null; bio: string | null; collectionDescription: string | null; memberSince: string; themesOwned: number };
type Activity = { id: string; type: string; at: string };

export function ProfileView({ snapshot, profile, activity, readOnly = false }: { snapshot: MuseumSnapshot; profile: Profile; activity: Activity[]; readOnly?: boolean }) {
  const t = useTranslations();
  const f = useFormatter();
  const router = useRouter();
  const params = useSearchParams();
  const pushUnlocks = useUnlocks((s) => s.push);
  const [tab, setTab] = useState<"collection" | "awards" | "stats" | "activity">((params.get("tab") as "stats") ?? "collection");
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ displayName: profile.displayName, bio: profile.bio ?? "", collectionDescription: profile.collectionDescription ?? "", avatarUrl: profile.avatarUrl ?? "" });
  const [error, setError] = useState<string | null>(null);
  const s = snapshot.stats;
  const games = snapshot.galleries.flatMap((g) => g.shelves.flatMap((sh) => sh.games));
  const recent = games.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const favorites = games.filter((g) => g.isFavorite).slice(0, 8);
  const earned = snapshot.awards.filter((a) => a.earned);
  const parts = [
    { label: "PC", value: s.byPlatform.pc ?? 0, color: "#AEB9C7" },
    { label: "PlayStation", value: s.byPlatform.playstation ?? 0, color: "#477DFF" },
    { label: "Xbox", value: s.byPlatform.xbox ?? 0, color: "#45B36B" },
  ];
  const statusCounts = (["backlog", "playing", "completed", "paused", "dropped"] as const).map((k) => ({ k, n: games.filter((g) => g.status === k).length }));

  const shelf = (list: typeof games) => (
    <ul className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
      {list.map((g) => (
        <li key={g.copyId} className="w-24 shrink-0">
          <Link href={readOnly ? `/games/${g.catalogGameId}` : `/games/${g.catalogGameId}?copy=${g.copyId}`}>
            <CoverImage title={g.title} url={g.coverUrl} palette={g.palette} demo={g.dataSource === "demo"} />
            <div className="mt-1 truncate text-[11px]">{g.title}</div>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col items-center text-center">
        <Avatar name={profile.displayName} url={profile.avatarUrl} size={104} className="border-2 border-[#477DFF]/70 shadow-[0_0_40px_-8px_rgba(71,125,255,0.6)]" />
        <h1 className="mt-4 text-2xl font-semibold">{profile.displayName}</h1>
        <div className="text-sm text-slate">@{profile.username} · {t("common.level", { level: snapshot.owner.level })}</div>
        <p className="mt-2 max-w-md text-sm text-ivory/80">{profile.bio || t("profile.tagline")}</p>
        <div className="mt-4 flex gap-2">
          {!readOnly && <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}><Pencil size={14} /> {t("profile.editProfile")}</Button>}
          {!readOnly && <Button asChild variant="ghost" size="sm"><Link href="/settings#privacy"><Share2 size={14} /> {t("profile.share")}</Link></Button>}
        </div>
      </div>

      <div className="my-6 grid grid-cols-3 divide-x divide-white/5 text-center">
        <div><div className="text-2xl font-light tabular-nums">{s.copies}</div><div className="text-xs text-slate">{t("profile.totalGames")}</div></div>
        <div><div className="text-2xl font-light tabular-nums">{s.awards}</div><div className="text-xs text-slate">{t("profile.earnedAwards")}</div></div>
        <div><div className="text-2xl font-light tabular-nums">{profile.themesOwned}</div><div className="text-xs text-slate">{t("profile.shelfThemes")}</div></div>
      </div>

      <PillTabs ariaLabel={t("profile.title")} value={tab} onChange={setTab} className="justify-center"
        items={[{ value: "collection", label: t("profile.tabCollection") }, { value: "awards", label: t("profile.tabAwards") }, { value: "stats", label: t("profile.tabStats") }, ...(readOnly ? [] : [{ value: "activity" as const, label: t("profile.tabActivity") }])]} />

      <div className="mt-6 space-y-8">
        {tab === "collection" && (
          <>
            <section className="panel p-5">
              <h2 className="mb-4 font-semibold">{t("profile.distribution")}</h2>
              <Donut parts={parts} total={s.copies} label={t("common.games", { count: s.copies }).replace(/^\d+\s*/, "")} />
            </section>
            {profile.collectionDescription && <p className="panel whitespace-pre-line p-4 text-sm text-ivory/80">{profile.collectionDescription}</p>}
            <section>
              <h2 className="mb-3 font-semibold">{t("profile.recent")}</h2>
              {shelf(recent)}
            </section>
            {favorites.length > 0 && (
              <section>
                <h2 className="mb-3 font-semibold">{t("profile.favorites")}</h2>
                {shelf(favorites)}
              </section>
            )}
          </>
        )}
        {tab === "awards" && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {earned.map((a) => <li key={a.id} className="panel p-4"><AwardInfo award={a} readOnly={readOnly} /></li>)}
            {earned.length === 0 && <li className="text-sm text-slate">—</li>}
          </ul>
        )}
        {tab === "stats" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="panel p-4">
              <h3 className="mb-2 text-sm font-semibold">{t("profile.physicalDigital")}</h3>
              <div className="flex h-3 overflow-hidden rounded-full bg-white/5">
                <div className="bg-gold" style={{ width: `${s.copies ? (s.physical / s.copies) * 100 : 0}%` }} />
                <div className="bg-[#477DFF]" style={{ width: `${s.copies ? (s.digital / s.copies) * 100 : 0}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate"><span>{t("common.physical")} {s.physical}</span><span>{t("common.digital")} {s.digital}</span></div>
            </section>
            <section className="panel p-4">
              <h3 className="mb-2 text-sm font-semibold">{t("profile.byStatus")}</h3>
              <ul className="space-y-1 text-sm">{statusCounts.map((x) => <li key={x.k} className="flex justify-between"><span className="text-slate">{t(`status.${x.k}`)}</span><span className="tabular-nums">{x.n}</span></li>)}</ul>
            </section>
            <section className="panel p-4 sm:col-span-2">
              <h3 className="mb-2 text-sm font-semibold">{t("profile.byGeneration")}</h3>
              <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {snapshot.galleries.flatMap((g) => g.shelves).map((sh) => (
                  <li key={sh.generationId} className="flex items-center gap-2">
                    <span className="w-28 truncate text-slate">{sh.name}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5"><span className="block h-full bg-gold/70" style={{ width: `${s.copies ? (sh.games.length / s.copies) * 100 : 0}%` }} /></span>
                    <span className="w-6 text-right tabular-nums">{sh.games.length}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
        {tab === "activity" && (
          <ul className="space-y-1">
            {activity.length === 0 && <li className="text-sm text-slate">{t("profile.noActivity")}</li>}
            {activity.map((a) => (
              <li key={a.id} className="flex justify-between rounded-lg px-3 py-2 text-sm hover:bg-white/[0.03]">
                <span>{t.has(`profile.activity_${a.type}`) ? t(`profile.activity_${a.type}` as "profile.activity_game_added") : a.type}</span>
                <span className="text-xs text-slate">{f.relativeTime(new Date(a.at), new Date())}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen} title={t("profile.editProfile")} closeLabel={t("common.close")}>
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          try {
            const r = await api<{ unlocked: { awardId: string }[] }>("/api/me/profile", { method: "PATCH", body: { displayName: form.displayName, bio: form.bio || null, collectionDescription: form.collectionDescription || null, avatarUrl: form.avatarUrl || null } });
            if (r.unlocked.length) pushUnlocks(r.unlocked.map((u) => u.awardId));
            setEditOpen(false);
            router.refresh();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : t("common.error"));
          }
        }}>
          <div><label className="label" htmlFor="p-name">{t("profile.displayName")}</label><input id="p-name" className="field" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></div>
          <div><label className="label" htmlFor="p-bio">{t("profile.bio")}</label><input id="p-bio" className="field" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
          <div><label className="label" htmlFor="p-desc">{t("profile.collectionDescription")}</label><textarea id="p-desc" rows={4} className="field" value={form.collectionDescription} onChange={(e) => setForm({ ...form, collectionDescription: e.target.value })} /></div>
          <div><label className="label" htmlFor="p-av">{t("profile.avatarUrl")}</label><input id="p-av" className="field" value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} /></div>
          {error && <p role="alert" className="text-sm text-[#ff9a92]">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>{t("common.cancel")}</Button><Button type="submit" variant="primary">{t("common.save")}</Button></div>
        </form>
      </Dialog>
    </div>
  );
}

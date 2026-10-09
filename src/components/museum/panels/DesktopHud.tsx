"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Library, Trophy, ChevronRight, LayoutGrid, ListOrdered, Award, Paintbrush, CheckCircle2 } from "lucide-react";
import type { MuseumSnapshot } from "@/types/museum";
import { PlatformMark } from "@/components/shell/PlatformMark";
import { ProgressRing, Badge } from "@/components/ui/misc";
import { CoverImage } from "../CoverImage";

/** Top statistics strip + featured card + quick actions (desktop home), all computed from the snapshot. */
export function DesktopHud({ snapshot, basePath, readOnly }: { snapshot: MuseumSnapshot; basePath: string; readOnly: boolean }) {
  const t = useTranslations();
  const s = snapshot.stats;
  const goal = s.goalProgress;
  const all = snapshot.galleries.flatMap((g) => g.shelves.flatMap((sh) => sh.games));
  const featured = all.find((g) => g.isFavorite) ?? all.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const firstGallery = snapshot.galleries.find((g) => g.total > 0)?.platformId ?? "playstation";

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-20 z-10 hidden px-5 lg:block">
        <div className="pointer-events-auto mx-auto grid max-w-[1500px] grid-cols-[1fr_1.1fr_1.6fr_0.9fr_1.25fr_1.1fr] gap-3">
          <div className="panel-glass flex items-center gap-3 px-4 py-3">
            <Library className="text-gold" size={30} strokeWidth={1.3} />
            <div>
              <div className="text-3xl font-light tabular-nums">{s.uniqueGames}</div>
              <div className="text-xs text-slate">{t("hud.uniqueGames")}</div>
              <div className="mt-0.5 text-[10px] text-slate/80">{s.copies} {t("hud.copies")} · {s.physical} {t("hud.physical")} · {s.digital} {t("hud.digital")}</div>
            </div>
          </div>
          <div className="panel-glass px-4 py-3">
            <div className="text-lg"><span className="text-2xl font-light tabular-nums">{s.platforms}</span> <span className="text-sm text-slate">{t("hud.platforms")}</span></div>
            <div className="mt-2 flex items-center gap-3 text-sm tabular-nums">
              {snapshot.galleries.map((g) => (
                <Link key={g.platformId} href={`${basePath}/${g.platformId}`} className="flex items-center gap-1.5 hover:text-gold">
                  <PlatformMark platform={g.platformId} size={20} /> {s.byPlatform[g.platformId] ?? 0}
                </Link>
              ))}
            </div>
          </div>
          <div className="panel-glass relative overflow-hidden px-5 py-3 text-right">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(213,180,119,0.18),transparent_55%),linear-gradient(115deg,#1a2230,#0b0d12_60%)]" aria-hidden />
            <div className="relative">
              <div className="display text-2xl tracking-[0.18em]">{t("hud.lifetime")}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-slate">{t("hud.lifetimeSub")}</div>
            </div>
          </div>
          <Link href={`${basePath}/awards`} className="panel-glass flex items-center gap-3 px-4 py-3 hover:border-gold/30">
            <Trophy className="text-gold" size={30} strokeWidth={1.3} />
            <div>
              <div className="text-3xl font-light tabular-nums">{s.awards}</div>
              <div className="text-xs text-slate">{t("hud.awards")}</div>
              <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate/80"><CheckCircle2 size={10} /> {s.completed} {t("hud.completed")}</div>
            </div>
          </Link>
          <div className="panel-glass flex items-center gap-3 px-4 py-3">
            {goal && goal.target > 0 ? (
              <>
                <ProgressRing value={goal.owned / goal.target} size={58} />
                <div className="min-w-0">
                  <div className="text-sm">{t("hud.progress")}</div>
                  <div className="text-[11px] text-slate">{t("hud.progressDetail", { owned: goal.owned, target: goal.target, goals: goal.goals })}</div>
                </div>
              </>
            ) : (
              <div className="min-w-0">
                <div className="text-sm">{t("hud.progress")}</div>
                {readOnly ? <div className="text-[11px] text-slate">—</div> : <Link href="/collection?tab=goals" className="text-[11px] text-gold hover:underline">{t("hud.noGoal")} →</Link>}
                {s.latest && (
                  <div className="mt-1 truncate text-[11px] text-slate">{t("hud.latest")}: <span className="text-ivory">{s.latest.title}</span></div>
                )}
              </div>
            )}
          </div>
          <Link href={`${basePath}/${firstGallery}`} className="panel-glass group relative flex items-center justify-between overflow-hidden px-4 py-3">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#18202c,#0b0d12)]" aria-hidden />
            <div className="relative display text-lg tracking-[0.16em]">{t("hud.exploreMuseum").toUpperCase()}</div>
            <ChevronRight className="relative text-gold transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      {featured && (
        <div className="absolute bottom-6 left-5 z-10 hidden w-[340px] lg:block">
          <div className="eyebrow mb-2 text-ivory/80">▸ {t("museum.featured")}</div>
          <div className="panel-glass flex gap-4 p-4">
            <div className="w-24 shrink-0"><CoverImage title={featured.title} url={featured.coverUrl} palette={featured.palette} demo={featured.dataSource === "demo"} /></div>
            <div className="min-w-0">
              <div className="display text-xl leading-tight">{featured.title}</div>
              <div className="mt-1 text-xs text-slate">{featured.releaseYear ?? ""}</div>
              <div className="mt-2 flex flex-wrap gap-1">{featured.series.slice(0, 2).map((x) => <Badge key={x}>{x}</Badge>)}</div>
              <Link href={`/games/${featured.catalogGameId}${snapshot.mode === "user" ? `?copy=${featured.copyId}` : ""}`} className="mt-3 inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-xs hover:border-gold/50">
                {t("museum.viewInCollection")} <ChevronRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {!readOnly && (
        <nav aria-label={t("museum.quickActions")} className="absolute bottom-6 right-5 z-10 hidden w-64 flex-col gap-2 lg:flex">
          {[
            { href: "/collection", label: t("museum.viewCollection"), icon: LayoutGrid },
            { href: `${basePath}/${firstGallery}`, label: t("museum.organize"), icon: ListOrdered },
            { href: `${basePath}/awards`, label: t("museum.viewAwards"), icon: Award },
            { href: `${basePath}/customize`, label: t("nav.customize"), icon: Paintbrush },
          ].map((a) => (
            <Link key={a.label} href={a.href} className="panel-glass flex items-center gap-3 px-4 py-3 text-sm hover:border-gold/30">
              <a.icon size={18} className="text-gold" strokeWidth={1.5} /> {a.label} <ChevronRight size={14} className="ml-auto text-slate" />
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}

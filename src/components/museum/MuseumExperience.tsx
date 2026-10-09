"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowLeft, ChevronLeft, ChevronRight, Grid2x2, List, Minimize2, MoreHorizontal, Box as BoxIcon, Eye } from "lucide-react";
import type { MuseumSnapshot } from "@/types/museum";
import { api } from "@/lib/client/api";
import { useMuseumStore, type GalleryId } from "@/stores/museum-store";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useShelfLayout } from "@/hooks/useShelfLayout";
import { SHELF_ROWS } from "@/features/platforms/reference";
import { MuseumCanvas } from "./MuseumCanvas";
import { useMuseumRoute } from "./useMuseumRoute";
import { DesktopHud } from "./panels/DesktopHud";
import { GalleryPanel } from "./panels/GalleryPanel";
import { CaseDetail } from "./panels/CaseDetail";
import { AwardDetail } from "./panels/AwardDetail";
import { AwardsPanel } from "./panels/AwardsPanel";
import { CustomizePanel } from "./panels/CustomizePanel";
import { Fallback2D } from "./Fallback2D";
import { MobileHeader } from "@/components/shell/MobileChrome";
import { PlatformMark } from "@/components/shell/PlatformMark";
import { PillTabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { SceneMode, SceneTexts } from "./scene/SceneRoot";

type Props = {
  initial: MuseumSnapshot;
  queryKey: readonly unknown[];
  fetchUrl: string;
  basePath: string;
  readOnly: boolean;
  /** extra query string to keep on navigation (unlisted share key) */
  keepQuery?: string;
  banner?: React.ReactNode;
};

const GALLERY_STYLE: Record<GalleryId, string> = {
  xbox: "from-[#123d24] to-[#0b1a11] border-xbox/40",
  playstation: "from-[#173a8c] to-[#0b1636] border-ps/50",
  pc: "from-[#2a2f37] to-[#121519] border-pc/30",
};

/**
 * The museum: one persistent WebGL canvas shared by every /museum route so moving between the hall,
 * a gallery, the awards showcase or customisation animates the camera instead of reloading a page.
 */
export function MuseumExperience({ initial, queryKey, fetchUrl, basePath, readOnly, keepQuery = "", banner }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const params = useSearchParams();
  const route = useMuseumRoute(basePath);
  const desktop = useIsDesktop();
  const { data } = useQuery({ queryKey, queryFn: () => api<{ snapshot: MuseumSnapshot }>(fetchUrl), initialData: { snapshot: initial } });
  const snapshot = "snapshot" in data ? data.snapshot : initial;
  const editable = !readOnly && snapshot.mode === "user";
  const { orders, reorder, saveState } = useShelfLayout(snapshot, editable);
  const s = {
    webgl: useMuseumStore((x) => x.webgl),
    focusGeneration: useMuseumStore((x) => x.focusGeneration),
    selectedCopyId: useMuseumStore((x) => x.selectedCopyId),
    pages: useMuseumStore((x) => x.pages),
    set: useMuseumStore((x) => x.set),
    setPage: useMuseumStore((x) => x.setPage),
  };
  const [attempt, setAttempt] = useState(0);
  const [mobileView, setMobileView] = useState<"shelf" | "list">("shelf");
  const [force2d, setForce2d] = useState(false);
  const explore = params.get("explore") === "1";
  const qs = keepQuery ? `?${keepQuery}` : "";

  const gameHref = useCallback(
    (catalogGameId: string, copyId: string) => (snapshot.mode === "user" ? `/games/${catalogGameId}?copy=${copyId}` : `/games/${catalogGameId}`),
    [snapshot.mode],
  );

  // URL → camera focus.
  useEffect(() => {
    const st = useMuseumStore.getState();
    if (route.kind === "gallery") {
      const g = snapshot.galleries.find((x) => x.platformId === route.gallery);
      const firstFilled = g?.shelves.find((x) => x.games.length)?.generationId ?? g?.shelves[0]?.generationId ?? null;
      const keepGen = st.focus === route.gallery && st.focusGeneration;
      st.set({ focus: route.gallery, focusAwards: false, focusGeneration: keepGen ? st.focusGeneration : desktop ? null : firstFilled, selectedAwardId: null });
    } else if (route.kind === "awards") {
      st.set({ focus: null, focusGeneration: null, focusAwards: true, selectedCopyId: null, editMode: false });
      const a = params.get("award");
      if (a) st.set({ selectedAwardId: a });
    } else {
      st.set({ focus: null, focusGeneration: null, focusAwards: false, editMode: false, selectedAwardId: null });
    }
    st.set({ exploreMode: explore });
  }, [route.kind, route.kind === "gallery" ? route.gallery : null, desktop, explore, params, snapshot.galleries]);

  // ?highlight=<copyId>: "Show on shelf" from the game page — focus gallery, page and the case itself.
  useEffect(() => {
    const id = params.get("highlight");
    if (!id) return;
    for (const g of snapshot.galleries)
      for (const sh of g.shelves) {
        const idx = sh.games.findIndex((x) => x.copyId === id);
        if (idx === -1) continue;
        const st = useMuseumStore.getState();
        st.setPage(sh.generationId, Math.floor(idx / (sh.capacity * SHELF_ROWS)));
        st.set({ focus: g.platformId, focusGeneration: sh.generationId, highlightCopyId: id, selectedCopyId: id });
        return;
      }
  }, [params, snapshot.galleries]);

  // Scene events → navigation (keeps URL in sync with the camera).
  useEffect(() => {
    const onGallery = (e: Event) => router.push(`${basePath}/${(e as CustomEvent<string>).detail}${qs}`, { scroll: false });
    const onTap = (e: Event) => {
      const d = (e as CustomEvent<{ copyId: string; again: boolean }>).detail;
      if (!d.again || desktop) return;
      const game = snapshot.galleries.flatMap((g) => g.shelves.flatMap((x) => x.games)).find((x) => x.copyId === d.copyId);
      if (game) router.push(gameHref(game.catalogGameId, game.copyId));
    };
    window.addEventListener("gm:gallery", onGallery);
    window.addEventListener("gm:case-tap", onTap);
    return () => {
      window.removeEventListener("gm:gallery", onGallery);
      window.removeEventListener("gm:case-tap", onTap);
    };
  }, [router, basePath, qs, desktop, snapshot.galleries, gameHref]);

  // Escape returns to the hall from a gallery or clears selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const st = useMuseumStore.getState();
      if (st.selectedCopyId || st.selectedAwardId || st.highlightCopyId) st.set({ selectedCopyId: null, selectedAwardId: null, highlightCopyId: null });
      else if (route.kind !== "home") router.push(`${basePath}${qs}`, { scroll: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [route.kind, router, basePath, qs]);

  const texts: SceneTexts = useMemo(
    () => ({
      modelMissing: t("museum.modelMissing"),
      modelFailed: t("museum.modelFailed"),
      empty: t("museum.emptyShelf"),
      showcase: t("museum.showcase"),
      bannerLeft: t("museum.bannerLeft"),
      bannerRight: t("museum.bannerRight"),
    }),
    [t],
  );

  const failed = s.webgl === "unsupported" || s.webgl === "lost" || s.webgl === "error";
  if (failed || force2d) {
    return (
      <>
        {!desktop && <MobileHeader />}
        {banner}
        {force2d && !failed && (
          <div className="mx-auto max-w-6xl px-4 pt-4 lg:px-8 lg:pt-20">
            <Button variant="outline" size="sm" onClick={() => setForce2d(false)}><BoxIcon size={14} /> {t("museum.view3d")}</Button>
          </div>
        )}
        <Fallback2D snapshot={snapshot} reason={force2d && !failed ? "manual" : s.webgl} gameHref={gameHref} onRetry={() => { s.set({ webgl: "unknown" }); setAttempt((a) => a + 1); }} />
      </>
    );
  }

  const gallery = route.kind === "gallery" ? snapshot.galleries.find((g) => g.platformId === route.gallery) : undefined;
  const empty = snapshot.stats.copies === 0;

  let mode: SceneMode;
  let canvasClass: string;
  if (desktop) {
    mode = "desktop";
    canvasClass = "fixed inset-0 top-16";
  } else if (route.kind === "home") {
    mode = explore ? "mobile-explore" : "mobile-preview";
    canvasClass = explore ? "fixed inset-0 z-50" : "relative mx-3 h-[50dvh] overflow-hidden rounded-[22px] border hairline";
  } else if (route.kind === "gallery") {
    mode = "mobile-shelf";
    canvasClass = mobileView === "list" ? "pointer-events-none fixed left-0 top-0 h-px w-px opacity-0" : "relative h-[58dvh] overflow-hidden";
  } else {
    mode = "mobile-explore";
    canvasClass = "relative mx-3 h-[38dvh] overflow-hidden rounded-[22px] border hairline";
  }

  const canvas = (
    <MuseumCanvas
      snapshot={snapshot}
      mode={mode}
      texts={texts}
      orders={orders}
      onReorder={reorder}
      className={canvasClass}
      showEmptyAnchors={route.kind === "customize"}
      attempt={attempt}
    />
  );

  /* ─────────────── Desktop ─────────────── */
  if (desktop) {
    return (
      <div className="relative h-dvh overflow-hidden">
        {canvas}
        {banner && <div className="absolute inset-x-0 bottom-16 z-20">{banner}</div>}
        {route.kind === "home" && <DesktopHud snapshot={snapshot} basePath={basePath} readOnly={readOnly} />}
        {route.kind === "home" && empty && editable && <EmptyOverlay />}
        {route.kind !== "home" && (
          <Link href={`${basePath}${qs}`} scroll={false} className="panel-glass absolute left-5 top-20 z-20 flex items-center gap-2 px-3 py-2 text-sm hover:border-gold/40">
            <ArrowLeft size={15} /> {t("nav.museum")}
          </Link>
        )}
        {gallery && (
          <div className="panel-glass absolute bottom-5 right-5 top-20 z-20 flex w-[380px] flex-col p-4">
            <GalleryPanel gallery={gallery} editable={editable} orders={orders} onReorder={reorder} saveState={saveState} className="min-h-0 flex-1" />
          </div>
        )}
        {route.kind === "awards" && (
          <div className="panel-glass absolute bottom-5 right-5 top-20 z-20 flex w-[400px] flex-col p-5">
            <AwardsPanel snapshot={snapshot} className="min-h-0 flex-1" />
          </div>
        )}
        {route.kind === "customize" && !readOnly && (
          <div className="panel-glass absolute bottom-5 right-5 top-20 z-20 flex w-[400px] flex-col p-5">
            <CustomizePanel snapshot={snapshot} className="min-h-0 flex-1" />
          </div>
        )}
        <div className="absolute bottom-5 left-5 z-20 flex w-[420px] flex-col gap-3">
          <CaseDetail snapshot={snapshot} readOnly={readOnly} gameHref={gameHref} />
          <AwardDetail snapshot={snapshot} readOnly={readOnly} />
        </div>
        <button onClick={() => setForce2d(true)} className="panel-glass absolute bottom-5 left-1/2 z-20 -translate-x-1/2 px-3 py-1.5 text-xs text-slate hover:text-ivory">
          <Eye size={12} className="mr-1 inline" /> {t("museum.view2d")}
        </button>
      </div>
    );
  }

  /* ─────────────── Mobile ─────────────── */
  if (route.kind === "home") {
    return (
      <div className="pb-28">
        {!explore && <MobileHeader />}
        {banner}
        <div className="relative">
          {canvas}
          {explore ? (
            <div className="fixed inset-x-0 top-0 z-[55] flex items-center justify-between p-3 pt-[calc(var(--safe-top)+10px)]">
              <Button variant="secondary" size="sm" onClick={() => router.push(`${basePath}${qs}`, { scroll: false })}><Minimize2 size={14} /> {t("nav.exitMuseum")}</Button>
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-x-3 bottom-0 flex items-end justify-between rounded-b-[22px] bg-gradient-to-t from-black/70 to-transparent p-4">
              <div className="text-[11px] text-ivory/70">{t("museum.previewHint")}</div>
              <Button asChild variant="primary" size="sm" className="pointer-events-auto">
                <Link href={`${basePath}?explore=1${keepQuery ? `&${keepQuery}` : ""}`} scroll={false}>{t("nav.enterMuseum")}</Link>
              </Button>
            </div>
          )}
        </div>
        {explore && (
          <div className="fixed inset-x-3 bottom-[calc(var(--safe-bottom)+12px)] z-[55] flex flex-col gap-2">
            <CaseDetail snapshot={snapshot} readOnly={readOnly} gameHref={gameHref} />
            <AwardDetail snapshot={snapshot} readOnly={readOnly} />
          </div>
        )}
        {!explore && (
          <section className="px-4 pt-5">
            {empty && editable && (
              <div className="panel mb-4 p-4">
                <div className="display text-xl">{t("museum.emptyTitle")}</div>
                <p className="mt-1 text-sm text-slate">{t("museum.emptyBody")}</p>
                <Button asChild variant="primary" size="sm" className="mt-3"><Link href="/collection/add">{t("museum.addFirst")}</Link></Button>
              </div>
            )}
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-lg font-semibold"><span className="text-gold">✦</span> {t("museum.myCollection")}</h2>
              {!readOnly && <Link href="/collection" className="text-xs text-slate">{t("common.seeAll")}</Link>}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {snapshot.galleries.map((g) => (
                <Link key={g.platformId} href={`${basePath}/${g.platformId}${qs}`} className={cn("flex flex-col items-center justify-center rounded-2xl border bg-gradient-to-b px-2 py-4 text-center", GALLERY_STYLE[g.platformId])}>
                  <PlatformMark platform={g.platformId} size={36} />
                  <div className="mt-2 text-sm font-semibold">{g.name}</div>
                  <div className="text-[11px] text-ivory/70">{t("common.games", { count: g.total })}</div>
                </Link>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                [snapshot.stats.uniqueGames, t("hud.uniqueGames")],
                [snapshot.stats.awards, t("hud.awards")],
                [snapshot.stats.completed, t("hud.completed")],
              ].map(([n, l]) => (
                <div key={String(l)} className="panel px-2 py-3">
                  <div className="text-xl font-light tabular-nums">{n}</div>
                  <div className="text-[10px] text-slate">{l}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setForce2d(true)} className="mt-4 w-full text-center text-xs text-slate underline-offset-4 hover:underline">{t("museum.view2d")}</button>
          </section>
        )}
      </div>
    );
  }

  if (route.kind === "gallery" && gallery) {
    const shelf = gallery.shelves.find((x) => x.generationId === s.focusGeneration) ?? gallery.shelves[0]!;
    const perPage = shelf.capacity * SHELF_ROWS;
    const pageCount = Math.max(1, Math.ceil(shelf.games.length / perPage));
    const page = Math.min(s.pages[shelf.generationId] ?? 0, pageCount - 1);
    const gi = gallery.shelves.indexOf(shelf);
    const step = (dir: 1 | -1) => {
      const np = page + dir;
      if (np >= 0 && np < pageCount) return s.setPage(shelf.generationId, np);
      const ng = gallery.shelves[gi + dir];
      if (ng) s.set({ focusGeneration: ng.generationId, selectedCopyId: null, highlightCopyId: null });
    };
    return (
      <div className="pb-28">
        <header className="sticky top-0 z-30 bg-obsidian/90 px-3 pb-2 pt-[calc(var(--safe-top)+8px)] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <Link href={`${basePath}${qs}`} className="rounded-full p-2" aria-label={t("common.back")}><ArrowLeft size={20} /></Link>
            <div className="text-center">
              <PlatformMark platform={gallery.platformId} size={30} className="mx-auto" />
              <div className="mt-1 text-[15px] font-semibold">{t("gallery.collectionOf", { name: gallery.name })}</div>
              <div className="text-[11px] text-slate">{t("common.games", { count: gallery.total })}</div>
            </div>
            <Link href="/collection" className="rounded-full p-2" aria-label={t("nav.collection")}><MoreHorizontal size={20} /></Link>
          </div>
          <PillTabs
            className="mt-2"
            ariaLabel={t("gallery.allGenerations")}
            value={shelf.generationId}
            onChange={(v) => s.set({ focusGeneration: v, selectedCopyId: null, highlightCopyId: null })}
            items={gallery.shelves.map((x) => ({ value: x.generationId, label: x.shortName }))}
          />
        </header>
        {banner}
        <div className="relative">
          {canvas}
          {mobileView === "shelf" && (
            <>
              <button aria-label={t("gallery.prev")} onClick={() => step(-1)} className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/50 p-2 backdrop-blur"><ChevronLeft size={18} /></button>
              <button aria-label={t("gallery.next")} onClick={() => step(1)} className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/50 p-2 backdrop-blur"><ChevronRight size={18} /></button>
              <div className="absolute inset-x-0 top-2 z-10 text-center text-[11px] text-slate">{shelf.name}{pageCount > 1 ? ` · ${t("gallery.page", { page: page + 1, pages: pageCount })}` : ""}</div>
            </>
          )}
        </div>
        <div className="px-3">
          {mobileView === "shelf" ? (
            <div className="mt-3 space-y-3">
              <CaseDetail snapshot={snapshot} readOnly={readOnly} gameHref={gameHref} />
              {!s.selectedCopyId && shelf.games.length > 0 && <p className="text-center text-[11px] text-slate">{t("case.tapAgain")}</p>}
            </div>
          ) : (
            <GalleryPanel gallery={gallery} editable={editable} orders={orders} onReorder={reorder} saveState={saveState} compact className="mt-3" />
          )}
        </div>
        <div className="fixed inset-x-0 bottom-[calc(var(--safe-bottom)+72px)] z-30 flex justify-center">
          <div className="panel-glass flex gap-1 p-1">
            <button onClick={() => setMobileView("shelf")} aria-pressed={mobileView === "shelf"} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs", mobileView === "shelf" ? "bg-[#1a2c55] text-ivory" : "text-slate")}><Grid2x2 size={14} /> {t("gallery.shelfView")}</button>
            <button onClick={() => setMobileView("list")} aria-pressed={mobileView === "list"} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs", mobileView === "list" ? "bg-[#1a2c55] text-ivory" : "text-slate")}><List size={14} /> {t("gallery.listView")}</button>
          </div>
        </div>
      </div>
    );
  }

  // awards / customize on mobile
  return (
    <div className="pb-28">
      <MobileHeader />
      {banner}
      {canvas}
      <div className="px-4 pt-4">
        {route.kind === "awards" && (
          <>
            <AwardDetail snapshot={snapshot} readOnly={readOnly} className="mb-4" />
            <AwardsPanel snapshot={snapshot} />
          </>
        )}
        {route.kind === "customize" && !readOnly && <CustomizePanel snapshot={snapshot} />}
      </div>
    </div>
  );
}

function EmptyOverlay() {
  const t = useTranslations();
  return (
    <div className="absolute left-1/2 top-[42%] z-20 w-[420px] -translate-x-1/2 -translate-y-1/2 text-center">
      <div className="panel-glass p-6">
        <div className="display text-3xl">{t("museum.emptyTitle")}</div>
        <p className="mt-2 text-sm text-slate">{t("museum.emptyBody")}</p>
        <Button asChild variant="primary" className="mt-4"><Link href="/collection/add">{t("museum.addFirst")}</Link></Button>
      </div>
    </div>
  );
}

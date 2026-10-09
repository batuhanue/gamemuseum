"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import type { MuseumSnapshot, WebglStateLike } from "./types";
import { Button } from "@/components/ui/button";
import { PlatformMark } from "@/components/shell/PlatformMark";
import { CoverImage } from "./CoverImage";

/** 2D collection view: used when WebGL is unavailable/lost, and as an accessible alternative to 3D. */
export function Fallback2D({ snapshot, reason, onRetry, gameHref }: { snapshot: MuseumSnapshot; reason: WebglStateLike | "manual"; onRetry?: () => void; gameHref: (catalogGameId: string, copyId: string) => string }) {
  const t = useTranslations();
  const message = reason === "unsupported" ? t("museum.fallbackUnsupported") : reason === "lost" ? t("museum.fallbackLost") : reason === "error" ? t("museum.fallbackError") : null;
  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-4 lg:px-8 lg:pt-24">
      {message && (
        <div role="alert" className="panel mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <AlertTriangle className="shrink-0 text-gold" />
          <div className="flex-1">
            <div className="font-medium">{t("museum.fallbackTitle")}</div>
            <p className="text-sm text-slate">{message}</p>
          </div>
          {onRetry && reason !== "unsupported" && <Button variant="outline" onClick={onRetry}>{t("common.retry")}</Button>}
        </div>
      )}
      {snapshot.galleries.map((g) => (
        <section key={g.platformId} className="mb-10" aria-label={g.name}>
          <div className="mb-3 flex items-center gap-3">
            <PlatformMark platform={g.platformId} />
            <h2 className="display text-2xl">{g.name}</h2>
            <span className="text-xs text-slate">{t("common.games", { count: g.total })}</span>
          </div>
          {g.shelves.map((s) => (
            <div key={s.generationId} className="mb-5">
              <div className="mb-2 text-sm text-slate">{s.name}{s.years ? ` · ${s.years}` : ""}</div>
              {s.games.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-xs text-slate">{t("gallery.empty")}</div>
              ) : (
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
                  {s.games.map((x) => (
                    <li key={x.copyId}>
                      <Link href={gameHref(x.catalogGameId, x.copyId)} className="block">
                        <CoverImage title={x.title} url={x.coverUrl} palette={x.palette} demo={x.dataSource === "demo"} />
                        <div className="mt-1 truncate text-xs">{x.title}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

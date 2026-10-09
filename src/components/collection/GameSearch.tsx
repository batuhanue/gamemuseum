"use client";
import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { api, ApiError } from "@/lib/client/api";
import type { CatalogGameDto } from "@/features/games/dto";
import { IGDB_PLATFORM_NAMES } from "@/features/platforms/reference";
import { Skeleton, Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/museum/CoverImage";
import { demoPalette } from "@/features/games/demo-catalog";

type Page = { source: "igdb" | "demo"; hasMore: boolean; games: CatalogGameDto[] };

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** Catalog search: 300 ms debounce, platform filter, small pages, skeletons and explicit errors. */
export function GameSearch({ onPick, initialQuery = "", autoFocus }: { onPick: (g: CatalogGameDto) => void; initialQuery?: string; autoFocus?: boolean }) {
  const t = useTranslations();
  const [q, setQ] = useState(initialQuery);
  const [platform, setPlatform] = useState<string>("");
  const dq = useDebounced(q.trim(), 300);
  const query = useInfiniteQuery({
    queryKey: ["catalog-search", dq, platform],
    enabled: dq.length >= 2,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => api<Page>(`/api/games/search?q=${encodeURIComponent(dq)}&page=${pageParam}${platform ? `&platform=${platform}` : ""}`),
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length : undefined),
    retry: (n, e) => n < 1 && !(e instanceof ApiError && e.status < 500),
  });
  const games = query.data?.pages.flatMap((p) => p.games) ?? [];
  const source = query.data?.pages[0]?.source;
  const err = query.error;

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">{t("add.searchPlaceholder")}</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <input autoFocus={autoFocus} className="field pl-9" placeholder={t("add.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select aria-label={t("add.platformFilter")} className="field sm:w-56" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="">{t("add.anyPlatform")}</option>
          {Object.entries(IGDB_PLATFORM_NAMES).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </div>
      {source === "demo" && <p className="mt-3 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-gold">{t("add.demoNotice")}</p>}
      {dq.length < 2 && <p className="mt-4 text-sm text-slate">{t("add.minChars")}</p>}
      {err && (
        <p role="alert" className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-[#ffb3ad]">
          {err instanceof ApiError && err.status === 429 ? t("errors.rateLimited") : err instanceof ApiError && err.status === 503 ? `${t("errors.unavailable")} (${err.message})` : t("common.error")}
          <button className="ml-2 underline" onClick={() => void query.refetch()}>{t("common.retry")}</button>
        </p>
      )}
      <ul className="mt-4 space-y-2" aria-busy={query.isFetching}>
        {query.isLoading &&
          Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="flex gap-3 rounded-xl border hairline p-2"><Skeleton className="h-16 w-12" /><div className="flex-1 space-y-2 py-1"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div></li>
          ))}
        {games.map((g) => (
          <li key={g.id}>
            <button onClick={() => onPick(g)} className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 text-left hover:border-gold/40">
              <div className="w-12 shrink-0"><CoverImage title={g.title} url={g.coverUrl} palette={g.dataSource === "demo" ? demoPalette(g.id) : undefined} demo={g.dataSource === "demo"} tiny /></div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{g.title}</div>
                <div className="text-xs text-slate">{g.releaseDate?.slice(0, 4) ?? "—"} · {g.platformNames.slice(0, 4).join(", ")}</div>
                <div className="mt-1 flex gap-1">
                  {g.dataSource === "demo" && <Badge tone="gold">{t("common.demoCatalog")}</Badge>}
                  {g.dataSource === "manual" && <Badge>{t("collection.manualEntry")}</Badge>}
                </div>
              </div>
            </button>
          </li>
        ))}
        {dq.length >= 2 && !query.isLoading && !err && games.length === 0 && <li className="text-sm text-slate">{t("add.noResults")}</li>}
      </ul>
      {query.hasNextPage && (
        <Button variant="ghost" className="mt-3 w-full" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{t("add.loadMore")}</Button>
      )}
      {source === "igdb" && <p className="mt-4 text-[10px] text-slate">{t("attribution.igdb")}</p>}
    </div>
  );
}

"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { api } from "@/lib/client/api";
import { useViewer } from "./ViewerContext";
import type { CollectionItem } from "@/components/collection/types";

/** Search across the signed-in user's collection, with a hand-off to the catalog search. */
export function GlobalSearch({ variant }: { variant: "bar" | "icon" }) {
  const t = useTranslations();
  const viewer = useViewer();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["collection"],
    queryFn: () => api<{ items: CollectionItem[] }>("/api/collection"),
    enabled: open && !!viewer,
  });
  const results = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr");
    if (!s || !data) return [];
    return data.items.filter((i) => i.game.title.toLocaleLowerCase("tr").includes(s)).slice(0, 12);
  }, [q, data]);

  return (
    <>
      {variant === "bar" ? (
        <button onClick={() => setOpen(true)} className="flex h-9 w-64 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 text-left text-xs text-slate hover:border-gold/40 xl:w-72">
          <Search size={15} /> {t("nav.searchPlaceholder")}
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="rounded-full p-2 text-ivory/80 hover:bg-white/5" aria-label={t("common.search")}>
          <Search size={20} />
        </button>
      )}
      <Dialog open={open} onOpenChange={setOpen} title={t("common.search")} closeLabel={t("common.close")}>
        <input autoFocus className="field" placeholder={t("nav.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("nav.searchPlaceholder")} />
        <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto">
          {results.map((r) => (
            <li key={r.id}>
              <Link href={`/games/${r.game.id}?copy=${r.id}`} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-white/5">
                <span>{r.game.title}</span>
                <span className="text-xs text-slate">{r.generationId.toUpperCase()}</span>
              </Link>
            </li>
          ))}
        </ul>
        {q.trim().length >= 2 && (
          <Link href={`/explore?q=${encodeURIComponent(q.trim())}`} onClick={() => setOpen(false)} className="mt-3 block text-sm text-gold hover:underline">
            {t("explore.title")}: “{q.trim()}” →
          </Link>
        )}
      </Dialog>
    </>
  );
}

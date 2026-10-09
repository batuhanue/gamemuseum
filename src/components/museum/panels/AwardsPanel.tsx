"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import type { MuseumSnapshot } from "@/types/museum";
import { PillTabs } from "@/components/ui/tabs";
import { useMuseumStore } from "@/stores/museum-store";
import { cn } from "@/lib/cn";

const CATS = ["all", "milestone", "platform", "retro", "series", "curator"] as const;
const tint: Record<string, string> = { bronze: "#a8693a", silver: "#cfd4da", gold: "#d5b477", crystal: "#bcd3ff", obsidian: "#8f7cff" };

/** Award catalogue with real progress; earned trophies can be put on the 3D showcase. */
export function AwardsPanel({ snapshot, className }: { snapshot: MuseumSnapshot; className?: string }) {
  const t = useTranslations();
  const [cat, setCat] = useState<(typeof CATS)[number]>("all");
  const selected = useMuseumStore((s) => s.selectedAwardId);
  const set = useMuseumStore((s) => s.set);
  const list = snapshot.awards.filter((a) => cat === "all" || a.category === cat);
  const used = snapshot.awards.filter((a) => a.earned?.displayed).length;
  return (
    <section className={cn("flex flex-col", className)}>
      <h1 className="display text-3xl">{t("awards.title")}</h1>
      <p className="text-sm text-slate">{t("awards.subtitle")}</p>
      <div className="mt-1 text-[11px] text-gold-dim">{t("awards.pedestals", { used })}</div>
      <PillTabs className="mt-3" ariaLabel={t("awards.title")} value={cat} onChange={setCat} items={CATS.map((c) => ({ value: c, label: t(`awards.${c}`) }))} />
      <ul className="mt-4 grid min-h-0 flex-1 grid-cols-3 gap-2 overflow-y-auto pb-2">
        {list.map((a) => {
          const pct = a.progress ? Math.min(1, a.progress.current / a.progress.target) : 0;
          return (
            <li key={a.id}>
              <button
                onClick={() => set({ selectedAwardId: a.id })}
                aria-pressed={selected === a.id}
                className={cn("flex h-full w-full flex-col items-center rounded-xl border p-2.5 text-center transition-colors", selected === a.id ? "border-gold/60 bg-gold/5" : "border-white/[0.06] bg-white/[0.02] hover:border-white/15")}
              >
                <span className="relative mb-2 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: a.earned ? `radial-gradient(circle at 35% 30%, ${tint[a.material]}, #120f0a 75%)` : "radial-gradient(circle, #1d222a, #0c0e12)" }}>
                  {!a.earned && <Lock size={16} className="text-slate" />}
                  {a.earned?.displayed && <span className="absolute -bottom-1 rounded-full bg-gold px-1.5 text-[8px] font-semibold text-obsidian">★</span>}
                </span>
                <span className={cn("text-[11px] font-medium leading-tight", !a.earned && "text-slate")}>{a.title}</span>
                <span className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-slate">{a.description}</span>
                {!a.earned && a.progress && (
                  <span className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/5"><span className="block h-full bg-gold/70" style={{ width: `${pct * 100}%` }} /></span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[10px] text-slate/80">{t("awards.policy")} {t("awards.notPurchasable")}</p>
    </section>
  );
}

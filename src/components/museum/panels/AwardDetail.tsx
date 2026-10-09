"use client";
import { useTranslations, useFormatter } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import type { AwardView, MuseumSnapshot } from "@/types/museum";
import { useMuseumStore } from "@/stores/museum-store";
import { api, ApiError } from "@/lib/client/api";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { useToasts } from "@/stores/toast-store";
import { useUnlocks } from "@/stores/unlock-store";
import { cn } from "@/lib/cn";

export function useAwardToggle() {
  const t = useTranslations();
  const qc = useQueryClient();
  const toast = useToasts((s) => s.show);
  const pushUnlocks = useUnlocks((s) => s.push);
  return async (award: AwardView, displayed: boolean) => {
    try {
      const res = await api<{ unlocked: { awardId: string }[] }>(`/api/awards/${award.id}`, { method: "PATCH", body: { displayed } });
      if (res.unlocked.length) pushUnlocks(res.unlocked.map((u) => u.awardId));
      await qc.invalidateQueries({ queryKey: ["museum"] });
    } catch (e) {
      toast(e instanceof ApiError && e.code === "conflict" ? t("awards.showcaseFull") : t("common.error"), "error");
    }
  };
}

export function AwardInfo({ award, readOnly, onClose }: { award: AwardView; readOnly: boolean; onClose?: () => void }) {
  const t = useTranslations();
  const f = useFormatter();
  const toggle = useAwardToggle();
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow">{t(`awards.${award.category}`)}</div>
          <h3 className="display mt-1 text-2xl">{award.title}</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-full p-1 text-slate hover:text-ivory" aria-label={t("common.close")}><X size={16} /></button>
        )}
      </div>
      <p className="mt-2 text-sm text-slate">{award.description}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div><dt className="text-slate">{t("awards.rarity")}</dt><dd className="mt-0.5 text-ivory">{t(`awards.${award.rarity}`)} · {t("awards.points", { points: award.points })}</dd></div>
        <div><dt className="text-slate">{t("awards.condition")}</dt><dd className="mt-0.5 text-ivory">{award.description}</dd></div>
        {award.earned && <div><dt className="text-slate">{t("awards.earned")}</dt><dd className="mt-0.5 text-ivory">{f.dateTime(new Date(award.earned.unlockedAt), { dateStyle: "medium" })}</dd></div>}
        {award.earned && <div><dt className="text-slate">✓</dt><dd className="mt-0.5 text-ivory">{award.earned.verificationLevel === "platform-verified" ? t("awards.platformVerified") : t("awards.selfReported")}</dd></div>}
      </dl>
      {!award.earned && award.progress && (
        <div className="mt-4">
          <div className="mb-1 text-xs text-slate">{t("awards.progress", { current: Math.min(award.progress.current, award.progress.target), target: award.progress.target })}</div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-gold" style={{ width: `${Math.min(100, (award.progress.current / award.progress.target) * 100)}%` }} /></div>
        </div>
      )}
      {!award.asset && <p className="mt-3 text-[11px] text-slate/80">{t("awards.placeholderModel")}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {award.earned ? <Badge tone="gold">{t("awards.earned")}</Badge> : <Badge>{t("awards.locked")}</Badge>}
        {!readOnly && award.earned && (
          <Button size="sm" variant={award.earned.displayed ? "ghost" : "outline"} onClick={() => void toggle(award, !award.earned!.displayed)}>
            {award.earned.displayed ? t("awards.undisplay") : t("awards.display")}
          </Button>
        )}
      </div>
    </div>
  );
}

export function AwardDetail({ snapshot, readOnly, className }: { snapshot: MuseumSnapshot; readOnly: boolean; className?: string }) {
  const id = useMuseumStore((s) => s.selectedAwardId);
  const set = useMuseumStore((s) => s.set);
  const award = snapshot.awards.find((a) => a.id === id);
  if (!award) return null;
  return (
    <aside className={cn("panel-glass p-5", className)}>
      <AwardInfo award={award} readOnly={readOnly || snapshot.mode !== "user"} onClose={() => set({ selectedAwardId: null })} />
    </aside>
  );
}

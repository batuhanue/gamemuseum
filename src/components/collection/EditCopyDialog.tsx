"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/client/api";
import { GENERATIONS } from "@/features/platforms/reference";
import { useUnlocks } from "@/stores/unlock-store";
import type { CollectionItem } from "./types";

/** Edit one owned copy. Changing the platform moves it to the right generation shelf on the server. */
export function EditCopyDialog({ item, open, onOpenChange, allowedGenerations }: { item: CollectionItem; open: boolean; onOpenChange: (o: boolean) => void; allowedGenerations?: string[] }) {
  const t = useTranslations();
  const qc = useQueryClient();
  const pushUnlocks = useUnlocks((s) => s.push);
  const [v, setV] = useState({
    generationId: item.generationId,
    ownershipType: item.ownershipType,
    edition: item.edition ?? "",
    region: item.region ?? "",
    condition: item.condition ?? "",
    status: item.status,
    isFavorite: item.isFavorite,
    isPublic: item.isPublic,
    notes: item.notes ?? "",
    purchaseDate: item.purchaseDate ?? "",
    purchasePrice: item.purchasePrice?.toString() ?? "",
    purchaseCurrency: item.purchaseCurrency ?? "TRY",
    rating: item.rating?.toString() ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const gens = GENERATIONS.filter((g) => item.platformId === "pc" ? g.platformId === "pc" : !allowedGenerations?.length || allowedGenerations.includes(g.id) || g.id === item.generationId);

  const save = async () => {
    setError(null);
    try {
      const pc = v.generationId.startsWith("pc-");
      const res = await api<{ unlocked: { awardId: string }[] }>(`/api/collection/${item.id}`, {
        method: "PATCH",
        body: {
          expectedVersion: item.version,
          generationId: v.generationId,
          store: pc ? v.generationId.slice(3) : null,
          ownershipType: v.ownershipType,
          edition: v.edition || null,
          region: v.region || null,
          condition: v.ownershipType === "physical" && v.condition ? v.condition : null,
          status: v.status,
          isFavorite: v.isFavorite,
          isPublic: v.isPublic,
          notes: v.notes || null,
          purchaseDate: v.purchaseDate || null,
          purchasePrice: v.purchasePrice ? Number(v.purchasePrice) : null,
          purchaseCurrency: v.purchasePrice ? v.purchaseCurrency : null,
          rating: v.rating ? Number(v.rating) : null,
        },
      });
      if (res.unlocked.length) pushUnlocks(res.unlocked.map((u) => u.awardId));
      await Promise.all(["collection", "museum", "copy"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 409 ? t("common.conflict") : e instanceof ApiError ? e.message : t("common.error"));
      if (e instanceof ApiError && e.status === 409) await qc.invalidateQueries({ queryKey: ["collection"] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("game.editCopy")} description={item.game.title} closeLabel={t("common.close")}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="e-gen">{t("collection.generation")}</label>
          <select id="e-gen" className="field" value={v.generationId} onChange={(e) => setV({ ...v, generationId: e.target.value })}>
            {gens.map((g) => <option key={g.id} value={g.id}>{g.platformId === "pc" ? `PC · ${g.name}` : g.name}</option>)}
          </select>
        </div>
        <div><label className="label" htmlFor="e-own">{t("add.ownershipType")}</label>
          <select id="e-own" className="field" value={v.ownershipType} onChange={(e) => setV({ ...v, ownershipType: e.target.value as "physical" | "digital" })}>
            <option value="physical">{t("common.physical")}</option><option value="digital">{t("common.digital")}</option>
          </select>
        </div>
        <div><label className="label" htmlFor="e-status">{t("case.status")}</label>
          <select id="e-status" className="field" value={v.status} onChange={(e) => setV({ ...v, status: e.target.value as CollectionItem["status"] })}>
            {["backlog", "playing", "completed", "paused", "dropped"].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </select>
        </div>
        <div><label className="label" htmlFor="e-ed">{t("add.edition")}</label><input id="e-ed" className="field" value={v.edition} onChange={(e) => setV({ ...v, edition: e.target.value })} /></div>
        <div><label className="label" htmlFor="e-reg">{t("add.region")}</label><input id="e-reg" className="field" value={v.region} onChange={(e) => setV({ ...v, region: e.target.value })} /></div>
        {v.ownershipType === "physical" && (
          <div><label className="label" htmlFor="e-cond">{t("add.condition")}</label>
            <select id="e-cond" className="field" value={v.condition} onChange={(e) => setV({ ...v, condition: e.target.value })}>
              <option value="">—</option>{["sealed", "complete", "loose", "custom"].map((c) => <option key={c} value={c}>{t(`add.${c}`)}</option>)}
            </select>
          </div>
        )}
        <div><label className="label" htmlFor="e-date">{t("add.purchaseDate")}</label><input id="e-date" type="date" className="field" value={v.purchaseDate} onChange={(e) => setV({ ...v, purchaseDate: e.target.value })} /></div>
        <div className="grid grid-cols-[1fr_84px] gap-2">
          <div><label className="label" htmlFor="e-price">{t("add.purchasePrice")}</label><input id="e-price" inputMode="decimal" className="field" value={v.purchasePrice} onChange={(e) => setV({ ...v, purchasePrice: e.target.value.replace(/[^\d.]/g, "") })} /></div>
          <div><label className="label" htmlFor="e-cur">{t("add.currency")}</label><select id="e-cur" className="field" value={v.purchaseCurrency} onChange={(e) => setV({ ...v, purchaseCurrency: e.target.value })}>{["TRY", "USD", "EUR", "GBP", "JPY"].map((c) => <option key={c}>{c}</option>)}</select></div>
        </div>
        <div><label className="label" htmlFor="e-rating">{t("add.rating")}</label><input id="e-rating" inputMode="decimal" className="field" value={v.rating} onChange={(e) => setV({ ...v, rating: e.target.value.replace(/[^\d.]/g, "").slice(0, 4) })} /></div>
        <div className="flex flex-col justify-end gap-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={v.isFavorite} onChange={(e) => setV({ ...v, isFavorite: e.target.checked })} /> {t("add.favorite")}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={v.isPublic} onChange={(e) => setV({ ...v, isPublic: e.target.checked })} /> {t("game.visibility")}</label>
        </div>
        <div className="sm:col-span-2"><label className="label" htmlFor="e-notes">{t("add.notes")}</label><textarea id="e-notes" rows={3} className="field" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></div>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-[#ff9a92]">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
        <Button variant="primary" onClick={() => void save()}>{t("common.save")}</Button>
      </div>
    </Dialog>
  );
}

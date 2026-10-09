"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { JsonEditor } from "./JsonEditor";
import { cn } from "@/lib/cn";

type Award = {
  id: string; title: { tr: string; en: string }; description: { tr: string; en: string }; category: string; conditionType: string;
  conditionConfig: Record<string, unknown>; rarity: string; material: string; modelAssetId: string | null; points: number; sortOrder: number;
  active: boolean; version: number; granted: number;
};
type Asset = { id: string; name: string; category: string; status: string };

const CONDITIONS = ["total_games", "platform_games", "generation_games", "retro_generations", "retro_shelf_full", "series_count", "goal_completed", "completed_games", "event"];

/** Award definitions: changing a rule bumps its version; granted awards keep the version they were earned under. */
export function AwardsAdmin() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["admin-awards"], queryFn: () => api<{ awards: Award[] }>("/api/admin/awards") });
  const assets = useQuery({ queryKey: ["admin-assets"], queryFn: () => api<{ assets: Asset[] }>("/api/admin/assets") });
  const [edit, setEdit] = useState<Award | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const blank: Award = { id: "", title: { tr: "", en: "" }, description: { tr: "", en: "" }, category: "milestone", conditionType: "total_games", conditionConfig: { min: 10 }, rarity: "common", material: "bronze", modelAssetId: null, points: 10, sortOrder: 100, active: true, version: 1, granted: 0 };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_440px]">
      <section>
        <div className="mb-3 flex justify-between"><h2 className="font-semibold">Award definitions</h2><Button size="sm" variant="secondary" onClick={() => setEdit(blank)}>+ New</Button></div>
        <ul className="space-y-1">
          {list.data?.awards.map((a) => (
            <li key={a.id}>
              <button onClick={() => { setEdit(a); setMsg(null); }} className={cn("flex w-full items-center gap-3 rounded-lg border p-2 text-left text-sm", edit?.id === a.id ? "border-gold/50" : "border-white/[0.06]")}>
                <span className="flex-1">{a.title.en} <span className="text-xs text-slate">({a.id})</span></span>
                <span className="text-xs text-slate">{a.conditionType} · v{a.version} · {a.granted} granted</span>
                {!a.active && <Badge tone="danger">inactive</Badge>}
              </button>
            </li>
          ))}
        </ul>
      </section>
      {edit && (
        <section className="panel space-y-3 p-4">
          <label className="block text-xs"><span className="label">id</span><input className="field" disabled={!!list.data?.awards.some((a) => a.id === edit.id) && edit !== blank} value={edit.id} onChange={(e) => setEdit({ ...edit, id: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-2">
            {(["tr", "en"] as const).map((l) => (
              <label key={l} className="text-xs"><span className="label">title.{l}</span><input className="field" value={edit.title[l]} onChange={(e) => setEdit({ ...edit, title: { ...edit.title, [l]: e.target.value } })} /></label>
            ))}
            {(["tr", "en"] as const).map((l) => (
              <label key={l} className="text-xs"><span className="label">description.{l}</span><input className="field" value={edit.description[l]} onChange={(e) => setEdit({ ...edit, description: { ...edit.description, [l]: e.target.value } })} /></label>
            ))}
            <label className="text-xs"><span className="label">category</span><select className="field" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{["milestone", "platform", "retro", "series", "curator", "verified"].map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="text-xs"><span className="label">condition</span><select className="field" value={edit.conditionType} onChange={(e) => setEdit({ ...edit, conditionType: e.target.value })}>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="text-xs"><span className="label">rarity</span><select className="field" value={edit.rarity} onChange={(e) => setEdit({ ...edit, rarity: e.target.value })}>{["common", "rare", "epic", "legendary"].map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="text-xs"><span className="label">material</span><select className="field" value={edit.material} onChange={(e) => setEdit({ ...edit, material: e.target.value })}>{["bronze", "silver", "gold", "crystal", "obsidian"].map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="text-xs"><span className="label">points</span><input type="number" className="field" value={edit.points} onChange={(e) => setEdit({ ...edit, points: Number(e.target.value) })} /></label>
            <label className="text-xs"><span className="label">sortOrder</span><input type="number" className="field" value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) })} /></label>
            <label className="col-span-2 text-xs"><span className="label">3D model (award asset)</span>
              <select className="field" value={edit.modelAssetId ?? ""} onChange={(e) => setEdit({ ...edit, modelAssetId: e.target.value || null })}>
                <option value="">— abstract trophy —</option>
                {assets.data?.assets.filter((a) => a.category === "award").map((a) => <option key={a.id} value={a.id}>{a.name} ({a.status})</option>)}
              </select>
            </label>
          </div>
          <JsonEditor key={edit.id + edit.conditionType} label="conditionConfig" value={edit.conditionConfig} onChange={(v) => setEdit({ ...edit, conditionConfig: v as Record<string, unknown> })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> active</label>
          <Button variant="primary" onClick={async () => {
            try {
              const { granted: _g, version: _v, ...body } = edit;
              await api("/api/admin/awards", { method: "PUT", body });
              setMsg("Saved.");
              await qc.invalidateQueries({ queryKey: ["admin-awards"] });
            } catch (e) { setMsg(e instanceof ApiError ? `${e.message} ${JSON.stringify(e.details ?? "")}` : "Error"); }
          }}>Save</Button>
          {msg && <p className="text-xs text-gold">{msg}</p>}
        </section>
      )}
    </div>
  );
}

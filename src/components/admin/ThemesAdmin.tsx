"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { JsonEditor } from "./JsonEditor";
import type { ThemeParams } from "@/lib/db/schema";

type Theme = { id: string; name: { tr: string; en: string }; description: { tr: string; en: string }; params: ThemeParams; premiumSku: string | null; sortOrder: number; active: boolean };

/** Themes change real scene materials and lights (see ThemeParams), not a background image. */
export function ThemesAdmin() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["admin-themes"], queryFn: () => api<{ themes: Theme[] }>("/api/admin/themes") });
  const [edit, setEdit] = useState<Theme | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <section>
        <div className="mb-3 flex justify-between"><h2 className="font-semibold">Themes</h2>
          <Button size="sm" variant="secondary" onClick={() => list.data?.themes[0] && setEdit({ ...list.data.themes[0], id: "new-theme", name: { tr: "", en: "" }, active: false })}>+ New</Button>
        </div>
        <ul className="space-y-1">
          {list.data?.themes.map((t) => (
            <li key={t.id}><button onClick={() => { setEdit(t); setMsg(null); }} className="flex w-full items-center gap-2 rounded-lg border border-white/[0.06] p-2 text-left text-sm">
              <span className="h-5 w-5 rounded" style={{ background: `linear-gradient(${t.params.wall}, ${t.params.trim})` }} /> {t.name.en} {t.premiumSku && <span className="text-xs text-gold">★</span>} {!t.active && <span className="text-xs text-slate">(inactive)</span>}
            </button></li>
          ))}
        </ul>
      </section>
      {edit && (
        <section className="panel space-y-3 p-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-xs"><span className="label">id</span><input className="field" value={edit.id} onChange={(e) => setEdit({ ...edit, id: e.target.value })} /></label>
            <label className="text-xs"><span className="label">name.tr</span><input className="field" value={edit.name.tr} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, tr: e.target.value } })} /></label>
            <label className="text-xs"><span className="label">name.en</span><input className="field" value={edit.name.en} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, en: e.target.value } })} /></label>
            <label className="text-xs"><span className="label">description.tr</span><input className="field" value={edit.description.tr} onChange={(e) => setEdit({ ...edit, description: { ...edit.description, tr: e.target.value } })} /></label>
            <label className="text-xs"><span className="label">description.en</span><input className="field" value={edit.description.en} onChange={(e) => setEdit({ ...edit, description: { ...edit.description, en: e.target.value } })} /></label>
            <label className="text-xs"><span className="label">premium SKU (empty = free)</span><input className="field" value={edit.premiumSku ?? ""} onChange={(e) => setEdit({ ...edit, premiumSku: e.target.value || null })} /></label>
          </div>
          <JsonEditor key={edit.id} label="params (materials, lights, fog, camera)" rows={18} value={edit.params} onChange={(v) => setEdit({ ...edit, params: v as ThemeParams })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> active</label>
          <Button variant="primary" onClick={async () => {
            try { await api("/api/admin/themes", { method: "PUT", body: edit }); setMsg("Saved."); await qc.invalidateQueries({ queryKey: ["admin-themes"] }); }
            catch (e) { setMsg(e instanceof ApiError ? `${e.message} ${JSON.stringify(e.details ?? "")}` : "Error"); }
          }}>Save</Button>
          {msg && <p className="text-xs text-gold">{msg}</p>}
        </section>
      )}
    </div>
  );
}

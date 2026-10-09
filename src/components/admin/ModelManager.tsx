"use client";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter } from "next-intl";
import { upload } from "@vercel/blob/client";
import { api, ApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { GENERATIONS } from "@/features/platforms/reference";
import { SCENE_ANCHORS } from "@/features/museum/anchors";
import { analyzeModel, type ModelAnalysis } from "@/features/assets/analyze";
import type { AssetRef } from "@/types/museum";
import { ModelPreview } from "./ModelPreview";
import { cn } from "@/lib/cn";

type Vec3 = [number, number, number];
type Asset = AssetRef & {
  thumbnailUrl: string | null; platformFamily: string | null; generationId: string | null; anchorType: string; rarity: string | null;
  isUnlockable: boolean; unlockRuleId: string | null; premiumSku: string | null; analysis: ModelAnalysis | null; updatedAt: string;
  usage: { placedByUsers: number; awards: string[]; consoleSlot: string | null };
};
type Version = { id: string; version: number; modelUrl: string; createdAt: string };

const CATEGORIES = ["console", "controller", "figure", "award", "furniture", "decoration", "exhibit"] as const;
const SIZE_BY_CATEGORY: Record<string, Vec3> = {
  console: [1.2, 0.58, 0.4], controller: [0.6, 1.1, 0.6], figure: [0.7, 1.3, 0.7], award: [0.42, 0.62, 0.42],
  furniture: [1.4, 2.4, 1.4], decoration: [0.9, 2.0, 0.9], exhibit: [0.7, 1.3, 0.7],
};

const empty = (): Partial<Asset> => ({ name: "", category: "console", scale: [1, 1, 1], positionOffset: [0, 0, 0], rotationOffset: [0, 0, 0], anchorType: "pedestal", status: "draft" });

async function uploadFile(file: File, kind: "model" | "thumb", storage: string): Promise<string> {
  if (storage === "blob") {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "glb";
    const res = await upload(`${kind === "model" ? "models" : "thumbs"}/${Date.now()}.${ext}`, file, {
      access: "public",
      handleUploadUrl: "/api/admin/assets/upload",
      contentType: kind === "model" ? (ext === "gltf" ? "model/gltf+json" : "model/gltf-binary") : file.type,
    });
    return res.url;
  }
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);
  const res = await fetch("/api/admin/assets/upload-local", { method: "POST", body: fd });
  if (res.status === 413) throw new Error("File too large for a direct server upload. Connect Vercel Blob (BLOB_READ_WRITE_TOKEN) and redeploy.");
  const body = (await res.json().catch(() => ({}))) as { url?: string; error?: { message: string } };
  if (!res.ok || !body.url) throw new Error(body.error?.message ?? "Upload failed");
  return body.url;
}

/** /admin/models — upload, analyse, preview, fit, map and version the user-provided 3D models. */
export function ModelManager() {
  const f = useFormatter();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["admin-assets"], queryFn: () => api<{ assets: Asset[]; storage: "blob" | "local" | "none" }>("/api/admin/assets") });
  const [edit, setEdit] = useState<Partial<Asset>>(empty());
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const history = useQuery({ queryKey: ["asset-history", edit.id], queryFn: () => api<{ history: Version[] }>(`/api/admin/assets/${edit.id}`), enabled: !!edit.id });
  const storage = list.data?.storage ?? "none";
  const maxSize = SIZE_BY_CATEGORY[edit.category ?? "console"] ?? [0.7, 1.3, 0.7];

  const onFile = async (file: File) => {
    setMsg(null);
    if (!/\.(glb|gltf)$/i.test(file.name)) return setMsg("Only .glb / self-contained .gltf files are accepted.");
    if (file.size > 50 * 1024 * 1024) return setMsg("File exceeds 50 MB.");
    setBusy("upload");
    try {
      const url = await uploadFile(file, "model", storage);
      setBusy("analyse");
      const analysis = await analyzeModel(url, file.size).catch((e: Error) => ({ triangles: 0, meshes: 0, materials: 0, textures: 0, bbox: { min: [0, 0, 0] as Vec3, max: [0, 0, 0] as Vec3 }, warnings: [`Could not parse model: ${e.message}`], fileSize: file.size }));
      setEdit((e) => ({ ...e, modelUrl: url, analysis, status: e.status ?? "draft" }));
      setPendingFile(file);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  };

  const captureThumb = async (): Promise<string | null> => {
    const c = canvasRef.current;
    if (!c) return null;
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
    if (!blob) return null;
    return uploadFile(new File([blob], "thumb.png", { type: "image/png" }), "thumb", storage).catch(() => null);
  };

  const save = async () => {
    setBusy("save");
    setMsg(null);
    try {
      const thumbnailUrl = edit.modelUrl && pendingFile ? (await captureThumb()) ?? edit.thumbnailUrl : edit.thumbnailUrl;
      const body = {
        name: edit.name, category: edit.category, modelUrl: edit.modelUrl ?? null, thumbnailUrl: thumbnailUrl ?? null,
        platformFamily: edit.platformFamily || null, generationId: edit.generationId || null, scale: edit.scale, positionOffset: edit.positionOffset,
        rotationOffset: edit.rotationOffset, anchorType: edit.anchorType, rarity: edit.rarity || null, isUnlockable: !!edit.isUnlockable,
        unlockRuleId: edit.unlockRuleId || null, premiumSku: edit.premiumSku || null, status: edit.status, analysis: edit.analysis ?? null,
      };
      const res = edit.id
        ? await api<{ asset: Asset }>(`/api/admin/assets/${edit.id}`, { method: "PATCH", body })
        : await api<{ asset: Asset }>("/api/admin/assets", { method: "POST", body });
      setEdit({ ...edit, ...res.asset });
      setPendingFile(null);
      setMsg("Saved.");
      await Promise.all([qc.invalidateQueries({ queryKey: ["admin-assets"] }), qc.invalidateQueries({ queryKey: ["asset-history"] }), qc.invalidateQueries({ queryKey: ["museum"] })]);
    } catch (e) {
      setMsg(e instanceof ApiError ? `${e.message}${e.details ? ` ${JSON.stringify(e.details)}` : ""}` : "Save failed");
    } finally {
      setBusy(null);
    }
  };

  const vec = (key: "scale" | "positionOffset" | "rotationOffset", i: number, v: number) => {
    const cur = [...((edit[key] as Vec3 | undefined) ?? (key === "scale" ? [1, 1, 1] : [0, 0, 0]))] as Vec3;
    cur[i] = v;
    if (key === "scale" && i === 0) {
      cur[1] = v;
      cur[2] = v;
    }
    setEdit({ ...edit, [key]: cur });
  };

  const previewAsset: AssetRef = {
    id: edit.id ?? "preview", name: edit.name ?? "", category: edit.category ?? "console", modelUrl: edit.modelUrl ?? null,
    status: "ready", scale: (edit.scale as Vec3) ?? [1, 1, 1], positionOffset: (edit.positionOffset as Vec3) ?? [0, 0, 0],
    rotationOffset: (edit.rotationOffset as Vec3) ?? [0, 0, 0], version: (edit.version ?? 0) + (pendingFile ? 1000 : 0),
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">3D Assets</h2>
          <Button size="sm" variant="secondary" onClick={() => { setEdit(empty()); setPendingFile(null); setMsg(null); }}>+ New</Button>
        </div>
        <p className="mb-3 text-xs text-slate">Storage: {storage === "blob" ? "Vercel Blob" : storage === "local" ? "local /public/uploads (development only)" : "not configured — Vercel → Storage → Create → Blob, connect it to this project, then redeploy (BLOB_READ_WRITE_TOKEN)."}</p>
        <ul className="space-y-1.5">
          {list.data?.assets.map((a) => (
            <li key={a.id}>
              <button onClick={() => { setEdit(a); setPendingFile(null); setMsg(null); }} className={cn("flex w-full items-center gap-3 rounded-xl border p-2 text-left text-sm", edit.id === a.id ? "border-gold/50" : "border-white/[0.06] hover:border-white/20")}>
                {a.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.thumbnailUrl} alt="" className="h-10 w-10 rounded object-cover" />
                ) : <span className="h-10 w-10 rounded bg-white/5" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{a.name}</span>
                  <span className="text-[11px] text-slate">{a.category}{a.generationId ? ` · ${a.generationId}` : ""} · v{a.version}</span>
                </span>
                <Badge tone={a.status === "ready" ? "gold" : a.status === "disabled" ? "danger" : "neutral"}>{a.status}</Badge>
              </button>
            </li>
          ))}
          {list.data?.assets.length === 0 && <li className="text-xs text-slate">No assets yet. Upload your first GLB.</li>}
        </ul>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="col-span-2 text-xs"><span className="label">Name</span><input className="field" value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
            <label className="text-xs"><span className="label">Category</span>
              <select className="field" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            <label className="text-xs"><span className="label">Anchor type</span>
              <select className="field" value={edit.anchorType} onChange={(e) => setEdit({ ...edit, anchorType: e.target.value })}>{["pedestal", "shelf", "floor", "wall"].map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            <label className="text-xs"><span className="label">Platform family</span>
              <select className="field" value={edit.platformFamily ?? ""} onChange={(e) => setEdit({ ...edit, platformFamily: e.target.value || null })}><option value="">—</option><option value="xbox">xbox</option><option value="playstation">playstation</option><option value="pc">pc</option></select>
            </label>
            <label className="text-xs"><span className="label">Generation (console slot)</span>
              <select className="field" value={edit.generationId ?? ""} onChange={(e) => setEdit({ ...edit, generationId: e.target.value || null })}><option value="">—</option>{GENERATIONS.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
            </label>
            <label className="text-xs"><span className="label">Premium SKU</span><input className="field" placeholder="decor.neon-sign" value={edit.premiumSku ?? ""} onChange={(e) => setEdit({ ...edit, premiumSku: e.target.value })} /></label>
            <label className="text-xs"><span className="label">Unlock award id</span><input className="field" placeholder="games-100" value={edit.unlockRuleId ?? ""} onChange={(e) => setEdit({ ...edit, unlockRuleId: e.target.value, isUnlockable: !!e.target.value })} /></label>
          </div>

          <div className="rounded-xl border hairline p-3">
            <div className="mb-2 text-xs text-slate">Model file (.glb, max 50 MB){edit.modelUrl ? " — uploading a new file creates a new version; placements stay intact." : ""}</div>
            <input type="file" accept=".glb,.gltf,model/gltf-binary" disabled={!!busy || storage === "none"} onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} aria-label="Model file" />
            {busy && <div className="mt-2 text-xs text-gold">{busy}…</div>}
          </div>

          {(["scale", "positionOffset", "rotationOffset"] as const).map((k) => (
            <div key={k}>
              <div className="label">{k === "scale" ? "Scale (uniform)" : k === "positionOffset" ? "Position offset (m)" : "Rotation (rad)"}</div>
              <div className="grid grid-cols-3 gap-2">
                {(k === "scale" ? [0] : [0, 1, 2]).map((i) => (
                  <input key={i} type="number" step={k === "rotationOffset" ? 0.0872665 : 0.01} min={k === "scale" ? 0.05 : undefined} max={k === "scale" ? 5 : undefined} className="field" aria-label={`${k} ${"xyz"[i]}`} value={((edit[k] as Vec3 | undefined) ?? (k === "scale" ? [1, 1, 1] : [0, 0, 0]))[i]} onChange={(e) => vec(k, i, Number(e.target.value))} />
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEdit({ ...edit, rotationOffset: [-Math.PI / 2, 0, 0] })}>Z-up → Y-up</Button>
            <Button size="sm" variant="ghost" onClick={() => setEdit({ ...edit, scale: [1, 1, 1], positionOffset: [0, 0, 0], rotationOffset: [0, 0, 0] })}>Reset transform</Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs">Status{" "}
              <select className="field inline-block w-auto" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Asset["status"] })}><option value="draft">draft</option><option value="ready">ready (active)</option><option value="disabled">disabled</option></select>
            </label>
            <Button variant="primary" disabled={!!busy || !edit.name} onClick={() => void save()}>{busy === "save" ? "Saving…" : "Save"}</Button>
          </div>
          {msg && <p className="text-xs text-gold" role="status">{msg}</p>}

          {edit.analysis && (
            <div className="rounded-xl border hairline p-3 text-xs">
              <div className="mb-1 font-medium">Analysis</div>
              <div className="text-slate">{edit.analysis.triangles?.toLocaleString()} tris · {edit.analysis.meshes} meshes · {edit.analysis.materials} materials · {edit.analysis.textures} textures{edit.analysis.fileSize ? ` · ${(edit.analysis.fileSize / 1048576).toFixed(1)} MB` : ""}</div>
              {edit.analysis.warnings?.map((w) => <div key={w} className="mt-1 text-[#ffcf8a]">⚠ {w}</div>)}
            </div>
          )}
          {edit.id && (
            <div className="rounded-xl border hairline p-3 text-xs">
              <div className="mb-1 font-medium">Usage</div>
              {"usage" in edit && edit.usage ? (
                <div className="text-slate">{edit.usage.placedByUsers} user placements · awards: {edit.usage.awards.join(", ") || "—"} · console slot: {edit.usage.consoleSlot ?? "—"}</div>
              ) : null}
              <div className="mb-1 mt-3 font-medium">Versions</div>
              <ul className="space-y-1">
                {history.data?.history.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2">
                    <span>v{v.version} · {f.dateTime(new Date(v.createdAt), { dateStyle: "short", timeStyle: "short" })}{v.version === edit.version ? " (current)" : ""}</span>
                    {v.version !== edit.version && <Button size="sm" variant="ghost" onClick={async () => { const r = await api<{ asset: Asset }>(`/api/admin/assets/${edit.id}/rollback`, { method: "POST", body: { version: v.version } }); setEdit({ ...edit, ...r.asset }); await qc.invalidateQueries({ queryKey: ["admin-assets"] }); await qc.invalidateQueries({ queryKey: ["asset-history"] }); }}>Roll back</Button>}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-slate">Placement anchors: {SCENE_ANCHORS.map((a) => a.id).join(", ")}</p>
            </div>
          )}
        </div>
        <div className="h-[420px] lg:sticky lg:top-24">
          <ModelPreview ref={canvasRef} asset={previewAsset} maxSize={maxSize} />
          <p className="mt-2 text-[11px] text-slate">Gold wireframe = the box the museum fits this category into. The model's own geometry is never modified.</p>
        </div>
      </section>
    </div>
  );
}

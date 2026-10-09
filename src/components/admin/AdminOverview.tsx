"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations, useFormatter } from "next-intl";
import { api, ApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { JsonEditor } from "./JsonEditor";

type Overview = { users: number; copies: number; assets: number; awardsGranted: number; audits: { id: string; action: string; targetType: string; targetId: string | null; createdAt: string; actorId: string }[]; errors: { id: string; scope: string; message: string; createdAt: string }[] };
type PG = { platforms: Record<string, unknown>[]; generations: (Record<string, unknown> & { id: string; name: string })[] };

export function AdminOverview() {
  const t = useTranslations();
  const f = useFormatter();
  const qc = useQueryClient();
  const ov = useQuery({ queryKey: ["admin-overview"], queryFn: () => api<Overview>("/api/admin/overview") });
  const pg = useQuery({ queryKey: ["admin-pg"], queryFn: () => api<PG>("/api/admin/platforms") });
  const [ent, setEnt] = useState({ email: "", sku: "theme.retro-room" });
  const [msg, setMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ type: "platform" | "generation"; data: unknown } | null>(null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          [t("admin.users"), ov.data?.users], [t("admin.copies"), ov.data?.copies], [t("admin.assets"), ov.data?.assets], [t("admin.granted"), ov.data?.awardsGranted],
        ].map(([l, n]) => <div key={String(l)} className="panel p-4"><div className="text-2xl tabular-nums">{n ?? "…"}</div><div className="text-xs text-slate">{l}</div></div>)}
      </div>

      <section className="panel p-4">
        <h2 className="mb-3 font-semibold">{t("admin.platforms")}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ul className="max-h-80 space-y-1 overflow-y-auto text-sm">
            {pg.data?.platforms.map((p) => <li key={String(p.id)}><button className="text-left hover:text-gold" onClick={() => setDraft({ type: "platform", data: p })}>▸ {String(p.name)} <span className="text-xs text-slate">({String(p.id)})</span></button></li>)}
            {pg.data?.generations.map((g) => <li key={g.id} className="pl-4"><button className="text-left hover:text-gold" onClick={() => setDraft({ type: "generation", data: g })}>{g.name} <span className="text-xs text-slate">({g.id})</span></button></li>)}
          </ul>
          <div>
            <div className="mb-2 flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setDraft({ type: "platform", data: { id: "nintendo", name: "Nintendo", accentColor: "#E4000F", tagline: null, sortOrder: 3, active: false } })}>+ platform</Button>
              <Button size="sm" variant="ghost" onClick={() => setDraft({ type: "generation", data: { id: "new-gen", platformId: "playstation", name: "", shortName: "", kind: "console", yearStart: null, yearEnd: null, caseProfile: "dvd-black", igdbPlatformIds: [], isRetro: false, shelfCapacity: 4, sortOrder: 9, active: false } })}>+ generation</Button>
            </div>
            {draft && (
              <>
                <JsonEditor key={JSON.stringify(draft.data)} label={draft.type} value={draft.data} rows={14} onChange={(v) => setDraft({ ...draft, data: v })} />
                <Button size="sm" variant="primary" className="mt-2" onClick={async () => {
                  try { await api("/api/admin/platforms", { method: "PUT", body: draft }); setMsg(t("common.saved")); await qc.invalidateQueries({ queryKey: ["admin-pg"] }); }
                  catch (e) { setMsg(e instanceof ApiError ? `${e.message} ${JSON.stringify(e.details ?? "")}` : t("common.error")); }
                }}>{t("common.save")}</Button>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 font-semibold">{t("admin.entitlements")}</h2>
        <form className="flex flex-wrap gap-2" onSubmit={async (e) => {
          e.preventDefault();
          try { await api("/api/admin/entitlements", { method: "POST", body: ent }); setMsg(t("common.saved")); } catch (x) { setMsg(x instanceof ApiError ? x.message : t("common.error")); }
        }}>
          <input className="field w-64" placeholder="email" value={ent.email} onChange={(e) => setEnt({ ...ent, email: e.target.value })} aria-label="email" />
          <input className="field w-56" value={ent.sku} onChange={(e) => setEnt({ ...ent, sku: e.target.value })} aria-label="sku" />
          <Button type="submit" variant="secondary">OK</Button>
        </form>
        {msg && <p className="mt-2 text-xs text-gold">{msg}</p>}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-4">
          <h2 className="mb-3 font-semibold">{t("admin.audit")}</h2>
          <ul className="max-h-80 space-y-1 overflow-y-auto text-xs">
            {ov.data?.audits.map((a) => <li key={a.id} className="flex justify-between gap-2"><span>{a.action} · {a.targetType}:{a.targetId}</span><span className="text-slate">{f.dateTime(new Date(a.createdAt), { dateStyle: "short", timeStyle: "short" })}</span></li>)}
          </ul>
        </section>
        <section className="panel p-4">
          <h2 className="mb-3 font-semibold">{t("admin.errors")}</h2>
          <ul className="max-h-80 space-y-1 overflow-y-auto text-xs">
            {ov.data?.errors.map((e) => <li key={e.id}><span className="text-[#ff9a92]">[{e.scope}]</span> {e.message} <span className="text-slate">· {f.dateTime(new Date(e.createdAt), { dateStyle: "short", timeStyle: "short" })}</span></li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}

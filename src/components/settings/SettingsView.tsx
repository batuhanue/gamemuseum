"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Copy, RefreshCw } from "lucide-react";
import { api, ApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { LocaleSwitch } from "@/components/shell/LocaleSwitch";
import { useToasts } from "@/stores/toast-store";
import { useUnlocks } from "@/stores/unlock-store";
import { cn } from "@/lib/cn";

type Me = {
  email: string; username: string; emailVerified: boolean; hasPassword: boolean; plan: "free" | "premium";
  museumVisibility: "private" | "unlisted" | "public"; shareToken: string;
  shareSettings: { platforms: string[]; showAwards: boolean; showFavorites: boolean; showStats: boolean };
  steam: string | null; appUrl: string;
};

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="panel p-5">
      <h2 className="display mb-4 text-2xl">{title}</h2>
      {children}
    </section>
  );
}

export function SettingsView({ me }: { me: Me }) {
  const t = useTranslations();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToasts((s) => s.show);
  const pushUnlocks = useUnlocks((s) => s.push);
  const [privacy, setPrivacy] = useState({ museumVisibility: me.museumVisibility, shareSettings: me.shareSettings });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [del, setDel] = useState({ confirmUsername: "", password: "" });
  const verified = params.get("verified");
  const shareUrl = `${me.appUrl}/u/${me.username}/museum${privacy.museumVisibility === "unlisted" ? `?key=${me.shareToken}` : ""}`;

  const savePrivacy = async (rotateToken = false) => {
    try {
      const r = await api<{ unlocked: { awardId: string }[] }>("/api/me/privacy", { method: "PUT", body: { ...privacy, rotateToken } });
      if (r.unlocked.length) pushUnlocks(r.unlocked.map((u) => u.awardId));
      toast(t("common.saved"), "success");
      router.refresh();
    } catch {
      toast(t("common.error"), "error");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="display text-4xl">{t("settings.title")}</h1>
      {verified && <p role="status" className={cn("rounded-lg border px-3 py-2 text-sm", verified === "1" ? "border-xbox/40 text-xbox" : "border-danger/40 text-[#ff9a92]")}>{verified === "1" ? t("settings.verifiedOk") : t("settings.verifiedFail")}</p>}

      <Section title={t("settings.account")}>
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{me.email}</span>
            {me.emailVerified ? <Badge tone="gold">{t("settings.emailVerified")}</Badge> : (
              <span className="flex items-center gap-2">
                <Badge>{t("settings.emailNotVerified")}</Badge>
                <Button size="sm" variant="ghost" onClick={async () => {
                  try {
                    const r = await api<{ channel: string }>("/api/auth/resend", { method: "POST" });
                    toast(r.channel === "resend" ? t("settings.verificationSent") : r.channel === "dev-log" ? t("settings.verificationDev") : t("auth.resetNoMail"));
                  } catch (e) { toast(e instanceof ApiError && e.status === 429 ? t("errors.rateLimited") : t("common.error"), "error"); }
                }}>{t("settings.resendVerification")}</Button>
              </span>
            )}
          </div>
          <div className="flex items-center justify-between"><span className="text-slate">{t("common.language")}</span><LocaleSwitch /></div>
          <div className="flex items-center justify-between"><span className="text-slate">{t("settings.plan")}</span><Badge tone={me.plan === "premium" ? "gold" : "neutral"}>{me.plan === "premium" ? t("settings.planPremium") : t("settings.planFree")}</Badge></div>
          <p className="text-xs text-slate">{t("settings.premiumNote")}</p>
          <div className="flex items-center justify-between"><span className="text-slate">{t("settings.linkedAccounts")}</span><span className="text-xs">{me.steam ? `Steam · ${me.steam}` : "—"}</span></div>
        </div>
      </Section>

      <Section id="privacy" title={t("share.title")}>
        <div className="grid gap-2 sm:grid-cols-3">
          {(["private", "unlisted", "public"] as const).map((v) => (
            <button key={v} aria-pressed={privacy.museumVisibility === v} onClick={() => setPrivacy({ ...privacy, museumVisibility: v })} className={cn("rounded-xl border p-3 text-left", privacy.museumVisibility === v ? "border-gold bg-gold/5" : "border-white/[0.08]")}>
              <div className="text-sm">{t(`share.${v}`)}</div>
              <div className="mt-1 text-[11px] text-slate">{t(`share.${v}Hint`)}</div>
            </button>
          ))}
        </div>
        <fieldset className="mt-4 space-y-2 text-sm">
          <legend className="label">{t("share.showPlatforms")}</legend>
          <div className="flex flex-wrap gap-3">
            {["xbox", "playstation", "pc"].map((p) => (
              <label key={p} className="flex items-center gap-2"><input type="checkbox" checked={privacy.shareSettings.platforms.includes(p)} onChange={(e) => setPrivacy({ ...privacy, shareSettings: { ...privacy.shareSettings, platforms: e.target.checked ? [...privacy.shareSettings.platforms, p] : privacy.shareSettings.platforms.filter((x) => x !== p) } })} /> {p === "playstation" ? "PlayStation" : p === "pc" ? "PC" : "Xbox"}</label>
            ))}
          </div>
          {(["showAwards", "showFavorites", "showStats"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={privacy.shareSettings[k]} onChange={(e) => setPrivacy({ ...privacy, shareSettings: { ...privacy.shareSettings, [k]: e.target.checked } })} /> {t(`share.${k}`)}</label>
          ))}
        </fieldset>
        <p className="mt-3 text-xs text-slate">{t("share.privacyNote")}</p>
        <Button variant="primary" className="mt-4" onClick={() => void savePrivacy()}>{t("common.save")}</Button>
        {me.museumVisibility !== "private" && (
          <div className="mt-5 rounded-xl border hairline p-3">
            <div className="label">{t("share.link")}</div>
            <div className="flex gap-2">
              <input readOnly className="field text-xs" value={shareUrl} aria-label={t("share.link")} />
              <Button size="icon" variant="secondary" aria-label={t("share.copy")} onClick={async () => { await navigator.clipboard.writeText(shareUrl); toast(t("share.copied")); }}><Copy size={15} /></Button>
            </div>
            {me.museumVisibility === "unlisted" && <Button size="sm" variant="ghost" className="mt-2" onClick={() => void savePrivacy(true)}><RefreshCw size={13} /> {t("share.rotate")}</Button>}
          </div>
        )}
      </Section>

      <Section title={t("settings.security")}>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (e) => {
          e.preventDefault();
          try { await api("/api/me/password", { method: "POST", body: { current: pw.current || undefined, next: pw.next } }); setPw({ current: "", next: "" }); toast(t("settings.passwordChanged"), "success"); }
          catch (err) { toast(err instanceof ApiError ? err.message : t("common.error"), "error"); }
        }}>
          {me.hasPassword && <div><label className="label" htmlFor="s-cur">{t("settings.currentPassword")}</label><input id="s-cur" type="password" autoComplete="current-password" className="field" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>}
          <div><label className="label" htmlFor="s-new">{t("auth.newPassword")}</label><input id="s-new" type="password" minLength={8} autoComplete="new-password" className="field" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
          <Button type="submit" variant="secondary" className="sm:col-span-2 sm:w-fit">{t("settings.changePassword")}</Button>
        </form>
      </Section>

      <Section title={t("settings.data")}>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary"><a href="/api/me/export?format=json">{t("settings.exportJson")}</a></Button>
          <Button asChild variant="secondary"><a href="/api/me/export?format=csv">{t("settings.exportCsv")}</a></Button>
        </div>
        <p className="mt-2 text-xs text-slate">{t("settings.exportNote")}</p>
        <div className="mt-6 rounded-xl border border-danger/30 p-4">
          <div className="font-medium text-[#ff9a92]">{t("settings.deleteAccount")}</div>
          <p className="mt-1 text-xs text-slate">{t("settings.deleteWarning")}</p>
          <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={async (e) => {
            e.preventDefault();
            try { await api("/api/me", { method: "DELETE", body: { confirmUsername: del.confirmUsername, password: del.password || undefined } }); router.push("/"); router.refresh(); }
            catch (err) { toast(err instanceof ApiError ? err.message : t("common.error"), "error"); }
          }}>
            <label className="text-xs sm:col-span-2" htmlFor="s-del">{t("settings.typeUsername", { username: me.username })}</label>
            <input id="s-del" className="field" value={del.confirmUsername} onChange={(e) => setDel({ ...del, confirmUsername: e.target.value })} />
            {me.hasPassword && <input type="password" className="field" placeholder={t("auth.password")} aria-label={t("auth.password")} value={del.password} onChange={(e) => setDel({ ...del, password: e.target.value })} />}
            <Button type="submit" variant="danger" disabled={del.confirmUsername.toLowerCase() !== me.username} className="sm:col-span-2 sm:w-fit">{t("settings.deleteConfirm")}</Button>
          </form>
        </div>
      </Section>
    </div>
  );
}

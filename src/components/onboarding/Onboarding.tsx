"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Check } from "lucide-react";
import { api } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { PlatformMark, Logo } from "@/components/shell/PlatformMark";
import { AddGameFlow } from "@/components/collection/AddGameFlow";
import { THEMES } from "@/features/museum/themes";
import { useUnlocks } from "@/stores/unlock-store";
import { cn } from "@/lib/cn";

/** Short first run: platforms → theme → first three games → museum. Never blocks on adding everything. */
export function Onboarding({ name }: { name: string }) {
  const t = useTranslations();
  const locale = useLocale() as "tr" | "en";
  const router = useRouter();
  const pushUnlocks = useUnlocks((s) => s.push);
  const [step, setStep] = useState(0);
  const [platforms, setPlatforms] = useState<string[]>(["xbox", "playstation", "pc"]);
  const [theme, setTheme] = useState("modern-museum");
  const [added, setAdded] = useState(0);
  const [flowKey, setFlowKey] = useState(0);

  const finish = async () => {
    await api("/api/onboarding", { method: "POST", body: { step: "complete" } });
    const r = await api<{ unlocked: { awardId: string }[] }>("/api/awards", { method: "POST" });
    if (r.unlocked.length) pushUnlocks(r.unlocked.map((u) => u.awardId));
    router.push("/museum");
    router.refresh();
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <Logo compact />
        <ol className="flex gap-1.5" aria-label="progress">
          {[0, 1, 2].map((i) => <li key={i} className={cn("h-1.5 w-10 rounded-full", i <= step ? "bg-gold" : "bg-white/10")} />)}
        </ol>
      </div>
      <div className="eyebrow">{t("onboarding.welcome")}, {name}</div>

      {step === 0 && (
        <section className="mt-2">
          <h1 className="display text-4xl">{t("onboarding.stepPlatforms")}</h1>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {(["xbox", "playstation", "pc"] as const).map((p) => {
              const on = platforms.includes(p);
              return (
                <button key={p} aria-pressed={on} onClick={() => setPlatforms(on ? platforms.filter((x) => x !== p) : [...platforms, p])} className={cn("panel flex items-center gap-3 p-4 text-left", on && "border-gold/60")}>
                  <PlatformMark platform={p} size={36} />
                  <span className="flex-1 font-medium">{p === "xbox" ? "Xbox" : p === "playstation" ? "PlayStation" : "PC"}</span>
                  {on && <Check size={16} className="text-gold" />}
                </button>
              );
            })}
          </div>
          <Button variant="primary" className="mt-8" disabled={!platforms.length} onClick={async () => { await api("/api/onboarding", { method: "POST", body: { step: "platforms", platforms } }); setStep(1); }}>{t("common.next")}</Button>
        </section>
      )}

      {step === 1 && (
        <section className="mt-2">
          <h1 className="display text-4xl">{t("onboarding.stepTheme")}</h1>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {THEMES.filter((th) => !th.premiumSku).map((th) => (
              <button key={th.id} aria-pressed={theme === th.id} onClick={() => setTheme(th.id)} className={cn("panel overflow-hidden p-2 text-left", theme === th.id && "border-gold/60")}>
                <div className="h-24 rounded-lg" style={{ background: `linear-gradient(180deg, ${th.params.wall} 55%, ${th.params.floor} 55%)`, boxShadow: `inset 0 -2px 0 ${th.params.trim}` }} />
                <div className="mt-2 px-1 text-sm">{th.name[locale]}</div>
                <div className="px-1 text-[11px] text-slate">{th.description[locale]}</div>
              </button>
            ))}
          </div>
          <Button variant="primary" className="mt-8" onClick={async () => {
            const r = await api<{ unlocked: { awardId: string }[] }>("/api/onboarding", { method: "POST", body: { step: "theme", themeId: theme } });
            if (r.unlocked.length) pushUnlocks(r.unlocked.map((u) => u.awardId));
            setStep(2);
          }}>{t("common.next")}</Button>
        </section>
      )}

      {step === 2 && (
        <section className="mt-2">
          <h1 className="display text-4xl">{t("onboarding.stepGames")}</h1>
          <p className="mt-1 text-sm text-slate">{t("onboarding.stepGamesBody")}</p>
          <div className="mt-2 text-sm text-gold">{t("onboarding.added", { count: Math.min(added, 3) })}</div>
          <div className="mt-5">
            <AddGameFlow key={flowKey} compact onAdded={() => { setAdded((n) => n + 1); setTimeout(() => setFlowKey((k) => k + 1), 1200); }} />
          </div>
          <div className="mt-8 flex gap-2">
            <Button variant="primary" onClick={() => void finish()} disabled={added === 0}>{t("onboarding.finish")}</Button>
            <Button variant="ghost" onClick={() => void finish()}>{t("onboarding.skip")}</Button>
          </div>
        </section>
      )}
    </div>
  );
}
